// @ts-nocheck
import { db, seedUtil, type Create, type Update, type Habitacion, type TipoHabitacion, type EstadoHabitacion } from './__supabase_db__';

const KEY_HAB = 'habitaciones' as const;
const KEY_TIPO = 'tiposHabitacion' as const;

export const HabitacionService = {
  // ===== TIPOS DE HABITACIÓN =====
  async listarTipos(): Promise<TipoHabitacion[]> {
    const rows = await db.allAsync<TipoHabitacion>(KEY_TIPO);
    return rows.sort((a, b) => (a.precioBaseNoche || 0) - (b.precioBaseNoche || 0));
  },

  async buscarTipoPorId(id: string): Promise<TipoHabitacion | undefined> {
    return db.getByIdAsync<TipoHabitacion>(KEY_TIPO, id);
  },

  async crearTipo(payload: Create<TipoHabitacion>): Promise<TipoHabitacion> {
    return db.addAsync<TipoHabitacion>(KEY_TIPO, payload);
  },

  async actualizarTipo(id: string, changes: Update<TipoHabitacion>): Promise<TipoHabitacion | undefined> {
    return db.updateAsync<TipoHabitacion>(KEY_TIPO, id, changes);
  },

  // ===== HABITACIONES =====
  async listarTodas(params?: {
    estado?: EstadoHabitacion;
    estadoLimpieza?: Habitacion['estadoLimpieza'];
    tipoHabitacionId?: string;
    vistaEfectiva?: Habitacion['vistaEfectiva'];
    disponiblesParaFechas?: { checkinISO: string; checkoutISO: string };
    capacidadMinimaPax?: number;
  }): Promise<Habitacion[]> {
    let lista = (await db.allAsync<Habitacion>(KEY_HAB)).sort((a, b) =>
      (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true })
    );

    if (params?.estado) lista = lista.filter((h) => h.estado === params.estado);
    if (params?.estadoLimpieza) lista = lista.filter((h) => h.estadoLimpieza === params.estadoLimpieza);
    if (params?.tipoHabitacionId) lista = lista.filter((h) => h.tipoHabitacionId === params.tipoHabitacionId);
    if (params?.vistaEfectiva) lista = lista.filter((h) => h.vistaEfectiva === params.vistaEfectiva);

    if (params?.capacidadMinimaPax) {
      const tipos = await this.listarTipos();
      const tipoMap = new Map(tipos.map((t) => [t.id, t]));
      lista = lista.filter((h) => {
        const tipo = h.tipoHabitacion || tipoMap.get(h.tipoHabitacionId);
        const cap = ((tipo?.capacidadAdultos || 0) as number) + ((tipo?.capacidadNinos || 0) as number);
        return cap >= params!.capacidadMinimaPax!;
      });
    }

    if (params?.disponiblesParaFechas) {
      const { checkinISO, checkoutISO } = params.disponiblesParaFechas;
      const reservas = await db.allAsync<import('./__supabase_db__').Reserva>('reservas');
      const idsOcupadas = new Set<string>();
      for (const r of reservas) {
        if (r.estado === 'CANCELADA') continue;
        if (r.estado === 'CHECKOUT') continue;
        if (!Array.isArray((r as any).habitaciones)) continue;
        const superposicion =
          seedUtil.addDaysISO(checkinISO, 0) < (r.fechaCheckout as any) &&
          checkoutISO > seedUtil.addDaysISO(String(r.fechaCheckin), 0);
        if (!superposicion) continue;
        for (const rh of (r as any).habitaciones) idsOcupadas.add(rh.habitacionId);
      }
      lista = lista.filter(
        (h) => !idsOcupadas.has(h.id) && h.estado !== 'BLOQUEADA' && h.estado !== 'MANTENIMIENTO'
      );
    }

    const tipos = await this.listarTipos();
    const tipoMap = new Map(tipos.map((t) => [t.id, t]));
    return lista.map((h) => (!h.tipoHabitacion ? { ...h, tipoHabitacion: tipoMap.get(h.tipoHabitacionId) } : h));
  },

  async resumenDisponibilidadHoy(): Promise<{
    total: number; libres: number; ocupadas: number; mantenimiento: number; limpieza: number; bloqueadas: number; inspeccionadas: number; reservadas: number;
  }> {
    const todas = await db.allAsync<Habitacion>(KEY_HAB);
    const count = (estado: EstadoHabitacion) => todas.filter((h) => h.estado === estado).length;
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

  async buscarPorId(id: string): Promise<Habitacion | undefined> {
    const hab = await db.getByIdAsync<Habitacion>(KEY_HAB, id);
    if (hab && !hab.tipoHabitacion) {
      hab.tipoHabitacion = await this.buscarTipoPorId(hab.tipoHabitacionId);
    }
    return hab;
  },

  async buscarPorCodigo(codigo: string): Promise<Habitacion | undefined> {
    return db.findOneAsync<Habitacion>(KEY_HAB, (h) => h.codigo === codigo);
  },

  async crear(payload: Create<Habitacion>): Promise<Habitacion> {
    const hab = await db.addAsync<Habitacion>(KEY_HAB, payload);
    if (!hab.tipoHabitacion && hab.tipoHabitacionId) {
      hab.tipoHabitacion = await this.buscarTipoPorId(hab.tipoHabitacionId);
    }
    return hab;
  },

  async actualizar(id: string, changes: Update<Habitacion>): Promise<Habitacion | undefined> {
    return db.updateAsync<Habitacion>(KEY_HAB, id, changes);
  },

  async cambiarEstado(
    id: string,
    estado: EstadoHabitacion,
    actualizadoPor = 'system-habitaciones'
  ): Promise<Habitacion | undefined> {
    const actual = await db.getByIdAsync<Habitacion>(KEY_HAB, id);
    if (!actual) return undefined;
    const cambios: Partial<Habitacion> = { estado, updatedAt: seedUtil.nowISO(), updatedBy: actualizadoPor } as any;
    if (estado === 'LIBRE') cambios.estadoLimpieza = 'INSPECCIONADA';
    if (estado === 'LIMPIEZA') cambios.estadoLimpieza = 'EN_PROGRESO';
    if (estado === 'MANTENIMIENTO') cambios.estadoLimpieza = 'PENDIENTE';
    return db.updateAsync<Habitacion>(KEY_HAB, id, cambios as unknown as Update<Habitacion>);
  },

  async marcarLimpia(id: string, actualizadoPor = 'system-hk'): Promise<Habitacion | undefined> {
    const actual = await db.getByIdAsync<Habitacion>(KEY_HAB, id);
    if (!actual) return undefined;
    return db.updateAsync<Habitacion>(KEY_HAB, id, {
      estado: actual.estado === 'LIMPIEZA' ? 'LIBRE' : actual.estado,
      estadoLimpieza: 'LIMPIA',
      ultimaLimpiezaAt: seedUtil.nowISO(),
      updatedBy: actualizadoPor,
    } as unknown as Update<Habitacion>);
  },

  async eliminar(id: string): Promise<boolean> {
    return db.removeAsync(KEY_HAB, id);
  },

  reiniciarSeed(): void {
    db.reset();
  },
};

export default HabitacionService;
