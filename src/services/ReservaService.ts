// @ts-nocheck
import { db, seedUtil, type Create, type Update, type Reserva, type EstadoReserva, type OrigenReserva, type Habitacion } from './__supabase_db__';
import { HabitacionService } from './HabitacionService';
import { TarifaService, PoliticaCancelacionService } from './TarifaService';
import { HuespedService } from './HuespedService';

const KEY = 'reservas';

const PREFIJO = 'R-';
const siguienteCodigo = async (): Promise<string> => {
  const existentes = (await db.allAsync<Reserva>(KEY)).map((r) => (r.codigoReserva || '').replace(PREFIJO, ''));
  const maxNum = existentes.reduce((max, v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 1000);
  return `${PREFIJO}${maxNum + 1}`;
};

const agregarHistorial = (
  reservaId: string,
  tipoCambio: any,
  valorAnterior: any,
  valorNuevo: any,
  usuarioId: string,
  comentario = ''
): any => ({
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
  async listarTodas(params?: {
    estado?: EstadoReserva;
    origen?: OrigenReserva;
    huespedId?: string;
    habitacionId?: string;
    rangoFechasCheckin?: { inicioISO: string; finISO: string };
    buscar?: string;
    soloPendientesGarantia?: boolean;
  }): Promise<Reserva[]> {
    let lista = (await db.allAsync<Reserva>(KEY)).sort((a, b) =>
      ((b.fechaCreacion as any) || '').localeCompare((a.fechaCreacion as any) || '')
    );
    if (params?.estado) lista = lista.filter((r) => r.estado === params.estado);
    if (params?.origen) lista = lista.filter((r) => r.origen === params.origen);
    if (params?.huespedId) lista = lista.filter((r) => r.huespedId === params.huespedId);
    if (params?.habitacionId) {
      lista = lista.filter((r) => (r as any).habitaciones?.some((rh: any) => rh.habitacionId === params!.habitacionId));
    }
    if (params?.rangoFechasCheckin) {
      const { inicioISO, finISO } = params.rangoFechasCheckin;
      lista = lista.filter((r) => (r.fechaCheckin as any) >= inicioISO && (r.fechaCheckin as any) <= finISO);
    }
    if (params?.soloPendientesGarantia) {
      lista = lista.filter(
        (r) =>
          r.estado !== 'CANCELADA' &&
          r.estado !== 'CHECKED_OUT' &&
          (r as any).pagoGarantia?.tipoGarantia === 'PENDIENTE_CONFIRMACION'
      );
    }
    if (params?.buscar) {
      const q = params.buscar.toLowerCase().trim();
      lista = lista.filter((r: any) =>
        (r.codigoReserva || '').toLowerCase().includes(q) ||
        (r.huesped?.nombreCompleto || '').toLowerCase().includes(q) ||
        (r.huesped?.numeroDocumento || '').includes(q) ||
        (r.huesped?.telefono1 && String(r.huesped.telefono1).includes(q)) ||
        (r.codigoOtaConirmacion || '').toLowerCase().includes(q) ||
        (r.habitaciones || []).some((rh: any) => (rh.habitacion?.codigo || '').toLowerCase().includes(q))
      );
    }
    return lista;
  },

  async estadisticasHoy(): Promise<{
    llegadasHoy: number;
    salidasHoy: number;
    enCasa: number;
    enCheckIn: number;
    pendientesGarantia: number;
    reservasActivas: number;
  }> {
    const hoy = seedUtil.hoy().slice(0, 10);
    const activas = await this.listarTodas();
    return {
      reservasActivas: activas.filter((r) => r.estado !== 'CANCELADA').length,
      llegadasHoy: activas.filter((r) => String(r.fechaCheckin).startsWith(hoy) && ['CONFIRMADA', 'CHECKED_IN', 'PENDIENTE'].includes(r.estado)).length,
      salidasHoy: activas.filter((r) => String(r.fechaCheckout).startsWith(hoy) && ['CHECKED_IN', 'CONFIRMADA'].includes(r.estado)).length,
      enCasa: activas.filter((r) => r.estado === 'CHECKED_IN').length,
      enCheckIn: activas.filter((r) => r.estado === 'CHECKED_IN').reduce((sum, r) => sum + (r.totalPersonas || 0), 0),
      pendientesGarantia: activas.filter(
        (r: any) => ['CONFIRMADA', 'PENDIENTE'].includes(r.estado) && r.pagoGarantia?.tipoGarantia === 'PENDIENTE_CONFIRMACION'
      ).length,
    };
  },

  async buscarPorId(id: string): Promise<Reserva | undefined> {
    const r = await db.getByIdAsync<Reserva>(KEY, id);
    if (!r) return undefined;
    if (!r.huesped && r.huespedId) {
      const huesped = await HuespedService.buscarPorId(r.huespedId);
      if (huesped) r.huesped = huesped;
    }
    (r as any).habitaciones = await Promise.all(
      ((r as any).habitaciones || []).map(async (rh: any) => {
        if (rh.habitacion) return rh;
        const hab = await HabitacionService.buscarPorId(rh.habitacionId);
        return hab ? { ...rh, habitacion: hab } : rh;
      })
    );
    return r;
  },

  async buscarPorCodigo(codigo: string): Promise<Reserva | undefined> {
    const r = await db.findOneAsync<Reserva>(KEY, (x) => (x.codigoReserva || '').trim().toUpperCase() === codigo.trim().toUpperCase());
    return r ? this.buscarPorId(r.id) : undefined;
  },

  async listarPorHabitacionYFechas(params: {
    habitacionId: string;
    checkinISO: string;
    checkoutISO: string;
    excluirReservaId?: string;
  }): Promise<Reserva[]> {
    const { habitacionId, checkinISO, checkoutISO, excluirReservaId } = params;
    const todas = await this.listarTodas();
    return todas.filter((r: any) => {
      if (r.estado === 'CANCELADA') return false;
      if (excluirReservaId && r.id === excluirReservaId) return false;
      if (!r.habitaciones?.some((rh: any) => rh.habitacionId === habitacionId)) return false;
      return checkinISO < r.fechaCheckout && checkoutISO > r.fechaCheckin;
    });
  },

  async calcularPreReserva(params: {
    tipoHabitacionId?: string;
    habitacionIdSeleccionada?: string;
    checkinISO: string;
    checkoutISO: string;
    adultos: number;
    ninos?: number;
    codPromocional?: string;
    origen: OrigenReserva;
  }): Promise<{
    valido: boolean;
    habitacionDisponible?: Habitacion;
    noches: number;
    tarifaCalculada?: any;
    motivo?: string;
  }> {
    const noches = Math.max(1, Math.round(
      (new Date(params.checkoutISO).getTime() - new Date(params.checkinISO).getTime()) / (1000 * 60 * 60 * 24)
    ));
    if (noches < 1) return { valido: false, noches: 0, motivo: 'Check-out debe ser después de check-in' };

    let habitacion: Habitacion | undefined;
    if (params.habitacionIdSeleccionada) {
      const conflictos = await this.listarPorHabitacionYFechas({
        habitacionId: params.habitacionIdSeleccionada,
        checkinISO: params.checkinISO,
        checkoutISO: params.checkoutISO,
      });
      if (conflictos.length > 0) {
        return { valido: false, noches, motivo: 'La habitación seleccionada no está disponible en ese rango.' };
      }
      habitacion = await HabitacionService.buscarPorId(params.habitacionIdSeleccionada);
    } else {
      const disponibles = await HabitacionService.listarTodas({
        disponiblesParaFechas: { checkinISO: params.checkinISO, checkoutISO: params.checkoutISO },
        tipoHabitacionId: params.tipoHabitacionId,
        capacidadMinimaPax: params.adultos + (params.ninos ?? 0),
      });
      habitacion = disponibles[0];
    }
    if (!habitacion) {
      return { valido: false, noches, motivo: 'No hay habitaciones disponibles para las fechas y capacidad seleccionadas.' };
    }

    const tarifaCalc = await TarifaService.buscarMejorParaFecha({
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

  async crear(payload: Create<Reserva> & { usuarioResponsableId: string }): Promise<Reserva> {
    const codigo = await siguienteCodigo();
    const nueva = await db.addAsync<Reserva>(KEY, {
      ...payload,
      codigoReserva: codigo,
      historialCambios: [
        agregarHistorial('', 'CREACION', null, payload, payload.usuarioResponsableId, 'Reserva creada en sistema'),
      ],
      fechaCreacion: (payload as any).fechaCreacion || seedUtil.nowISO(),
      fechaModificacion: seedUtil.nowISO(),
    } as unknown as Create<Reserva>);

    (nueva as any).historialCambios = ((nueva as any).historialCambios || []).map((h: any) => ({ ...h, reservaId: nueva.id }));
    await db.updateAsync<Reserva>(KEY, nueva.id, {
      historialCambios: (nueva as any).historialCambios,
      updatedBy: payload.usuarioResponsableId,
    } as unknown as Update<Reserva>);

    for (const rh of (nueva as any).habitaciones || []) {
      const hab = await HabitacionService.buscarPorId(rh.habitacionId);
      if (hab && hab.estado === 'LIBRE') {
        await HabitacionService.cambiarEstado(rh.habitacionId, 'RESERVADA', payload.usuarioResponsableId);
      }
    }

    if (nueva.huespedId && (await HuespedService.buscarPorId(nueva.huespedId))) {
      await HuespedService.actualizar(nueva.huespedId, {
        updatedBy: payload.usuarioResponsableId,
        fechaUltimaEstadia: nueva.fechaCheckin as any,
      } as any);
    }

    return (await this.buscarPorId(nueva.id))!;
  },

  async actualizar(id: string, changes: Update<Reserva> & { usuarioResponsableId: string }): Promise<Reserva | undefined> {
    const anterior = await this.buscarPorId(id);
    if (!anterior) return undefined;
    await db.updateAsync<Reserva>(KEY, id, {
      ...(changes as any),
      fechaModificacion: seedUtil.nowISO(),
      historialCambios: [
        ...(anterior as any).historialCambios,
        agregarHistorial(id, 'MODIFICACION', anterior, changes, changes.usuarioResponsableId, 'Actualización manual'),
      ],
    } as unknown as Update<Reserva>);
    return this.buscarPorId(id);
  },

  async cambiarEstado(
    id: string,
    nuevoEstado: EstadoReserva,
    params: {
      usuarioResponsableId: string;
      comentario?: string;
      informacionAdicional?: Partial<Reserva>;
    }
  ): Promise<Reserva | undefined> {
    const anterior = await this.buscarPorId(id);
    if (!anterior) return undefined;
    const estadosValidos: Record<string, string[]> = {
      PENDIENTE: ['CONFIRMADA', 'CANCELADA', 'CHECKED_IN', 'NO_SHOW', 'MODIFICADA'],
      CONFIRMADA: ['CHECKED_IN', 'CANCELADA', 'PENDIENTE', 'NO_SHOW', 'MODIFICADA'],
      MODIFICADA: ['CONFIRMADA', 'CANCELADA', 'CHECKED_IN', 'PENDIENTE', 'NO_SHOW'],
      CHECKED_IN: ['CHECKED_OUT', 'MODIFICADA'],
      CHECKED_OUT: ['MODIFICADA'],
      CANCELADA: ['MODIFICADA'],
      NO_SHOW: ['MODIFICADA', 'CANCELADA'],
    };
    const actuales = estadosValidos[anterior.estado] || [];
    if (!actuales.includes(nuevoEstado) && nuevoEstado !== anterior.estado) {
      throw new Error(
        `Transición inválida: ${anterior.estado} → ${nuevoEstado}. Válidos: ${actuales.join(', ') || '(ninguno)'}`
      );
    }
    await db.updateAsync<Reserva>(KEY, id, {
      estado: nuevoEstado,
      fechaModificacion: seedUtil.nowISO(),
      historialCambios: [
        ...(anterior as any).historialCambios,
        agregarHistorial(id, 'CAMBIO_ESTADO', anterior.estado, nuevoEstado, params.usuarioResponsableId, params.comentario || `Cambio de estado: ${anterior.estado} → ${nuevoEstado}`),
      ],
      ...(params.informacionAdicional as any),
    } as unknown as Update<Reserva>);
    return this.buscarPorId(id);
  },

  async cancelar(
    id: string,
    params: {
      usuarioResponsableId: string;
      motivoCancelacion: string;
      fechaCancelacionISO?: string;
      esNoShow?: boolean;
    }
  ): Promise<{ reserva?: Reserva; multaPorcentaje: number; multaMonto: number; motivoMulta: string }> {
    const anterior = await this.buscarPorId(id);
    if (!anterior) return { multaPorcentaje: 0, multaMonto: 0, motivoMulta: 'Reserva no encontrada' };

    const fechaCancel = params.fechaCancelacionISO || seedUtil.nowISO();
    const penalidad = await PoliticaCancelacionService.calcularPenalidad(
      (anterior as any).politicaCancelacionId,
      anterior.montoTotalReserva || 0,
      anterior.fechaCheckin as any,
      fechaCancel,
      !!params.esNoShow
    );

    const reserva = await this.cambiarEstado(id, params.esNoShow ? 'NO_SHOW' : 'CANCELADA', {
      usuarioResponsableId: params.usuarioResponsableId,
      comentario: params.motivoCancelacion,
    });

    if (reserva) {
      for (const rh of (reserva as any).habitaciones || []) {
        const hab = await HabitacionService.buscarPorId(rh.habitacionId);
        if (hab && hab.estado === 'RESERVADA') {
          await HabitacionService.cambiarEstado(rh.habitacionId, 'LIBRE', params.usuarioResponsableId);
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

  async eliminar(id: string): Promise<boolean> {
    return db.removeAsync(KEY, id);
  },

  reiniciarSeed(): void {
    db.reset();
  },
};

export default ReservaService;
