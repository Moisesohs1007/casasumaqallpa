export type ID = string;

export type UUID = string;

export type Timestamp = string;

export type DateISO = string;

export type DateTimeISO = string;

export type Moneda = 'PEN' | 'USD' | 'EUR';

export type TipoDocumento =
  | 'DNI'
  | 'CE'
  | 'PASAPORTE'
  | 'RUC'
  | 'OTRO';

export type Genero = 'M' | 'F' | 'OTRO' | 'NO_DECLARA';

export type EstadoGeneral =
  | 'ACTIVO'
  | 'INACTIVO'
  | 'ELIMINADO';

export interface AuditFields {
  createdAt: DateTimeISO;
  updatedAt: DateTimeISO;
  createdBy?: ID;
  updatedBy?: ID;
}

export interface Paginacion {
  page: number;
  perPage: number;
  total: number;
}

export type SortDirection = 'asc' | 'desc';

export interface FiltroFecha {
  desde?: DateISO;
  hasta?: DateISO;
}

export type RespuestaAPI<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };
