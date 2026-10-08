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

const CLONE = <T>(x: T): T => JSON.parse(JSON.stringify(x));

class InMemoryDB {
  private data: Record<CollectionKey, unknown[]>;

  constructor() {
    this.data = {
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

  all<T>(key: CollectionKey): T[] {
    return CLONE(this.data[key] as T[]);
  }

  setAll<T>(key: CollectionKey, value: T[]): void {
    (this.data[key] as unknown[]) = CLONE(value);
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
    return CLONE(actualizado);
  }

  remove(key: CollectionKey, id: string): boolean {
    const arr = this.data[key] as Array<{ id: string }>;
    const idx = arr.findIndex((x) => x.id === id);
    if (idx < 0) return false;
    arr.splice(idx, 1);
    return true;
  }

  /** Insertar item raw con ID PRE-DEFINIDO; SOLO si no existe uno con mismo id. Retorna lo insertado o undefined si ya existía. */
  addRawIfMissingById<T extends { id: string }>(key: CollectionKey, id: string, rawItem: T): T | undefined {
    const arr = this.data[key] as T[];
    if (arr.some((x) => x.id === id)) return undefined;
    arr.push(rawItem);
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
      const tsRem = (remote.updatedAt || remote.updated_at || remote.updatedAtTimestamp || '') as string;
      const tsLoc = (local.updatedAt || (local as any).updated_at || '') as string;
      const remEsMasActual = tsRem && tsLoc ? tsRem > tsLoc : (preferRemote ? true : !!tsLoc);
      if (remEsMasActual || preferRemote) {
        const idx = arr.findIndex((x: any) => String(x[matchKey]) === String(k));
        if (idx >= 0) {
          const merged: any = { ...(arr[idx] as any), ...(remote as any) };
          if (!merged.updatedAt) merged.updatedAt = tsRem || tsLoc || seedUtil.nowISO();
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
    const fresh = new InMemoryDB();
    this.data = fresh.data;
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
