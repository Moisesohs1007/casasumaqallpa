// @ts-nocheck
import { db, seedUtil, type Create, type Update, type Comanda, type ComandaDetalle, type EstadoComanda, type TipoConsumoComanda, type TipoComanda, type PrioridadComanda, type Mesa, type ProductoFB, type PuntoVenta, type CargoFolio } from './__db__';
import { dbRemota } from './__supabase_db__';
import { FolioService, CargoFolioService } from './FolioService';
import { ImpuestoService } from './TarifaService';

const KEY_PV = 'puntosVenta';
const KEY_MESA = 'mesas';
const KEY_COM = 'comandas';
const KEY_COMDET = 'comandasDetalles';
const KEY_CAT = 'categoriasFB';
const KEY_PROD = 'productosFB';
const KEY_PRES = 'presentacionesFB';
const KEY_MOD = 'modificadoresFB';
const KEY_ALERG = 'alergenos';

const POS_KEYS_HIDRATAR = [KEY_ALERG, KEY_CAT, KEY_PROD, KEY_PRES, KEY_MOD, KEY_PV, KEY_MESA, KEY_COM, KEY_COMDET] as const;
let _hidratadoPos = false;
let _hidratandoPos: Promise<boolean> | null = null;

async function _hidratarDesdeSupabasePos(force = false): Promise<boolean> {
  if (_hidratadoPos && !force) return true;
  if (!dbRemota.isOnline()) return false;
  if (_hidratandoPos) return _hidratandoPos;
  _hidratandoPos = (async () => {
    try {
      const resultados = await Promise.all(POS_KEYS_HIDRATAR.map((k) => dbRemota.allAsync<any>(k).catch((e) => { console.warn('[PosService.hidratar] fail key=', k, e); return null; })));
      POS_KEYS_HIDRATAR.forEach((k, idx) => {
        const rows = resultados[idx];
        if (Array.isArray(rows) && rows.length > 0) {
          try { db.upsertAll<any>(k, rows, { matchKey: 'id' }); } catch (e) { console.warn('[PosService.hidratar] upsertAll fail key=', k, e); }
        }
      });
      _hidratadoPos = true;
      return true;
    } catch (e) {
      console.warn('[PosService.hidratar] error general:', e);
      return false;
    } finally { _hidratandoPos = null; }
  })();
  return _hidratandoPos;
}

// Init detalles comandas desde seed (solo si remota no trajo datos)
try {
  const existentes = db.all<ComandaDetalle>(KEY_COMDET);
  if (existentes.length === 0) {
    const comandas = db.all<Comanda>(KEY_COM);
    for (const c of comandas) {
      for (const d of c.detalles || []) {
        if (!existentes.find((x) => x.id === d.id)) {
          db.add<ComandaDetalle>(KEY_COMDET, { ...d, comandaId: c.id } as Create<ComandaDetalle>);
        }
      }
    }
  }
} catch {}

export const CatalogoFBService = {
  listarCategorias(): any[] {
    return db.all<any>(KEY_CAT).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  },
  buscarCategoriaPorId(id: string): any | undefined {
    return db.getById<any>(KEY_CAT, id);
  },
  crearCategoria(payload: any, usuarioId = 'system-catalogo'): any {
    const data = { ...payload, estado: payload.estado ?? 'ACTIVO', orden: payload.orden ?? 0, createdAt: seedUtil.nowISO(), updatedAt: seedUtil.nowISO(), createdBy: usuarioId, updatedBy: usuarioId };
    const nueva = db.add<any>(KEY_CAT, data);
    dbRemota.addAsync<any>(KEY_CAT, { ...data, id: nueva.id }).catch((e) => console.error('[CatalogoFB.crearCategoria] remoto fail:', e));
    return nueva;
  },
  actualizarCategoria(id: string, payload: any, usuarioId = 'system-catalogo'): any | undefined {
    const upd = db.update<any>(KEY_CAT, id, { ...payload, updatedAt: seedUtil.nowISO(), updatedBy: usuarioId });
    if (upd) dbRemota.updateAsync<any>(KEY_CAT, id, { ...payload, updatedAt: seedUtil.nowISO(), updatedBy: usuarioId }).catch((e) => console.error('[CatalogoFB.actualizarCategoria] remoto fail:', e));
    return upd;
  },
  eliminarCategoria(id: string): boolean {
    const ok = db.remove(KEY_CAT, id);
    if (ok) dbRemota.removeAsync(KEY_CAT, id).catch((e) => console.error('[CatalogoFB.eliminarCategoria] remoto fail:', e));
    return ok;
  },

  listarProductos(params?: {
    categoriaId?: string;
    soloActivos?: boolean;
    buscar?: string;
    puntoVentaId?: string;
  }): ProductoFB[] {
    let list = db.all<ProductoFB>(KEY_PROD);
    if (params?.soloActivos !== false) list = list.filter((p) => p.estado === 'ACTIVO');
    if (params?.categoriaId) list = list.filter((p) => p.categoriaId === params.categoriaId);
    if (params?.buscar) {
      const q = params.buscar.toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.nombre || '').toLowerCase().includes(q) ||
          (p.codigo || '').toLowerCase().includes(q) ||
          (p.descripcion || '').toLowerCase().includes(q)
      );
    }
    return list;
  },
  buscarProductoPorId(id: string): ProductoFB | undefined {
    return db.getById<ProductoFB>(KEY_PROD, id);
  },
  crearProducto(payload: any, usuarioId = 'system-catalogo'): ProductoFB {
    const data = {
      codigo: payload.codigo || '',
      nombre: payload.nombre || '',
      descripcion: payload.descripcion || '',
      categoriaId: payload.categoriaId || null,
      precioVentaBase: Number(payload.precioVentaBase || 0),
      costoAproximado: Number(payload.costoAproximado || 0),
      impuestosIds: payload.impuestosIds || ['IMP-IGV-18'],
      presentacionesActivasIds: payload.presentacionesActivasIds || [],
      modificadoresIds: payload.modificadoresIds || [],
      alergenosIds: payload.alergenosIds || [],
      estacionesCocinaIds: payload.estacionesCocinaIds || [],
      unidadMedida: payload.unidadMedida || 'UND',
      estado: payload.estado ?? 'ACTIVO',
      stockControl: payload.stockControl ?? false,
      stockActual: Number(payload.stockActual || 0),
      stockMinimo: Number(payload.stockMinimo || 0),
      orden: payload.orden ?? 0,
      imagenUrl: payload.imagenUrl || null,
      observaciones: payload.observaciones || '',
      createdAt: seedUtil.nowISO(),
      updatedAt: seedUtil.nowISO(),
      createdBy: usuarioId,
      updatedBy: usuarioId,
    };
    const nuevo = db.add<ProductoFB>(KEY_PROD, data as any);
    dbRemota.addAsync<ProductoFB>(KEY_PROD, { ...data, id: nuevo.id } as any).catch((e) => console.error('[CatalogoFB.crearProducto] remoto fail:', e));
    return nuevo;
  },
  actualizarProducto(id: string, payload: any, usuarioId = 'system-catalogo'): ProductoFB | undefined {
    const delta: any = { ...payload, updatedAt: seedUtil.nowISO(), updatedBy: usuarioId };
    if (delta.precioVentaBase !== undefined) delta.precioVentaBase = Number(delta.precioVentaBase || 0);
    if (delta.costoAproximado !== undefined) delta.costoAproximado = Number(delta.costoAproximado || 0);
    if (delta.stockActual !== undefined) delta.stockActual = Number(delta.stockActual || 0);
    if (delta.stockMinimo !== undefined) delta.stockMinimo = Number(delta.stockMinimo || 0);
    const upd = db.update<ProductoFB>(KEY_PROD, id, delta as any);
    if (upd) dbRemota.updateAsync<ProductoFB>(KEY_PROD, id, delta as any).catch((e) => console.error('[CatalogoFB.actualizarProducto] remoto fail:', e));
    return upd;
  },
  eliminarProducto(id: string): boolean {
    const ok = db.remove(KEY_PROD, id);
    if (ok) dbRemota.removeAsync(KEY_PROD, id).catch((e) => console.error('[CatalogoFB.eliminarProducto] remoto fail:', e));
    return ok;
  },

  listarPresentacionesProducto(productoId: string): any[] {
    return db.findMany<any>(KEY_PRES, (x: any) => x.productoId === productoId);
  },
  crearPresentacion(payload: any, usuarioId = 'system-catalogo'): any {
    const data = { ...payload, estado: payload.estado ?? 'ACTIVO', stockControl: payload.stockControl ?? false, stockActual: Number(payload.stockActual || 0), stockMinimo: Number(payload.stockMinimo || 0), createdAt: seedUtil.nowISO(), updatedAt: seedUtil.nowISO(), createdBy: usuarioId, updatedBy: usuarioId };
    const nueva = db.add<any>(KEY_PRES, data);
    dbRemota.addAsync<any>(KEY_PRES, { ...data, id: nueva.id }).catch((e) => console.error('[CatalogoFB.crearPresentacion] remoto fail:', e));
    return nueva;
  },
  actualizarPresentacion(id: string, payload: any, usuarioId = 'system-catalogo'): any | undefined {
    const delta = { ...payload, updatedAt: seedUtil.nowISO(), updatedBy: usuarioId };
    if (delta.precioVenta !== undefined) delta.precioVenta = Number(delta.precioVenta || 0);
    if (delta.stockActual !== undefined) delta.stockActual = Number(delta.stockActual || 0);
    if (delta.stockMinimo !== undefined) delta.stockMinimo = Number(delta.stockMinimo || 0);
    const upd = db.update<any>(KEY_PRES, id, delta);
    if (upd) dbRemota.updateAsync<any>(KEY_PRES, id, delta).catch((e) => console.error('[CatalogoFB.actualizarPresentacion] remoto fail:', e));
    return upd;
  },
  eliminarPresentacion(id: string): boolean {
    const ok = db.remove(KEY_PRES, id);
    if (ok) dbRemota.removeAsync(KEY_PRES, id).catch((e) => console.error('[CatalogoFB.eliminarPresentacion] remoto fail:', e));
    return ok;
  },

  listarModificadoresProducto(productoId: string): any[] {
    const prod = this.buscarProductoPorId(productoId);
    if (!prod) return [];
    const todos = db.all<any>(KEY_MOD);
    return todos.filter((m) => {
      if (!Array.isArray(prod.modificadoresIds) || !prod.modificadoresIds.includes(m.id)) return false;
      if (m.aplicaA === 'CUALQUIER_PRODUCTO') return true;
      if (m.aplicaA === 'PRODUCTOS_ESPECIFICOS' && Array.isArray(m.aplicableCategoriaIds) && m.aplicableCategoriaIds.length) {
        return m.aplicableCategoriaIds.includes(prod.categoriaId);
      }
      return true;
    });
  },
  listarModificadoresTodos(estado?: 'ACTIVO' | 'INACTIVO'): any[] {
    let lista = db.all<any>(KEY_MOD);
    if (estado) lista = lista.filter((m) => m.estado === estado);
    return lista;
  },
  crearModificador(payload: any, usuarioId = 'system-catalogo'): any {
    const data = { ...payload, estado: payload.estado ?? 'ACTIVO', precio: Number(payload.precio || 0), createdAt: seedUtil.nowISO(), updatedAt: seedUtil.nowISO(), createdBy: usuarioId, updatedBy: usuarioId };
    const nuevo = db.add<any>(KEY_MOD, data);
    dbRemota.addAsync<any>(KEY_MOD, { ...data, id: nuevo.id }).catch((e) => console.error('[CatalogoFB.crearModificador] remoto fail:', e));
    return nuevo;
  },
  actualizarModificador(id: string, payload: any, usuarioId = 'system-catalogo'): any | undefined {
    const delta = { ...payload, updatedAt: seedUtil.nowISO(), updatedBy: usuarioId };
    if (delta.precio !== undefined) delta.precio = Number(delta.precio || 0);
    const upd = db.update<any>(KEY_MOD, id, delta);
    if (upd) dbRemota.updateAsync<any>(KEY_MOD, id, delta).catch((e) => console.error('[CatalogoFB.actualizarModificador] remoto fail:', e));
    return upd;
  },
  eliminarModificador(id: string): boolean {
    const ok = db.remove(KEY_MOD, id);
    if (ok) dbRemota.removeAsync(KEY_MOD, id).catch((e) => console.error('[CatalogoFB.eliminarModificador] remoto fail:', e));
    return ok;
  },

  listarAlergenosProducto(productoId: string): any[] {
    const prod = this.buscarProductoPorId(productoId);
    if (!prod) return [];
    return db.findMany<any>(KEY_ALERG, (x: any) => Array.isArray(prod.alergenosIds) && prod.alergenosIds.includes(x.id));
  },
  listarAlergenosTodos(estado?: 'ACTIVO' | 'INACTIVO'): any[] {
    let lista = db.all<any>(KEY_ALERG);
    if (estado) lista = lista.filter((a) => a.estado === estado);
    return lista;
  },
  crearAlergeno(payload: any, usuarioId = 'system-catalogo'): any {
    const data = { ...payload, estado: payload.estado ?? 'ACTIVO', createdAt: seedUtil.nowISO(), updatedAt: seedUtil.nowISO(), createdBy: usuarioId, updatedBy: usuarioId };
    const nuevo = db.add<any>(KEY_ALERG, data);
    dbRemota.addAsync<any>(KEY_ALERG, { ...data, id: nuevo.id }).catch((e) => console.error('[CatalogoFB.crearAlergeno] remoto fail:', e));
    return nuevo;
  },
  actualizarAlergeno(id: string, payload: any, usuarioId = 'system-catalogo'): any | undefined {
    const delta = { ...payload, updatedAt: seedUtil.nowISO(), updatedBy: usuarioId };
    const upd = db.update<any>(KEY_ALERG, id, delta);
    if (upd) dbRemota.updateAsync<any>(KEY_ALERG, id, delta).catch((e) => console.error('[CatalogoFB.actualizarAlergeno] remoto fail:', e));
    return upd;
  },
  eliminarAlergeno(id: string): boolean {
    const ok = db.remove(KEY_ALERG, id);
    if (ok) dbRemota.removeAsync(KEY_ALERG, id).catch((e) => console.error('[CatalogoFB.eliminarAlergeno] remoto fail:', e));
    return ok;
  },
};

export const PuntoVentaService = {
  listarTodos(estado?: 'ACTIVO' | 'INACTIVO'): PuntoVenta[] {
    let lista = db.all<PuntoVenta>(KEY_PV);
    if (estado) lista = lista.filter((p) => p.estado === estado);
    return lista;
  },
  buscarPorId(id: string): PuntoVenta | undefined {
    return db.getById<PuntoVenta>(KEY_PV, id);
  },
  crear(payload: any, usuarioId = 'system-pv'): PuntoVenta {
    const data = { ...payload, estado: payload.estado ?? 'ACTIVO', createdAt: seedUtil.nowISO(), updatedAt: seedUtil.nowISO(), createdBy: usuarioId, updatedBy: usuarioId };
    const nuevo = db.add<PuntoVenta>(KEY_PV, data as any);
    dbRemota.addAsync<PuntoVenta>(KEY_PV, { ...data, id: nuevo.id } as any).catch((e) => console.error('[PuntoVenta.crear] remoto fail:', e));
    return nuevo;
  },
  actualizar(id: string, payload: any, usuarioId = 'system-pv'): PuntoVenta | undefined {
    const delta = { ...payload, updatedAt: seedUtil.nowISO(), updatedBy: usuarioId };
    const upd = db.update<PuntoVenta>(KEY_PV, id, delta as any);
    if (upd) dbRemota.updateAsync<PuntoVenta>(KEY_PV, id, delta as any).catch((e) => console.error('[PuntoVenta.actualizar] remoto fail:', e));
    return upd;
  },
  ensureDefault(puntoVentaIdDefault = 'PV-RESTAURANTE-01'): PuntoVenta {
    const existente = PuntoVentaService.buscarPorId(puntoVentaIdDefault);
    if (existente) return existente;
    const pv = PuntoVentaService.crear(
      {
        id: puntoVentaIdDefault,
        nombre: 'Restaurante POS · Casa Sumaq Allpa',
        codigo: 'PV-REST-01',
        zona: 'GENERAL',
        permiteRoomService: true,
        permiteDelivery: false,
        permiteLlevar: true,
        estado: 'ACTIVO',
        configuracion: {
          impuestoPorDefecto: 'IGV',
          porcentajeImpuesto: 18,
          monedaPorDefecto: 'PEN',
          ticketAnchoMm: 80,
        },
      },
      'system-pv'
    );
    return pv;
  },
};

export const MesaService = {
  listarTodas(params?: {
    puntoVentaId?: string;
    zona?: Mesa['zona'];
    estado?: Mesa['estado'];
    habitacionAsignadaId?: string;
  }): Mesa[] {
    let lista = db.all<Mesa>(KEY_MESA);
    if (params?.puntoVentaId) lista = lista.filter((m) => m.puntoVentaId === params.puntoVentaId);
    if (params?.zona) lista = lista.filter((m) => m.zona === params.zona);
    if (params?.estado) lista = lista.filter((m) => m.estado === params.estado);
    if (params?.habitacionAsignadaId) lista = lista.filter((m) => m.habitacionAsignadaId === params.habitacionAsignadaId);
    return lista;
  },
  buscarPorId(id: string): Mesa | undefined {
    return db.getById<Mesa>(KEY_MESA, id);
  },
  buscarPorHabitacion(habitacionId: string): Mesa | undefined {
    return db.findOne<Mesa>(KEY_MESA, (m) => m.habitacionAsignadaId === habitacionId);
  },
  crear(payload: any, usuarioId = 'system-mesas'): Mesa {
    const data = { ...payload, estado: payload.estado ?? 'LIBRE', createdAt: seedUtil.nowISO(), updatedAt: seedUtil.nowISO(), createdBy: usuarioId, updatedBy: usuarioId };
    const nueva = db.add<Mesa>(KEY_MESA, data as any);
    dbRemota.addAsync<Mesa>(KEY_MESA, { ...data, id: nueva.id } as any).catch((e) => console.error('[Mesa.crear] remoto fail:', e));
    return nueva;
  },
  actualizar(id: string, payload: any, usuarioId = 'system-mesas'): Mesa | undefined {
    const delta = { ...payload, updatedAt: seedUtil.nowISO(), updatedBy: usuarioId };
    const upd = db.update<Mesa>(KEY_MESA, id, delta as any);
    if (upd) dbRemota.updateAsync<Mesa>(KEY_MESA, id, delta as any).catch((e) => console.error('[Mesa.actualizar] remoto fail:', e));
    return upd;
  },
  crearRoomServiceSiNoExiste(params: {
    habitacionId: string;
    codHab: string;
    puntoVentaId: string;
    usuarioId: string;
  }): Mesa {
    const { habitacionId, codHab, puntoVentaId, usuarioId } = params;
    const cod = String(codHab || 'ROOM').replace(/[^a-z0-9]/gi, '').toUpperCase() || 'ROOM';
    let existing = db.findOne<Mesa>(KEY_MESA, (m: any) => m && m.habitacionAsignadaId === habitacionId);
    if (existing) return existing;
    existing = db.findOne<Mesa>(KEY_MESA, (m: any) =>
      m && (
        String(m.codigo || '').toUpperCase() === cod ||
        String(m.nombreVisible || '').toUpperCase() === `HAB. ${cod}`
      )
    );
    if (existing) {
      try {
        const delta = {
          habitacionAsignadaId: habitacionId,
          nombreVisible: `Hab. ${String(codHab || cod)}`,
          updatedBy: usuarioId,
          updatedAt: seedUtil.nowISO(),
        };
        const upd = db.update<Mesa>(KEY_MESA, existing.id, delta as unknown as Update<Mesa>);
        if (upd) dbRemota.updateAsync<Mesa>(KEY_MESA, existing.id, delta as any).catch((e) => console.error('[Mesa.crearRS.exist] remoto fail:', e));
        if (upd) return upd;
      } catch { return existing; }
      return existing;
    }
    const sinAsignar = db.findOne<Mesa>(KEY_MESA, (m: any) =>
      m &&
      String(m.zona || '').toUpperCase() === 'ROOM_SERVICE' &&
      (!m.habitacionAsignadaId || m.estado === 'LIBRE')
    );
    if (sinAsignar) {
      try {
        const delta = {
          habitacionAsignadaId: habitacionId,
          codigo: cod,
          nombreVisible: `Hab. ${String(codHab || cod)}`,
          updatedBy: usuarioId,
          updatedAt: seedUtil.nowISO(),
        };
        const upd = db.update<Mesa>(KEY_MESA, sinAsignar.id, delta as unknown as Update<Mesa>);
        if (upd) dbRemota.updateAsync<Mesa>(KEY_MESA, sinAsignar.id, delta as any).catch((e) => console.error('[Mesa.crearRS.sinAsignar] remoto fail:', e));
        if (upd) return upd;
      } catch { return sinAsignar; }
      return sinAsignar;
    }
    const data = {
      puntoVentaId,
      codigo: cod,
      nombreVisible: `Hab. ${String(codHab || cod)}`,
      zona: 'ROOM_SERVICE' as Mesa['zona'],
      capacidadMaxPax: 4,
      capacidadActualUsada: 0,
      tipo: 'ROOM_SERVICE' as Mesa['tipo'],
      estado: 'LIBRE' as Mesa['estado'],
      esCombinable: false,
      mesaCombinadaIds: [],
      habitacionAsignadaId: habitacionId,
      proximaLimpiezaAt: null,
      observaciones: 'Mesa Room Service (auto)',
      createdAt: seedUtil.nowISO(),
      updatedAt: seedUtil.nowISO(),
      createdBy: usuarioId,
      updatedBy: usuarioId,
    };
    const nueva = db.add<Mesa>(KEY_MESA, data as unknown as Create<Mesa>);
    dbRemota.addAsync<Mesa>(KEY_MESA, { ...data, id: nueva.id } as any).catch((e) => console.error('[Mesa.crearRS.nueva] remoto fail:', e));
    return nueva;
  },
  cambiarEstado(id: string, estado: Mesa['estado'], actualizadoPor = 'system-mesas'): Mesa | undefined {
    const delta = {
      estado,
      updatedBy: actualizadoPor,
      updatedAt: seedUtil.nowISO(),
    };
    const upd = db.update<Mesa>(KEY_MESA, id, delta as unknown as Update<Mesa>);
    if (upd) dbRemota.updateAsync<Mesa>(KEY_MESA, id, delta as any).catch((e) => console.error('[Mesa.cambiarEstado] remoto fail:', e));
    return upd;
  },
  actualizarCapacidadUsada(id: string, pax: number, actualizadoPor = 'system-mesas'): Mesa | undefined {
    const actual = db.getById<Mesa>(KEY_MESA, id);
    const delta = {
      capacidadActualUsada: pax,
      estado: pax > 0 ? 'OCUPADA' : actual?.estado || 'LIBRE',
      updatedBy: actualizadoPor,
      updatedAt: seedUtil.nowISO(),
    };
    const upd = db.update<Mesa>(KEY_MESA, id, delta as unknown as Update<Mesa>);
    if (upd) dbRemota.updateAsync<Mesa>(KEY_MESA, id, delta as any).catch((e) => console.error('[Mesa.actualizarCap] remoto fail:', e));
    return upd;
  },
  eliminar(id: string): boolean {
    const ok = db.remove(KEY_MESA, id);
    if (ok) dbRemota.removeAsync(KEY_MESA, id).catch((e) => console.error('[Mesa.eliminar] remoto fail:', e));
    return ok;
  },
};

export const ComandaService = {
  listarTodas(params?: {
    puntoVentaId?: string;
    mesaId?: string;
    habitacionId?: string;
    folioId?: string;
    estado?: EstadoComanda;
    tipo?: TipoComanda;
    buscar?: string;
    fechaDesdeISO?: string;
    fechaHastaISO?: string;
  }): Comanda[] {
    let lista = db.all<Comanda>(KEY_COM).sort((a, b) =>
      (b.fechaApertura || '').localeCompare(a.fechaApertura || '')
    );
    if (params?.puntoVentaId) lista = lista.filter((c) => c.puntoVentaId === params.puntoVentaId);
    if (params?.mesaId) lista = lista.filter((c) => c.mesaId === params.mesaId);
    if (params?.habitacionId) lista = lista.filter((c) => c.habitacionId === params.habitacionId);
    if (params?.folioId) lista = lista.filter((c) => c.folioId === params.folioId);
    if (params?.estado) lista = lista.filter((c) => c.estado === params.estado);
    if (params?.tipo) lista = lista.filter((c) => c.tipoComanda === params.tipo);
    if (params?.fechaDesdeISO) lista = lista.filter((c) => (c.fechaApertura || '') >= params.fechaDesdeISO!);
    if (params?.fechaHastaISO) lista = lista.filter((c) => (c.fechaApertura || '') <= params.fechaHastaISO!);
    if (params?.buscar) {
      const q = params.buscar.toLowerCase().trim();
      lista = lista.filter(
        (c) =>
          (c.numeroCorrelativo || '').toLowerCase().includes(q) ||
          (c.folioId || '').toLowerCase().includes(q) ||
          (c.mesa?.nombreVisible || '').toLowerCase().includes(q) ||
          (c.habitacion?.codigo || '').toLowerCase().includes(q)
      );
    }
    return lista.map((c) => this._enriquecer(c));
  },

  buscarPorId(id: string): Comanda | undefined {
    const c = db.getById<Comanda>(KEY_COM, id);
    return c ? this._enriquecer(c) : undefined;
  },

  _enriquecer(c: Comanda): Comanda {
    c.detalles = db.findMany<ComandaDetalle>(KEY_COMDET, (d) => d.comandaId === c.id);
    if (c.mesaId && !c.mesa) c.mesa = MesaService.buscarPorId(c.mesaId);
    if (c.habitacionId && !c.habitacion) c.habitacion = (db.getById<any>('habitaciones', c.habitacionId));
    if (c.folioId && !c.folioId) { /* noop */ }
    return this._recalcularTotalesEnMemoria(c);
  },

  _recalcularTotalesEnMemoria(c: Comanda): Comanda {
    const detalles = c.detalles || [];
    const total = detalles.reduce((s, d) => s + Number(d.montoLinea || 0), 0);
    const subtotal = detalles.reduce((s, d) => s + Number(d.subtotal || 0), 0);
    const impuestos = detalles.reduce((s, d) =>
      s + (d.impuestosMontoDesglosado || []).reduce((s2, x) => s2 + Number(x.montoImpuesto || 0), 0),
      0
    );
    const descuentos = detalles.reduce((s, d) =>
      s + Number(d.descuentoMonto || 0), 0
    );
    const propinaSugerida = c.propinaSugerida ?? Number((total * 0.10).toFixed(2));
    const impuestosDetalleMap = new Map<string, { impuestoId: string; impuestoNombre: string; montoImpuesto: number }>();
    for (const d of detalles) {
      const arr = (d.impuestosMontoDesglosado as any[]) || [];
      for (const x of arr) {
        const id = String(x.impuestoId);
        if (!id || id === 'IMP-SELVA-5') continue;
        const prev = impuestosDetalleMap.get(id) || { impuestoId: id, impuestoNombre: String(x.impuestoNombre || id), montoImpuesto: 0 };
        prev.montoImpuesto += Number(x.montoImpuesto || 0);
        impuestosDetalleMap.set(id, prev);
      }
    }
    let impuestosDetalle = Array.from(impuestosDetalleMap.values()).map((x) => ({ ...x, montoImpuesto: Number(x.montoImpuesto.toFixed(2)) }));
    if (impuestosDetalle.length === 0) {
      impuestosDetalle = [{ impuestoId: 'IMP-IGV-18', impuestoNombre: 'IGV 18%', montoImpuesto: Number((subtotal * 0.18).toFixed(2)) }];
    }
    return {
      ...c,
      totalNetoSinImpuestos: Number(subtotal.toFixed(2)),
      totalImpuestos: Number(impuestosDetalle.reduce((s, x) => s + Number(x.montoImpuesto || 0), 0).toFixed(2)),
      impuestosDetalle,
      totalDescuentos: Number(descuentos.toFixed(2)),
      propinaSugerida: Number(propinaSugerida.toFixed(2)),
      totalComanda: Number(total.toFixed(2)),
      totalFinalConPropina: Number((total + c.totalPropinas).toFixed(2)),
      saldoPendiente: Number((total + c.totalPropinas - c.totalCobrado).toFixed(2)),
    };
  },

  recalcularTotales(id: string, updatedBy = 'system-comanda'): Comanda | undefined {
    const c = db.getById<Comanda>(KEY_COM, id);
    if (!c) return undefined;
    const actualizados = this._recalcularTotalesEnMemoria({
      ...c,
      detalles: db.findMany<ComandaDetalle>(KEY_COMDET, (d) => d.comandaId === id),
    });
    const delta: any = {
      totalNetoSinImpuestos: actualizados.totalNetoSinImpuestos,
      totalImpuestos: actualizados.totalImpuestos,
      impuestosDetalle: actualizados.impuestosDetalle,
      totalDescuentos: actualizados.totalDescuentos,
      propinaSugerida: actualizados.propinaSugerida,
      totalComanda: actualizados.totalComanda,
      totalFinalConPropina: actualizados.totalFinalConPropina,
      saldoPendiente: actualizados.saldoPendiente,
      updatedBy,
      updatedAt: seedUtil.nowISO(),
    };
    const upd = db.update<Comanda>(KEY_COM, id, delta as unknown as Update<Comanda>);
    if (upd) dbRemota.updateAsync<Comanda>(KEY_COM, id, delta as any).catch((e) => console.error('[Comanda.recalc] remoto fail:', e));
    return upd;
  },

  crear(params: {
    puntoVentaId: string;
    mesaId: string;
    usuarioIdMozoApertura: string;
    habitacionId?: string;
    folioId?: string;
    reservaId?: string;
    huespedTitularId?: string;
    tipoComanda?: TipoComanda;
    tipoConsumo?: TipoConsumoComanda;
    prioridad?: PrioridadComanda;
    paxAdultos?: number;
    paxNinos?: number;
    observacionesInternas?: string;
    lineas: Array<{
      productoId: string;
      presentacionId?: string;
      cantidad: number;
      observaciones?: string;
      modificadoresAplicados?: any[];
    }>;
    modoAnulacionDescuentos?: any;
  }): { comanda: Comanda; cargosFolio?: CargoFolio[]; error?: string } {
    const mesa = MesaService.buscarPorId(params.mesaId);
    if (!mesa) return { comanda: null as any, error: 'Mesa no encontrada (verifica PuntoVenta.Mesas seed o MesaService.crearRoomServiceSiNoExiste).' };
    const puntoVentaId = params.puntoVentaId || 'PV-RESTAURANTE-01';
    let puntoVenta = PuntoVentaService.buscarPorId(puntoVentaId);
    if (!puntoVenta) puntoVenta = PuntoVentaService.ensureDefault(puntoVentaId);
    if (!puntoVenta) return { comanda: null as any, error: 'Punto de venta no encontrado (seed automático falló, recarga F5).' };

    const esRoomService =
      params.tipoComanda === 'ROOM_SERVICE' ||
      mesa.zona === 'ROOM_SERVICE' ||
      !!params.habitacionId ||
      params.tipoConsumo === 'CARGO_A_HABITACION';

    const habitacionId = params.habitacionId || mesa.habitacionAsignadaId;
    const folioId = params.folioId || (habitacionId ? FolioService.buscarPorHabitacionAbierta(habitacionId)?.id : undefined);

    const tipoComandaFinal = params.tipoComanda ?? (esRoomService ? 'ROOM_SERVICE' : 'MESA_RESTAURANTE');
    const tipoConsumoFinal =
      params.tipoConsumo ?? (esRoomService ? 'CARGO_A_HABITACION' : 'COBRO_DIRECTO');
    const prioridadFinal =
      params.prioridad ?? (esRoomService ? (params.paxAdultos && params.paxAdultos >= 4 ? 'ROOM_SERVICE_RAPIDO' : 'ROOM_SERVICE_NORMAL') : 'NORMAL');

    const mesaIdNuevo = params.mesaId;
    const now = seedUtil.nowISO();
    const comandaData = {
      puntoVentaId: params.puntoVentaId,
      cajaSesionId: null,
      numeroCorrelativo: this.siguienteNumeroCorrelativo(params.puntoVentaId, puntoVenta.codigoPuntoVenta),
      mesaId: mesaIdNuevo,
      habitacionId,
      folioId,
      reservaId: params.reservaId,
      huespedTitularId: params.huespedTitularId,
      tipoComanda: tipoComandaFinal,
      tipoConsumo: tipoConsumoFinal,
      prioridad: prioridadFinal,
      estado: 'ABIERTA',
      estadoEntrega: 'TOMANDO_ORDEN',
      modoAtencion: tipoComandaFinal === 'ROOM_SERVICE' ? 'ROOM_SERVICE' : 'EN_SALON',
      usuarioIdMozoApertura: params.usuarioIdMozoApertura,
      turnoServicioId: null,
      fechaApertura: now,
      horaApertura: now,
      paxAdultos: params.paxAdultos ?? mesa.capacidadActualUsada ?? 2,
      paxNinos: params.paxNinos ?? 0,
      moneda: puntoVenta.monedaPredeterminada,
      detalles: [],
      totalNetoSinImpuestos: 0,
      totalImpuestos: 0,
      impuestosDetalle: [],
      totalDescuentos: 0,
      propinaSugerida: 0,
      propinaAplicadaMonto: 0,
      totalPropinas: 0,
      totalComanda: 0,
      totalFinalConPropina: 0,
      saldoPendiente: 0,
      totalCobrado: 0,
      cobros: [],
      observacionesInternas: params.observacionesInternas || '',
      horaEnvioKds: null,
      ticketsKdsIds: [],
      facturasIds: [],
      createdAt: now,
      updatedAt: now,
      createdBy: params.usuarioIdMozoApertura,
      updatedBy: params.usuarioIdMozoApertura,
    };
    const comandaSeed = db.add<Comanda>(KEY_COM, comandaData as unknown as Create<Comanda>);
    dbRemota.addAsync<Comanda>(KEY_COM, { ...comandaData, id: comandaSeed.id } as any).catch((e) => console.error('[Comanda.crear.comanda] remoto fail:', e));

    const comandaId = comandaSeed.id;
    const cargosFolioCreados: CargoFolio[] = [];
    const usuarioId = params.usuarioIdMozoApertura;

    let numeroLineaFolio = 1;
    for (const linea of params.lineas) {
      const prod = CatalogoFBService.buscarProductoPorId(linea.productoId);
      if (!prod) continue;
      const presentacionId = linea.presentacionId || (Array.isArray(prod.presentacionesActivasIds) && prod.presentacionesActivasIds[0]) || '';
      const precio = Number(prod.precioVentaBase) || 0;
      const nominal = Number((linea.cantidad * precio).toFixed(2));
      const impuestosOrig = Array.isArray(prod.impuestosIds) && prod.impuestosIds.length > 0 ? prod.impuestosIds.slice() : null;
      const selvaActivo = impuestosOrig ? impuestosOrig.includes('IMP-SELVA-5') : false;
      const igvActivo = impuestosOrig ? impuestosOrig.includes('IMP-IGV-18') : true;
      const impuestosIdsFinal: string[] = [];
      if (igvActivo) impuestosIdsFinal.push('IMP-IGV-18');
      if (selvaActivo) impuestosIdsFinal.push('IMP-SELVA-5');
      if (impuestosIdsFinal.length === 0) impuestosIdsFinal.push('IMP-IGV-18');
      const tieneSelva = impuestosIdsFinal.includes('IMP-SELVA-5');
      const divisor = tieneSelva ? 1.23 : 1.18;
      const baseImponible = Number((nominal / divisor).toFixed(2));
      const imps = impuestosIdsFinal.map((impId) => {
        const imp = ImpuestoService.buscarPorId(impId);
        const porc = impId === 'IMP-IGV-18' ? 18 : 5;
        if (!imp) return { impuestoId: impId, impuestoNombre: impId === 'IMP-IGV-18' ? 'IGV 18%' : 'IGV Selva 5%', montoImpuesto: 0 };
        const monto = imp.tipo === 'PORCENTAJE' ? baseImponible * (porc / 100) : Number(imp.valor) || 0;
        return {
          impuestoId: impId,
          impuestoNombre: imp.nombre || (impId === 'IMP-IGV-18' ? 'IGV 18%' : 'IGV Selva 5%'),
          montoImpuesto: Number(monto.toFixed(2)),
        };
      });
      const totalImpuestos = Number(imps.reduce((s, x) => s + Number(x.montoImpuesto || 0), 0).toFixed(2));
      const montoLinea = nominal;
      const subtotal = baseImponible;
      const montoImpuesto = totalImpuestos;
      const detalleData = {
        comandaId,
        numeroLinea: 1,
        productoId: prod.id,
        presentacionId,
        cantidad: linea.cantidad,
        precioUnitario: precio,
        moneda: puntoVenta.monedaPredeterminada,
        descuentoPorcentaje: 0,
        descuentoMonto: 0,
        observaciones: linea.observaciones || '',
        seleccionModificadores: linea.modificadoresAplicados || [],
        alergenosOmitidosIds: [],
        impuestosIds: imps.map((i) => i.impuestoId),
        impuestosMontoDesglosado: imps as any,
        subtotal,
        montoLinea,
        estadoPreparacion: 'PENDIENTE',
        estacionCocinaId: (Array.isArray(prod.estacionesCocinaIds) && prod.estacionesCocinaIds[0]) || null,
        usuarioIdAsignadoEstacion: null,
        horaSolicitado: now,
        horaInicioPreparacion: null,
        horaTerminoPreparacion: null,
        horaEntregado: null,
        esModificacion: false,
        comandaDetalleOrigenId: null,
        esCortesia: false,
        motivoCortesia: '',
        esComplementoCargo: false,
        ticketImpresoKds: false,
        comentariosInternos: '',
        createdAt: now,
        updatedAt: now,
        createdBy: usuarioId,
        updatedBy: usuarioId,
      };
      const detalle = db.add<ComandaDetalle>(KEY_COMDET, detalleData as unknown as Create<ComandaDetalle>);
      dbRemota.addAsync<ComandaDetalle>(KEY_COMDET, { ...detalleData, id: detalle.id } as any).catch((e) => console.error('[Comanda.crear.detalle] remoto fail:', e));

      // ===== DESCUENTO AUTOMÁTICO DE STOCK (por cada línea comanda room service o POS) =====
      try {
        const prodLinea: any = CatalogoFBService.buscarProductoPorId(prod.id);
        const presLinea: any = presentacionId
          ? (CatalogoFBService.listarPresentacionesProducto(prod.id) || []).find((x) => x.id === presentacionId)
          : undefined;
        const stockControlProd = !!(prodLinea && (prodLinea.stockControl === true || prodLinea.payload?.stockControl === true));
        const stockControlPres = !!(presLinea && (presLinea.stockControl === true || presLinea.payload?.stockControl === true));
        if ((stockControlProd || stockControlPres) && Number(linea.cantidad || 0) > 0) {
          Promise.resolve().then(async () => {
            try {
              const { InventarioService } = await import('./InventarioService');
              InventarioService.moverStock({
                productoId: stockControlProd ? prod.id : undefined,
                presentacionId: stockControlPres ? presLinea.id : undefined,
                delta: -1 * Math.abs(Number(linea.cantidad || 0)),
                motivo: `Venta comanda #${comandaSeed.numeroCorrelativo || comandaId}`,
                usuarioId,
                referenciaId: detalle.id,
                referenciaTipo: 'COMANDA_DETALLE',
                bloquearNegativo: false,
              });
            } catch (e2) { console.warn('[Comanda.crear] descuento stock lazy fail:', e2); }
          });
        }
      } catch (eStock) { console.warn('[Comanda.crear] descuento stock skip:', eStock); }
      // ===== FIN DESCUENTO STOCK =====

      if (esRoomService && folioId && tipoConsumoFinal === 'CARGO_A_HABITACION') {
        const nombreUsuario = (usuarioId === 'USR-MOISES-0001') ? 'Moisés Ochoa' : String(usuarioId || 'Recepción');
        const monto = montoLinea;
        const cargoParams: Partial<CargoFolio> & any = {
          folioId,
          numeroLinea: numeroLineaFolio++,
          fechaCargo: now,
          concepto: `${linea.cantidad}× ${prod.nombre} · ${mesa.codigo}`,
          tipoConcepto: 'COMIDA_BEBIDA' as any,
          categoria: prod.categoriaId || 'Comida y Bebida',
          habitacionId,
          comandaId,
          comandaDetalleId: detalle.id,
          conceptoDetalle: [
            `Comanda #${comandaSeed.numeroCorrelativo}`,
            `Hab: ${mesa.codigo}`,
            `Mozo: ${nombreUsuario}`,
            ...(linea.observaciones ? [`Obs: ${linea.observaciones}`] : []),
          ],
          descripcion: `Comanda #${comandaSeed.numeroCorrelativo} · Hab ${mesa.codigo} · Mozo ${usuarioId}. ${linea.observaciones || ''}`,
          cantidad: linea.cantidad,
          unidadMedida: 'UND',
          precioUnitario: precio,
          descuentoMonto: 0,
          descuentoPorcentaje: 0,
          montoImpuesto,
          impuestoPorcentaje: Array.isArray(prod.impuestosIds) && prod.impuestosIds?.length ? null : 23,
          subtotal,
          total: monto,
          monto,
          moneda: puntoVenta.monedaPredeterminada,
          cargoAuto: true,
          origenCargo: 'ROOM_SERVICE',
          nombreUsuarioAplicaCargo: nombreUsuario,
          usuarioRegistroId: usuarioId,
          autorizadoPor: nombreUsuario,
          anulado: false,
          esAnulado: false,
          motivoAnulacion: '',
          fechaAplicacion: now,
          fechaVencimiento: null as any,
          productoInventarioId: null,
          cajaSesionId: null,
          comprobanteAsociadoId: null,
          comentarios: `Cargo automático desde comanda #${comandaSeed.numeroCorrelativo}. Hab: ${habitacionId}.`,
          reservaId: params.reservaId,
          huespedId: params.huespedTitularId || (folioId ? FolioService.buscarPorId(folioId)?.huespedId : undefined),
          referenciaId: detalle.id,
          referenciaExternaId: detalle.id,
          usuarioId,
          estado: 'PENDIENTE_COBRO',
          impuestosIds: imps.map((i) => i.impuestoId),
          impuestosMontoDesglosado: imps as any,
          descuentosIds: [],
          descuentosMontoDesglosado: [],
          propinaMonto: 0,
          aplicaIgv: true,
          createdAt: now,
          updatedAt: now,
          createdBy: usuarioId,
          updatedBy: usuarioId,
        };
        const cargo = CargoFolioService.crear(cargoParams);
        cargosFolioCreados.push(cargo);
      }
    }

    MesaService.cambiarEstado(mesaIdNuevo, 'OCUPADA', usuarioId);

    this.recalcularTotales(comandaId, usuarioId);

    const deltaKds: any = {
      estado: 'EN_COCINA_BAR',
      estadoEntrega: 'EN_PROCESO',
      horaEnvioKds: seedUtil.nowISO(),
      updatedBy: usuarioId,
      updatedAt: seedUtil.nowISO(),
    };
    const updKds = db.update<Comanda>(KEY_COM, comandaId, deltaKds as unknown as Update<Comanda>);
    if (updKds) dbRemota.updateAsync<Comanda>(KEY_COM, comandaId, deltaKds as any).catch((e) => console.error('[Comanda.crear.kds] remoto fail:', e));

    return {
      comanda: this.buscarPorId(comandaId)!,
      cargosFolio: cargosFolioCreados,
    };
  },

  siguienteNumeroCorrelativo(puntoVentaId: string, prefijo = 'C'): string {
    const existentes = this.listarTodas({ puntoVentaId }).map((c) => {
      const clean = (c.numeroCorrelativo || '').replace(/\D/g, '');
      return clean ? parseInt(clean, 10) : 0;
    });
    const max = existentes.reduce((m, n) => (n > m ? n : m), 900);
    return `${prefijo}-${max + 1}`;
  },

  agregarLinea(comandaId: string, linea: Create<ComandaDetalle> & { usuarioId: string }): ComandaDetalle | undefined {
    const now = seedUtil.nowISO();
    const detalleData = {
      comandaId,
      ...linea,
      createdBy: linea.usuarioId,
      updatedBy: linea.usuarioId,
      createdAt: now,
      updatedAt: now,
    };
    const detalle = db.add<ComandaDetalle>(KEY_COMDET, detalleData as unknown as Create<ComandaDetalle>);
    dbRemota.addAsync<ComandaDetalle>(KEY_COMDET, { ...detalleData, id: detalle.id } as any).catch((e) => console.error('[Comanda.agregarLinea] remoto fail:', e));

    // ===== DESCUENTO AUTOMÁTICO DE STOCK (agregar línea) =====
    try {
      const prodLinea: any = CatalogoFBService.buscarProductoPorId(detalle.productoId);
      const presId = (detalle as any).presentacionId;
      const presLinea: any = presId
        ? (CatalogoFBService.listarPresentacionesProducto(prodLinea?.id || '') || []).find((x) => x.id === presId)
        : undefined;
      const stockControlProd = !!(prodLinea && (prodLinea.stockControl === true || prodLinea.payload?.stockControl === true));
      const stockControlPres = !!(presLinea && (presLinea.stockControl === true || presLinea.payload?.stockControl === true));
      if ((stockControlProd || stockControlPres) && Number(detalle.cantidad || 0) > 0) {
        Promise.resolve().then(async () => {
          try {
            const { InventarioService } = await import('./InventarioService');
            InventarioService.moverStock({
              productoId: stockControlProd ? detalle.productoId : undefined,
              presentacionId: stockControlPres ? presId : undefined,
              delta: -1 * Math.abs(Number(detalle.cantidad || 0)),
              motivo: `Agregado item comanda`,
              usuarioId: linea.usuarioId,
              referenciaId: detalle.id,
              referenciaTipo: 'COMANDA_DETALLE',
              bloquearNegativo: false,
            });
          } catch (e2) { console.warn('[Comanda.agregarLinea] descuento stock lazy fail:', e2); }
        });
      }
    } catch (eStock) { console.warn('[Comanda.agregarLinea] descuento stock skip:', eStock); }
    // ===== FIN DESCUENTO STOCK =====

    const comanda = this.buscarPorId(comandaId);
    if (comanda?.folioId && comanda.tipoConsumo === 'CARGO_A_HABITACION') {
      const prod = CatalogoFBService.buscarProductoPorId(detalle.productoId);
      if (prod) {
        CargoFolioService.crear({
          folioId: comanda.folioId,
          tipo: 'CONSUMO_POS',
          concepto: `${detalle.cantidad}× ${prod.nombre}`,
          descripcion: `Agregado a comanda #${comanda.numeroCorrelativo}`,
          origen: 'COMANDA_POS',
          referenciaId: detalle.id,
          reservaId: comanda.reservaId || undefined,
          habitacionId: comanda.habitacionId || undefined,
          huespedId: comanda.huespedTitularId || undefined,
          productoInventarioId: null,
          comandaId: comanda.id,
          comandaDetalleId: detalle.id,
          cajaSesionId: null,
          usuarioId: linea.usuarioId,
          monto: detalle.montoLinea,
          moneda: detalle.moneda || 'PEN',
          impuestosIds: detalle.impuestosIds,
          impuestosMontoDesglosado: detalle.impuestosMontoDesglosado,
          subtotal: detalle.subtotal,
          descuentosIds: [],
          descuentosMontoDesglosado: [],
          propinaMonto: detalle.esPropina ? detalle.montoLinea : 0,
          estado: 'PENDIENTE_COBRO',
          fechaCargo: now,
          fechaAplicacion: now,
          fechaVencimiento: null as any,
          esAnulado: false,
          motivoAnulacion: '',
          comprobanteAsociadoId: null,
          comentarios: detalle.observaciones || '',
          createdAt: now,
          updatedAt: now,
          createdBy: linea.usuarioId,
          updatedBy: linea.usuarioId,
        } as Create<CargoFolio>);
      }
    }

    this.recalcularTotales(comandaId, linea.usuarioId);
    return detalle;
  },

  quitarLinea(detalleId: string, usuarioId: string): boolean {
    const det = db.getById<ComandaDetalle>(KEY_COMDET, detalleId);
    if (!det) return false;
    const comandaId = det.comandaId;
    const ok = db.remove(KEY_COMDET, detalleId);
    if (ok) dbRemota.removeAsync(KEY_COMDET, detalleId).catch((e) => console.error('[Comanda.quitarLinea] remoto fail:', e));
    if (ok && comandaId) this.recalcularTotales(comandaId, usuarioId);
    return ok;
  },

  actualizarLinea(detalleId: string, payload: any, usuarioId: string): ComandaDetalle | undefined {
    const delta = { ...payload, updatedAt: seedUtil.nowISO(), updatedBy: usuarioId };
    if (delta.precioUnitario !== undefined) delta.precioUnitario = Number(delta.precioUnitario || 0);
    if (delta.cantidad !== undefined) delta.cantidad = Number(delta.cantidad || 0);
    if (delta.subtotal !== undefined) delta.subtotal = Number(delta.subtotal || 0);
    if (delta.montoLinea !== undefined) delta.montoLinea = Number(delta.montoLinea || 0);
    if (delta.descuentoMonto !== undefined) delta.descuentoMonto = Number(delta.descuentoMonto || 0);
    const upd = db.update<ComandaDetalle>(KEY_COMDET, detalleId, delta as any);
    if (upd) {
      dbRemota.updateAsync<ComandaDetalle>(KEY_COMDET, detalleId, delta as any).catch((e) => console.error('[Comanda.actualizarLinea] remoto fail:', e));
      this.recalcularTotales(upd.comandaId, usuarioId);
    }
    return upd;
  },

  cambiarEstado(comandaId: string, nuevoEstado: EstadoComanda, usuarioId: string, comentario?: string): Comanda | undefined {
    const delta = {
      estado: nuevoEstado,
      updatedBy: usuarioId,
      updatedAt: seedUtil.nowISO(),
      observacionesInternas: comentario,
    };
    const actualizados = db.update<Comanda>(KEY_COM, comandaId, delta as unknown as Update<Comanda>);
    if (actualizados) dbRemota.updateAsync<Comanda>(KEY_COM, comandaId, delta as any).catch((e) => console.error('[Comanda.cambiarEstado] remoto fail:', e));
    return actualizados ? this.buscarPorId(actualizados.id) : undefined;
  },

  cerrarYcobrar(params: {
    comandaId: string;
    usuarioId: string;
    metodoPago: any;
    montoTotalCobrado: number;
    montoVuelto?: number;
    referencia?: string;
    observaciones?: string;
    incluyePropinaMonto?: number;
  }): Comanda | undefined {
    const comanda = this.buscarPorId(params.comandaId);
    if (!comanda) return undefined;

    if (comanda.mesaId && comanda.mesa?.zona !== 'ROOM_SERVICE') {
      MesaService.cambiarEstado(comanda.mesaId, 'SUCIA', params.usuarioId);
    }

    const now = seedUtil.nowISO();
    const delta: any = {
      estado: 'CERRADA_COBRADA',
      estadoEntrega: 'COBRADA_Y_CERRADA',
      cierre: {
        id: seedUtil.generateUUID(),
        comandaId: params.comandaId,
        tipo: comanda.tipoConsumo === 'CARGO_A_HABITACION' ? 'CARGO_A_FOLIO' : 'COBRO_DIRECTO',
        folioIdCargado: comanda.folioId,
        cajaSesionId: null,
        usuarioIdCierre: params.usuarioId,
        fechaHoraCierre: now,
        observaciones: params.observaciones || '',
        metodoPago: params.metodoPago,
        montoTotalCobrado: Number(params.montoTotalCobrado || 0),
        montoVuelto: Number(params.montoVuelto || 0),
        referencia: params.referencia || '',
        createdAt: now,
        updatedAt: now,
        createdBy: params.usuarioId,
        updatedBy: params.usuarioId,
      } as any,
      totalCobrado: Number((comanda.totalCobrado + Number(params.montoTotalCobrado || 0)).toFixed(2)),
      totalPropinas: Number((comanda.totalPropinas + Number(params.incluyePropinaMonto || 0)).toFixed(2)),
      propinaAplicadaMonto: Number(params.incluyePropinaMonto || comanda.propinaAplicadaMonto || 0),
      fechaCierre: now,
      horaCierre: now,
      updatedBy: params.usuarioId,
      updatedAt: now,
    };
    const cerrada = db.update<Comanda>(KEY_COM, params.comandaId, delta as unknown as Update<Comanda>);
    if (cerrada) dbRemota.updateAsync<Comanda>(KEY_COM, params.comandaId, delta as any).catch((e) => console.error('[Comanda.cerrarCobrar] remoto fail:', e));
    return cerrada ? this.buscarPorId(cerrada.id) : undefined;
  },

  anular(comandaId: string, usuarioId: string, motivo = ''): Comanda | undefined {
    const delta = {
      estado: 'ANULADA',
      estadoEntrega: 'ANULADA',
      updatedBy: usuarioId,
      updatedAt: seedUtil.nowISO(),
      observacionesInternas: motivo,
      fechaCierre: seedUtil.nowISO(),
      horaCierre: seedUtil.nowISO(),
    };
    const upd = db.update<Comanda>(KEY_COM, comandaId, delta as unknown as Update<Comanda>);
    if (upd) {
      dbRemota.updateAsync<Comanda>(KEY_COM, comandaId, delta as any).catch((e) => console.error('[Comanda.anular] remoto fail:', e));
      if (upd.mesaId) MesaService.cambiarEstado(upd.mesaId, 'LIBRE', usuarioId);
    }
    return upd ? this.buscarPorId(upd.id) : undefined;
  },

  reiniciarSeed(): void {
    db.reset();
  },
};

export const PosService = {
  hidratarDesdeSupabase: _hidratarDesdeSupabasePos,
};
