// @ts-nocheck
import { db, seedUtil, type Create, type Update, type Folio, type CargoFolio, type PagoFolio, type Reserva, type Habitacion, type EstadoFolio, type EstadoPago, type MetodoPago } from './__db__';
import { dbRemota } from './__supabase_db__';
import { ReservaService } from './ReservaService';
import { HabitacionService } from './HabitacionService';
import { HuespedService } from './HuespedService';
import { ImpuestoService } from './TarifaService';
import * as pendingSync from './__pending_sync__';

const TIMEOUT_REMOTO_MS = 3500;
const timeoutPromise = (ms: number) => new Promise<never>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT_REMOTO')), ms));

async function _remotoConQueue(method: 'add' | 'update' | 'remove', key: string, matchId: string, payload: any, remotoCallFn: () => Promise<any>): Promise<void> {
  if (!dbRemota.isOnline()) {
    pendingSync.enqueue(key, method, matchId, payload);
    return;
  }
  try {
    const res = await Promise.race([remotoCallFn(), timeoutPromise(TIMEOUT_REMOTO_MS)]);
    if (!res && method !== 'remove') throw new Error('respuesta remota vacía');
  } catch (e) {
    console.warn('[Folio._remotoConQueue] remoto falló → enqueue. Key=', key, 'm=', method, 'id=', matchId, 'err=', (e as Error)?.message || e);
    pendingSync.enqueue(key, method, matchId, payload);
  }
}

const KEY_FOLIO = 'folios';
const KEY_CARGO = 'cargosFolio';
const KEY_PAGO = 'pagosFolio';

const FOLIO_KEYS_HIDRATAR = [KEY_FOLIO, KEY_CARGO, KEY_PAGO] as const;
let _hidratadoFolio = false;
let _hidratandoFolio: Promise<boolean> | null = null;

async function _hidratarDesdeSupabaseFolio(force = false): Promise<boolean> {
  if (_hidratadoFolio && !force) return true;
  if (!dbRemota.isOnline()) return false;
  if (_hidratandoFolio) return _hidratandoFolio;
  _hidratandoFolio = (async () => {
    try {
      const resultados = await Promise.all(FOLIO_KEYS_HIDRATAR.map((k) => dbRemota.allAsync<any>(k).catch((e) => { console.warn('[FolioService.hidratar] fail key=', k, e); return null; })));
      FOLIO_KEYS_HIDRATAR.forEach((k, idx) => {
        const rows = resultados[idx];
        if (Array.isArray(rows) && rows.length > 0) {
          try { db.upsertAll<any>(k, rows, { matchKey: 'id' }); } catch (e) { console.warn('[FolioService.hidratar] upsertAll fail key=', k, e); }
        }
      });
      _hidratadoFolio = true;
      return true;
    } catch (e) {
      console.warn('[FolioService.hidratar] error general:', e);
      return false;
    } finally { _hidratandoFolio = null; }
  })();
  return _hidratandoFolio;
}

const siguienteNumeroFolio = (): string => {
  const fecha = new Date();
  const yyyymmdd = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}`;
  const existentes = db
    .all<Folio>(KEY_FOLIO)
    .filter((f) => (f.numeroFolio || '').includes(yyyymmdd))
    .map((f) => {
      const m = (f.numeroFolio || '').match(/-(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
  const maxNum = existentes.reduce((max, n) => (n > max ? n : max), 0);
  return `F-${yyyymmdd}-${String(maxNum + 1).padStart(3, '0')}`;
};

export const CargoFolioService = {
  crear(c: Create<CargoFolio>): CargoFolio {
    const now = seedUtil.nowISO();
    const idUnico = (c as any).id || seedUtil.generateUUID();
    const usuarioOrigen = (c as any).createdBy || (c as any).usuarioId || 'system-cargo';
    const payload: any = { id: idUnico, createdAt: (c as any).createdAt || now, updatedAt: (c as any).updatedAt || now, createdBy: usuarioOrigen, updatedBy: (c as any).updatedBy || usuarioOrigen, ...c };
    const nuevo = db.add<CargoFolio>(KEY_CARGO, payload);
    const payloadFinal = { ...payload, id: nuevo.id };

    (async () => {
      try {
        await _remotoConQueue('add', KEY_CARGO, nuevo.id, payloadFinal, () =>
          dbRemota.addAsync<CargoFolio>(KEY_CARGO, payloadFinal as any)
        );
      } catch (_) {}
    })().catch(() => {});

    const folio = db.getById<Folio>(KEY_FOLIO, nuevo.folioId);
    if (folio) FolioService.recalcularTotales(nuevo.folioId, (payload as any).updatedBy || usuarioOrigen);
    return nuevo;
  },
  actualizar(id: string, changes: Update<CargoFolio>): CargoFolio | undefined {
    const usuarioOrigen = (changes as any).updatedBy || 'system-cargo';
    const delta: any = { updatedAt: seedUtil.nowISO(), ...changes };
    const act = db.update<CargoFolio>(KEY_CARGO, id, delta);
    if (act) {
      const payloadDelta = { ...delta, id };
      (async () => {
        try {
          await _remotoConQueue('update', KEY_CARGO, id, payloadDelta, () =>
            dbRemota.updateAsync<CargoFolio>(KEY_CARGO, id, delta as any)
          );
        } catch (_) {}
      })().catch(() => {});
      FolioService.recalcularTotales(act.folioId, (changes as any).updatedBy || usuarioOrigen);
    }
    return act;
  },
  anular(id: string, motivo: string, usuarioId: string): CargoFolio | undefined {
    const now = seedUtil.nowISO();
    const existing = db.getById<CargoFolio>(KEY_CARGO, id);
    const delta = {
      esAnulado: true,
      motivoAnulacion: motivo,
      estado: 'ANULADO',
      monto: 0,
      subtotal: 0,
      total: 0,
      impuestosMontoDesglosado: (existing?.impuestosMontoDesglosado || []).map((x) => ({ ...x, montoImpuesto: 0 })),
      updatedBy: usuarioId,
      updatedAt: now,
    } as unknown as Update<CargoFolio>;
    const act = db.update<CargoFolio>(KEY_CARGO, id, delta);
    if (act) {
      const payloadDelta = { id, ...delta };
      (async () => {
        try {
          await _remotoConQueue('update', KEY_CARGO, id, payloadDelta, () =>
            dbRemota.updateAsync<CargoFolio>(KEY_CARGO, id, delta as any)
          );
        } catch (_) {}
      })().catch(() => {});
      FolioService.recalcularTotales(act.folioId, usuarioId);
    }
    return act;
  },
  listarPorFolio(folioId: string): CargoFolio[] {
    return db.findMany<CargoFolio>(KEY_CARGO, (c) => c.folioId === folioId && c.estado !== 'ANULADO');
  },
};

export const PagoFolioService = {
  crear(p: Create<PagoFolio>): PagoFolio {
    const now = seedUtil.nowISO();
    const idUnico = (p as any).id || seedUtil.generateUUID();
    const usuarioOrigen = (p as any).createdBy || (p as any).usuarioId || 'system-pago';
    const payload: any = { id: idUnico, createdAt: (p as any).createdAt || now, updatedAt: (p as any).updatedAt || now, createdBy: usuarioOrigen, updatedBy: (p as any).updatedBy || ((p as any).usuarioId || usuarioOrigen), ...p };
    const nuevo = db.add<PagoFolio>(KEY_PAGO, payload);
    const payloadFinal = { ...payload, id: nuevo.id };

    (async () => {
      try {
        await _remotoConQueue('add', KEY_PAGO, nuevo.id, payloadFinal, () =>
          dbRemota.addAsync<PagoFolio>(KEY_PAGO, payloadFinal as any)
        );
      } catch (_) {}
    })().catch(() => {});

    if (nuevo.folioId && nuevo.estado !== 'ANULADO') {
      FolioService.recalcularTotales(nuevo.folioId, (payload as any).usuarioId || usuarioOrigen);
    }
    return nuevo;
  },
  actualizar(id: string, changes: Update<PagoFolio>): PagoFolio | undefined {
    const usuarioOrigen = (changes as any).usuarioId || (changes as any).updatedBy || 'system-pago';
    const delta: any = { updatedAt: seedUtil.nowISO(), ...changes };
    if (delta.monto !== undefined) delta.monto = Number(delta.monto || 0);
    const upd = db.update<PagoFolio>(KEY_PAGO, id, delta);
    if (upd) {
      const payloadDelta = { id, ...delta };
      (async () => {
        try {
          await _remotoConQueue('update', KEY_PAGO, id, payloadDelta, () =>
            dbRemota.updateAsync<PagoFolio>(KEY_PAGO, id, delta as any)
          );
        } catch (_) {}
      })().catch(() => {});
      if (upd.folioId) FolioService.recalcularTotales(upd.folioId, usuarioOrigen);
    }
    return upd;
  },
  anular(id: string, motivo: string, usuarioId: string): PagoFolio | undefined {
    const delta = {
      estado: 'ANULADO' as EstadoPago,
      esDevolucion: true,
      monto: 0,
      total: 0,
      motivoAnulacion: motivo,
      observaciones: `Anulado: ${motivo}`,
      updatedBy: usuarioId,
      updatedAt: seedUtil.nowISO(),
    } as unknown as Update<PagoFolio>;
    const upd = db.update<PagoFolio>(KEY_PAGO, id, delta);
    if (upd) {
      const payloadDelta = { id, ...delta };
      (async () => {
        try {
          await _remotoConQueue('update', KEY_PAGO, id, payloadDelta, () =>
            dbRemota.updateAsync<PagoFolio>(KEY_PAGO, id, delta as any)
          );
        } catch (_) {}
      })().catch(() => {});
      if (upd.folioId) FolioService.recalcularTotales(upd.folioId, usuarioId);
    }
    return upd;
  },
  listarPorFolio(folioId: string): PagoFolio[] {
    return db.findMany<PagoFolio>(KEY_PAGO, (p) => p.folioId === folioId && p.estado !== 'ANULADO');
  },
};

const initFromSeed = () => {
  const folios = db.all<Folio>(KEY_FOLIO);
  for (const f of folios) {
    for (const c of f.cargos || []) {
      if (!db.findOne<CargoFolio>(KEY_CARGO, (x) => x.id === c.id)) {
        db.add<CargoFolio>(KEY_CARGO, c as Create<CargoFolio>);
      }
    }
    for (const p of f.pagos || []) {
      if (!db.findOne<PagoFolio>(KEY_PAGO, (x) => x.id === p.id)) {
        db.add<PagoFolio>(KEY_PAGO, p as Create<PagoFolio>);
      }
    }
  }
};
try { initFromSeed(); } catch (e) { /* no pasa nada */ }

export const FolioService = {
  hidratarDesdeSupabase: _hidratarDesdeSupabaseFolio,

  listarTodos(params?: {
    estado?: EstadoFolio;
    habitacionId?: string;
    huespedId?: string;
    reservaId?: string;
    fechaAperturaDesde?: string;
    fechaCierreDesde?: string;
    buscar?: string;
  }): Folio[] {
    let lista = db.all<Folio>(KEY_FOLIO).sort((a, b) =>
      (b.fechaApertura || '').localeCompare(a.fechaApertura || '')
    );
    if (params?.estado) lista = lista.filter((f) => f.estado === params.estado);
    if (params?.habitacionId) lista = lista.filter((f) => f.habitacionId === params.habitacionId);
    if (params?.huespedId) lista = lista.filter((f) => f.huespedId === params.huespedId);
    if (params?.reservaId) lista = lista.filter((f) => f.reservaId === params.reservaId);
    if (params?.fechaAperturaDesde) lista = lista.filter((f) => (f.fechaApertura || '') >= params.fechaAperturaDesde!);
    if (params?.buscar) {
      const q = params.buscar.toLowerCase().trim();
      lista = lista.filter((f) =>
        (f.numeroFolio || '').toLowerCase().includes(q) ||
        (f.huesped?.nombreCompleto || '').toLowerCase().includes(q) ||
        (f.habitacion?.codigo || '').toLowerCase().includes(q) ||
        (f.reserva?.codigoReserva || '').toLowerCase().includes(q)
      );
    }
    return lista.map((f) => this._enriquecer(f));
  },

  resumenCajaHoy(): {
    foliosAbiertos: number;
    foliosCerradosHoy: number;
    saldoPendienteTotal: number;
    cobradoHoy: number;
    propinasHoy: number;
  } {
    const hoy = seedUtil.hoy().slice(0, 10);
    const todos = db.all<Folio>(KEY_FOLIO);
    return {
      foliosAbiertos: todos.filter((f) => f.estado === 'ABIERTO').length,
      foliosCerradosHoy: todos.filter((f) => f.estado === 'CERRADO' && (f.fechaCierre || '').startsWith(hoy)).length,
      saldoPendienteTotal: todos.filter((f) => f.estado === 'ABIERTO').reduce((s, f) => s + Number(f.saldoPendiente || 0), 0),
      cobradoHoy: todos.filter((f) => (f.fechaCierre || '').startsWith(hoy)).reduce((s, f) => s + Number(f.totalPagado || 0), 0),
      propinasHoy: todos.filter((f) => (f.fechaCierre || '').startsWith(hoy)).reduce((s, f) => s + Number(f.totalPropinas || 0), 0),
    };
  },

  buscarPorId(id: string): Folio | undefined {
    const f = db.getById<Folio>(KEY_FOLIO, id);
    return f ? this._enriquecer(f) : undefined;
  },

  buscarPorHabitacionAbierta(habitacionId: string): Folio | undefined {
    const f = db.findOne<Folio>(
      KEY_FOLIO,
      (x) => x.habitacionId === habitacionId && x.estado === 'ABIERTO'
    );
    return f ? this.buscarPorId(f.id) : undefined;
  },

  buscarPorReserva(reservaId: string): Folio[] {
    return this.listarTodos({ reservaId });
  },

  _enriquecer(f: Folio): Folio {
    if (f && !f.huesped) {
      const h = HuespedService.buscarPorId(f.huespedId);
      if (h) f.huesped = h;
    }
    if (f && !f.habitacion) {
      const hab = HabitacionService.buscarPorId(f.habitacionId);
      if (hab) f.habitacion = hab;
    }
    if (f && !f.reserva && f.reservaId) {
      const r = ReservaService.buscarPorId(f.reservaId);
      if (r) f.reserva = r;
    }
    f.cargos = CargoFolioService.listarPorFolio(f.id);
    f.pagos = PagoFolioService.listarPorFolio(f.id);
    return this._recalcularTotalesEnMemoria(f);
  },

  _recalcularTotalesEnMemoria(f: Folio): Folio {
    const cargos = f.cargos || [];
    const sub = cargos.reduce((s, c) => s + Number(c.subtotal || 0), 0);
    const imp = cargos.reduce((s, c) =>
      s + (c.impuestosMontoDesglosado || []).reduce((s2, x) => s2 + Number(x.montoImpuesto || 0), 0),
      0
    );
    const desc = cargos.reduce((s, c) =>
      s + (c.descuentosMontoDesglosado || []).reduce((s2, x) => s2 + Number(x.montoDescuento || 0), 0),
      0
    );
    const totalProp = cargos.reduce((s, c) => s + Number(c.propinaMonto || 0), 0);
    const total = cargos.reduce((s, c) => s + Number(c.total || c.monto || 0), 0);
    const pagado = (f.pagos || []).reduce((s, p) => s + Number(p.monto || p.total || 0), 0);
    const saldo = Number((total - pagado).toFixed(2));
    return {
      ...f,
      subTotalSinImpuestos: Number(sub.toFixed(2)),
      totalImpuestos: Number(imp.toFixed(2)),
      totalDescuentos: Number(desc.toFixed(2)),
      totalPropinas: Number(totalProp.toFixed(2)),
      totalFolio: Number(total.toFixed(2)),
      totalPagado: Number(pagado.toFixed(2)),
      saldoPendiente: saldo,
      creditoExcedido: Number((f as any).limiteCreditoAutorizado || 0) > 0 && total > Number((f as any).limiteCreditoAutorizado || 0),
    } as Folio & any;
  },

  recalcularTotales(folioId: string, updatedBy = 'system-recalc'): Folio | undefined {
    const f = db.getById<Folio>(KEY_FOLIO, folioId);
    if (!f) return undefined;
    const recalculado = this._recalcularTotalesEnMemoria({
      ...f,
      cargos: CargoFolioService.listarPorFolio(f.id),
      pagos: PagoFolioService.listarPorFolio(f.id),
    });
    const delta: any = {
      subTotalSinImpuestos: recalculado.subTotalSinImpuestos,
      totalImpuestos: recalculado.totalImpuestos,
      totalDescuentos: recalculado.totalDescuentos,
      totalPropinas: recalculado.totalPropinas,
      totalFolio: recalculado.totalFolio,
      totalPagado: recalculado.totalPagado,
      saldoPendiente: recalculado.saldoPendiente,
      creditoExcedido: recalculado.creditoExcedido,
      updatedBy,
      updatedAt: seedUtil.nowISO(),
    };
    const upd = db.update<Folio>(KEY_FOLIO, folioId, delta as unknown as Update<Folio>);
    if (upd) {
      const payloadDelta = { id: folioId, ...delta };
      (async () => {
        try {
          await _remotoConQueue('update', KEY_FOLIO, folioId, payloadDelta, () =>
            dbRemota.updateAsync<Folio>(KEY_FOLIO, folioId, delta as any)
          );
        } catch (_) {}
      })().catch(() => {});
    }
    return upd;
  },

  registrarCheckIn(params: {
    reservaId: string;
    usuarioIdRecepcionista: string;
    llaveCodigo: string;
    cantidadLlaves?: number;
    depositoLlavesMonto?: number;
    observaciones?: string;
    pagoAdelantado?: Partial<PagoFolio>;
  }): {
    reservaActualizada?: Reserva;
    folio?: Folio;
    error?: string;
  } {
    const reserva = ReservaService.buscarPorId(params.reservaId);
    if (!reserva) return { error: 'Reserva no encontrada' };

    if (!['CONFIRMADA', 'PENDIENTE', 'MODIFICADA'].includes(reserva.estado)) {
      return { error: `Estado de reserva inválido para check-in: ${reserva.estado}` };
    }

    const now = seedUtil.nowISO();
    const userId = params.usuarioIdRecepcionista;
    const checkInInfo: NonNullable<Reserva['checkInInfo']> = {
      fechaHoraCheckin: now,
      recepcionistaId: userId,
      llaveEntregadaCodigo: params.llaveCodigo,
      cantidadLlavesEntregadas: params.cantidadLlaves ?? 2,
      depositoLlavesMonto: params.depositoLlavesMonto ?? 0,
      documentoEntregado: true,
      firmaRegistroFisico: true,
      aceptaTerminosYCondiciones: true,
      aceptaPoliticaCancelacion: true,
      autorizaCargosExtras: true,
      observaciones: params.observaciones || '',
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const reservaActualizada = ReservaService.cambiarEstado(params.reservaId, 'CHECKED_IN', {
      usuarioResponsableId: userId,
      comentario: `Check-in realizado ${checkInInfo.fechaHoraCheckin}. Llave: ${checkInInfo.llaveEntregadaCodigo}.`,
      informacionAdicional: {
        fechaCheckinReal: checkInInfo.fechaHoraCheckin,
        checkInInfo,
      },
    });

    if (!reservaActualizada) return { error: 'No se pudo actualizar la reserva' };

    for (const rh of reservaActualizada.habitaciones) {
      HabitacionService.cambiarEstado(rh.habitacionId, 'OCUPADA', userId);
    }

    const montoProyectadoEstadia = reservaActualizada.montoTotalReserva || 0;
    HuespedService.incrementarVisita(
      reservaActualizada.huespedId,
      montoProyectadoEstadia,
      reservaActualizada.totalNoches || 0
    );

    const folios: Folio[] = [];
    for (const rh of reservaActualizada.habitaciones) {
      const numeroFolio = siguienteNumeroFolio();
      const folioData = {
        numeroFolio,
        reservaId: reservaActualizada.id,
        checkInId: `CHECKIN-${reservaActualizada.id}`,
        huespedId: reservaActualizada.huespedId,
        habitacionId: rh.habitacionId,
        fechaApertura: now,
        fechaCheckout: reservaActualizada.fechaCheckout,
        estado: 'ABIERTO',
        esCuentaCompartida: reservaActualizada.habitaciones.length > 1,
        foliosCompartidosIds: reservaActualizada.habitaciones.filter((x) => x.habitacionId !== rh.habitacionId).map(() => '__placeholder__'),
        usuarioIdApertura: userId,
        moneda: reservaActualizada.moneda,
        limiteCreditoAutorizado: 5000,
        notasInternas: `Folio creado en check-in automático. Hab: ${rh.habitacion.codigo}. Autoriza cargos extras: SÍ.`,
        subTotalSinImpuestos: 0,
        totalImpuestos: 0,
        totalPropinas: 0,
        totalDescuentos: 0,
        totalBonificacionesCortesia: 0,
        totalFolio: 0,
        totalPagado: 0,
        saldoPendiente: 0,
        creditoExcedido: false,
        cargos: [],
        pagos: [],
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      };
      const folioSeed = db.add<Folio>(KEY_FOLIO, folioData as unknown as Create<Folio>);
      const folioFinalPayload = { ...folioData, id: folioSeed.id };
      (async () => {
        try {
          await _remotoConQueue('add', KEY_FOLIO, folioSeed.id, folioFinalPayload, () =>
            dbRemota.addAsync<Folio>(KEY_FOLIO, folioFinalPayload as any)
          );
        } catch (_) {}
      })().catch(() => {});

      const montoCargoAlojamiento = Number((rh.totalNoches * (rh.precioBaseAcordadoPorNoche || 0)).toFixed(2));
      const divisor = 1.18;
      const subtotal = Number((montoCargoAlojamiento / divisor).toFixed(2));
      const impuestosIds = ['IMP-IGV-18'];
      const cargo: CargoFolio & any = {
        id: seedUtil.generateUUID(),
        folioId: folioSeed.id,
        tipo: 'ALOJAMIENTO',
        concepto: `Alojamiento ${rh.totalNoches} noches - Hab ${rh.habitacion.codigo}`,
        descripcion: `Tarifa base S/ ${Number(rh.precioBaseAcordadoPorNoche || 0).toFixed(2)} × ${rh.totalNoches} noches. ${rh.observaciones || ''}`,
        origen: 'ALOJAMIENTO_RESERVA',
        referenciaId: rh.id,
        reservaId: reservaActualizada.id,
        habitacionId: rh.habitacionId,
        huespedId: reservaActualizada.huespedId,
        productoInventarioId: null,
        comandaId: null,
        comandaDetalleId: null,
        cajaSesionId: null,
        usuarioId: userId,
        monto: montoCargoAlojamiento,
        total: montoCargoAlojamiento,
        moneda: reservaActualizada.moneda,
        impuestosIds,
        impuestosMontoDesglosado: impuestosIds.flatMap((impId) => {
          const imp = ImpuestoService.buscarPorId(impId);
          if (!imp) return [];
          const montoImp = imp.tipo === 'PORCENTAJE' ? Number(((subtotal * (Number(imp.valor) || 0)) / 100).toFixed(2)) : Number(imp.valor) || 0;
          return [{ impuestoId: impId, impuestoNombre: imp.nombre || impId, montoImpuesto: montoImp }];
        }),
        subtotal,
        descuentosIds: [],
        descuentosMontoDesglosado: [],
        propinaMonto: 0,
        estado: 'PENDIENTE_COBRO',
        fechaCargo: now,
        fechaAplicacion: reservaActualizada.fechaCheckin,
        fechaVencimiento: reservaActualizada.fechaCheckout,
        esAnulado: false,
        motivoAnulacion: '',
        comprobanteAsociadoId: null,
        comentarios: `Cargo automático check-in. Folio #${numeroFolio}. Reserva ${reservaActualizada.codigoReserva}.`,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      };
      const cargoCreado = db.add<CargoFolio>(KEY_CARGO, cargo as Create<CargoFolio>);
      const cargoFinalPayload = { ...cargo, id: cargoCreado.id };
      (async () => {
        try {
          await _remotoConQueue('add', KEY_CARGO, cargoCreado.id, cargoFinalPayload, () =>
            dbRemota.addAsync<CargoFolio>(KEY_CARGO, cargoFinalPayload as any)
          );
        } catch (_) {}
      })().catch(() => {});

      if (params.pagoAdelantado && params.pagoAdelantado.monto && params.pagoAdelantado.monto > 0) {
        const pago: PagoFolio & any = {
          id: seedUtil.generateUUID(),
          folioId: folioSeed.id,
          cajaSesionId: null,
          usuarioId: userId,
          metodoPago: (params.pagoAdelantado.metodoPago || 'TARJETA_CREDITO') as MetodoPago,
          subMetodoPago: params.pagoAdelantado.subMetodoPago || '',
          monto: params.pagoAdelantado.monto,
          total: params.pagoAdelantado.monto,
          moneda: params.pagoAdelantado.moneda || reservaActualizada.moneda,
          tipoCambioMonedaReferencia: params.pagoAdelantado.tipoCambioMonedaReferencia || 1,
          montoMonedaOriginal: params.pagoAdelantado.montoMonedaOriginal || params.pagoAdelantado.monto,
          fechaHoraPago: now,
          referenciaBancaria: params.pagoAdelantado.referenciaBancaria || `PAGO-CHECKIN-${reservaActualizada.codigoReserva}`,
          comprobanteAsociadoId: null,
          comprobanteNumero: '',
          estado: 'COMPLETADO' as EstadoPago,
          esPropina: false,
          esParcial: false,
          esDevolucion: false,
          pagoOriginalId: null,
          comprobanteEnvioCorreo: false,
          comprobanteEnvioWhatsApp: false,
          comprobantePDFUrl: null,
          cajeroNombre: null,
          aprobacionCodigo: params.pagoAdelantado.aprobacionCodigo || '',
          observaciones: `Pago adelantado en check-in. Reserva: ${reservaActualizada.codigoReserva}. Folio: ${numeroFolio}. ${params.pagoAdelantado.observaciones || ''}`,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
        };
        const pagoCreado = db.add<PagoFolio>(KEY_PAGO, pago as Create<PagoFolio>);
        const pagoFinalPayload = { ...pago, id: pagoCreado.id };
        (async () => {
          try {
            await _remotoConQueue('add', KEY_PAGO, pagoCreado.id, pagoFinalPayload, () =>
              dbRemota.addAsync<PagoFolio>(KEY_PAGO, pagoFinalPayload as any)
            );
          } catch (_) {}
        })().catch(() => {});
      }

      this.recalcularTotales(folioSeed.id, userId);
      folios.push(this.buscarPorId(folioSeed.id)!);
    }

    if (folios.length > 1) {
      const ids = folios.map((f) => f.id);
      for (const f of folios) {
        const delta = {
          foliosCompartidosIds: ids.filter((id) => id !== f.id),
          updatedBy: userId,
          updatedAt: seedUtil.nowISO(),
        };
        const upd = db.update<Folio>(KEY_FOLIO, f.id, delta as unknown as Update<Folio>);
        if (upd) {
          const payloadDelta = { id: f.id, ...delta };
          (async () => {
            try {
              await _remotoConQueue('update', KEY_FOLIO, f.id, payloadDelta, () =>
                dbRemota.updateAsync<Folio>(KEY_FOLIO, f.id, delta as any)
              );
            } catch (_) {}
          })().catch(() => {});
        }
      }
    }

    return {
      reservaActualizada: ReservaService.buscarPorId(reservaActualizada.id),
      folio: folios[0],
    };
  },

  registrarCheckOut(params: {
    folioId?: string;
    reservaId?: string;
    usuarioIdRecepcionista: string;
    pagosFinales?: Array<Partial<PagoFolio>>;
    llavesDevueltas?: boolean;
    estadoHabitacionEntrega?: Habitacion['estado'];
    observaciones?: string;
    comprobanteTipo?: 'BOLETA' | 'FACTURA';
    comprobanteEnvioCorreo?: boolean;
    comprobanteEnvioWhatsApp?: boolean;
  }): {
    error?: string;
    foliosCerrados: Folio[];
    reservaActualizada?: Reserva;
  } {
    const folios: Folio[] = [];
    const userId = params.usuarioIdRecepcionista;

    if (params.reservaId) {
      folios.push(...this.listarTodos({ reservaId: params.reservaId, estado: 'ABIERTO' }));
    } else if (params.folioId) {
      const f = this.buscarPorId(params.folioId);
      if (f && f.estado === 'ABIERTO') folios.push(f);
    }
    if (folios.length === 0) {
      return { error: 'No hay folios abiertos para cerrar.', foliosCerrados: [] };
    }

    const cerrados: Folio[] = [];
    let reservaIdFinal: string | undefined;
    const now = seedUtil.nowISO();

    for (const f of folios) {
      if (params.pagosFinales && (f.saldoPendiente ?? 0) > 0.01) {
        for (const pago of params.pagosFinales) {
          if (!pago.monto) continue;
          PagoFolioService.crear({
            folioId: f.id,
            cajaSesionId: null,
            usuarioId: userId,
            metodoPago: (pago.metodoPago || 'EFECTIVO') as MetodoPago,
            subMetodoPago: pago.subMetodoPago || '',
            monto: pago.monto,
            total: pago.monto,
            moneda: pago.moneda || f.moneda,
            tipoCambioMonedaReferencia: pago.tipoCambioMonedaReferencia || 1,
            montoMonedaOriginal: pago.montoMonedaOriginal || pago.monto,
            fechaHoraPago: now,
            referenciaBancaria: pago.referenciaBancaria || `CHECKOUT-${f.numeroFolio}`,
            comprobanteAsociadoId: null,
            comprobanteNumero: '',
            estado: 'COMPLETADO' as EstadoPago,
            esPropina: pago.esPropina || false,
            esParcial: false,
            esDevolucion: false,
            pagoOriginalId: null,
            comprobanteEnvioCorreo: params.comprobanteEnvioCorreo ?? false,
            comprobanteEnvioWhatsApp: params.comprobanteEnvioWhatsApp ?? true,
            comprobantePDFUrl: null,
            cajeroNombre: null,
            aprobacionCodigo: pago.aprobacionCodigo || '',
            observaciones: `Pago checkout. Folio ${f.numeroFolio}. ${pago.observaciones || ''} ${params.observaciones || ''}`,
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            updatedBy: userId,
          } as Create<PagoFolio>);
        }
      }

      this.recalcularTotales(f.id, userId);

      const delta = {
        estado: 'CERRADO',
        fechaCierre: now,
        fechaCheckoutReal: now,
        usuarioIdCierre: userId,
        updatedBy: userId,
        updatedAt: now,
      } as unknown as Update<Folio>;
      const cerrado = db.update<Folio>(KEY_FOLIO, f.id, delta);
      if (cerrado) {
        const payloadDelta = { id: f.id, ...delta };
        (async () => {
          try {
            await _remotoConQueue('update', KEY_FOLIO, f.id, payloadDelta, () =>
              dbRemota.updateAsync<Folio>(KEY_FOLIO, f.id, delta as any)
            );
          } catch (_) {}
        })().catch(() => {});
        cerrados.push(this.buscarPorId(cerrado.id)!);
      } else if (cerrado === undefined && db.getById<Folio>(KEY_FOLIO, f.id)) {
        cerrados.push(this.buscarPorId(f.id)!);
      }

      if (f.habitacionId) {
        HabitacionService.cambiarEstado(
          f.habitacionId,
          params.estadoHabitacionEntrega || 'LIMPIEZA',
          userId
        );
      }

      reservaIdFinal = f.reservaId || reservaIdFinal;
    }

    let reservaActualizada: Reserva | undefined;
    if (reservaIdFinal) {
      const reserva = ReservaService.buscarPorId(reservaIdFinal);
      const foliosCerrados = cerrados;
      const totalCobrado = foliosCerrados.reduce((s, ff) => s + (ff.totalPagado || 0), 0);
      const totalCargos = foliosCerrados.reduce((s, ff) => s + (ff.totalFolio || 0), 0);
      reservaActualizada = ReservaService.cambiarEstado(reservaIdFinal, 'CHECKED_OUT', {
        usuarioResponsableId: userId,
        comentario: `Check-out realizado ${new Date().toLocaleString('es-PE')}. Folios: ${foliosCerrados.map((f) => f.numeroFolio).join(', ')}. Total cobrado: S/ ${totalCobrado.toFixed(2)}.`,
        informacionAdicional: {
          fechaCheckoutReal: now,
          estadoPago:
            Math.abs(totalCargos - totalCobrado) < 0.05
              ? 'PAGADO_TOTAL'
              : totalCobrado > 0
              ? 'PAGO_PARCIAL'
              : 'PAGO_PENDIENTE',
          saldoPendiente: Number((totalCargos - totalCobrado).toFixed(2)),
          montoPagadoAnticipado: totalCobrado,
          checkOutInfo: {
            fechaHoraCheckout: now,
            recepcionistaId: userId,
            llavesDevueltas: params.llavesDevueltas ?? true,
            cantidadLlavesDevueltas: 2,
            estadoHabitacionEntregaFinal: params.estadoHabitacionEntrega || 'SUCIA',
            folioIdCerrado: foliosCerrados[0]?.id || '',
            folio: foliosCerrados[0] || null,
            totalCargosFolio: totalCargos,
            totalImpuestosFolio: foliosCerrados.reduce((s, ff) => s + (ff.totalImpuestos || 0), 0),
            descuentosAplicados: foliosCerrados.reduce((s, ff) => s + (ff.totalDescuentos || 0), 0),
            totalPagadoCheckout: totalCobrado,
            metodoPagoCheckout: (params.pagosFinales?.[0]?.metodoPago || 'EFECTIVO') as any,
            transaccionId: `TXN-CHECKOUT-${reserva?.codigoReserva || ''}`,
            comprobanteEmitidoId: `CPE-${params.comprobanteTipo || 'BOLETA'}-${(reserva?.codigoReserva || '').replace(/\D/g, '')}`,
            comprobanteNumero: `${params.comprobanteTipo === 'FACTURA' ? 'F001' : 'B001'}-${String(Math.floor(Math.random() * 9000 + 1000))}`,
            comprobanteEnviadoCorreo: params.comprobanteEnvioCorreo ?? false,
            observacionesEntrega: params.observaciones || '',
            firmaRecepcionCliente: true,
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            updatedBy: userId,
          } as NonNullable<Reserva['checkOutInfo']>,
        },
      });
    }

    return { foliosCerrados: cerrados, reservaActualizada };
  },

  abrir(params: { numeroFolio?: string; habitacionId?: string; huespedId?: string; reservaId?: string; usuarioIdApertura: string; moneda?: string; notasInternas?: string }): Folio {
    const now = seedUtil.nowISO();
    const userId = params.usuarioIdApertura;
    const data = {
      numeroFolio: params.numeroFolio || siguienteNumeroFolio(),
      reservaId: params.reservaId || null,
      checkInId: null,
      huespedId: params.huespedId || null,
      habitacionId: params.habitacionId || null,
      fechaApertura: now,
      fechaCheckout: null,
      estado: 'ABIERTO' as EstadoFolio,
      esCuentaCompartida: false,
      foliosCompartidosIds: [],
      usuarioIdApertura: userId,
      moneda: params.moneda || 'PEN',
      limiteCreditoAutorizado: 5000,
      notasInternas: params.notasInternas || '',
      subTotalSinImpuestos: 0,
      totalImpuestos: 0,
      totalPropinas: 0,
      totalDescuentos: 0,
      totalBonificacionesCortesia: 0,
      totalFolio: 0,
      totalPagado: 0,
      saldoPendiente: 0,
      creditoExcedido: false,
      cargos: [],
      pagos: [],
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };
    const nuevo = db.add<Folio>(KEY_FOLIO, data as unknown as Create<Folio>);
    const folioFinalPayload = { ...data, id: nuevo.id };
    (async () => {
      try {
        await _remotoConQueue('add', KEY_FOLIO, nuevo.id, folioFinalPayload, () =>
          dbRemota.addAsync<Folio>(KEY_FOLIO, folioFinalPayload as any)
        );
      } catch (_) {}
    })().catch(() => {});
    return nuevo;
  },

  crear(params: Create<Folio>): Folio {
    const now = seedUtil.nowISO();
    const idUnico = (params as any).id || seedUtil.generateUUID();
    const usuarioOrigen = (params as any).createdBy || 'system-folio';
    const payload: any = { id: idUnico, createdAt: (params as any).createdAt || now, updatedAt: (params as any).updatedAt || now, createdBy: usuarioOrigen, updatedBy: (params as any).updatedBy || usuarioOrigen, ...params };
    const nuevo = db.add<Folio>(KEY_FOLIO, payload);
    const payloadFinal = { ...payload, id: nuevo.id };
    (async () => {
      try {
        await _remotoConQueue('add', KEY_FOLIO, nuevo.id, payloadFinal, () =>
          dbRemota.addAsync<Folio>(KEY_FOLIO, payloadFinal as any)
        );
      } catch (_) {}
    })().catch(() => {});
    return nuevo;
  },
  actualizar(id: string, changes: Update<Folio>): Folio | undefined {
    const usuarioOrigen = (changes as any).updatedBy || 'system-folio';
    const delta: any = { updatedAt: seedUtil.nowISO(), ...changes };
    const upd = db.update<Folio>(KEY_FOLIO, id, delta);
    if (upd) {
      const payloadDelta = { id, ...delta };
      (async () => {
        try {
          await _remotoConQueue('update', KEY_FOLIO, id, payloadDelta, () =>
            dbRemota.updateAsync<Folio>(KEY_FOLIO, id, delta as any)
          );
        } catch (_) {}
      })().catch(() => {});
    }
    return upd;
  },
  reiniciarSeed(): void {
    db.reset();
    try { initFromSeed(); } catch { /* ignore */ }
  },
};
