import { supabase } from './supabaseClient';
import { toSnake, toCamel } from './_case';
import { seed, seedUtil, type Create, type Update } from './__seed__';
import type {
  TipoHabitacion, Habitacion, Tarifa, Temporada, PoliticaCancelacion, CodigoPromocional,
  Reserva, Huesped, Folio, CargoFolio, PagoFolio,
  Usuario, Rol, PuntoVenta, CategoriaFB, ProductoFB, PresentacionProducto, ModificadorOpcion,
  AlergenoProducto, Mesa, Comanda, ComandaDetalle, ImpuestoTarifa,
  EstadoHabitacion, EstadoReserva, OrigenReserva,
  EstadoComanda, TipoConsumoComanda, PrioridadComanda, EstadoMesa,
  EstadoFolio, EstadoPago, MetodoPago
} from '../types';

export type TipoComanda = TipoConsumoComanda;

export { seedUtil, type Create, type Update };
export type {
  TipoHabitacion, Habitacion, Tarifa, Temporada, PoliticaCancelacion, CodigoPromocional,
  Reserva, Huesped, Folio, CargoFolio, PagoFolio,
  Usuario, Rol, PuntoVenta, CategoriaFB, ProductoFB, PresentacionProducto, ModificadorOpcion,
  AlergenoProducto, Mesa, Comanda, ComandaDetalle, ImpuestoTarifa,
  EstadoHabitacion, EstadoReserva, OrigenReserva,
  EstadoComanda, TipoConsumoComanda, PrioridadComanda, EstadoMesa,
  EstadoFolio, EstadoPago, MetodoPago
};

type CollectionKey =
  | 'alergenos' | 'categoriasFB' | 'productosFB' | 'presentacionesFB' | 'modificadoresFB' | 'impuestos'
  | 'tiposHabitacion' | 'habitaciones' | 'tarifas' | 'temporadas' | 'politicasCancelacion' | 'codigosPromo'
  | 'huespedes' | 'roles' | 'usuarios'
  | 'puntosVenta' | 'mesas' | 'reservas' | 'folios' | 'cargosFolio' | 'pagosFolio' | 'comandas' | 'comandasDetalles';

const TABLE: Record<CollectionKey, string> = {
  alergenos: 'alergenos',
  categoriasFB: 'categorias_fb',
  productosFB: 'productos_fb',
  presentacionesFB: 'presentaciones_fb',
  modificadoresFB: 'modificadores_fb',
  impuestos: 'impuestos',
  tiposHabitacion: 'tipos_habitacion',
  habitaciones: 'habitaciones',
  tarifas: 'tarifas',
  temporadas: 'temporadas',
  politicasCancelacion: 'politicas_cancelacion',
  codigosPromo: 'codigos_promo',
  huespedes: 'huespedes',
  roles: 'roles',
  usuarios: 'usuarios',
  puntosVenta: 'puntos_venta',
  mesas: 'mesas',
  reservas: 'reservas',
  folios: 'folios',
  cargosFolio: 'cargos_folio',
  pagosFolio: 'pagos_folio',
  comandas: 'comandas',
  comandasDetalles: 'comandas_detalles',
};

const CLONE = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const tryNum = (v: any): any => (typeof v === 'bigint' ? Number(v) : v);
const normalizeRow = <T>(r: any): T => {
  if (!r) return undefined as any;
  const obj: any = {};
  for (const k of Object.keys(r)) obj[k] = tryNum(r[k]);
  return toCamel<T>(obj);
};

class SupabaseDB {
  all<T>(key: CollectionKey): T[] {
    throw new Error('SupabaseDB.all() es async; usa allAsync()');
  }

  async allAsync<T>(key: CollectionKey): Promise<T[]> {
    const { data, error } = await supabase.from(TABLE[key]).select('*');
    if (error) {
      console.error(`[SupabaseDB.allAsync] ${TABLE[key]} →`, error.message);
      return [];
    }
    return (data || []).map((r) => normalizeRow<T>(r));
  }

  async setAllAsync<T>(key: CollectionKey, _value: T[]): Promise<void> {
    console.warn('[SupabaseDB.setAllAsync] no implementado (upsert multi-row)');
  }

  getById<T extends { id: string }>(_key: CollectionKey, _id: string): T | undefined {
    throw new Error('SupabaseDB.getById() es async; usa getByIdAsync()');
  }

  async getByIdAsync<T extends { id: string }>(key: CollectionKey, id: string): Promise<T | undefined> {
    const { data, error } = await supabase.from(TABLE[key]).select('*').eq('id', id).maybeSingle();
    if (error) {
      console.error(`[SupabaseDB.getByIdAsync] ${TABLE[key]}/${id} →`, error.message);
      return undefined;
    }
    return data ? normalizeRow<T>(data) : undefined;
  }

  add<T extends { id?: string; createdAt?: string; updatedAt?: string; createdBy?: string; updatedBy?: string }>(
    _key: CollectionKey,
    _item: Create<T>
  ): T {
    throw new Error('SupabaseDB.add() es async; usa addAsync()');
  }

  async addAsync<T extends { id?: string; createdAt?: string; updatedAt?: string; createdBy?: string; updatedBy?: string }>(
    key: CollectionKey,
    item: Create<T>
  ): Promise<T> {
    const now = seedUtil.nowISO();
    const itemWithAudit: any = {
      id: (item as any).id || seedUtil.generateUUID(),
      createdAt: now,
      updatedAt: now,
      createdBy: (item as any).createdBy || 'system-supabase',
      updatedBy: (item as any).updatedBy || 'system-supabase',
      ...(item as any),
    };
    const snake = toSnake(itemWithAudit);
    const { data, error } = await supabase.from(TABLE[key]).insert(snake).select().maybeSingle();
    if (error) {
      console.error(`[SupabaseDB.addAsync] ${TABLE[key]} →`, error.message, snake);
      return CLONE(itemWithAudit) as T;
    }
    return (data ? normalizeRow<T>(data) : CLONE(itemWithAudit)) as T;
  }

  update<T extends { id: string; updatedAt?: string; updatedBy?: string }>(
    _key: CollectionKey,
    _id: string,
    _changes: Update<T>
  ): T | undefined {
    throw new Error('SupabaseDB.update() es async; usa updateAsync()');
  }

  async updateAsync<T extends { id: string; updatedAt?: string; updatedBy?: string }>(
    key: CollectionKey,
    id: string,
    changes: Update<T>
  ): Promise<T | undefined> {
    const patch: any = {
      ...(changes as any),
      id,
      updatedAt: seedUtil.nowISO(),
    };
    const snake = toSnake(patch);
    const { data, error } = await supabase.from(TABLE[key]).update(snake).eq('id', id).select().maybeSingle();
    if (error) {
      console.error(`[SupabaseDB.updateAsync] ${TABLE[key]}/${id} →`, error.message);
      return undefined;
    }
    return data ? normalizeRow<T>(data) : undefined;
  }

  remove(_key: CollectionKey, _id: string): boolean {
    throw new Error('SupabaseDB.remove() es async; usa removeAsync()');
  }

  async removeAsync(key: CollectionKey, id: string): Promise<boolean> {
    const { error } = await supabase.from(TABLE[key]).delete().eq('id', id);
    if (error) {
      console.error(`[SupabaseDB.removeAsync] ${TABLE[key]}/${id} →`, error.message);
      return false;
    }
    return true;
  }

  findOne<T extends { [k: string]: any }>(
    _key: CollectionKey,
    _predicate: (x: T) => boolean
  ): T | undefined {
    throw new Error('SupabaseDB.findOne() es async; usa findOneAsync()');
  }

  async findOneAsync<T extends { [k: string]: any }>(
    key: CollectionKey,
    predicate: (x: T) => boolean
  ): Promise<T | undefined> {
    const all = await this.allAsync<T>(key);
    return all.find(predicate);
  }

  findMany<T extends { [k: string]: any }>(
    _key: CollectionKey,
    _predicate: (x: T) => boolean
  ): T[] {
    throw new Error('SupabaseDB.findMany() es async; usa findManyAsync()');
  }

  async findManyAsync<T extends { [k: string]: any }>(
    key: CollectionKey,
    predicate: (x: T) => boolean
  ): Promise<T[]> {
    const all = await this.allAsync<T>(key);
    return CLONE(all.filter(predicate));
  }

  reset(): void {
    console.warn('[SupabaseDB.reset] no implementado; no se limpian tablas remotas.');
  }
}

export const db = new SupabaseDB();
export default db;
