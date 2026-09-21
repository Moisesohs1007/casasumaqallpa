import { db, seedUtil, type Create, type Update, type Reserva, type EstadoReserva, type OrigenReserva, type Habitacion } from './__db__';
import { HabitacionService } from './HabitacionService';
import { TarifaService, PoliticaCancelacionService } from './TarifaService';
import { HuespedService } from './HuespedService';

const KEY = 'reservas';

const PREFIJO = 'R-';
const siguienteCodigo = (): string => {
  const existentes = db.all<Reserva>(KEY).map((r) => r.codigoReserva.replace(PREFIJO, ''));
  const maxNum = existentes.reduce((max, v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 1000);
  return `${PREFIJO}${maxNum + 1}`;
};

const agregarHistorial = (
  reservaId: string,
  tipoCambio: import('../types').HistorialCambioReserva['tipoCambio'],
  valorAnterior: any,
  valorNuevo: any,
  usuarioId: string,
  comentario = ''
): import('../types').HistorialCambioReserva => ({
  id: seedUtil.generateUUID(),
  reservaId,
  timestamp: seedUtil.nowISO(),
  usuarioId,
  tipoCambio,
  valorAnterior,
  valorNuevo,
  comentario,
  createdAt: seedUtil.nowISO(),
  updatedAt: seedUtil.nowISO(),
  createdBy: usuarioId,
  updatedBy: usuarioId,
});

export const ReservaService = {
  listarTodas(params?: {
    estado?: EstadoReserva;
    origen?: OrigenReserva;
    huespedId?: string;
    habitacionId?: string;
    rangoFechasCheckin?: { inicioISO: string; finISO: string };
    buscar?: string;
    soloPendientesGarantia?: boolean;
  }): Reserva[] {
    let lista = db.all<Reserva>(KEY).sort((a, b) =>
      (b.fechaCreacion || '').localeCompare(a.fechaCreacion || '')
    );
    if (params?.estado) lista = lista.filter((r) => r.estado === params.estado);
    if (params?.origen) lista = lista.filter((r) => r.origen === params.origen);
    if (params?.huespedId) lista = lista.filter((r) => r.huespedId === params.huespedId);
    if (params?.habitacionId) {
      lista = lista.filter((r) => r.habitaciones.some((rh) => rh.habitacionId === params.habitacionId));
    }
    if (params?.rangoFechasCheckin) {
      const { inicioISO, finISO } = params.rangoFechasCheckin;
      lista = lista.filter(
        (r) => r.fechaCheckin >= inicioISO && r.fechaCheckin <= finISO
      );
    }
    if (params?.soloPendientesGarantia) {
      lista = lista.filter(
        (r) =>
          r.estado !== 'CANCELADA' &&
          r.estado !== 'CHECKED_OUT' &&
          r.pagoGarantia.tipoGarantia === 'PENDIENTE_CONFIRMACION'
      );
    }
    if (params?.buscar) {
      const q = params.buscar.toLowerCase().trim();
      lista = lista.filter((r) =>
        r.codigoReserva.toLowerCase().includes(q) ||
        r.huesped?.nombreCompleto.toLowerCase().includes(q) ||
        r.huesped?.numeroDocumento.includes(q) ||
        (r.huesped?.telefono1 && r.huesped.telefono1.includes(q)) ||
        r.codigoOtaConirmacion?.toLowerCase().includes(q) ||
        r.habitaciones.some((rh) => rh.habitacion.codigo.toLowerCase().includes(q))
      );
    }
    return lista;
  },

  estadisticasHoy(): {
    llegadasHoy: number;
    salidasHoy: number;
    enCasa: number;
    enCheckIn: number;
    pendientesGarantia: number;
    reservasActivas: number;
  } {
    const hoy = seedUtil.hoy();
    const activas = this.listarTodas();
    return {
      reservasActivas: activas.filter((r) => r.estado !== 'CANCELADA').length,
      llegadasHoy: activas.filter((r) => r.fechaCheckin.startsWith(hoy.slice(0, 10)) && ['CONFIRMADA', 'CHECKED_IN', 'PENDIENTE'].includes(r.estado)).length,
      salidasHoy: activas.filter((r) => r.fechaCheckout.startsWith(hoy.slice(0, 10)) && ['CHECKED_IN', 'CONFIRMADA'].includes(r.estado)).length,
      enCasa: activas.filter((r) => r.estado === 'CHECKED_IN').length,
      enCheckIn: activas.filter((r) => r.estado === 'CHECKED_IN').reduce((sum, r) => sum + r.totalPersonas, 0),
      pendientesGarantia: activas.filter(
        (r) => ['CONFIRMADA', 'PENDIENTE'].includes(r.estado) && r.pagoGarantia.tipoGarantia === 'PENDIENTE_CONFIRMACION'
      ).length,
    };
  },

  buscarPorId(id: string): Reserva | undefined {
    const r = db.getById<Reserva>(KEY, id);
    if (r && !r.huesped) {
      const huesped = HuespedService.buscarPorId(r.huespedId);
      if (huesped) r.huesped = huesped;
    }
    if (r) {
      r.habitaciones = r.habitaciones.map((rh) => {
        if (rh.habitacion) return rh;
        const hab = HabitacionService.buscarPorId(rh.habitacionId);
        return hab ? { ...rh, habitacion: hab } : rh;
      });
    }
    return r;
  },

  buscarPorCodigo(codigo: string): Reserva | undefined {
    const r = db.findOne<Reserva>(KEY, (x) => x.codigoReserva.trim().toUpperCase() === codigo.trim().toUpperCase());
    return r ? this.buscarPorId(r.id) : undefined;
  },

  listarPorHabitacionYFechas(params: {
    habitacionId: string;
    checkinISO: string;
    checkoutISO: string;
    excluirReservaId?: string;
  }): Reserva[] {
    const { habitacionId, checkinISO, checkoutISO, excluirReservaId } = params;
    return this.listarTodas().filter((r) => {
      if (r.estado === 'CANCELADA') return false;
      if (excluirReservaId && r.id === excluirReservaId) return false;
      if (!r.habitaciones.some((rh) => rh.habitacionId === habitacionId)) return false;
      return checkinISO < r.fechaCheckout && checkoutISO > r.fechaCheckin;
    });
  },

  /** Paso 1 del flujo: validar disponibilidad de habitaciones y tarifa. */
  calcularPreReserva(params: {
    tipoHabitacionId?: string;
    habitacionIdSeleccionada?: string;
    checkinISO: string;
    checkoutISO: string;
    adultos: number;
    ninos?: number;
    codPromocional?: string;
    origen: OrigenReserva;
  }): {
    valido: boolean;
    habitacionDisponible?: Habitacion;
    noches: number;
    tarifaCalculada?: ReturnType<typeof TarifaService.buscarMejorParaFecha>;
    motivo?: string;
  } {
    const noches = Math.max(1, Math.round(
      (new Date(params.checkoutISO).getTime() - new Date(params.checkinISO).getTime()) / (1000 * 60 * 60 * 24)
    ));
    if (noches < 1) return { valido: false, noches: 0, motivo: 'Check-out debe ser después de check-in' };

    // Habitación: seleccionar disponible
    let habitacion: Habitacion | undefined;
    if (params.habitacionIdSeleccionada) {
      const conflictos = this.listarPorHabitacionYFechas({
        habitacionId: params.habitacionIdSeleccionada,
        checkinISO: params.checkinISO,
        checkoutISO: params.checkoutISO,
      });
      if (conflictos.length > 0) {
        return { valido: false, noches, motivo: 'La habitación seleccionada no está disponible en ese rango.' };
      }
      habitacion = HabitacionService.buscarPorId(params.habitacionIdSeleccionada);
    } else {
      const disponibles = HabitacionService.listarTodas({
        disponiblesParaFechas: { checkinISO: params.checkinISO, checkoutISO: params.checkoutISO },
        tipoHabitacionId: params.tipoHabitacionId,
        capacidadMinimaPax: params.adultos + (params.ninos ?? 0),
      });
      habitacion = disponibles[0];
    }
    if (!habitacion) {
      return { valido: false, noches, motivo: 'No hay habitaciones disponibles para las fechas y capacidad seleccionadas.' };
    }

    // Calcular tarifa
    const tarifaCalc = TarifaService.buscarMejorParaFecha({
      tipoHabitacionId: habitacion.tipoHabitacionId,
      fechaCheckinISO: params.checkinISO,
      noches,
      fechaCheckoutISO: params.checkoutISO,
      codPromocionalAplicado: params.codPromocional,
    });
    if (!tarifaCalc) {
      return { valido: false, noches, habitacion, motivo: 'No hay tarifa vigente para esta habitación.' };
    }
    return { valido: true, habitacion, noches, tarifaCalculada: tarifaCalc };
  },

  /** Paso 2 del flujo: crear la reserva. */
  crear(payload: Create<Reserva> & { usuarioResponsableId: string }): Reserva {
    const codigo = siguienteCodigo();
    const nueva = db.add<Reserva>(KEY, {
      ...payload,
      codigoReserva: codigo,
      historialCambios: [
        agregarHistorial('', 'CREACION', null, payload, payload.usuarioResponsableId, 'Reserva creada en sistema'),
      ],
      fechaCreacion: payload.fechaCreacion || seedUtil.nowISO(),
      fechaModificacion: seedUtil.nowISO(),
    } as unknown as Create<Reserva>);

    // Actualizar historial con id correcto
    nueva.historialCambios = nueva.historialCambios.map((h) => ({ ...h, reservaId: nueva.id }));
    db.update<Reserva>(KEY, nueva.id, {
      historialCambios: nueva.historialCambios,
      updatedBy: payload.usuarioResponsableId,
    } as unknown as Update<Reserva>);

    // Actualizar habitaciones a RESERVADA
    for (const rh of nueva.habitaciones) {
      const hab = HabitacionService.buscarPorId(rh.habitacionId);
      if (hab && hab.estado === 'LIBRE') {
        HabitacionService.cambiarEstado(rh.habitacionId, 'RESERVADA', payload.usuarioResponsableId);
      }
    }

    // Incrementar visitas de huésped si lo existía
    if (HuespedService.buscarPorId(nueva.huespedId)) {
      HuespedService.actualizar(nueva.huespedId, {
        updatedBy: payload.usuarioResponsableId,
        fechaUltimaEstadia: nueva.fechaCheckin,
      } as any);
    }

    return this.buscarPorId(nueva.id)!;
  },

  actualizar(id: string, changes: Update<Reserva> & { usuarioResponsableId: string }): Reserva | undefined {
    const anterior = this.buscarPorId(id);
    if (!anterior) return undefined;
    const actualizados = db.update<Reserva>(KEY, id, {
      ...changes,
      fechaModificacion: seedUtil.nowISO(),
      historialCambios: [
        ...anterior.historialCambios,
        agregarHistorial(id, 'MODIFICACION', anterior, changes, changes.usuarioResponsableId, 'Actualización manual'),
      ],
    } as unknown as Update<Reserva>);
    return this.buscarPorId(actualizados!.id);
  },

  cambiarEstado(
    id: string,
    nuevoEstado: EstadoReserva,
    params: {
      usuarioResponsableId: string;
      comentario?: string;
      informacionAdicional?: Partial<Reserva>;
    }
  ): Reserva | undefined {
    const anterior = this.buscarPorId(id);
    if (!anterior) return undefined;
    const estadosValidos: Record<EstadoReserva, EstadoReserva[]> = {
      PENDIENTE: ['CONFIRMADA', 'CANCELADA', 'CHECKED_IN', 'NO_SHOW', 'MODIFICADA'],
      CONFIRMADA: ['CHECKED_IN', 'CANCELADA', 'PENDIENTE', 'NO_SHOW', 'MODIFICADA'],
      MODIFICADA: ['CONFIRMADA', 'CANCELADA', 'CHECKED_IN', 'PENDIENTE', 'NO_SHOW'],
      CHECKED_IN: ['CHECKED_OUT', 'MODIFICADA'],
      CHECKED_OUT: ['MODIFICADA'],
      CANCELADA: ['MODIFICADA'],
      NO_SHOW: ['MODIFICADA', 'CANCELADA'],
    };
    const actuales = estadosValidos[anterior.estado];
    if (!actuales.includes(nuevoEstado) && nuevoEstado !== anterior.estado) {
      throw new Error(
        `Transición inválida: ${anterior.estado} → ${nuevoEstado}. Válidos: ${actuales.join(', ') || '(ninguno)'}`
      );
    }
    const actual = db.update<Reserva>(KEY, id, {
      estado: nuevoEstado,
      fechaModificacion: seedUtil.nowISO(),
      historialCambios: [
        ...anterior.historialCambios,
        agregarHistorial(id, 'CAMBIO_ESTADO', anterior.estado, nuevoEstado, params.usuarioResponsableId, params.comentario || `Cambio de estado: ${anterior.estado} → ${nuevoEstado}`),
      ],
      ...params.informacionAdicional,
    } as unknown as Update<Reserva>);
    return this.buscarPorId(actual!.id);
  },

  /** Valida y calcula cancelación (multa). */
  cancelar(
    id: string,
    params: {
      usuarioResponsableId: string;
      motivoCancelacion: string;
      fechaCancelacionISO?: string;
      esNoShow?: boolean;
    }
  ): { reserva?: Reserva; multaPorcentaje: number; multaMonto: number; motivoMulta: string } {
    const anterior = this.buscarPorId(id);
    if (!anterior) return { multaPorcentaje: 0, multaMonto: 0, motivoMulta: 'Reserva no encontrada' };

    const fechaCancel = params.fechaCancelacionISO || seedUtil.nowISO();
    const penalidad = PoliticaCancelacionService.calcularPenalidad(
      anterior.politicaCancelacionId,
      anterior.montoTotalReserva,
      anterior.fechaCheckin,
      fechaCancel,
      !!params.esNoShow
    );

    const reserva = this.cambiarEstado(id, params.esNoShow ? 'NO_SHOW' : 'CANCELADA', {
      usuarioResponsableId: params.usuarioResponsableId,
      comentario: params.motivoCancelacion,
    });

    // Liberar habitaciones reservadas
    if (reserva) {
      for (const rh of reserva.habitaciones) {
        const hab = HabitacionService.buscarPorId(rh.habitacionId);
        if (hab && hab.estado === 'RESERVADA') {
          HabitacionService.cambiarEstado(rh.habitacionId, 'LIBRE', params.usuarioResponsableId);
        }
      }
    }

    return {
      reserva,
      multaPorcentaje: penalidad.multaPorcentaje,
      multaMonto: penalidad.montoMulta,
      motivoMulta: `${penalidad.motivo}. ${params.esNoShow ? 'Aplicado como No-Show.' : ''} Motivo: ${params.motivoCancelacion}`,
    };
  },

  eliminar(id: string): boolean {
    return db.remove(KEY, id);
  },

  reiniciarSeed(): void {
    db.reset();
  },
};
