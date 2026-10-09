// @ts-nocheck
import { db, seedUtil, type Create, type Update, type Habitacion, type TipoHabitacion, type EstadoHabitacion } from './__db__';
import SupabaseDB, { db as dbRemota } from './__supabase_db__';
import * as pendingSync from './__pending_sync__';

const KEY_HAB = 'habitaciones' as const;
const KEY_TIPO = 'tiposHabitacion' as const;
const KEY_TAR = 'tarifas' as const;
const KEY_POL = 'politicasCancelacion' as const;

const TIMEOUT_REMOTO_MS = 3500;
const timeoutPromise = (ms: number) => new Promise<never>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT_REMOTO')), ms));

async function _remotoConQueue(method: 'add' | 'update' | 'remove', key: string, matchId: string, payload: any, remotoCallFn: () => Promise<any>): Promise<void> {
  if (!dbRemota || !((dbRemota as any)?.isOnline?.())) {
    pendingSync.enqueue(key, method, matchId, payload);
    return;
  }
  try {
    const res = await Promise.race([remotoCallFn(), timeoutPromise(TIMEOUT_REMOTO_MS)]);
    if (!res && method !== 'remove') throw new Error('respuesta remota vacía');
  } catch (e) {
    console.warn('[Hab._remotoConQueue] remoto falló → enqueue. Key=', key, 'm=', method, 'id=', matchId, 'err=', (e as Error)?.message || e);
    pendingSync.enqueue(key, method, matchId, payload);
  }
}

let _hidratacionDone = false;
let _hidratandoPromise: Promise<boolean> | null = null;

const log = (msg: string, ...rest: any[]) => {
  try { console.debug(`[HabitacionService] ${msg}`, ...rest); } catch (_) {}
};

export const HabitacionService = {
  // ============= INICIALIZACIÓN: CARGAR DATOS DE SUPABASE REMOTO A INMEMORYDB (solo 1 vez) =============
  async hidratarDesdeSupabase(force = false): Promise<boolean> {
    if (_hidratacionDone && !force) return true;
    if (_hidratandoPromise && !force) return _hidratandoPromise;

    const run = async (): Promise<boolean> => {
      try {
        log('Hidratando desde Supabase Cloud...');
        const [tiposRem, tarifasRem, polsRem, habsRem] = await Promise.all([
          dbRemota.allAsync<TipoHabitacion>(KEY_TIPO),
          dbRemota.allAsync<any>(KEY_TAR),
          dbRemota.allAsync<any>(KEY_POL),
          dbRemota.allAsync<Habitacion>(KEY_HAB),
        ]);

        let ok = false;
        if (tiposRem && tiposRem.length > 0) {
          const [ins, upd] = db.upsertAll(KEY_TIPO, tiposRem);
          ok = true; log(`→ tiposHabitacion upsert OK: +${ins} nuevos / ~${upd} actualizados`);
        }
        if (tarifasRem && tarifasRem.length > 0) {
          const [ins, upd] = db.upsertAll(KEY_TAR, tarifasRem);
          ok = true; log(`→ tarifas upsert OK: +${ins} nuevas / ~${upd} actualizadas`);
        }
        if (polsRem && polsRem.length > 0) {
          const [ins, upd] = db.upsertAll(KEY_POL, polsRem);
          ok = true; log(`→ politicasCancelacion upsert OK: +${ins} nuevas / ~${upd} actualizadas`);
        }
        if (habsRem && habsRem.length > 0) {
          const [ins, upd] = db.upsertAll(KEY_HAB, habsRem);
          ok = true; log(`→ habitaciones upsert OK: +${ins} nuevas / ~${upd} actualizadas. [NO BORRA locales pendientes sync]`);
        }

        _hidratacionDone = ok;
        if (ok) log('✅ Hidratación OK. Ahora InMemoryDB sincronizado con Supabase Cloud.');
        else    log('⚠️  Ninguna tabla remota con datos. Se mantiene seed local InMemoryDB.');
        return ok;
      } catch (e) {
        console.error('[HabitacionService] Error hidratando desde Supabase:', (e as any)?.message || e);
        _hidratacionDone = false;
        return false;
      } finally {
        _hidratandoPromise = null;
      }
    };
    _hidratandoPromise = run();
    return _hidratandoPromise;
  },

  // ===== TIPOS DE HABITACIÓN =====
  listarTipos(): TipoHabitacion[] {
    return db.all<TipoHabitacion>(KEY_TIPO).sort((a, b) => (a.precioBaseNoche || 0) - (b.precioBaseNoche || 0));
  },

  buscarTipoPorId(id: string): TipoHabitacion | undefined {
    return db.getById<TipoHabitacion>(KEY_TIPO, id);
  },

  crearTipo(payload: Create<TipoHabitacion>): TipoHabitacion {
    const tipo = db.add<TipoHabitacion>(KEY_TIPO, payload);
    const payloadFinal = { ...tipo };
    (async () => { try { await _remotoConQueue('add', KEY_TIPO, tipo.id, payloadFinal, () => dbRemota.addAsync<TipoHabitacion>(KEY_TIPO, tipo as any)); } catch (_) {} })().catch(()=>{});
    return tipo;
  },

  actualizarTipo(id: string, changes: Update<TipoHabitacion>): TipoHabitacion | undefined {
    const local = db.update<TipoHabitacion>(KEY_TIPO, id, changes);
    if (local) {
      const payloadDelta = { id, ...changes };
      (async () => { try { await _remotoConQueue('update', KEY_TIPO, id, payloadDelta, () => dbRemota.updateAsync<TipoHabitacion>(KEY_TIPO, id, changes as any)); } catch (_) {} })().catch(()=>{});
    }
    return local;
  },

  // ===== HABITACIONES =====
  listarTodas(params?: {
    estado?: EstadoHabitacion;
    estadoLimpieza?: Habitacion['estadoLimpieza'];
    tipoHabitacionId?: string;
    vistaEfectiva?: Habitacion['vistaEfectiva'];
    disponiblesParaFechas?: { checkinISO: string; checkoutISO: string };
    capacidadMinimaPax?: number;
  }): Habitacion[] {
    let lista = db.all<Habitacion>(KEY_HAB).sort((a, b) =>
      a.codigo.localeCompare(b.codigo, undefined, { numeric: true })
    );

    if (params?.estado) lista = lista.filter((h) => h.estado === params.estado);
    if (params?.estadoLimpieza) lista = lista.filter((h) => h.estadoLimpieza === params.estadoLimpieza);
    if (params?.tipoHabitacionId) lista = lista.filter((h) => h.tipoHabitacionId === params.tipoHabitacionId);
    if (params?.vistaEfectiva) lista = lista.filter((h) => h.vistaEfectiva === params.vistaEfectiva);

    if (params?.capacidadMinimaPax) {
      lista = lista.filter((h) => {
        const tipo = h.tipoHabitacion || HabitacionService.buscarTipoPorId(h.tipoHabitacionId);
        const cap = (tipo?.capacidadAdultos || 0) + (tipo?.capacidadNinos || 0);
        return cap >= params!.capacidadMinimaPax!;
      });
    }

    if (params?.disponiblesParaFechas) {
      const { checkinISO, checkoutISO } = params.disponiblesParaFechas;
      const reservas = db.all<import('./__db__').Reserva>('reservas');
      const idsOcupadas = new Set<string>();
      for (const r of reservas) {
        if (r.estado === 'CANCELADA') continue;
        if (r.estado === 'CHECKED_OUT') continue;
        if (!Array.isArray(r.habitaciones)) continue;
        const superposicion =
          seedUtil.addDaysISO(checkinISO, 0) < r.fechaCheckout &&
          checkoutISO > seedUtil.addDaysISO(r.fechaCheckin, 0);
        if (!superposicion) continue;
        for (const rh of r.habitaciones) idsOcupadas.add(rh.habitacionId);
      }
      lista = lista.filter((h) => !idsOcupadas.has(h.id) && h.estado !== 'BLOQUEADA' && h.estado !== 'MANTENIMIENTO');
    }

    return lista;
  },

  resumenDisponibilidadHoy(): {
    total: number; libres: number; ocupadas: number; mantenimiento: number; limpieza: number; bloqueadas: number; inspeccionadas: number; reservadas: number;
  } {
    const todas = db.all<Habitacion>(KEY_HAB);
    const count = (estado: EstadoHabitacion) => todas.filter((h) => (h.estado === estado || (estado === 'LIBRE' && h.estado === 'DISPONIBLE'))).length;
    return {
      total: todas.length,
      libres: count('LIBRE'),
      ocupadas: count('OCUPADA'),
      reservadas: count('RESERVADA'),
      limpieza: count('LIMPIEZA'),
      inspeccionadas: count('INSPECCIONADA'),
      mantenimiento: count('MANTENIMIENTO'),
      bloqueadas: count('BLOQUEADA'),
    };
  },

  buscarPorId(id: string): Habitacion | undefined {
    const hab = db.getById<Habitacion>(KEY_HAB, id);
    if (hab && !hab.tipoHabitacion) {
      hab.tipoHabitacion = this.buscarTipoPorId(hab.tipoHabitacionId);
    }
    return hab;
  },

  buscarPorCodigo(codigo: string): Habitacion | undefined {
    return db.findOne<Habitacion>(KEY_HAB, (h) => h.codigo === codigo);
  },

  crear(payload: Create<Habitacion>): Habitacion {
    const hab = db.add<Habitacion>(KEY_HAB, payload);
    if (!hab.tipoHabitacion && hab.tipoHabitacionId) hab.tipoHabitacion = this.buscarTipoPorId(hab.tipoHabitacionId);
    const payloadFinal = { ...hab };
    (async () => { try { await _remotoConQueue('add', KEY_HAB, hab.id, payloadFinal, () => dbRemota.addAsync<Habitacion>(KEY_HAB, hab as any)); } catch (_) {} })().catch(()=>{});
    return hab;
  },

  actualizar(id: string, changes: Update<Habitacion>): Habitacion | undefined {
    const local = db.update<Habitacion>(KEY_HAB, id, changes);
    if (local) {
      const payloadDelta = { id, ...changes };
      (async () => { try { await _remotoConQueue('update', KEY_HAB, id, payloadDelta, () => dbRemota.updateAsync<Habitacion>(KEY_HAB, id, changes as any)); } catch (_) {} })().catch(()=>{});
    }
    return local;
  },

  cambiarEstado(id: string, estado: EstadoHabitacion, actualizadoPor = 'system-habitaciones'): Habitacion | undefined {
    const actual = db.getById<Habitacion>(KEY_HAB, id);
    if (!actual) return undefined;
    const cambios: Partial<Habitacion> = { estado, updatedAt: seedUtil.nowISO(), updatedBy: actualizadoPor } as any;
    if (estado === 'LIBRE' || estado === 'DISPONIBLE') cambios.estadoLimpieza = 'INSPECCIONADA' as any;
    if (estado === 'LIMPIEZA') cambios.estadoLimpieza = 'EN_PROGRESO' as any;
    if (estado === 'MANTENIMIENTO') cambios.estadoLimpieza = 'PENDIENTE' as any;
    const local = db.update<Habitacion>(KEY_HAB, id, cambios as unknown as Update<Habitacion>);
    if (local) {
      // Remoto non-blocking + queue persistente si falla
      (async () => {
        try {
          if (!dbRemota || !((dbRemota as any)?.isOnline?.())) {
            pendingSync.enqueue(KEY_HAB, 'update', id, cambios as any);
            return;
          }
          const prom = (dbRemota as any).updateAsync<Habitacion>(KEY_HAB, id, cambios as any);
          const to = new Promise<any>((_, rj) => setTimeout(() => rj(new Error('TIMEOUT_HAB_UPDATE_3500')), 3500));
          await Promise.race([prom, to]);
          try { pendingSync.getPendientes(KEY_HAB).filter(o => o.matchId === id && o.method === 'update').forEach(o => pendingSync.removerOp(o.id)); } catch (_) {}
        } catch (e: any) {
          pendingSync.enqueue(KEY_HAB, 'update', id, cambios as any);
        }
      })();
    }
    return local;
  },

  marcarLimpia(id: string, actualizadoPor = 'system-hk'): Habitacion | undefined {
    const actual = db.getById<Habitacion>(KEY_HAB, id);
    if (!actual) return undefined;
    const patch: any = {
      estadoLimpieza: 'LIMPIA',
      ultimaLimpiezaAt: seedUtil.nowISO(),
      updatedBy: actualizadoPor,
    };
    if (actual.estado === 'LIMPIEZA') patch.estado = 'LIBRE';
    const local = db.update<Habitacion>(KEY_HAB, id, patch);
    if (local) {
      (async () => {
        try {
          if (!dbRemota || !((dbRemota as any)?.isOnline?.())) {
            pendingSync.enqueue(KEY_HAB, 'update', id, patch);
            return;
          }
          const prom = (dbRemota as any).updateAsync<Habitacion>(KEY_HAB, id, patch);
          const to = new Promise<any>((_, rj) => setTimeout(() => rj(new Error('TIMEOUT_HAB_LIMPIA_3500')), 3500));
          await Promise.race([prom, to]);
          try { pendingSync.getPendientes(KEY_HAB).filter(o => o.matchId === id && o.method === 'update').forEach(o => pendingSync.removerOp(o.id)); } catch (_) {}
        } catch (e: any) {
          pendingSync.enqueue(KEY_HAB, 'update', id, patch);
        }
      })();
    }
    return local;
  },

  eliminar(id: string): boolean {
    const ok = db.remove(KEY_HAB, id);
    if (ok) {
      (async () => { try { await _remotoConQueue('remove', KEY_HAB, id, { id }, () => dbRemota.removeAsync(KEY_HAB, id)); } catch (_) {} })().catch(()=>{});
    }
    return ok;
  },

  reiniciarSeed(): void {
    db.reset();
    _hidratacionDone = false;
    _hidratandoPromise = null;
  },
};
