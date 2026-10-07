// @ts-nocheck
import { db, seedUtil, type Create, type Update, type Reserva, type EstadoReserva, type OrigenReserva, type Habitacion } from './__db__';
import { HabitacionService } from './HabitacionService';
import { TarifaService, PoliticaCancelacionService } from './TarifaService';
import { HuespedService } from './HuespedService';
import { db as dbRemota } from './__supabase_db__';

const KEY = 'reservas';

let _hidratacionDone = false;
let _hidratandoPromise: Promise<boolean> | null = null;

const log = (m: string, ...rest: any[]) => { try { console.debug(`[ReservaService] ${m}`, ...rest); } catch (_) {} };

const siguienteCodigoLocal = (): string => {
  const sufijo = Date.now().toString().slice(-7);
  return `R-${sufijo}`;
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
  // ============== BOOT: Hidratar InMemoryDB desde Supabase Cloud (singleton 1 vez) ==============
  async hidratarDesdeSupabase(force = false): Promise<boolean> {
    if (_hidratacionDone && !force) return true;
    if (_hidratandoPromise && !force) return _hidratandoPromise;

    const run = async (): Promise<boolean> => {
      try {
        log('Hidratando reservas desde Supabase Cloud...');
        const reservasRemotas = await dbRemota.allAsync<Reserva>(KEY);
        if (reservasRemotas && reservasRemotas.length > 0) {
          db.setAll<Reserva>(KEY, reservasRemotas);
          _hidratacionDone = true;
          log(`✅ reservas cargadas: ${reservasRemotas.length}`);
          return true;
        } else {
          log('⚠️  0 reservas en Supabase Cloud. InMemoryDB se mantiene vacía.');
          _hidratacionDone = true;
          return true;
        }
      } catch (e) {
        console.error('[ReservaService] Error hidratando reservas Supabase:', (e as any)?.message || e);
        _hidratacionDone = false;
        return false;
      } finally {
        _hidratandoPromise = null;
      }
    };
    _hidratandoPromise = run();
    return _hidratandoPromise;
  },

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
      lista = lista.filter((r) => (r.habitaciones || []).some((rh) => rh.habitacionId === params.habitacionId));
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
          (r.pagoGarantia as any)?.tipoGarantia === 'PENDIENTE_CONFIRMACION'
      );
    }
    if (params?.buscar) {
      const q = params.buscar.toLowerCase().trim();
      lista = lista.filter((r) =>
        ((r.codigoReserva || '') as string).toLowerCase().includes(q) ||
        (r.huesped?.nombreCompleto || '').toString().toLowerCase().includes(q) ||
        (r.huesped?.numeroDocumento || '').toString().includes(q) ||
        ((r.huesped?.telefono1 || '') as string).includes(q) ||
        ((r as any).codigoOtaConirmacion || (r as any).codigoOtaConfirmacion || '').toString().toLowerCase().includes(q) ||
        (r.habitaciones || []).some((rh) => (rh.habitacion?.codigo || '').toLowerCase().includes(q))
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
      llegadasHoy: activas.filter((r) => (r.fechaCheckin || '').startsWith(hoy.slice(0, 10)) && ['CONFIRMADA', 'CHECKED_IN', 'PENDIENTE', 'MODIFICADA'].includes(r.estado)).length,
      salidasHoy: activas.filter((r) => (r.fechaCheckout || '').startsWith(hoy.slice(0, 10)) && ['CHECKED_IN', 'CONFIRMADA', 'MODIFICADA'].includes(r.estado)).length,
      enCasa: activas.filter((r) => r.estado === 'CHECKED_IN').length,
      enCheckIn: activas.filter((r) => r.estado === 'CHECKED_IN').reduce((sum, r) => sum + (r.totalPersonas || 0), 0),
      pendientesGarantia: activas.filter(
        (r) => ['CONFIRMADA', 'PENDIENTE', 'MODIFICADA'].includes(r.estado) && ((r.pagoGarantia as any)?.tipoGarantia === 'PENDIENTE_CONFIRMACION')
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
      r.habitaciones = (r.habitaciones || []).map((rh) => {
        if (rh.habitacion) return rh;
        const hab = HabitacionService.buscarPorId(rh.habitacionId);
        return hab ? { ...rh, habitacion: hab } : rh;
      });
    }
    return r;
  },

  buscarPorCodigo(codigo: string): Reserva | undefined {
    const r = db.findOne<Reserva>(KEY, (x) => ((x.codigoReserva || '') as string).trim().toUpperCase() === codigo.trim().toUpperCase());
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
      if (!(r.habitaciones || []).some((rh) => rh.habitacionId === habitacionId)) return false;
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

  /** Paso 2 del flujo: crear la reserva. DUAL WRITE local + Supabase Cloud (persiste). */
  crear(payload: Create<Reserva> & { usuarioResponsableId: string }): Reserva {
    // Primero, CREAR EN SUPABASE REMOTO para: (a) obtener codigo_reserva MAX+1 único remoto (evita colisiones multi-usuario), (b) persiste.
    let codigo = siguienteCodigoLocal();
    try {
      // No esperamos asíncrono para no bloquear UI; pero lanzamos dual write fire and forget con el mismo payload.
      dbRemota.addAsync<Reserva>(KEY, {
        ...(payload as any),
        codigoReserva: codigo,
        historialCambios: [
          agregarHistorial('', 'CREACION', null, payload, payload.usuarioResponsableId, 'Reserva creada en sistema'),
        ],
        fechaCreacion: payload.fechaCreacion || seedUtil.nowISO(),
        fechaModificacion: seedUtil.nowISO(),
      } as any).then((remota: any) => {
        if (remota && remota.id && remota.codigoReserva) {
          try {
            // Si la remota tiene ID y codigo nuevo, actualizamos InMemoryDB para que coincidan.
            const existe = db.getById<any>(KEY, remota.id);
            if (existe) {
              db.update<any>(KEY, remota.id, { codigoReserva: remota.codigoReserva, updatedBy: payload.usuarioResponsableId });
            } else {
              // Si el insert local falló, metemos la remota.
              db.setAll<any>(KEY, [remota, ...db.all<any>(KEY).filter((x: any) => x.id !== remota.id)]);
            }
            log(`✅ Reserva sincronizada con Supabase: ${remota.codigoReserva || remota.id}`);
          } catch (_) {}
        }
      }).catch((e) => console.error('[ReservaService.crear] Sync remoto falló (reserva no persistida en nube):', e?.message || e));
    } catch (e) {
      console.error('[ReservaService.crear] Error al enviar Supabase:', (e as any)?.message || e);
    }

    // Crear local para UI inmediata (usamos el mismo ID si Supabase devuelve síncrono; pero aquí usamos add local normal)
    const nueva = db.add<Reserva>(KEY, {
      ...payload,
      codigoReserva: codigo,
      historialCambios: [
        agregarHistorial('', 'CREACION', null, payload, payload.usuarioResponsableId, 'Reserva creada en sistema'),
      ],
      fechaCreacion: payload.fechaCreacion || seedUtil.nowISO(),
      fechaModificacion: seedUtil.nowISO(),
    } as unknown as Create<Reserva>);

    // Actualizar historial con id correcto local
    nueva.historialCambios = nueva.historialCambios.map((h) => ({ ...h, reservaId: nueva.id }));
    db.update<Reserva>(KEY, nueva.id, {
      historialCambios: nueva.historialCambios,
      updatedBy: payload.usuarioResponsableId,
    } as unknown as Update<Reserva>);

    // Actualizar habitaciones a RESERVADA dual (HabitacionService ya dual)
    for (const rh of nueva.habitaciones || []) {
      const hab = HabitacionService.buscarPorId(rh.habitacionId);
      if (hab && (hab.estado === 'LIBRE' || hab.estado === 'DISPONIBLE')) {
        HabitacionService.cambiarEstado(rh.habitacionId, 'RESERVADA', payload.usuarioResponsableId);
      }
    }

    // Incrementar visitas de huésped si lo existía (si es que ya tiene dual write en HuespedService: futuro, por ahora local OK)
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

    // Dual-write: remoto
    dbRemota.updateAsync<Reserva>(KEY, id, {
      ...changes,
      fechaModificacion: seedUtil.nowISO(),
      historialCambios: [
        ...anterior.historialCambios,
        agregarHistorial(id, 'MODIFICACION', anterior, changes, changes.usuarioResponsableId, 'Actualización manual'),
      ],
    } as any).catch((e) => console.error('[ReservaService.actualizar] Sync remoto falló:', e?.message || e));

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
    const payloadLocal: any = {
      estado: nuevoEstado,
      fechaModificacion: seedUtil.nowISO(),
      historialCambios: [
        ...anterior.historialCambios,
        agregarHistorial(id, 'CAMBIO_ESTADO', anterior.estado, nuevoEstado, params.usuarioResponsableId, params.comentario || `Cambio de estado: ${anterior.estado} → ${nuevoEstado}`),
      ],
      ...params.informacionAdicional,
    };
    const actual = db.update<Reserva>(KEY, id, payloadLocal as unknown as Update<Reserva>);

    // Dual-write: remoto
    dbRemota.updateAsync<Reserva>(KEY, id, payloadLocal as any).catch((e) => console.error('[ReservaService.cambiarEstado] Sync remoto falló:', e?.message || e));

    return this.buscarPorId(actual!.id);
  },

  /** Valida y calcula cancelación (multa). Dual-write también. */
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

    // Liberar habitaciones reservadas (HabitacionService dual write)
    if (reserva) {
      for (const rh of reserva.habitaciones || []) {
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
    const ok = db.remove(KEY, id);
    if (ok) {
      dbRemota.removeAsync(KEY, id).catch((e) => console.error('[ReservaService.eliminar] Sync remoto falló:', e?.message || e));
    }
    return ok;
  },

  reiniciarSeed(): void {
    db.reset();
    _hidratacionDone = false;
    _hidratandoPromise = null;
  },
};
