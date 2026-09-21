import { seed, seedUtil, type Create, type Update } from './__seed__';
import type {
  TipoHabitacion, Habitacion, Tarifa, Temporada, PoliticaCancelacion, CodigoPromocional,
  Reserva, Huesped, Folio, CargoFolio, PagoFolio,
  Usuario, Rol, PuntoVenta, CategoriaFB, ProductoFB, PresentacionProducto, ModificadorProducto,
  AlergenoProducto, Mesa, Comanda, ComandaDetalle, ImpuestoTarifa
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
      folios: CLONE(seed.folios),
      cargosFolio: CLONE(seed.folios.flatMap((f) => f.cargos || [])),
      pagosFolio: CLONE([...seed.pagosFolio, ...seed.folios.flatMap((f) => f.pagos || [])]),
      comandas: CLONE(seed.comandas),
      comandasDetalles: CLONE(seed.comandas.flatMap((c) => c.detalles?.map((d) => ({ ...d, comandaId: c.id })) || [])),
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
  Usuario, Rol, PuntoVenta, CategoriaFB, ProductoFB, PresentacionProducto, ModificadorProducto,
  AlergenoProducto, Mesa, Comanda, ComandaDetalle, ImpuestoTarifa
};
