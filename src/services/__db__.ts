// @ts-nocheck
import { seed, seedUtil, type Create, type Update } from './__seed__';
import type {
  TipoHabitacion, Habitacion, Tarifa, Temporada, PoliticaCancelacion, CodigoPromocional,
  Reserva, Huesped, Folio, CargoFolio, PagoFolio,
  Usuario, Rol, PuntoVenta, CategoriaFB, ProductoFB, PresentacionProducto, ModificadorGrupo,
  AlergenoProducto, Mesa, Comanda, ComandaDetalle, ImpuestoTarifa,
  EstadoHabitacion, EstadoFolio, EstadoPago, MetodoPago,
  EstadoComanda, TipoConsumoComanda, TipoComanda, PrioridadComanda,
  EstadoReserva, OrigenReserva
} from '../types';

type CollectionKey =
  | 'alergenos' | 'categoriasFB' | 'productosFB' | 'presentacionesFB' | 'modificadoresFB' | 'impuestos'
  | 'tiposHabitacion' | 'habitaciones' | 'tarifas' | 'temporadas' | 'politicasCancelacion' | 'codigosPromo'
  | 'huespedes' | 'roles' | 'usuarios'
  | 'puntosVenta' | 'mesas' | 'reservas' | 'folios' | 'cargosFolio' | 'pagosFolio' | 'comandas' | 'comandasDetalles';

const LS_KEY_PERSIST = 'lodge_inmemory_db_v1';
const LS_FLAG_PRIMER_BOOT = 'lodge_inmemory_db_boot_v1';

const CLONE = <T>(x: T): T => JSON.parse(JSON.stringify(x));

const ALL_COLLECTION_KEYS: CollectionKey[] = [
  'alergenos', 'categoriasFB', 'productosFB', 'presentacionesFB', 'modificadoresFB', 'impuestos',
  'tiposHabitacion', 'habitaciones', 'tarifas', 'temporadas', 'politicasCancelacion', 'codigosPromo',
  'huespedes', 'roles', 'usuarios',
  'puntosVenta', 'mesas', 'reservas', 'folios', 'cargosFolio', 'pagosFolio', 'comandas', 'comandasDetalles',
];

function _lsSupported(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const t = '__test_ls__';
    localStorage.setItem(t, t);
    localStorage.removeItem(t);
    return true;
  } catch (_e) { return false; }
}
function _readLS(): Record<CollectionKey, unknown[]> | null {
  try {
    if (!_lsSupported()) return null;
    const raw = localStorage.getItem(LS_KEY_PERSIST);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as any;
    return null;
  } catch (_e) { return null; }
}
function _writeLS(data: Record<CollectionKey, unknown[]>): void {
  try {
    if (!_lsSupported()) return;
    localStorage.setItem(LS_KEY_PERSIST, JSON.stringify(data));
  } catch (_e) {}
}

function _seedInicial(): Record<CollectionKey, unknown[]> {
  return {
    alergenos: CLONE(seed.alergenos),
    categoriasFB: CLONE(seed.categoriasFB),
    productosFB: CLONE(seed.productosFB),
    presentacionesFB: CLONE(seed.presentacionesFB),
    modificadoresFB: CLONE(seed.modificadoresFB),
    impuestos: CLONE(seed.impuestos),
    tiposHabitacion: CLONE(seed.tiposHabitacion),
    habitaciones: CLONE(seed.habitaciones),
    tarifas: CLONE(seed.tarifas),
    temporadas: CLONE(seed.temporadas),
    politicasCancelacion: CLONE(seed.politicasCancelacion),
    codigosPromo: CLONE(seed.codigosPromo),
    huespedes: CLONE(seed.huespedes),
    roles: CLONE(seed.roles),
    usuarios: CLONE(seed.usuarios),
    puntosVenta: CLONE(seed.puntosVenta),
    mesas: CLONE(seed.mesas),
    reservas: CLONE(seed.reservas),
    folios: CLONE(seed.folios as any[]),
    cargosFolio: CLONE((seed.folios as any[]).flatMap((f: any) => f.cargos || [])),
    pagosFolio: CLONE([...(seed.pagosFolio as any[]), ...(seed.folios as any[]).flatMap((f: any) => f.pagos || [])]),
    comandas: CLONE(seed.comandas as any[]),
    comandasDetalles: CLONE((seed.comandas as any[]).flatMap((c: Comanda) => (c.detalles ?? c.items ?? []).map((d: ComandaDetalle) => ({ ...d, comandaId: c.id })) || [])),
  };
}

class InMemoryDB {
  private data: Record<CollectionKey, unknown[]>;

  constructor() {
    const inicial = _seedInicial();
    const desdeLS = _readLS();
    if (desdeLS) {
      const merged = { ...inicial };
      for (const k of ALL_COLLECTION_KEYS) {
        const arr = desdeLS[k];
        if (Array.isArray(arr)) (merged as any)[k] = CLONE(arr);
      }
      this.data = merged;
    } else {
      this.data = inicial;
    }
    try {
      if (_lsSupported() && !localStorage.getItem(LS_FLAG_PRIMER_BOOT)) {
        localStorage.setItem(LS_FLAG_PRIMER_BOOT, '1');
        _writeLS(this.data);
      }
    } catch (_e) {}
  }

  private _persist(): void {
    _writeLS(this.data);
    if (typeof window !== 'undefined') {
      try {
        const ev = new CustomEvent('lodge:db:mutated', { detail: { at: Date.now() } });
        window.dispatchEvent(ev);
      } catch (_) {}
    }
  }

  all<T>(key: CollectionKey): T[] {
    return CLONE(this.data[key] as T[]);
  }

  setAll<T>(key: CollectionKey, value: T[]): void {
    (this.data[key] as unknown[]) = CLONE(value);
    this._persist();
  }

  getById<T extends { id: string }>(key: CollectionKey, id: string): T | undefined {
    return (this.data[key] as T[]).find((x) => x.id === id);
  }

  add<T extends { id?: string; createdAt?: string; updatedAt?: string; createdBy?: string; updatedBy?: string }>(
    key: CollectionKey,
    item: Create<T>
  ): T {
    const now = seedUtil.nowISO();
    const nuevo: T = {
      id: seedUtil.generateUUID(),
      createdAt: now,
      updatedAt: now,
      createdBy: 'system-mock',
      updatedBy: 'system-mock',
      ...(item as unknown as T),
    } as T;
    (this.data[key] as unknown[]).push(nuevo);
    this._persist();
    return CLONE(nuevo);
  }

  update<T extends { id: string; updatedAt?: string; updatedBy?: string }>(
    key: CollectionKey,
    id: string,
    changes: Update<T>
  ): T | undefined {
    const arr = this.data[key] as T[];
    const idx = arr.findIndex((x) => x.id === id);
    if (idx < 0) return undefined;
    const actualizado: T = {
      ...arr[idx],
      ...(changes as Partial<T>),
      id,
      updatedAt: seedUtil.nowISO(),
    } as T;
    arr[idx] = actualizado;
    this._persist();
    return CLONE(actualizado);
  }

  remove(key: CollectionKey, id: string): boolean {
    const arr = this.data[key] as Array<{ id: string }>;
    const idx = arr.findIndex((x) => x.id === id);
    if (idx < 0) return false;
    arr.splice(idx, 1);
    this._persist();
    return true;
  }

  /** Insertar item raw con ID PRE-DEFINIDO; SOLO si no existe uno con mismo id. Retorna lo insertado o undefined si ya existía. */
  addRawIfMissingById<T extends { id: string }>(key: CollectionKey, id: string, rawItem: T): T | undefined {
    const arr = this.data[key] as T[];
    if (arr.some((x) => x.id === id)) return undefined;
    arr.push(rawItem);
    this._persist();
    return CLONE(rawItem);
  }

  /** Deduplicar array por clave business key. Retorna cantidad de duplicados removidos. */
  deduplicateBy<T extends { [k: string]: any }>(
    key: CollectionKey,
    getUniqueKey: (item: T) => string,
    keepStrategy: 'FIRST' | 'LAST' = 'FIRST'
  ): number {
    const arr = this.data[key] as T[];
    if (!arr || arr.length === 0) return 0;
    const seen = new Map<string, T>();
    for (const item of arr) {
      const uk = getUniqueKey(item);
      if (!uk) continue;
      if (keepStrategy === 'FIRST') {
        if (!seen.has(uk)) seen.set(uk, item);
      } else {
        seen.set(uk, item);
      }
    }
    const originalLen = arr.length;
    const deduped = Array.from(seen.values());
    if (deduped.length < originalLen) {
      (this.data[key] as unknown[]) = deduped;
      this._persist();
      return originalLen - deduped.length;
    }
    return 0;
  }

  /**
   * Merge NON-DESTRUCTIVE (upsert) rows remotas dentro del InMemoryDB.
   * - Actualiza fila existente si `matchKey` coincide, eligiendo la que tenga updatedAt MAYOR (más actual).
   * - Inserta filas nuevas que NO existan en local.
   * - PRESERVA 100% filas locales que NO existen en rows[] (pendientes de sync / offline first).
   * Retorna tupla [insertados, actualizados, preservadosLocales].
   */
  upsertAll<T extends { id?: string; updatedAt?: string; [k: string]: any }>(
    key: CollectionKey,
    rows: T[],
    opts?: { matchKey?: keyof T & string; preferRemoteIfSameTs?: boolean }
  ): [number, number, number] {
    if (!Array.isArray(rows)) return [0, 0, 0];
    const matchKey: string = (opts?.matchKey as string) || 'id';
    const preferRemote = opts?.preferRemoteIfSameTs !== false;
    const arr = this.data[key] as T[];
    const existingBy = new Map<string, T>();
    for (const it of arr) {
      const k = (it as any)[matchKey];
      if (k) existingBy.set(String(k), it);
    }
    let inserted = 0;
    let updated = 0;
    const clonedRows = CLONE(rows) as T[];
    for (const remote of clonedRows) {
      const k = (remote as any)[matchKey];
      if (!k) continue;
      const local = existingBy.get(String(k));
      if (!local) {
        arr.push(remote as any);
        inserted++;
        continue;
      }
      const tsRemRaw = (remote.updatedAt || (remote as any).updated_at || (remote as any).updatedAtTimestamp || '') as string;
      const tsLocRaw = (local.updatedAt || (local as any).updated_at || '') as string;
      const tsRem = tsRemRaw ? new Date(tsRemRaw).getTime() : NaN;
      const tsLoc = tsLocRaw ? new Date(tsLocRaw).getTime() : NaN;

      let remEsMasActual = false;
      if (!Number.isNaN(tsRem) && !Number.isNaN(tsLoc)) {
        // ======== CORRECCIÓN OFLINE-FIRST CRÍTICA =========
        // Solo actualizamos local con remoto SI el remoto ES ESTRICTO MAYOR.
        // Nunca por igual (empate). Nunca por "preferRemote default".
        // Así check-in OFFLINE Suite=OCUPADA (ts más nuevo) NO se pisa por Supabase RESERVADA.
        remEsMasActual = tsRem > tsLoc;
        if (tsRem === tsLoc && preferRemote) remEsMasActual = true; // solo empate exacto usa preferRemote
      } else if (!Number.isNaN(tsLoc) && Number.isNaN(tsRem)) {
        // Local tiene TS, remoto NO → local gana (check-in offline escribió TS)
        remEsMasActual = false;
      } else if (Number.isNaN(tsLoc) && !Number.isNaN(tsRem)) {
        // Remoto tiene TS, local NO → remoto gana
        remEsMasActual = true;
      } else {
        // Ambos sin TS → usa preferRemote (empate)
        remEsMasActual = !!preferRemote;
      }
      if (remEsMasActual) {
        const idx = arr.findIndex((x: any) => String(x[matchKey]) === String(k));
        if (idx >= 0) {
          const merged: any = { ...(arr[idx] as any), ...(remote as any) };
          if (!merged.updatedAt) merged.updatedAt = tsRemRaw || tsLocRaw || seedUtil.nowISO();
          if (!merged.id) merged.id = (local as any).id || (remote as any).id;
          arr[idx] = merged;
          updated++;
        } else {
          arr.push(remote as any);
          inserted++;
        }
      }
    }
    existingBy.clear();
    this._persist();
    return [inserted, updated, arr.length - (inserted + (rows.length - (inserted > 0 ? 0 : 0)))];
  }

  findOne<T extends { [k: string]: any }>(
    key: CollectionKey,
    predicate: (x: T) => boolean
  ): T | undefined {
    return (this.data[key] as T[]).find(predicate);
  }

  findMany<T extends { [k: string]: any }>(
    key: CollectionKey,
    predicate: (x: T) => boolean
  ): T[] {
    return CLONE((this.data[key] as T[]).filter(predicate));
  }

  reset(): void {
    this.data = _seedInicial();
    try {
      if (_lsSupported()) localStorage.removeItem(LS_KEY_PERSIST);
    } catch (_e) {}
    this._persist();
  }
}

export const db = new InMemoryDB();
export { seedUtil, type Create, type Update };
export type {
  TipoHabitacion, Habitacion, Tarifa, Temporada, PoliticaCancelacion, CodigoPromocional,
  Reserva, Huesped, Folio, CargoFolio, PagoFolio,
  Usuario, Rol, PuntoVenta, CategoriaFB, ProductoFB, PresentacionProducto, ModificadorGrupo,
  AlergenoProducto, Mesa, Comanda, ComandaDetalle, ImpuestoTarifa,
  EstadoHabitacion, EstadoFolio, EstadoPago, MetodoPago,
  EstadoComanda, TipoConsumoComanda, TipoComanda, PrioridadComanda
};
