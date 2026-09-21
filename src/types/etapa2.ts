import type {
  ID,
  UUID,
  DateISO,
  DateTimeISO,
  Moneda,
  AuditFields,
  EstadoGeneral,
} from './common';
import type {
  Habitacion,
  Reserva,
  Huesped,
  EstadoHabitacion,
} from './etapa1';

// ───────────────────────────────────────────────
// 2.1 Check-in / Check-out
// ───────────────────────────────────────────────

export interface CheckIn extends AuditFields {
  id: ID;
  reservaId: ID;
  reserva?: Reserva;
  habitacionId: ID;
  habitacion?: Habitacion;
  huespedTitularId: ID;
  huespedTitular?: Huesped;
  documentosVerificados: DocumentoVerificado[];
  aceptaNormasLodge: boolean;
  fechaAceptacionNormas?: DateTimeISO;
  llaveEntregada?: boolean;
  cantidadLlavesEntregadas?: number;
  codigoLlaveDigital?: string;
  depositoGarantia?: number;
  metodoGarantia?: MetodoPago;
  referenciaGarantia?: string;
  horaRealLlegada: DateTimeISO;
  horaEstimadaCheckOut?: string;
  tarjetaRegistroFirmada?: boolean;
  urlFirmaRegistro?: string;
  horaCheckOutPrevista?: DateTimeISO;
  notas?: string;
  usuarioCheckInId: ID;
  estado: 'EN_PROGRESO' | 'FINALIZADO' | 'ANULADO';
}

export interface CheckOut extends AuditFields {
  id: ID;
  reservaId: ID;
  reserva?: Reserva;
  habitacionId: ID;
  habitacion?: Habitacion;
  checkInId: ID;
  horaRealSalida: DateTimeISO;
  estadoHabitacionAlSalir: EstadoHabitacionAlSalir;
  danosReportados?: string;
  observacionesHabitacion?: string;
  folioId: ID;
  montoTotalPagado: number;
  saldoPendiente: number;
  llavesDevueltas?: boolean;
  cantidadLlavesDevueltas?: number;
  depósitoGarantiaDevuelto?: boolean;
  formaDevolucionGarantia?: string;
  encuestaSatisfaccion?: number;
  comentariosCheckOut?: string;
  suscripcionNewsletter?: boolean;
  consentimientoEnvioComprobanteCorreo?: boolean;
  avisoHousekeepingEnviado?: boolean;
  horaAvisoHousekeeping?: DateTimeISO;
  usuarioCheckOutId: ID;
  estado: 'EN_PROGRESO' | 'FINALIZADO' | 'ANULADO';
}

export type EstadoHabitacionAlSalir =
  | 'ACEPTABLE'
  | 'CON_OBSERVACIONES_MENORES'
  | 'CON_DANOS';

export interface DocumentoVerificado {
  tipo: string;
  numero: string;
  fechaVencimiento?: DateISO;
  fotoFrontal?: string;
  fotoPosterior?: string;
  verificado: boolean;
  observaciones?: string;
}

// ───────────────────────────────────────────────
// 2.2 Folio (cuenta del huésped)
// ───────────────────────────────────────────────

export type TipoConceptoFolio =
  | 'ALOJAMIENTO'
  | 'COMIDA_BEBIDA'
  | 'TOUR'
  | 'TRASLADO'
  | 'SPA'
  | 'LAVANDERIA'
  | 'LLAMADA_TELEFONICA'
  | 'INTERNET_EXTRA'
  | 'MINIBAR'
  | 'AMENITIES'
  | 'MASCOTA'
  | 'GARANTIA_DEPOSITO'
  | 'AJUSTE'
  | 'DESCUENTO'
  | 'CARGO_MANUAL'
  | 'CORTECIA'
  | 'IMPUESTO'
  | 'OTRO';

export type EstadoFolio = 'ABIERTO' | 'CERRADO' | 'ANULADO' | 'PENDIENTE_COBRO';

export type TipoFolio =
  | 'INDIVIDUAL'
  | 'MAESTRO_GRUPO'
  | 'COMPARTIDO'
  | 'AGENCIA'
  | 'EMPRESA';

export interface Folio extends AuditFields {
  id: ID;
  codigo: string;
  tipo: TipoFolio;
  estado: EstadoFolio;
  reservaId?: ID;
  reserva?: Reserva;
  habitacionId?: ID;
  habitacion?: Habitacion;
  huespedTitularId?: ID;
  huespedTitular?: Huesped;
  grupoId?: ID;
  nombreGrupo?: string;
  folioMaestroId?: ID;
  foliosDependientes?: ID[];
  fechaApertura: DateTimeISO;
  fechaCierre?: DateTimeISO;
  moneda: Moneda;
  cargosAlojamiento: number;
  cargosConsumos: number;
  cargosExtras: number;
  impuestos: number;
  descuentos: number;
  cortesias: number;
  ajustes: number;
  pagosAplicados: number;
  saldoPendiente: number;
  saldoPorAnticipo: number;
  totalPeriodo: number;
  cargos: CargoFolio[];
  pagos: PagoFolio[];
  comprobanteRelacionadoId?: ID;
  responsableId?: ID;
  notasInternas?: string;
  usuarioAperturaId: ID;
  usuarioCierreId?: ID;
  motivoAnulacion?: string;
  usuarioAnulacionId?: ID;
  fechaAnulacion?: DateTimeISO;
}

export interface CargoFolioImpuestoDetalle {
  impuestoId: string;
  impuestoNombre?: string;
  montoImpuesto: number;
}
export interface CargoFolioDescuentoDetalle {
  descuentoId?: string;
  descuentoNombre?: string;
  montoDescuento: number;
}

export interface CargoFolio extends AuditFields {
  id: ID;
  folioId: ID;
  numeroLinea: number;
  fechaCargo: DateTimeISO;
  concepto: string;
  tipoConcepto: TipoConceptoFolio;
  categoria?: string;
  habitacionId?: ID;
  habitacion?: Habitacion;
  comandaId?: ID;
  comandaDetalleId?: ID;
  tourId?: ID;
  trasladoId?: ID;
  referenciaExternaId?: ID;
  referenciaId?: ID;
  productoInventarioId?: ID;
  descripcion?: string;
  conceptoDetalle?: string[];
  cantidad: number;
  unidadMedida?: string;
  precioUnitario: number;
  descuentoMonto: number;
  descuentoPorcentaje?: number;
  montoImpuesto: number;
  impuestoPorcentaje?: number;
  subtotal: number;
  total: number;
  monto?: number;
  moneda: Moneda;
  tipoCambio?: number;
  cargoAuto: boolean;
  origenCargo: OrigenCargoFolio;
  nombreUsuarioAplicaCargo?: string;
  usuarioRegistroId: ID;
  autorizadoPor?: string;
  autorizacionId?: ID;
  motivoDescuento?: string;
  motivoCortesia?: string;
  anulado: boolean;
  fechaAnulacion?: DateTimeISO;
  motivoAnulacion?: string;
  usuarioAnulacionId?: ID;
  comprobanteDetalleId?: ID;
  huespedId?: ID;
  reservaId?: ID;
  usuarioId?: ID;
  fechaAplicacion?: DateTimeISO;
  fechaVencimiento?: DateTimeISO;
  esAnulado?: boolean;
  comprobanteAsociadoId?: ID;
  comentarios?: string;
  estado?: 'PENDIENTE_COBRO' | 'COBRADO' | 'ANULADO' | 'PENDIENTE';
  impuestosIds?: ID[];
  impuestosMontoDesglosado?: CargoFolioImpuestoDetalle[];
  descuentosIds?: ID[];
  descuentosMontoDesglosado?: CargoFolioDescuentoDetalle[];
  propinaMonto?: number;
  cajaSesionId?: ID;
  aplicaIgv?: boolean;
}

export type OrigenCargoFolio =
  | 'MANUAL_RECEPCION'
  | 'AUTO_NOCHE_ALOJAMIENTO'
  | 'POS_COMIDA_BEBIDA'
  | 'ROOM_SERVICE'
  | 'TOURS'
  | 'TRASLADOS'
  | 'SPA'
  | 'MINIBAR'
  | 'LAVANDERIA'
  | 'LLAMADAS'
  | 'INTERNET_EXTRA'
  | 'MASCOTA'
  | 'AJUSTE_SISTEMA'
  | 'IMPORTACION_EXTERNA'
  | 'OTRO';

// ───────────────────────────────────────────────
// 2.3 Cobros y pagos
// ───────────────────────────────────────────────

export type MetodoPago =
  | 'EFECTIVO'
  | 'TARJETA_CREDITO'
  | 'TARJETA_DEBITO'
  | 'TRANSFERENCIA_BANCARIA'
  | 'YAPE'
  | 'PLIN'
  | 'BIZUM'
  | 'PAYPAL'
  | 'PASARELA_ONLINE'
  | 'CHEQUE'
  | 'CORTESIA'
  | 'ANTICIPO'
  | 'CUENTA_POR_COBRAR'
  | 'CONTRA_NOTA_CREDITO'
  | 'OTRO';

export type EstadoPago = 'PENDIENTE' | 'APROBADO' | 'DECLINADO' | 'ANULADO' | 'DEVUELTO';

export type Pago = PagoFolio | PagoPos;

export interface PagoFolio extends AuditFields {
  id: ID;
  folioId: ID;
  reservaId?: ID;
  habitacionId?: ID;
  metodoPago: MetodoPago;
  moneda: Moneda;
  monto: number;
  tipoCambio?: number;
  referencia: string;
  codigoAutorizacion?: string;
  fechaPago: DateTimeISO;
  estado: EstadoPago;
  usuarioRegistroId: ID;
  usuarioCajaId?: ID;
  cajaSesionId?: ID;
  comprobanteId?: ID;
  notaCreditoRelacionadaId?: ID;
  motivoDevolucion?: string;
  fechaDevolucion?: DateTimeISO;
  observaciones?: string;
  pagadorNombre?: string;
  pagadorDocumento?: string;
}

export interface PagoPos extends AuditFields {
  id: ID;
  comandaId: ID;
  metodoPago: MetodoPago;
  moneda: Moneda;
  monto: number;
  tipoCambio?: number;
  referencia: string;
  codigoAutorizacion?: string;
  fechaPago: DateTimeISO;
  estado: EstadoPago;
  usuarioRegistroId: ID;
  usuarioCajaId?: ID;
  cajaSesionId?: ID;
  comprobanteId?: ID;
  folioId?: ID;
  cargoFolioId?: ID;
  propina?: number;
  usuarioPropinaAsignadoId?: ID;
  observaciones?: string;
  pagadorNombre?: string;
  pagadorDocumento?: string;
}

export interface CajaSesion extends AuditFields {
  id: ID;
  nombreCaja: string;
  usuarioAperturaId: ID;
  usuarioCierreId?: ID;
  fechaApertura: DateTimeISO;
  fechaCierre?: DateTimeISO;
  moneda: Moneda;
  saldoInicial: number;
  ingresosEfectivo: number;
  egresosEfectivo: number;
  saldoTeorico: number;
  saldoRealContado?: number;
  diferencia?: number;
  motivoDiferencia?: string;
  totalTransacciones: number;
  observacionesApertura?: string;
  observacionesCierre?: string;
  arqueoRealizado?: boolean;
  estado: 'ABIERTA' | 'CERRADA' | 'ANULADA';
}

// ───────────────────────────────────────────────
// 2.4 Usuarios y roles
// ───────────────────────────────────────────────

export type RolUsuario =
  | 'SUPER_ADMIN'
  | 'ADMINISTRACION'
  | 'GERENCIA'
  | 'RECEPCION'
  | 'RESERVAS'
  | 'HOUSEKEEPING'
  | 'MANTENIMIENTO'
  | 'MOZO'
  | 'BARTENDER'
  | 'COCINA'
  | 'JEFE_COCINA'
  | 'CAJA'
  | 'CONTABILIDAD'
  | 'ALMACEN'
  | 'TOUR_GUIA'
  | 'CONSERJE'
  | 'MARKETING'
  | 'LECTURA_ONLY';

export interface ModuloPermiso {
  modulo:
    | 'DASHBOARD'
    | 'HABITACIONES'
    | 'TARIFAS'
    | 'RESERVAS'
    | 'HUESPEDES'
    | 'CHECKIN_CHECKOUT'
    | 'FOLIOS'
    | 'CAJA_PAGOS'
    | 'FACTURACION_SUNAT'
    | 'HOUSEKEEPING'
    | 'MANTENIMIENTO'
    | 'REPORTES'
    | 'POS_FB'
    | 'INVENTARIO'
    | 'TOURS'
    | 'TRASLADOS'
    | 'PAQUETES'
    | 'MENSAJERIA_WHATSAPP'
    | 'CHANNEL_MANAGER'
    | 'PASARELA_PAGOS'
    | 'PRECIOS_DINAMICOS'
    | 'CRM'
    | 'CHECKIN_ONLINE'
    | 'PORTAL_HUESPED'
    | 'LLAVE_DIGITAL'
    | 'EVENTOS_GRUPOS'
    | 'LAVANDERIA'
    | 'TURNOS_PERSONAL'
    | 'CONTABILIDAD'
    | 'ENERGIA_AGUA'
    | 'USUARIOS_ROLES'
    | 'CONFIGURACION_SISTEMA'
    | 'AUDITORIA';
  permiso: 'NINGUNO' | 'LECTURA' | 'LECTURA_ESCRITURA' | 'ADMIN';
}

export interface Rol extends AuditFields {
  id: ID;
  nombre: RolUsuario | string;
  descripcion?: string;
  permisos: ModuloPermiso[];
  nivelJerarquia: number;
  estado: EstadoGeneral;
}

export interface Usuario extends AuditFields {
  id: ID;
  uuid: UUID;
  iniciales: string;
  nombres: string;
  apellidos: string;
  correoElectronico: string;
  nombreUsuario?: string;
  telefono?: string;
  rolId: ID;
  rol?: Rol;
  estado: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'ELIMINADO';
  passwordHash: string;
  ultimoAcceso?: DateTimeISO;
  ultimoCambioPassword?: DateTimeISO;
  intentosFallidosLogin?: number;
  bloqueadoHasta?: DateTimeISO;
  sedeId?: ID;
  cajaAsignada?: string;
  fotoPerfil?: string;
  firmaDigitalURL?: string;
  preferencias?: PreferenciasUsuario;
}

export interface PreferenciasUsuario {
  idioma?: 'es' | 'en';
  zonaHoraria?: string;
  formatoFecha?: string;
  monedaPorDefecto?: Moneda;
  temaOscuro?: boolean;
  notificacionesPush?: boolean;
  notificacionesEmail?: boolean;
  notificacionesWhatsapp?: boolean;
  paginacionPorDefecto?: number;
}

export interface ActividadUsuario extends AuditFields {
  id: ID;
  usuarioId: ID;
  fecha: DateTimeISO;
  modulo: string;
  accion: 'CREAR' | 'LEER' | 'ACTUALIZAR' | 'ELIMINAR' | 'IMPRIMIR' | 'ENVIAR' | 'LOGIN' | 'LOGOUT' | 'ANULAR' | 'COBRAR' | 'CHECKIN' | 'CHECKOUT' | 'CONFIRMAR' | 'OTRO';
  entidadTipo?: string;
  entidadId?: ID;
  entidadDescripcion?: string;
  campoCambiado?: string;
  valorAnterior?: string;
  valorNuevo?: string;
  ipOrigen?: string;
  dispositivo?: string;
  ubicacion?: string;
  detalles?: Record<string, unknown>;
  exitoso: boolean;
  mensajeError?: string;
}

export interface SesionUsuario extends AuditFields {
  id: ID;
  usuarioId: ID;
  tokenSesion: string;
  fechaInicio: DateTimeISO;
  fechaFin?: DateTimeISO;
  ipOrigen?: string;
  userAgent?: string;
  dispositivo?: string;
  estado: 'ACTIVA' | 'EXPIRADA' | 'CERRADA_MANUAL';
}

// ───────────────────────────────────────────────
// 2.5 POS de Comida y Bebida (F&B)
// ───────────────────────────────────────────────

// 2.5.1 Carta y productos F&B

export type TipoCategoriaFB =
  | 'DESAYUNO'
  | 'ALMUERZO'
  | 'CENA'
  | 'BRUNCH'
  | 'POSTRE'
  | 'BEBIDA_FRIA'
  | 'BEBIDA_CALIENTE'
  | 'TRAGO'
  | 'VINOS'
  | 'CERVEZA'
  | 'SNACK'
  | 'ROOM_SERVICE'
  | 'PISCINA'
  | 'TIENDA'
  | 'PICADA'
  | 'ENTRADA'
  | 'PLATO_FONDO'
  | 'GUARNICION'
  | 'ENSALADA'
  | 'OTRO';

export interface CategoriaFB extends AuditFields {
  id: ID;
  nombre: string;
  tipo?: TipoCategoriaFB;
  ordenVisual: number;
  color?: string;
  icono?: string;
  padreCategoriaId?: ID;
  estado: EstadoGeneral;
  visibilidad: {
    restaurante?: boolean;
    bar?: boolean;
    roomService?: boolean;
    piscina?: boolean;
    terraza?: boolean;
    tienda?: boolean;
  };
  puntosVentaDisponibleIds?: ID[];
}

export interface HorarioDisponibilidadProducto {
  diaSemana: 'LUN' | 'MAR' | 'MIE' | 'JUE' | 'VIE' | 'SAB' | 'DOM' | 'TODOS';
  horaInicio?: string;
  horaFin?: string;
  especial?: string;
}

export type TipoImpuestoProducto =
  | 'IGV'
  | 'IGV_SELVA_EXONERADO'
  | 'INAFECTO'
  | 'EXONERADO_LEY_SELVA'
  | 'EXONERADO_OTRO'
  | 'SIN_IMPUESTO'
  | 'OTRO';

export interface ModificadorGrupo {
  id: ID;
  nombre: string;
  descripcion?: string;
  tipo: 'SELECCION_UNICA' | 'MULTI_SELECCION' | 'INGRESO_TEXTO';
  esObligatorio: boolean;
  maximoSeleccionesPermitidas?: number;
  minimoSeleccionesRequeridas?: number;
  ordenVisual: number;
}

export interface ModificadorOpcion {
  id: ID;
  grupoModificadorId: ID;
  nombre: string;
  descripcion?: string;
  costoAdicional?: number;
  precioAdicional?: number;
  impuestoAplicable?: TipoImpuestoProducto;
  estado: EstadoGeneral;
}

export interface ProductoFB extends AuditFields {
  id: ID;
  sku?: string;
  codigoBarras?: string;
  nombre: string;
  descripcion?: string;
  categoriaId: ID;
  categoria?: CategoriaFB;
  subCategoriaId?: ID;
  moneda: Moneda;
  precioVentaBase: number;
  costoEstimado?: number;
  precioCostoPromedio?: number;
  impuesto: TipoImpuestoProducto;
  porcentajeImpuesto?: number;
  montoImpuestoCalculado?: number;
  presentaciones?: PresentacionProducto[];
  gruposModificadoresIds?: ID[];
  horarioDisponibilidad: HorarioDisponibilidadProducto[];
  menuDelDiaDesde?: DateISO;
  menuDelDiaHasta?: DateISO;
  menuEspecialNombre?: string;
  puntosVentaAplica: PuntoVentaPrecio[];
  permiteInventarioNegativo: boolean;
  stockActual?: number;
  stockMinimo?: number;
  recetaId?: ID;
  estadoProducto: 'ACTIVO' | 'AGOTADO_TEMPORAL' | 'INACTIVO' | 'DESCONTINUADO';
  tiempoPreparacionMinutos?: number;
  estacionCocinaPredeterminadaId?: ID;
  ingredientePrincipal?: string;
  esMenuNinos?: boolean;
  esPromocion?: boolean;
  contieneAlergenos?: AlergenoProducto[];
  esVegano?: boolean;
  esVegetariano?: boolean;
  esSinGluten?: boolean;
  esSinLacteos?: boolean;
  requierePreparacion?: boolean;
  fotoURL?: string;
  fotosSecundarias?: string[];
  tags: string[];
  observacionesInternas?: string;
}

export interface PresentacionProducto {
  id: ID;
  nombre: string;
  descripcion?: string;
  diferenciaPrecio: number;
  unidadMedida?: string;
}

export interface PuntoVentaPrecio {
  puntoVentaId: ID;
  precioVenta: number;
  recargoPorcentaje?: number;
  habilitado: boolean;
  tienePrecioEspecial: boolean;
}

export type AlergenoProducto =
  | 'GLUTEN'
  | 'LACTEOS'
  | 'HUEVO'
  | 'PESCADO'
  | 'MARISCOS'
  | 'SOJA'
  | 'FRUTOS_SECOS'
  | 'MANI'
  | 'APIOS'
  | 'MOSTAZA'
  | 'SESAMO'
  | 'SULFITOS'
  | 'ALTRAMUCES'
  | 'MOLUSCOS'
  | 'OTRO';

export interface RecetaProducto extends AuditFields {
  id: ID;
  productoFinalId: ID;
  porcionesRinde: number;
  instruccionesPreparacion?: string;
  tiempoPreparacionMinutos?: number;
  tiempoCoccionMinutos?: number;
  nivelDificultad?: 'FACIL' | 'MEDIO' | 'DIFICIL';
  ingredientes: IngredienteReceta[];
  fotoURL?: string;
  notas?: string;
}

export interface IngredienteReceta {
  id: ID;
  productoInventarioId: ID;
  productoInventarioNombre?: string;
  unidadMedida: string;
  cantidad: number;
  mermaPorcentaje?: number;
  costoUnitario?: number;
  costoTotal?: number;
  opcional: boolean;
}

// 2.5.2 Puntos de venta y mesas / áreas

export type TipoPuntoVenta =
  | 'RESTAURANTE_CON_MESAS'
  | 'BAR'
  | 'ROOM_SERVICE'
  | 'AREA_COMUN_PISCINA'
  | 'TERRAZA'
  | 'TIENDA_UTILERIA'
  | 'EVENTO_COMEDOR'
  | 'BUFFET'
  | 'OTRO';

export interface PuntoVenta extends AuditFields {
  id: ID;
  nombre: string;
  codigo?: string;
  tipo: TipoPuntoVenta;
  descripcion?: string;
  prefijoComanda?: string;
  proximoNumeroComanda: number;
  moneda: Moneda;
  impresorasConfiguradas?: ImpresoraPuntoVenta[];
  estacionesCocinaIds?: ID[];
  cajaAsignadaId?: ID;
  zonaId?: ID;
  piso?: string;
  area?: string;
  emailContacto?: string;
  telefono?: string;
  capacidadMaximaPersonas?: number;
  horarioAtencion: HorarioPuntoVenta[];
  tiposComandasPermitidos: TipoConsumoComanda[];
  propinaOpcional?: boolean;
  propinaPorcentajeSugerido?: number;
  impuestoPorDefecto: TipoImpuestoProducto;
  permiteDescuentos: boolean;
  maximoDescuentoPorcentaje: number;
  permiteCortesias: boolean;
  responsableCortesiaIds?: ID[];
  configPantallaKiosco?: boolean;
  logoPuntoVentaURL?: string;
  estado: EstadoGeneral;
}

export interface HorarioPuntoVenta {
  diaSemana: 'LUN' | 'MAR' | 'MIE' | 'JUE' | 'VIE' | 'SAB' | 'DOM' | 'TODOS';
  horaApertura?: string;
  horaCierre?: string;
  operacion24h?: boolean;
}

export interface ImpresoraPuntoVenta {
  id: ID;
  nombre: string;
  tipo: 'COMANDAS_COCINA' | 'COMANDAS_BAR' | 'TICKET_CLIENTE' | 'FACTURA' | 'OTRO';
  modelo?: string;
  ip?: string;
  puerto?: number;
  nombreImpresoraSistema?: string;
  cortarPapelAlFinal?: boolean;
  tamañoPapelCm?: 5.8 | 8.0;
}

export type EstadoMesa =
  | 'LIBRE'
  | 'OCUPADA'
  | 'RESERVADA'
  | 'EN_LIMPIEZA'
  | 'UNIDA_A_OTRA'
  | 'BLOQUEADA'
  | 'INACTIVA';

export interface Mesa extends AuditFields {
  id: ID;
  nombre: string;
  codigo?: string;
  puntoVentaId: ID;
  puntoVenta?: PuntoVenta;
  zona?: string;
  ubicacionPlanoX?: number;
  ubicacionPlanoY?: number;
  ancho?: number;
  alto?: number;
  formaGeometrica?: 'CIRCULO' | 'CUADRADO' | 'RECTANGULO' | 'OTRO';
  capacidadPersonas: number;
  capacidadMinima?: number;
  sillas?: number;
  sillasAdicionalesMaximasPermitidas?: number;
  mozoAsignadoId?: ID;
  comandaActivaId?: ID;
  estado: EstadoMesa;
  estadoAnterior?: EstadoMesa;
  fechaUltimoCambioEstado?: DateTimeISO;
  mesasUnidasIds?: ID[];
  mesaMaestraUnionId?: ID;
  esCombinable: boolean;
  esTransferible: boolean;
  serviciosOfrecidos?: string[];
  esExterior?: boolean;
  tieneVista?: boolean;
  tieneTerraza?: boolean;
  esAccesibleSillaRuedas?: boolean;
  observacionesInternas?: string;
  fotoURL?: string;
}

export interface ReservaMesa extends AuditFields {
  id: ID;
  mesaIds: ID[];
  puntoVentaId: ID;
  reservaHabitacionId?: ID;
  huespedId?: ID;
  nombreReserva: string;
  telefonoContacto?: string;
  correoContacto?: string;
  cantidadPersonas: number;
  sillasInfantilesSolicitadas?: number;
  fechaHora: DateTimeISO;
  duracionEstimadaMinutos?: number;
  estado: 'SOLICITADA' | 'CONFIRMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA' | 'NO_ASISTIO';
  horaLlegada?: DateTimeISO;
  comandaAsignadaId?: ID;
  notas?: string;
  restriccionesAlimentarias?: string;
  solicitudesEspeciales?: string;
  motivoCancelacion?: string;
  usuarioAsignadoId?: ID;
  origenSolicitud?: OrigenReservaMesa;
}

export type OrigenReservaMesa =
  | 'TELEFONO'
  | 'WHATSAPP'
  | 'RESERVA_ONLINE'
  | 'PRESENCIAL'
  | 'BOOKING_RESTAURANTE'
  | 'AGENCIA'
  | 'HUESPED_ALOJADO'
  | 'OTRO';

// 2.5.3 Comandas y pedidos

export type TipoConsumoComanda =
  | 'A_HABITACION'
  | 'MESA_RESTAURANTE'
  | 'PARA_LLEVAR'
  | 'DELIVERY'
  | 'ROOM_SERVICE'
  | 'PISCINA'
  | 'TERRAZA'
  | 'EVENTO'
  | 'OTRO';

export type EstadoComanda =
  | 'ABIERTA'
  | 'EN_COCINA_BAR'
  | 'LISTA_PARA_ENTREGAR'
  | 'ENTREGADA'
  | 'PENDIENTE_COBRO'
  | 'CERRADA_COBRADA'
  | 'CARGADA_A_FOLIO'
  | 'MIXTO_FOLIO_MAS_COBRO'
  | 'ANULADA';

export type PrioridadComanda = 'NORMAL' | 'URGENTE' | 'PRIMERA_HORA' | 'ROOM_SERVICE_RAPIDO';

export type MotivoAnulacionComanda =
  | 'ERROR_MOZO'
  | 'PRODUCTO_AGOTADO'
  | 'CLIENTE_ARREPENTIDO'
  | 'CAMBIO_DE_MESA'
  | 'TRASLADO_A_HABITACION'
  | 'PROBLEMA_COCINA'
  | 'OTRO';

export interface Comanda extends AuditFields {
  id: ID;
  numeroCorrelativo: number;
  prefijoCorrelativo?: string;
  codigoQR?: string;
  puntoVentaId: ID;
  puntoVenta?: PuntoVenta;
  tipoConsumo: TipoConsumoComanda;
  habitacionId?: ID;
  habitacion?: Habitacion;
  reservaId?: ID;
  reserva?: Reserva;
  huespedTitularId?: ID;
  huespedTitular?: Huesped;
  habitacionNombreString?: string;
  mesaId?: ID;
  mesa?: Mesa;
  mesasSecundariasIds?: ID[];
  nombresClientes?: string;
  contactoClienteTelefono?: string;
  cantidadPersonas: number;
  cantidadNinos?: number;
  mozoAsignadoId: ID;
  mozoAsignadoNombre?: string;
  mozoSegundoId?: ID;
  fechaApertura: DateTimeISO;
  fechaUltimaModificacion?: DateTimeISO;
  fechaEnviadaCocina?: DateTimeISO;
  fechaEntrega?: DateTimeISO;
  fechaCierre?: DateTimeISO;
  horaEstimadaEntregaRoomService?: string;
  solicitudEntregaDiferida?: boolean;
  horaSolicitadaEntrega?: DateTimeISO;
  estado: EstadoComanda;
  estadoAnterior?: EstadoComanda;
  prioridad: PrioridadComanda;
  moneda: Moneda;
  subtotalProductos: number;
  impuestos: number;
  descuentosTotal: number;
  servicios?: number;
  propinas?: number;
  redondeoCargo?: number;
  totalComanda: number;
  saldoPendientePago: number;
  cargadaTotalmenteAFolio: boolean;
  folioId?: ID;
  cortesiaAplicada: boolean;
  autorizacionCortesiaId?: ID;
  motivoCortesia?: string;
  observacionesGenerales?: string;
  instruccionesEntregaRoomService?: InstruccionesRoomService;
  confirmacionEntrega?: ConfirmacionEntrega;
  items: ComandaDetalle[];
  historialEstados: HistorialEstadoComanda[];
  auditoriaModificaciones?: AuditoriaModificacionComanda[];
  pagos: PagoPos[];
  usuarioAperturaId: ID;
  usuarioCierreId?: ID;
  anulada: boolean;
  fechaAnulacion?: DateTimeISO;
  motivoAnulacion?: MotivoAnulacionComanda;
  usuarioAnulacionId?: ID;
  notasInternas?: string;
}

export type EstadoPreparacionLinea =
  | 'PENDIENTE'
  | 'EN_PREPARACION'
  | 'LISTO_PARA_SERVIR'
  | 'SERVIDO'
  | 'CANCELADO'
  | 'ANULADO';

export interface ComandaDetalle extends AuditFields {
  id: ID;
  comandaId: ID;
  productoFBId: ID;
  productoFB?: ProductoFB;
  nombreProductoAlMomento: string;
  skuProductoAlMomento?: string;
  presentacionId?: ID;
  presentacionNombre?: string;
  cantidad: number;
  unidadMedida?: string;
  cantidadFraccional?: boolean;
  precioUnitarioAlMomento: number;
  descuentoMontoLinea: number;
  descuentoPorcentajeLinea?: number;
  motivoDescuentoLinea?: string;
  autorizacionDescuentoId?: ID;
  impuestoTipoAlMomento: TipoImpuestoProducto;
  impuestoPorcentajeAlMomento: number;
  impuestoMontoLinea: number;
  subtotalAntesImpuestos: number;
  totalLineaConImpuestos: number;
  moneda: Moneda;
  modificadoresAplicados?: ModificadorAplicadoLinea[];
  adicionesExtras?: AdicionExtraLinea[];
  comentariosLinea?: string;
  alergenosDestacados?: AlergenoProducto[];
  sinCobro: boolean;
  cortesiaLinea: boolean;
  motivoCortesiaLinea?: string;
  estadoPreparacion: EstadoPreparacionLinea;
  fechaEnvioPreparacion?: DateTimeISO;
  fechaPreparacionLista?: DateTimeISO;
  fechaServido?: DateTimeISO;
  estacionAsignadaId?: ID;
  estacionNombre?: string;
  cocineroResponsableId?: ID;
  usuarioRegistroId: ID;
  anulada: boolean;
  fechaAnulacion?: DateTimeISO;
  motivoAnulacion?: MotivoAnulacionLinea;
  usuarioAnulacionId?: ID;
  inventarioRebajadoOk: boolean;
  folioCargoLineaId?: ID;
  ticketKdsGenerado?: boolean;
  ticketKdsImpresoCantidad?: number;
}

export type MotivoAnulacionLinea =
  | 'ERROR_MOZO'
  | 'PRODUCTO_AGOTADO'
  | 'CLIENTE_ARREPENTIDO'
  | 'PROBLEMA_CALIDAD'
  | 'CAMBIO_SOLICITUD'
  | 'OTRO';

export interface ModificadorAplicadoLinea {
  id: ID;
  grupoModificadorId: ID;
  opcionModificadorId: ID;
  nombreGrupo: string;
  nombreOpcion: string;
  costoAdicional?: number;
  precioAdicional?: number;
  esGratis?: boolean;
  ordenVisual?: number;
}

export interface AdicionExtraLinea {
  id: ID;
  productoFBId?: ID;
  nombreAdicion: string;
  cantidad: number;
  precioUnitario: number;
  totalAdicion: number;
  comentario?: string;
}

export interface HistorialEstadoComanda {
  id: ID;
  fecha: DateTimeISO;
  estadoAnterior?: EstadoComanda;
  estadoNuevo: EstadoComanda;
  usuarioId?: ID;
  observaciones?: string;
  dispositivoOrigen?: string;
}

export interface AuditoriaModificacionComanda {
  id: ID;
  fecha: DateTimeISO;
  usuarioId: ID;
  tipoCambio:
    | 'AGREGO_LINEA'
    | 'QUITO_LINEA'
    | 'MODIFICO_CANTIDAD'
    | 'MODIFICO_PRECIO'
    | 'AGREGO_DESCUENTO'
    | 'ANULO_LINEA'
    | 'TRANSFIRIO_MESA'
    | 'TRANSFIRIO_HABITACION'
    | 'CAMBIO_MOZO'
    | 'OTRO';
  detalleAnterior?: unknown;
  detalleNuevo?: unknown;
  motivo?: string;
}

export interface InstruccionesRoomService {
  tocarTimbre: boolean;
  dejarEnPuerta: boolean;
  noMolestar: boolean;
  llamarAntes: boolean;
  horaEspecificaEntrega?: DateTimeISO;
  cubiertosExtra?: boolean;
  cantidadPlatos?: number;
  sillasAdicionales?: number;
  menajeEspecial?: string[];
  servicioAdicional?: string;
  otrasInstrucciones?: string;
}

export interface ConfirmacionEntrega {
  entregado: boolean;
  fechaHoraEntrega?: DateTimeISO;
  personaRecibeNombre?: string;
  firmaClienteURL?: string;
  fotoEntregaURL?: string;
  observacionesEntrega?: string;
  usuarioEntregaId?: ID;
  usuarioEntregaNombre?: string;
}

// 2.5.4 Cocina y bar (KDS)

export type TipoEstacionCocina =
  | 'COCINA_CALIENTE'
  | 'COCINA_FRIA'
  | 'PARRILLA'
  | 'WOK'
  | 'PASTELERIA_POSTRES'
  | 'BAR_BEBIDAS_FRIAS'
  | 'BAR_BEBIDAS_CALIENTES'
  | 'COCTELERIA'
  | 'VINOTECA'
  | 'ROOM_SERVICE_STATION'
  | 'ENSALADAS'
  | 'SOPAS'
  | 'PANADERIA'
  | 'OTRO';

export interface EstacionCocinaBar extends AuditFields {
  id: ID;
  nombre: string;
  tipo?: TipoEstacionCocina;
  descripcion?: string;
  ubicacionZona?: string;
  puntoVentaIds?: ID[];
  responsableId?: ID;
  impresoraAsignadaId?: ID;
  usaPantallaTactil: boolean;
  usaTicketImpreso: boolean;
  dispositivoKdsAsignado?: string;
  colorIdentificador?: string;
  ordenPreparacion?: number;
  tiempoEstimadoMinutos?: number;
  alertaDemoraMinutos?: number;
  sonidoAlertaNuevoPedido?: boolean;
  urlSonidoAlerta?: string;
  vibrarDispositivo?: boolean;
  estado: EstadoGeneral;
}

export interface VistaKdsTicket {
  comandaId: ID;
  numeroComanda: string;
  fechaHoraEnvio: DateTimeISO;
  tipoConsumo: TipoConsumoComanda;
  mesaNombre?: string;
  habitacionNombre?: string;
  huespedNombre?: string;
  puntoVentaNombre?: string;
  prioridad: PrioridadComanda;
  tiempoTranscurridoMinutos: number;
  tiempoRestanteEstimadoMinutos?: number;
  alertaDemora?: boolean;
  items: KdsItemTicket[];
  mozoNombre?: string;
  observacionesGenerales?: string;
  tiempoEntregaSolicitada?: DateTimeISO;
}

export interface KdsItemTicket {
  detalleId: ID;
  productoNombre: string;
  cantidad: number;
  estado: EstadoPreparacionLinea;
  modificadoresTexto?: string;
  comentarios?: string;
  alergenosDestacados?: AlergenoProducto[];
  urgente?: boolean;
  ordenTemporal?: number;
}

export interface EstadoEstacionTiempo {
  estacionId: ID;
  promedioMinutosUltimaHora: number;
  pendientes: number;
  enPreparacion: number;
  listos: number;
}

// 2.5.5 Cobro y cargo al folio (tipos de cierre)

export type TipoCierreComanda =
  | 'CARGAR_TODO_A_HABITACION'
  | 'PAGAR_EN_POS_TODO'
  | 'MIXTO_CARGO_HABITACION_Y_PAGO'
  | 'CUENTA_ABIERTA_ACUMULAR'
  | 'CORTESIA_CASA'
  | 'ANULACION_TOTAL'
  | 'CONTRA_NOTA_CREDITO';

export interface CierreComanda extends AuditFields {
  id: ID;
  comandaId: ID;
  comanda?: Comanda;
  tipoCierre: TipoCierreComanda;
  fechaHoraCierre: DateTimeISO;
  moneda: Moneda;
  totalComandaCierre: number;
  cargadoAFolio: number;
  pagadoEnLugar: number;
  cortesia: number;
  descuentos: number;
  impuestos: number;
  redondeo?: number;
  folioIds?: ID[];
  pagosIds?: ID[];
  autorizacionCortesiaId?: ID;
  motivoCortesia?: string;
  motivoNotaCredito?: string;
  comprobanteEmitido?: boolean;
  comprobanteId?: ID;
  ticketConsumicionFirmadoURL?: string;
  ticketConsumicionClienteNombre?: string;
  observaciones?: string;
  usuarioCierreId: ID;
  cajaSesionId?: ID;
}

// 2.5.6 Room service específico

export interface RoomService extends AuditFields {
  id: ID;
  comandaId: ID;
  comanda?: Comanda;
  habitacionId: ID;
  habitacion?: Habitacion;
  horaSolicitud: DateTimeISO;
  horaPrometidaEntrega?: DateTimeISO;
  horaRealEntrega?: DateTimeISO;
  tiempoEntregaMinutos?: number;
  personalEntregaId?: ID;
  personalTomaPedidoId?: ID;
  confirmacionEntregaId?: ID;
  housekeepingAvisoId?: ID;
  necesitaMenajeAdicional?: boolean;
  menajeAdicionalSolicitado?: string[];
  sillasAdicionalesSolicitadas?: number;
  observaciones?: string;
  estadoServicio: 'SOLICITADO' | 'EN_PREPARACION' | 'EN_CAMINO' | 'ENTREGADO' | 'CONFIRMADO_HUESPED' | 'CANCELADO';
}

// 2.5.7 Reportes F&B (estructuras)

export interface VentaDiariaFB {
  fecha: DateISO;
  puntoVentaId: ID;
  puntoVentaNombre: string;
  ventasTotales: number;
  ventasCobradasDirecto: number;
  ventasCargadasFolio: number;
  descuentos: number;
  cortesias: number;
  propinas: number;
  impuestos: number;
  numeroComandas: number;
  montoPromedioComanda: number;
  ticketPromedio: number;
  personasAtendidas: number;
  ocupacionMesasPorcentaje: number;
  tiempoPromedioMesaMinutos: number;
  tiempoPreparacionPromedioMinutos: number;
  moneda: Moneda;
}

export interface VentasCategoriaFB {
  categoriaId: ID;
  categoriaNombre: string;
  montoVentas: number;
  porcentajeParticipacion: number;
  numeroLineas: number;
  cantidadProductosVendidos: number;
}

export interface VentasProductoFB {
  productoId: ID;
  productoNombre: string;
  categoriaNombre: string;
  cantidadTotalVendida: number;
  montoTotalVendido: number;
  devolucionesAnulaciones: number;
  montoDescuentosAplicados: number;
  ranking?: number;
}

export interface VentasMozoTurno {
  mozoId: ID;
  mozoNombreCompleto: string;
  turnoId?: ID;
  turnoNombre?: string;
  comandasAtendidas: number;
  personasAtendidas: number;
  montoVentas: number;
  propinasRecibidas: number;
  propinasAsignadasDirectamente: number;
  mesasPromedioPorHora: number;
  ticketPromedio: number;
  horasTrabajadas?: number;
}

export interface MermaEstimadaInventarioFB {
  productoInventarioId: ID;
  productoInventarioNombre: string;
  unidadMedida: string;
  consumoEstimadoTeorico: number;
  salidaRealAlmacen: number;
  mermaUnidades: number;
  mermaPorcentaje: number;
  costoMerma: number;
  moneda: Moneda;
}

// 2.5.8 Integraciones (estructuras)

export interface IntegracionFB {
  comandaId?: ID;
  folioId?: ID;
  comprobanteSunatId?: ID;
  productoInventarioId?: ID;
  cajaSesionId?: ID;
  usuarioId?: ID;
}

// Tablas complementarias del POS (últimas 3 de tu Anexo): PrecioPuntoVenta, TurnoServicio, PropinaCortesia

export interface PrecioPuntoVenta {
  id: ID;
  productoId: ID;
  puntoVentaId: ID;
  precioVentaEspecial: number;
  moneda: Moneda;
  fechaInicio?: DateTimeISO;
  fechaFin?: DateTimeISO;
  estado: EstadoGeneral;
  audit?: AuditFields;
}

export type NombreTurnoServicio =
  | 'DESAYUNO'
  | 'BRUNCH'
  | 'ALMUERZO'
  | 'MERIENDA_TARDE'
  | 'COCTELERIA'
  | 'CENA'
  | 'ROOM_SERVICE_MADRUGADA'
  | 'OTRO';

export interface TurnoServicio extends AuditFields {
  id: ID;
  nombre: NombreTurnoServicio;
  descripcion?: string;
  horaInicio: string;
  horaFin: string;
  color?: string;
  puntoVentaIds: ID[];
  ordenVisual: number;
  estado: EstadoGeneral;
}

export interface PropinaCortesia extends AuditFields {
  id: ID;
  comandaId: ID;
  pagoPosId?: ID;
  folioId?: ID;
  tipo: 'PROPINA' | 'CORTESIA';
  monto: number;
  moneda: Moneda;
  motivo: string;
  observaciones?: string;
  autorizadoPorUsuarioId?: ID;
  autorizadoPorNombre?: string;
  usuarioId?: ID;
  personalAsignadoIds?: ID[];
  estado: EstadoGeneral;
}
