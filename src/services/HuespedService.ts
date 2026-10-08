// @ts-nocheck
import { db, seedUtil, type Create, type Update, type Huesped } from './__db__';
import { db as dbRemota } from './__supabase_db__';
import * as pendingSync from './__pending_sync__';

const KEY = 'huespedes' as const;

let _hidratado = false;
let _hidratando: Promise<boolean> | null = null;

export const HuespedService = {
  async hidratarDesdeSupabase(force = false): Promise<boolean> {
    if (!dbRemota.isOnline()) return false;
    if (_hidratado && !force) return true;
    if (_hidratando) return _hidratando;
    _hidratando = (async () => {
      try {
        const rows = await dbRemota.allAsync<Huesped>(KEY);
        if (rows && rows.length) {
          const [ins, upd] = db.upsertAll<Huesped>(KEY, rows, { matchKey: 'id' });
          (console.debug || console.log)(`[HuespedService] hidratar upsert: +${ins} nuevos / ~${upd} actualizados. [preserva pendientes]`);
        }
        _hidratado = true;
        return true;
      } catch (e) {
        console.warn('[HuespedService] hidratarDesdeSupabase no fatal:', (e as any)?.message || e);
        return false;
      } finally {
        _hidratando = null;
      }
    })();
    return _hidratando;
  },

  listarTodos(): Huesped[] {
    return db.all<Huesped>(KEY).sort((a, b) =>
      (b.fechaUltimaEstadia || '').localeCompare(a.fechaUltimaEstadia || '')
    );
  },

  buscarPorId(id: string): Huesped | undefined {
    return db.getById<Huesped>(KEY, id);
  },

  buscarPorDocumento(tipoDoc: Huesped['tipoDocumento'], numero: string): Huesped | undefined {
    return db.findOne<Huesped>(KEY, (h) => h.tipoDocumento === tipoDoc && h.numeroDocumento === numero);
  },

  buscarPorTexto(query: string): Huesped[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.listarTodos();
    return db.findMany<Huesped>(
      KEY,
      (h) =>
        (h.nombreCompleto || '').toLowerCase().includes(q) ||
        `${h.nombres || ''} ${h.apellidos || ''}`.toLowerCase().includes(q) ||
        (h.numeroDocumento || '').includes(q) ||
        (h.email && h.email.toLowerCase().includes(q)) ||
        (h.telefono1 && h.telefono1.includes(q))
    );
  },

  crear(payload: Create<Huesped>): Huesped {
    const data = payload as unknown as Huesped;
    const nombreCompleto =
      (data.nombreCompleto || '').trim() || `${data.nombres || ''} ${data.apellidos || ''}`.trim();
    const params: any = {
      ...payload,
      id: (payload as any).id || seedUtil ? (seedUtil as any).generateUUID() : (payload as any).id,
      nombreCompleto,
      totalVisitas: (data.totalVisitas ?? 0) + 1,
      fechaPrimeraEstadia: data.fechaPrimeraEstadia || new Date().toISOString(),
      fechaUltimaEstadia: data.fechaUltimaEstadia || new Date().toISOString(),
    };
    if (!params.id) {
      try { params.id = ((globalThis as any).crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`); } catch (_) { params.id = `huesped-${Date.now()}-${Math.floor(Math.random() * 9999)}`; }
    }

    // Remoto primero await (timeout 3.5s) + fallback queue persistente
    if (dbRemota && typeof (dbRemota as any).isOnline === 'function' && (dbRemota as any).isOnline()) {
      (async () => {
        try {
          const remotoPromise = (dbRemota as any).addAsync<Huesped>(KEY, { ...params });
          const timeout = new Promise<any>((_, rj) => setTimeout(() => rj(new Error('TIMEOUT_3500')), 3500));
          const remota = await Promise.race([remotoPromise, timeout]);
          if (remota && remota.id && remota.id !== params.id) {
            try { db.update(KEY, params.id, { ...remota }); } catch (_e) {}
          }
          try { pendingSync.getPendientes(KEY).filter(o => o.matchId === params.id).forEach(o => pendingSync.removerOp(o.id)); } catch (_) {}
        } catch (e: any) {
          pendingSync.enqueue(KEY, 'add', params.id, { ...params });
        }
      })();
    } else {
      pendingSync.enqueue(KEY, 'add', params.id, { ...params });
    }

    const existente = db.getById<Huesped>(KEY, params.id);
    const nueva: Huesped = existente || db.add<Huesped>(KEY, params as unknown as Create<Huesped>);
    return (nueva as any);
  },

  actualizar(id: string, changes: Update<Huesped>): Huesped | undefined {
    const data = changes as unknown as Partial<Huesped>;
    if (data.nombres || data.apellidos) {
      const prev = db.getById<Huesped>(KEY, id);
      const nombres = data.nombres ?? prev?.nombres ?? '';
      const apellidos = data.apellidos ?? prev?.apellidos ?? '';
      (changes as unknown as Huesped).nombreCompleto = (prev?.nombreCompleto) || `${nombres} ${apellidos}`.trim();
    }
    const actualizado = db.update<Huesped>(KEY, id, changes);
    if (actualizado) {
      // Remoto non-blocking + queue persistente si falla
      (async () => {
        try {
          if (!dbRemota || !((dbRemota as any)?.isOnline?.())) {
            pendingSync.enqueue(KEY, 'update', id, changes as any);
            return;
          }
          const prom = (dbRemota as any).updateAsync<Huesped>(KEY, id, changes);
          const to = new Promise<any>((_, rj) => setTimeout(() => rj(new Error('TIMEOUT_UPDATE_3500')), 3500));
          await Promise.race([prom, to]);
          try { pendingSync.getPendientes(KEY).filter(o => o.matchId === id && o.method === 'update').forEach(o => pendingSync.removerOp(o.id)); } catch (_) {}
        } catch (e: any) {
          pendingSync.enqueue(KEY, 'update', id, changes as any);
        }
      })();
    }
    return actualizado;
  },

  incrementarVisita(id: string, montoGasto: number, noches: number): Huesped | undefined {
    const actual = db.getById<Huesped>(KEY, id);
    if (!actual) return undefined;
    const puntosGanados = Math.round(Number(montoGasto || 0) * 0.10);
    const patch: any = {
      updatedBy: 'system-huesped',
      totalVisitas: (actual.totalVisitas ?? 0) + 1,
      totalNochesAcumuladas: (actual.totalNochesAcumuladas ?? 0) + Number(noches || 0),
      montoGastoAcumuladoHistorico: (actual.montoGastoAcumuladoHistorico ?? 0) + Number(montoGasto || 0),
      fechaUltimaEstadia: new Date().toISOString(),
      puntosFidelidadAcumulados: (actual.puntosFidelidadAcumulados ?? 0) + puntosGanados,
      nivelProgramaFidelidad: calcularNivelFidelidad(
        (actual.totalVisitas ?? 0) + 1,
        (actual.montoGastoAcumuladoHistorico ?? 0) + Number(montoGasto || 0)
      ),
    };
    const actualizado = db.update<Huesped>(KEY, id, patch);
    if (actualizado) {
      dbRemota.updateAsync<Huesped>(KEY, id, patch).catch((e) => console.error('[HuespedService] incrementarVisita remoto:', e));
    }
    return actualizado;
  },

  eliminar(id: string): boolean {
    const ok = db.remove(KEY, id);
    if (ok) dbRemota.removeAsync(KEY, id).catch((e) => console.error('[HuespedService] eliminar remoto:', e));
    return ok;
  },

  reiniciarSeed(): void { db.reset(); },
};

function calcularNivelFidelidad(visitas: number, gastoAcumulado: number): Huesped['nivelProgramaFidelidad'] {
  if (visitas >= 12 || gastoAcumulado >= 15000) return 'DIAMANTE';
  if (visitas >= 8 || gastoAcumulado >= 8000) return 'ORO';
  if (visitas >= 4 || gastoAcumulado >= 4000) return 'PLATA';
  if (visitas >= 2 || gastoAcumulado >= 1500) return 'BRONCE';
  return 'NUEVO';
}
