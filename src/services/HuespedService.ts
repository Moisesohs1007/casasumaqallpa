import { db, type Create, type Update, type Huesped } from './__db__';

const KEY = 'huespedes' as const;

export const HuespedService = {
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
        h.nombreCompleto.toLowerCase().includes(q) ||
        `${h.nombres} ${h.apellidos}`.toLowerCase().includes(q) ||
        h.numeroDocumento.includes(q) ||
        (h.email && h.email.toLowerCase().includes(q)) ||
        (h.telefono1 && h.telefono1.includes(q))
    );
  },

  crear(payload: Create<Huesped>): Huesped {
    const data = payload as unknown as Huesped;
    const nombreCompleto =
      data.nombreCompleto?.trim() || `${data.nombres} ${data.apellidos}`.trim();
    return db.add<Huesped>(KEY, {
      ...payload,
      nombreCompleto,
      totalVisitas: (data.totalVisitas ?? 0) + 1,
      fechaPrimeraEstadia: data.fechaPrimeraEstadia || new Date().toISOString(),
      fechaUltimaEstadia: data.fechaUltimaEstadia || new Date().toISOString(),
    } as Create<Huesped>);
  },

  actualizar(id: string, changes: Update<Huesped>): Huesped | undefined {
    const data = changes as unknown as Partial<Huesped>;
    if (data.nombres || data.apellidos) {
      const prev = db.getById<Huesped>(KEY, id);
      const nombres = data.nombres ?? prev?.nombres ?? '';
      const apellidos = data.apellidos ?? prev?.apellidos ?? '';
      (changes as unknown as Huesped).nombreCompleto = prev?.nombreCompleto || `${nombres} ${apellidos}`.trim();
    }
    return db.update<Huesped>(KEY, id, changes);
  },

  incrementarVisita(id: string, montoGasto: number, noches: number): Huesped | undefined {
    const actual = db.getById<Huesped>(KEY, id);
    if (!actual) return undefined;
    const puntosGanados = Math.round(montoGasto * 0.10);
    return db.update<Huesped>(KEY, id, {
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

  eliminar(id: string): boolean {
    return db.remove(KEY, id);
  },

  reiniciarSeed(): void {
    db.reset();
  },
};

function calcularNivelFidelidad(visitas: number, gastoAcumulado: number): Huesped['nivelProgramaFidelidad'] {
  if (visitas >= 12 || gastoAcumulado >= 15000) return 'DIAMANTE';
  if (visitas >= 8 || gastoAcumulado >= 8000) return 'ORO';
  if (visitas >= 4 || gastoAcumulado >= 4000) return 'PLATA';
  if (visitas >= 2 || gastoAcumulado >= 1500) return 'BRONCE';
  return 'NUEVO';
}
