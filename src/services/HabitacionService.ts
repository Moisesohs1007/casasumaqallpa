import { db, seedUtil, type Create, type Update, type Habitacion, type TipoHabitacion, type EstadoHabitacion } from './__db__';

const KEY_HAB = 'habitaciones' as const;
const KEY_TIPO = 'tiposHabitacion' as const;

export const HabitacionService = {
  // ===== TIPOS DE HABITACIÓN =====
  listarTipos(): TipoHabitacion[] {
    return db.all<TipoHabitacion>(KEY_TIPO).sort((a, b) => a.precioBaseNoche - b.precioBaseNoche);
  },

  buscarTipoPorId(id: string): TipoHabitacion | undefined {
    return db.getById<TipoHabitacion>(KEY_TIPO, id);
  },

  crearTipo(payload: Create<TipoHabitacion>): TipoHabitacion {
    return db.add<TipoHabitacion>(KEY_TIPO, payload);
  },

  actualizarTipo(id: string, changes: Update<TipoHabitacion>): TipoHabitacion | undefined {
    return db.update<TipoHabitacion>(KEY_TIPO, id, changes);
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
        const tipo = h.tipoHabitacion || this.buscarTipoPorId(h.tipoHabitacionId);
        const cap = (tipo?.capacidadAdultos || 0) + (tipo?.capacidadNinos || 0);
        return cap >= params.capacidadMinimaPax!;
      });
    }

    if (params?.disponiblesParaFechas) {
      const { checkinISO, checkoutISO } = params.disponiblesParaFechas;
      const reservas = db.all<import('./__db__').Reserva>('reservas');
      const idsOcupadas = new Set<string>();
      for (const r of reservas) {
        if (r.estado === 'CANCELADA') continue;
        if (r.estado === 'CHECKED_OUT') continue;
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
    if (!hab.tipoHabitacion && hab.tipoHabitacionId) {
      hab.tipoHabitacion = this.buscarTipoPorId(hab.tipoHabitacionId);
    }
    return hab;
  },

  actualizar(id: string, changes: Update<Habitacion>): Habitacion | undefined {
    return db.update<Habitacion>(KEY_HAB, id, changes);
  },

  cambiarEstado(id: string, estado: EstadoHabitacion, actualizadoPor = 'system-habitaciones'): Habitacion | undefined {
    const actual = db.getById<Habitacion>(KEY_HAB, id);
    if (!actual) return undefined;
    const cambios: Partial<Habitacion> = { estado, updatedAt: seedUtil.nowISO(), updatedBy: actualizadoPor };
    if (estado === 'LIBRE') cambios.estadoLimpieza = 'INSPECCIONADA';
    if (estado === 'LIMPIEZA') cambios.estadoLimpieza = 'EN_PROGRESO';
    if (estado === 'MANTENIMIENTO') cambios.estadoLimpieza = 'PENDIENTE';
    return db.update<Habitacion>(KEY_HAB, id, cambios as unknown as Update<Habitacion>);
  },

  marcarLimpia(id: string, actualizadoPor = 'system-hk'): Habitacion | undefined {
    const actual = db.getById<Habitacion>(KEY_HAB, id);
    if (!actual) return undefined;
    return db.update<Habitacion>(KEY_HAB, id, {
      estado: actual.estado === 'LIMPIEZA' ? 'LIBRE' : actual.estado,
      estadoLimpieza: 'LIMPIA',
      ultimaLimpiezaAt: seedUtil.nowISO(),
      updatedBy: actualizadoPor,
    } as unknown as Update<Habitacion>);
  },

  eliminar(id: string): boolean {
    return db.remove(KEY_HAB, id);
  },

  reiniciarSeed(): void {
    db.reset();
  },
};
