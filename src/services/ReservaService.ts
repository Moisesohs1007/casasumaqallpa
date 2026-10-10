// @ts-nocheck
import { db, seedUtil, type Create, type Update, type Reserva, type EstadoReserva, type OrigenReserva, type Habitacion } from './__db__';
import { HabitacionService } from './HabitacionService';
import { TarifaService, PoliticaCancelacionService } from './TarifaService';
import { HuespedService } from './HuespedService';
import { db as dbRemota } from './__supabase_db__';
import * as pendingSync from './__pending_sync__';

const KEY = 'reservas';

let _hidratacionDone = false;
let _hidratandoPromise: Promise<boolean> | null = null;

const log = (m: string, ...rest: any[]) => { try { console.debug(`[ReservaService] ${m}`, ...rest); } catch (_) {} };

/**
 * ✅ Helper GLOBAL anti-falso-positivo overlapping históricas.
 * USADO POR 2 MÓDULOS:
 *   1) ReservaService.listarPorHabitacionYFechas (RC3 2 niveles overlap validación)
 *   2) HabitacionService.listarTodas disponiblesParaFechas (valida al elegir habitación Paso 2)
 *
 * REGLAS DURAS: Si devuelve TRUE → esta reserva SÍ BLOQUEA nueva reserva en las fechas.
 *   - ESTADOS NUNCA BLOQUEAN (histórico): CANCELADA · CHECKED_OUT · NO_SHOW
 *   - NORMALIZACIÓN estado: uppercase + quitar espacios/guionesBajos/guiones → atrapa variantes "Check-out" / "checked_out" / "Checked Out" / etc
 *   - REGLA HISTÓRICA INQUEBRANTABLE: Si fechaCheckout (t11:00 AM) de esta reserva < HOY (inicio día 00:00) → YA PASÓ → NUNCA BLOQUEA aunque el estado esté roto/corrupto por pruebas antiguas.
 */
export const reservaBloqueaHabitacionEnFechas = (
  r: Pick<Reserva, 'estado'|'fechaCheckin'|'fechaCheckout'|'id'> & any,
  checkinISO: string,
  checkoutISO: string,
  habitacionId?: string,
  excluirReservaId?: string,
): boolean => {
  if (!r) return false;
  if (excluirReservaId && String(r.id) === String(excluirReservaId)) return false;
  if (habitacionId && !(r.habitaciones || []).some((rh: any) => String(rh.habitacionId) === String(habitacionId))) return false;
  // Normaliza estado (tolerante a variantes / typo / mayus-minus)
  const est = String(r.estado || 'PENDIENTE')
    .toUpperCase()
    .replace(/[\s_-]+/g, '');
  const bloqueados = new Set(['CHECKEDOUT','CANCELADA','CANCELADO','NOSHOW']);
  if (bloqueados.has(est)) return false;
  // REGLA DURA: checkout < hoy = histórica = nunca bloquea
  const fec = seedUtil.nowISO ? seedUtil.nowISO() : new Date().toISOString();
  const arrHoy = fec.slice(0,10).split('-').map(Number);
  const hoy00 = new Date(arrHoy[0], (arrHoy[1]||1)-1, arrHoy[2]||1).toISOString();
  if (String(r.fechaCheckout || '').slice(0,10) < hoy00.slice(0,10)) return false;
  // Overlap clásico estricto: checkinNuevo < checkoutViejo AND checkoutNuevo > checkinViejo
  const ciR = seedUtil.addDaysISO ? seedUtil.addDaysISO(String(r.fechaCheckin || ''), 0) : String(r.fechaCheckin || '');
  const coR = String(r.fechaCheckout || '');
  const ciN = seedUtil.addDaysISO ? seedUtil.addDaysISO(String(checkinISO || ''), 0) : String(checkinISO || '');
  const coN = String(checkoutISO || '');
  if (!ciR || !coR || !ciN || !coN) return false;
  return (ciN < coR) && (coN > ciR);
};


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
        let netas = reservasRemotas?.length || 0;
        let ins = 0, upd = 0;
        if (reservasRemotas && reservasRemotas.length > 0) {
          // FIX CRÍTICO: usar db.upsertAll (merge-only) EN VEZ DE db.setAll().
          // ANTES: setAll() = borraba TODO el InMemoryDB → perdía reservas locales creadas hace <2s (fire-and-forget aún no POSTeaba remoto)
          // AHORA: upsertAll = actualiza/inserta remotas, PRESERVA 100% las locales pendientes de sync que aún no existen en la nube.
          [ins, upd] = db.upsertAll<Reserva>(KEY, reservasRemotas, { matchKey: 'id' });
          const removidos = db.deduplicateBy<Reserva>(KEY, (r: any) => String(r.codigoReserva || r.id || '').trim(), 'FIRST');
          if (removidos > 0) log(`⚠️  Hidratación: removidos ${removidos} duplicados de reservas por codigoReserva.`);
          netas = reservasRemotas.length - removidos;
          _hidratacionDone = true;
          log(`✅ reservas sync Supabase OK: +${ins} nuevas / ~${upd} actualizadas / 0 perdidas locales`);
          try { const ap = pendingSync.applyPendingLocal?.(); if (ap) log(`↩️  applyPendingLocal aplicó ${ap} cambios reservas/huespedes/habs/folios luego hidratación.`); } catch (_) {}
          return true;
        } else {
          log('ℹ️  0 reservas en Supabase Cloud. InMemoryDB se MANTIENE con datos locales/pendientes.');
          const removidos = db.deduplicateBy<Reserva>(KEY, (r: any) => String(r.codigoReserva || r.id || '').trim(), 'FIRST');
          if (removidos > 0) log(`🧹 Limpieza: removidos ${removidos} duplicados residuales de reservas en RAM local.`);
          _hidratacionDone = true;
          try { pendingSync.applyPendingLocal?.(); } catch (_) {}
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
    // Limpieza segura: dedupe por codigoReserva antes de listar (protección final)
    try {
      const removidos = db.deduplicateBy<Reserva>(KEY, (r: any) => String(r.codigoReserva || r.id || '').trim(), 'FIRST');
      if (removidos > 0) log(`🧹 listarTodas: removidos ${removidos} duplicados de reserva antes de renderizar.`);
    } catch (_) {}
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
    return this.listarTodas().filter((r) =>
      reservaBloqueaHabitacionEnFechas(r, checkinISO, checkoutISO, habitacionId, excluirReservaId)
    );
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

  /**
   * Paso 2 del flujo: crear la reserva.
   * ESTRATEGIA NUEVA (garantía 0 pérdida):
   *  1) Primero insert REMOTO SI HAY INTERNET (await). Si éxito → SYNCED ✅.
   *  2) Si OFFLINE o REMOTO FALLA → insert LOCAL IGUAL + ENCOLAR en pendingSync localStorage.
   *     → Worker reintentará cada 30s o cuando window dispare 'online'.
   *  3) Hidratación usa upsertAll merge (no borra locales pendientes) → NUNCA PIERDES DATOS.
   * Genera UN SOLO id/codigo ANTES. Idempotencia por codigoReserva y id.
   */
  async crear(payload: Create<Reserva> & { usuarioResponsableId: string }): Promise<Reserva & { _syncStatus?: 'SYNCED' | 'PENDING' | 'ERROR'; _syncErrorMsg?: string | null }> {
    const ahora = seedUtil.nowISO();
    const idUnico = seedUtil.generateUUID();
    const codigo = (() => {
      const t = Date.now().toString().slice(-7);
      const r = Math.floor(Math.random() * 90 + 10);
      return `R-${t}${r}`;
    })();

    // ===== IDEMPOTENCIA =====
    const existentePorCodigo = db.findOne<Reserva>(KEY, (x: any) => String(x.codigoReserva || '').trim() === codigo.trim());
    if (existentePorCodigo) {
      log(`⚠️  Idempotencia: Reserva ${codigo} ya existía, reutilizando para evitar duplicado.`);
      return { ...this.buscarPorId(existentePorCodigo.id)!, _syncStatus: (existentePorCodigo as any)._syncStatus || 'SYNCED' };
    }

    // ===== RC3 ANTI-DOBLE-RESERVA (Overlap Validation INQUEBRANTABLE) =====
    const habitacionesAsignadas = Array.isArray((payload as any).habitaciones) ? ((payload as any).habitaciones as Array<{ habitacionId: string }>) : [];
    for (const rh of habitacionesAsignadas) {
      if (!rh?.habitacionId) continue;
      const conflictos = this.listarPorHabitacionYFechas({
        habitacionId: rh.habitacionId,
        checkinISO: (payload as any).fechaCheckin,
        checkoutISO: (payload as any).fechaCheckout,
      });
      if (conflictos.length > 0) {
        const hab = HabitacionService.buscarPorId(rh.habitacionId);
        const codHab = hab?.codigo || hab?.nombre || rh.habitacionId;
        const conflictStr = conflictos.map(c => `${c.codigoReserva || 'R-???'}(${String(c.estado || '').slice(0,3)})`).join(', ');
        const errMsg = `⛔ CONFLICTO: La Suite ${codHab} YA ESTÁ RESERVADA en esas fechas por otra terminal (${conflictStr}). La reserva NO SE CREÓ. Elige otra habitación o cambia las fechas.`;
        console.error('[ReservaService.crear] Overlap detectado (RC3):', errMsg);
        throw new Error(errMsg);
      }
    }

    const historial = [agregarHistorial(idUnico, 'CREACION', null, payload, payload.usuarioResponsableId, 'Reserva creada en sistema')];

    const payloadFinal: any = {
      ...payload,
      id: idUnico,
      codigoReserva: codigo,
      historialCambios: historial,
      fechaCreacion: payload.fechaCreacion || ahora,
      fechaModificacion: ahora,
      createdBy: payload.usuarioResponsableId,
      updatedBy: payload.usuarioResponsableId,
    };

    let syncStatus: 'SYNCED' | 'PENDING' | 'ERROR' = 'PENDING';
    let syncErrorMsg: string | null = null;

    // ===== REMOTO PRIMERO (await bloqueante, pero no muy: máximo 4s y luego offline fallback) =====
    if (dbRemota && typeof (dbRemota as any).isOnline === 'function' && (dbRemota as any).isOnline()) {
      try {
        const remotoPromise = (dbRemota as any).addAsync<Reserva>(KEY, payloadFinal);
        const timeoutPromise = new Promise<null>((_, rj) => setTimeout(() => rj(new Error('TIMEOUT_SUPABASE_4000ms')), 4000));
        const remota: any = await Promise.race([remotoPromise, timeoutPromise]);
        if (remota && remota.id) {
          syncStatus = 'SYNCED';
          log(`✅ Reserva ${codigo} SINCRONIZADA con Supabase (id=${remota.id}).`);
          // Limpiar por si quedo enqueueada por fallo transitorio anterior
          try { pendingSync.getPendientes(KEY).filter(o => o.matchId === idUnico).forEach(o => pendingSync.removerOp(o.id)); } catch (_) {}
        } else {
          syncStatus = 'PENDING';
          syncErrorMsg = 'Remoto retornó undefined/null';
        }
      } catch (e: any) {
        syncStatus = 'PENDING';
        syncErrorMsg = (e?.message || String(e)).slice(0, 200);
        console.warn('[ReservaService.crear] REMOTO FALLÓ (quedará en pendingSync queue):', syncErrorMsg);
      }
    } else {
      syncStatus = 'PENDING';
      syncErrorMsg = 'OFFLINE: no hay conexión Supabase en este momento';
      log('ℹ️  Modo OFFLINE: Reserva se guarda local + queue para reintentar.');
    }

    // ===== PENDING → encolar para reintentos persistentes =====
    if (syncStatus !== 'SYNCED') {
      try { pendingSync.enqueue(KEY, 'add', idUnico, payloadFinal); } catch (e: any) { console.warn('[ReservaService] pendingSync enqueue fail:', e?.message || e); }
    }

    // ===== INSERT LOCAL (Siempre, UI inmediata, MISMO id/codigo) =====
    const yaExiste = db.getById<any>(KEY, idUnico);
    let nueva: any;
    if (yaExiste) {
      nueva = yaExiste;
      log(`⚠️  Reserva id ${idUnico} ya estaba insertada (doble render React StrictMode); reutilizando.`);
    } else {
      const asAny = db as any;
      if (typeof asAny.addRawIfMissingById === 'function') {
        const conSync = { ...payloadFinal, _syncStatus: syncStatus, _syncErrorMsg: syncErrorMsg };
        nueva = asAny.addRawIfMissingById<Reserva>(KEY, idUnico, conSync) || db.add<Reserva>(KEY, conSync as unknown as Create<Reserva>);
      } else {
        nueva = db.add<Reserva>(KEY, payloadFinal as unknown as Create<Reserva>);
      }
    }

    // ===== Actualizar habitaciones a RESERVADA dual =====
    for (const rh of ((nueva?.habitaciones as any[]) || [])) {
      const hab = HabitacionService.buscarPorId(rh.habitacionId);
      if (hab && (hab.estado === 'LIBRE' || hab.estado === 'DISPONIBLE')) {
        try { HabitacionService.cambiarEstado(rh.habitacionId, 'RESERVADA', payload.usuarioResponsableId); } catch (_) {}
      }
    }

    try {
      if (HuespedService.buscarPorId(nueva?.huespedId)) {
        HuespedService.actualizar(nueva.huespedId, {
          updatedBy: payload.usuarioResponsableId,
          fechaUltimaEstadia: nueva?.fechaCheckin,
        } as any);
      }
    } catch (_) {}

    return { ...this.buscarPorId(nueva.id)!, _syncStatus: syncStatus, _syncErrorMsg: syncErrorMsg };
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

    // === FIX CHECKOUT BUG: Liberar/Cambiar estado habitaciones en CHECKED_OUT (igual que en cancelar) ===
    if (nuevoEstado === 'CHECKED_OUT') {
      const reservaRef = this.buscarPorId(actual!.id);
      if (reservaRef) {
        for (const rh of reservaRef.habitaciones || []) {
          const habId = rh.habitacionId || (rh.habitacion as any)?.id;
          if (habId) {
            try {
              const hab = HabitacionService.buscarPorId(habId);
              if (hab) {
                // Solo cambiar si sigue en OCUPADA/CHECKED_IN/RESERVADA
                if (['OCUPADA','CHECKED_IN','RESERVADA'].includes(String(hab.estado || ''))) {
                  HabitacionService.cambiarEstado(habId, 'LIMPIEZA', params.usuarioResponsableId);
                }
              }
            } catch (_) {}
          }
        }
      }
    }

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
