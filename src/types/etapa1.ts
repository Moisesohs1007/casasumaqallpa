import type {
  ID,
  UUID,
  DateISO,
  DateTimeISO,
  Moneda,
  TipoDocumento,
  Genero,
  EstadoGeneral,
  AuditFields,
} from './common';

// ───────────────────────────────────────────────
// 1.1 Habitaciones y tipos
// ───────────────────────────────────────────────

export interface TipoHabitacion extends AuditFields {
  id: ID;
  nombre: string;
  descripcion?: string;
  capacidadAdultos: number;
  capacidadNinos: number;
  camas: CamaHabitacion[];
  serviciosIncluidos: string[];
  fotos: string[];
  estado: EstadoGeneral;
}

export interface CamaHabitacion {
  tipo:
    | 'SIMPLE'
    | 'DOBLE'
    | 'QUEEN'
    | 'KING'
    | 'MATRIMONIAL'
    | 'SOFACAMA'
    | 'CUNA'
    | 'OTRO';
  cantidad: number;
}

export type EstadoHabitacion =
  | 'LIBRE'
  | 'OCUPADA'
  | 'RESERVADA'
  | 'BLOQUEADA'
  | 'LIMPIEZA'
  | 'INSPECCIONADA'
  | 'MANTENIMIENTO';

export interface Habitacion extends AuditFields {
  id: ID;
  codigo: string;
  nombre?: string;
  tipoHabitacionId: ID;
  tipoHabitacion?: TipoHabitacion;
  piso?: string;
  ubicacion?: string;
  estado: EstadoHabitacion;
  notasInternas?: string;
  bloqueadaHasta?: DateISO;
  motivoBloqueo?: string;
}

// ───────────────────────────────────────────────
// 1.2 Tarifas y temporadas
// ───────────────────────────────────────────────

export type TipoRegimen =
  | 'SOLO_ALOJAMIENTO'
  | 'DESAYUNO'
  | 'MEDIA_PENSION'
  | 'PENSION_COMPLETA'
  | 'TODO_INCLUIDO';

export type TipoPoliticaCancelacion =
  | 'FLEXIBLE'
  | 'MODERADA'
  | 'ESTRICTA'
  | 'NO_REEMBOLSABLE'
  | 'PERSONALIZADA';

export interface Temporada extends AuditFields {
  id: ID;
  nombre: string;
  tipo: 'ALTA' | 'MEDIA' | 'BAJA' | 'FERIADO' | 'ESPECIAL';
  fechaInicio: DateISO;
  fechaFin: DateISO;
  descripcion?: string;
}

export interface PoliticaCancelacion extends AuditFields {
  id: ID;
  nombre: string;
  tipo: TipoPoliticaCancelacion;
  diasAntesParaCancelarGratis?: number;
  porcentajeMultaPorCancelacionTardia?: number;
  porcentajeMultaNoShow?: number;
  notas?: string;
}

export interface Tarifa extends AuditFields {
  id: ID;
  nombre: string;
  tipoHabitacionId: ID;
  tipoHabitacion?: TipoHabitacion;
  moneda: Moneda;
  precioBasePorNoche: number;
  regimen: TipoRegimen;
  temporadaId?: ID;
  temporada?: Temporada;
  fechaInicioVigencia?: DateISO;
  fechaFinVigencia?: DateISO;
  minimoNoches: number;
  maximoNoches?: number;
  politicaCancelacionId: ID;
  politicaCancelacion?: PoliticaCancelacion;
  impuestos: ImpuestoTarifa[];
  cargosExtraPersona?: number;
  cargosExtraNino?: number;
  estado: EstadoGeneral;
}

export interface ImpuestoTarifa {
  nombre: 'IGV' | 'IGV_SELVA' | 'INAFECTO' | 'EXONERADO' | 'OTRO';
  porcentaje: number;
  base?: 'PRECIO_BASE' | 'TOTAL';
  descripcion?: string;
}

export interface CodigoPromocional extends AuditFields {
  id: ID;
  codigo: string;
  tipoDescuento: 'PORCENTAJE' | 'MONTO_FIJO' | 'NOCHE_GRATIS';
  valorDescuento: number;
  minimoNoches?: number;
  fechaInicio?: DateISO;
  fechaFin?: DateISO;
  usosPermitidos?: number;
  usosRealizados?: number;
  tipoHabitacionIds?: ID[];
  estado: EstadoGeneral;
}

export interface TarifaPorOrigen extends AuditFields {
  id: ID;
  tarifaId: ID;
  origenReserva: OrigenReserva;
  porcentajeRecargo?: number;
  porcentajeDescuento?: number;
  comisionOTA?: number;
}

// ───────────────────────────────────────────────
// 1.3 Calendario de disponibilidad
// ───────────────────────────────────────────────

export type EstadoDisponibilidad =
  | 'DISPONIBLE'
  | 'RESERVADA'
  | 'OCUPADA'
  | 'BLOQUEADA';

export interface DisponibilidadPorDia {
  fecha: DateISO;
  habitacionId: ID;
  estado: EstadoDisponibilidad;
  reservaId?: ID;
  tarifaId?: ID;
  precioNoche?: number;
  notas?: string;
}

export interface InventarioPorTipo {
  fecha: DateISO;
  tipoHabitacionId: ID;
  disponibles: number;
  vendidas: number;
  total: number;
  precioMinimo: number;
}

export interface BloqueoManual extends AuditFields {
  id: ID;
  habitacionId: ID;
  fechaInicio: DateISO;
  fechaFin: DateISO;
  motivo: 'MANTENIMIENTO' | 'REMODELACION' | 'RESERVA_INTERNA' | 'OTRO';
  descripcion?: string;
  usuarioId: ID;
}

// ───────────────────────────────────────────────
// 1.4 Reservas
// ───────────────────────────────────────────────

export type OrigenReserva =
  | 'DIRECTA'
  | 'WHATSAPP'
  | 'TELEFONO'
  | 'CORREO'
  | 'BOOKING'
  | 'EXPEDIA'
  | 'AIRBNB'
  | 'TRIPADVISOR'
  | 'AGENCIA_VIAJES'
  | 'TOUR_OPERADOR'
  | 'WEB_OFICIAL'
  | 'OTRO';

export type EstadoReserva =
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'CHECKIN'
  | 'CHECKOUT'
  | 'CANCELADA'
  | 'NO_SHOW'
  | 'MODIFICADA';

export interface HabitacionReserva {
  id: ID;
  reservaId: ID;
  habitacionId: ID;
  habitacion?: Habitacion;
  tipoHabitacionId: ID;
  tarifaId: ID;
  tarifa?: Tarifa;
  fechaCheckIn: DateISO;
  fechaCheckOut: DateISO;
  noches: number;
  adultos: number;
  ninos: number;
  precioTotalReservaHabitacion: number;
  moneda: Moneda;
  notas?: string;
}

export interface Reserva extends AuditFields {
  id: ID;
  codigo: string;
  huespedTitularId: ID;
  huespedTitular?: Huesped;
  acompaniantes?: Acompaniante[];
  habitaciones: HabitacionReserva[];
  origen: OrigenReserva;
  subOrigen?: string;
  estado: EstadoReserva;
  fechaCreacion: DateTimeISO;
  fechaConfirmacion?: DateTimeISO;
  fechaCheckIn: DateISO;
  fechaCheckOut: DateISO;
  horaEstimadaLlegada?: string;
  horaEstimadaSalida?: string;
  noches: number;
  adultosTotal: number;
  ninosTotal: number;
  moneda: Moneda;
  subTotalAlojamiento: number;
  impuestos: number;
  descuentos: number;
  codigoPromocionalId?: ID;
  totalReserva: number;
  anticipo?: number;
  metodoPagoAnticipo?: string;
  fechaAnticipo?: DateTimeISO;
  politicaCancelacionId: ID;
  politicaCancelacion?: PoliticaCancelacion;
  agenciaId?: ID;
  agenteId?: ID;
  pedidosEspeciales?: string;
  restriccionesAlimentariasTitular?: string;
  mascotas?: MascotaInfo;
  notasInternas?: string;
  historialCambios: CambioReserva[];
}

export interface Acompaniante {
  id: ID;
  nombres: string;
  apellidos: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  edad?: number;
  parentesco?: string;
}

export interface MascotaInfo {
  cantidad: number;
  tipo: string;
  tamanio: 'CHICO' | 'MEDIANO' | 'GRANDE';
  raza?: string;
  nombre?: string;
  cargoAdicional?: number;
}

export interface CambioReserva {
  id: ID;
  fecha: DateTimeISO;
  usuarioId: ID;
  tipoCambio:
    | 'CREADA'
    | 'MODIFICADA'
    | 'CANCELADA'
    | 'CHECKIN'
    | 'CHECKOUT'
    | 'REACTIVADA'
    | 'ANTICIPO'
    | 'CAMBIO_ESTADO'
    | 'OTRO';
  campoCambiado?: string;
  valorAnterior?: string;
  valorNuevo?: string;
  motivo?: string;
}

// ───────────────────────────────────────────────
// 1.5 Huéspedes
// ───────────────────────────────────────────────

export type PreferenciaAlimentaria =
  | 'NINGUNA'
  | 'VEGETARIANO'
  | 'VEGANO'
  | 'SIN_GLUTEN'
  | 'SIN_LACTEOS'
  | 'HALAL'
  | 'KOSHER'
  | 'OTRO';

export interface Nacionalidad {
  codigo: string;
  nombre: string;
}

export interface Huesped extends AuditFields {
  id: ID;
  uuid: UUID;
  nombres: string;
  apellidos: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  fechaNacimiento?: DateISO;
  genero?: Genero;
  nacionalidad?: string;
  paisResidencia?: string;
  ciudadProcedencia?: string;
  direccion?: string;
  telefonoCelular: string;
  telefonoFijo?: string;
  correoElectronico?: string;
  whatsapp?: boolean;
  preferenciasAlimentarias: PreferenciaAlimentaria;
  otrasRestriccionesAlimentarias?: string;
  alergiasConocidas?: string;
  medicacion?: string;
  necesidadesEspeciales?: string;
  consentimientoDatos?: boolean;
  fechaUltimoConsentimiento?: DateTimeISO;
  contactoSosEmergencia?: ContactoEmergencia;
  estadoCivil?: string;
  profesion?: string;
  motivoViaje?: string;
  comoSeEntero?: string;
  tags: EtiquetaHuesped[];
  notasInternas?: string;
  foto?: string;
}

export interface ContactoEmergencia {
  nombres: string;
  apellidos?: string;
  telefono: string;
  correo?: string;
  parentesco?: string;
  notas?: string;
}

export interface EtiquetaHuesped {
  id: ID;
  nombre: string;
  color?: string;
  tipo?: 'FIJO' | 'CALCULADO';
}

export interface HistorialEstadia {
  id: ID;
  huespedId: ID;
  reservaId: ID;
  habitacionIds: ID[];
  fechaCheckIn: DateISO;
  fechaCheckOut: DateISO;
  noches: number;
  montoTotalConsumo: number;
  moneda: Moneda;
  calificacionInterna?: number;
  comentariosInternos?: string;
}
