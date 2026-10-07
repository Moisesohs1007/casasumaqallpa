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
