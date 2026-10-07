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
  const flat: any = {};
  for (const k of Object.keys(r)) flat[k] = tryNum(r[k]);
  // Expand JSONB payload al nivel superior (permite guardar campos custom
  // sin ALTER TABLE, evitando HTTP 400 column not found en el API REST).
  // Los campos reales (columnas físicas) tienen prioridad sobre payload.
  if (flat.payload && typeof flat.payload === 'object' && !Array.isArray(flat.payload)) {
    for (const pk of Object.keys(flat.payload)) {
      if (flat[pk] === undefined || flat[pk] === null) flat[pk] = tryNum((flat.payload as any)[pk]);
    }
  }
  return toCamel<T>(flat);
};

// Columnas FÍSICAS reales de public.habitaciones (schema L119-138 initial_lodge_schema).
// Campos extra (capacidad, etc.) van al JSONB payload automáticamente.
const HABITACIONES_WHITELIST = new Set([
  'id','tipo_habitacion_id','codigo','nombre','piso','ubicacion','vista_efectiva',
  'estado','estado_limpieza','notas_internas','bloqueada_hasta','motivo_bloqueo',
  'ultima_limpieza_at','payload','created_at','updated_at','created_by','updated_by'
]);

// Columnas FÍSICAS reales de public.reservas (schema L334-370).
const RESERVA_WHITELIST = new Set([
  'id','codigo_reserva','huesped_id','origen','sub_origen','estado','fecha_creacion','fecha_confirmacion',
  'fecha_checkin','fecha_checkout','fecha_checkin_real','fecha_checkout_real','total_noches','total_personas',
  'adultos','ninos','moneda','politica_cancelacion_id','codigo_promocional_id','monto_total_reserva',
  'subtotal_alojamiento','impuestos','descuentos','pago_garantia','huesped','habitaciones','acompanantes',
  'historial_cambios','checkin_info','checkout_info','payload','created_at','updated_at','created_by','updated_by'
]);

/**
 * Aplica filtro de whitelist a un objeto snake_case para enviar al API REST de Supabase.
 * Campos fuera del whitelist se mergean en payload JSONB.
 */
function applyWhitelist(snake: any, whitelist: Set<string>): any {
  const row: any = {};
  const payloadExtra: any = {};
  Object.entries(snake || {}).forEach(([k, v]) => {
    if (k === 'payload') return; // manejado al final
    if (whitelist.has(k)) row[k] = v;
    else payloadExtra[k] = v;
  });
  row.payload = { ...(snake?.payload || {}), ...(payloadExtra || {}) };
  return row;
}

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
    let snake: any = toSnake(itemWithAudit);

    if (key === 'reservas') {
      // FIX codigo_reserva: siempre generar único desde Supabase remoto MAX+1
      try {
        const { data: codsList } = await supabase.from(TABLE[key]).select('codigo_reserva');
        let max = 1000;
        (codsList || []).forEach((r: any) => {
          const num = parseInt(String(r.codigo_reserva || '').replace(/^R-/i, ''), 10);
          if (Number.isFinite(num) && num > max) max = num;
        });
        snake.codigo_reserva = `R-${max + 1}`;
      } catch (_e) {
        snake.codigo_reserva = `R-${Date.now().toString().slice(-7)}`;
      }
    }

    // Aplicar whitelist para tablas con schema estricto (evita HTTP 400 column not found)
    if (key === 'reservas') snake = applyWhitelist(snake, RESERVA_WHITELIST);
    if (key === 'habitaciones') snake = applyWhitelist(snake, HABITACIONES_WHITELIST);

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
    let snake = toSnake(patch);
    // Aplicar whitelist para tablas con schema estricto (evita HTTP 400 column not found).
    // Para payload JSONB, leer existente primero y mergear para no perder campos previos.
    if (key === 'reservas' || key === 'habitaciones') {
      const whitelist = key === 'reservas' ? RESERVA_WHITELIST : HABITACIONES_WHITELIST;
      try {
        const { data: actual } = await supabase.from(TABLE[key]).select('payload').eq('id', id).maybeSingle() as any;
        if (actual && actual.payload && typeof actual.payload === 'object' && !Array.isArray(actual.payload)) {
          snake.payload = { ...actual.payload, ...(snake.payload || {}) };
        }
      } catch (_e) { /* ignore */ }
      snake = applyWhitelist(snake, whitelist);
    }
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
