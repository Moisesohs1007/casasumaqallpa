// @ts-nocheck
import { db, type Create, type Update, type Huesped } from './__db__';
import { db as dbRemota } from './__supabase_db__';

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
          db.setAll<Huesped>(KEY, rows);
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
      nombreCompleto,
      totalVisitas: (data.totalVisitas ?? 0) + 1,
      fechaPrimeraEstadia: data.fechaPrimeraEstadia || new Date().toISOString(),
      fechaUltimaEstadia: data.fechaUltimaEstadia || new Date().toISOString(),
    };
    const nueva = db.add<Huesped>(KEY, params);
    dbRemota.addAsync<Huesped>(KEY, params).then((remota: any) => {
      if (remota && remota.id && remota.id !== nueva.id) {
        try { db.update(KEY, nueva.id, { ...remota }); } catch (_e) {}
      }
    }).catch((e) => console.error('[HuespedService] crear remoto:', e));
    return nueva;
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
      dbRemota.updateAsync<Huesped>(KEY, id, changes).catch((e) => console.error('[HuespedService] actualizar remoto:', e));
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
