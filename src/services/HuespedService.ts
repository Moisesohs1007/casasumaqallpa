// @ts-nocheck
import { db, seedUtil, type Create, type Update, type Huesped } from './__supabase_db__';

const KEY = 'huespedes' as const;

export const HuespedService = {
  async listarTodos(): Promise<Huesped[]> {
    const rows = await db.allAsync<Huesped>(KEY);
    return rows.sort((a, b) => (b.fechaUltimaEstadia || '').localeCompare(a.fechaUltimaEstadia || ''));
  },

  async buscarPorId(id: string): Promise<Huesped | undefined> {
    return db.getByIdAsync<Huesped>(KEY, id);
  },

  async buscarPorDocumento(tipoDoc: Huesped['tipoDocumento'], numero: string): Promise<Huesped | undefined> {
    return db.findOneAsync<Huesped>(KEY, (h) => h.tipoDocumento === tipoDoc && h.numeroDocumento === numero);
  },

  async buscarPorTexto(query: string): Promise<Huesped[]> {
    const q = query.toLowerCase().trim();
    if (!q) return this.listarTodos();
    return db.findManyAsync<Huesped>(
      KEY,
      (h) =>
        (h.nombreCompleto || '').toLowerCase().includes(q) ||
        `${h.nombres} ${h.apellidos}`.toLowerCase().includes(q) ||
        (h.numeroDocumento || '').includes(q) ||
        (h.email && h.email.toLowerCase().includes(q)) ||
        (h.telefono1 && h.telefono1.includes(q))
    );
  },

  async crear(payload: Create<Huesped>): Promise<Huesped> {
    const data = payload as unknown as Huesped;
    const nombreCompleto =
      data.nombreCompleto?.trim() || `${data.nombres} ${data.apellidos}`.trim();
    return db.addAsync<Huesped>(KEY, {
      ...payload,
      nombreCompleto,
      totalVisitas: (data.totalVisitas ?? 0) + 1,
      fechaPrimeraEstadia: data.fechaPrimeraEstadia || new Date().toISOString(),
      fechaUltimaEstadia: data.fechaUltimaEstadia || new Date().toISOString(),
    } as Create<Huesped>);
  },

  async actualizar(id: string, changes: Update<Huesped>): Promise<Huesped | undefined> {
    const data = changes as unknown as Partial<Huesped>;
    if (data.nombres || data.apellidos) {
      const prev = await db.getByIdAsync<Huesped>(KEY, id);
      const nombres = data.nombres ?? prev?.nombres ?? '';
      const apellidos = data.apellidos ?? prev?.apellidos ?? '';
      (changes as unknown as Huesped).nombreCompleto = prev?.nombreCompleto || `${nombres} ${apellidos}`.trim();
    }
    return db.updateAsync<Huesped>(KEY, id, changes);
  },

  async incrementarVisita(id: string, montoGasto: number, noches: number): Promise<Huesped | undefined> {
    const actual = await db.getByIdAsync<Huesped>(KEY, id);
    if (!actual) return undefined;
    const puntosGanados = Math.round(montoGasto * 0.1);
    return db.updateAsync<Huesped>(KEY, id, {
      updatedBy: 'system-huesped',
      totalVisitas: (actual.totalVisitas ?? 0) + 1,
      totalNochesAcumuladas: (actual.totalNochesAcumuladas ?? 0) + noches,
      montoGastoAcumuladoHistorico: (actual.montoGastoAcumuladoHistorico ?? 0) + montoGasto,
      fechaUltimaEstadia: new Date().toISOString(),
      puntosFidelidadAcumulados: (actual.puntosFidelidadAcumulados ?? 0) + puntosGanados,
      nivelProgramaFidelidad: calcularNivelFidelidad(
        (actual.totalVisitas ?? 0) + 1,
        (actual.montoGastoAcumuladoHistorico ?? 0) + montoGasto
      ),
    } as unknown as Update<Huesped>);
  },

  async eliminar(id: string): Promise<boolean> {
    return db.removeAsync(KEY, id);
  },

  reiniciarSeed(): void {
    db.reset();
  },
};

export default HuespedService;

function calcularNivelFidelidad(visitas: number, gastoAcumulado: number): Huesped['nivelProgramaFidelidad'] {
  if (visitas >= 12 || gastoAcumulado >= 15000) return 'DIAMANTE';
  if (visitas >= 8 || gastoAcumulado >= 8000) return 'ORO';
  if (visitas >= 4 || gastoAcumulado >= 4000) return 'PLATA';
  if (visitas >= 2 || gastoAcumulado >= 1500) return 'BRONCE';
  return 'NUEVO';
}
