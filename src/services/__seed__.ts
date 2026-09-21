import type { AuditFields } from '../types/common';
import type {
  TipoHabitacion, Habitacion, EstadoHabitacion,
  Tarifa, ImpuestoTarifa, Temporada, PoliticaCancelacion,
  CodigoPromocional, Reserva, EstadoReserva, OrigenReserva, Huesped,
  Folio, EstadoFolio, CargoFolio, TipoCargoFolio, OrigenCargoFolio,
  PagoFolio, MetodoPago, EstadoPago,
  Usuario, Rol,
  PuntoVenta, CategoriaFB, ProductoFB, PresentacionProducto, ModificadorProducto,
  AlergenoProducto, EstacionCocinaFK,
  Mesa, EstadoMesa, Comanda, EstadoComanda, TipoConsumoComanda, PrioridadComanda,
  ComandaDetalle, LineaComanda, EstadoPreparacionLinea,
  CierreComanda, TipoCierre, TipoComanda,
  HistorialCambioReserva
} from '../types';

const generateUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const nowISO = () => new Date().toISOString();

const buildAudit = (user = 'system-init'): AuditFields => ({
  createdAt: nowISO(),
  updatedAt: nowISO(),
  createdBy: user,
  updatedBy: user,
});

const hoy = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const addDaysISO = (baseISO: string, days: number) => {
  const d = new Date(baseISO);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

// ===== SEED FIXTURES =====

const auditSeed = buildAudit();

const alergenosSeed: AlergenoProducto[] = [
  { id: 'AL-GLUTEN', nombre: 'Gluten', descripcion: 'Trigo, cebada, centeno, avena', ...auditSeed },
  { id: 'AL-LACTOSA', nombre: 'Lactosa', descripcion: 'Leche y derivados', ...auditSeed },
  { id: 'AL-CACAHUATE', nombre: 'Cacahuate', descripcion: 'Frutos secos de cáscara', ...auditSeed },
  { id: 'AL-MARISCOS', nombre: 'Mariscos', descripcion: 'Crustáceos y moluscos', ...auditSeed },
  { id: 'AL-HUEVO', nombre: 'Huevo', descripcion: 'Clara y yema', ...auditSeed },
  { id: 'AL-SOYA', nombre: 'Soya', descripcion: 'Derivados de soja', ...auditSeed },
  { id: 'AL-PESCADO', nombre: 'Pescado', descripcion: 'Pescados blancos y azules', ...auditSeed },
];

const estacionesCocinaSeed: EstacionCocinaFK[] = ['COCINA_FRIOS', 'COCINA_CALIENTES', 'GRILL_PARRILLA', 'BAR', 'PASTELERIA_POSTRES'];

const categoriasFBSeed: CategoriaFB[] = [
  { id: 'CAT-DESAYUNOS', nombre: '🥐 Desayunos', orden: 1, descripcion: 'Buffet y desayunos a la carta', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-ENTRADAS', nombre: '🥗 Entradas', orden: 2, descripcion: 'Anticuchos, ensaladas, ceviche', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-PLATOS', nombre: '🍽️ Platos Principales', orden: 3, descripcion: 'Criollo, Marino, Amazónico', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-BEBIDAS-FRIAS', nombre: '🥤 Bebidas Frías', orden: 4, descripcion: 'Jugos, refrescos, agua, hielo', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-BEBIDAS-CALIENTES', nombre: '☕ Bebidas Calientes', orden: 5, descripcion: 'Café, té, infusiones, chocolate', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-ALCOHOL', nombre: '🍺 Bar', orden: 6, descripcion: 'Cerveza, vino, cocteles, piscos', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-POSTRES', nombre: '🍰 Postres', orden: 7, descripcion: 'Tres leches, mazamorra, helados', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-MINIBAR', nombre: '🧃 Minibar', orden: 8, descripcion: 'Consumo dentro de habitación', estado: 'ACTIVO', ...auditSeed },
];

const presentacionesBase = (productoId: string, precio: number, unidad = 'Porción'): PresentacionProducto[] => {
  const baseId = `${productoId}-P1`;
  return [
    { id: baseId, productoId, nombre: unidad, precio, costoAproximado: Number((precio * 0.4).toFixed(2)), stockControl: false, unidadMedida: 'UNIDAD', ...auditSeed },
  ];
};

const productosFBSeedBase: Array<Omit<ProductoFB, 'presentacionesIds' | 'presentacionesActivasIds' | 'modificadoresIds' | 'alergenosIds' | 'impuestosIds' | 'estacionesCocinaIds'>> = [
  {
    id: 'PROD-DESAY-BUFFET', categoriaId: 'CAT-DESAYUNOS', codigo: 'DES001', nombre: 'Desayuno Buffet Completo',
    descripcion: 'Jugo natural, frutas frescas, panes, embutidos, huevos a gusto, café infusión, marmitas amazónicas',
    precioVentaBase: 45.00, costoAproximado: 18.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-DESAY-CONTINENTAL', categoriaId: 'CAT-DESAYUNOS', codigo: 'DES002', nombre: 'Desayuno Continental',
    descripcion: 'Café/té, 2 panes con mantequilla y mermelada, 1 jugo, 1 fruta',
    precioVentaBase: 28.00, costoAproximado: 11.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-ENT-ENSALADA-QUINUA', categoriaId: 'CAT-ENTRADAS', codigo: 'ENT101', nombre: 'Ensalada de Quinua Amazónica',
    descripcion: 'Quinua real, aguacate, tomate cherry, cebolla, cilantro, pechuga de pollo opcional, llimeña',
    precioVentaBase: 32.00, costoAproximado: 12.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-ENT-CEVICHE', categoriaId: 'CAT-ENTRADAS', codigo: 'ENT202', nombre: 'Ceviche de Pescado',
    descripcion: 'Filete de pescado blanco fresco, cebolla roja, aji limo, jugo de limón, cancha serrana, camote y choclo',
    precioVentaBase: 48.00, costoAproximado: 19.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-PLATO-LOMO', categoriaId: 'CAT-PLATOS', codigo: 'PLA301', nombre: 'Lomo Saltado Criollo',
    descripcion: 'Lomo fino saltado con verduras orientales, papas fritas, arroz blanco al wok, ají amarillo',
    precioVentaBase: 62.00, costoAproximado: 25.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-PLATO-TACACHO', categoriaId: 'CAT-PLATOS', codigo: 'PLA302', nombre: 'Tacacho con Cecina y Chorizo',
    descripcion: 'Platano verde machacado en mantequilla de cerdo, servido con cecina ahumada, chorizo criollo, ensalada y salsa criolla',
    precioVentaBase: 58.00, costoAproximado: 23.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-PLATO-JUANE', categoriaId: 'CAT-PLATOS', codigo: 'PLA303', nombre: 'Juane Gallina Criolla',
    descripcion: 'Arroz perfumado con hierbas y especias amazónicas, envuelto en hoja de bijao, acompañado de gallina criolla, huevo duro y aceitunas',
    precioVentaBase: 55.00, costoAproximado: 21.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-PLATO-PESCADO', categoriaId: 'CAT-PLATOS', codigo: 'PLA304', nombre: 'Filete de Pescado a la Plancha',
    descripcion: 'Pescado blanco fresco del día, salsa de maracuyá o 3 ajíes, puré de yuca, ensalada amazónica',
    precioVentaBase: 68.00, costoAproximado: 27.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-JUGO-NARANJA', categoriaId: 'CAT-BEBIDAS-FRIAS', codigo: 'BEB401', nombre: 'Jugo de Naranja Natural 500ml',
    descripcion: 'Jugo recién exprimido de naranja dulce del valle, sin azúcar añadido',
    precioVentaBase: 14.00, costoAproximado: 5.50, moneda: 'PEN',
    permiteModificadores: false, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-AGUA-MINERAL', categoriaId: 'CAT-BEBIDAS-FRIAS', codigo: 'BEB402', nombre: 'Agua Mineral 750ml',
    descripcion: 'Agua mineral sin gas, marca líder nacional',
    precioVentaBase: 8.00, costoAproximado: 2.80, moneda: 'PEN',
    permiteModificadores: false, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-GASEOSA', categoriaId: 'CAT-BEBIDAS-FRIAS', codigo: 'BEB403', nombre: 'Gaseosa 330ml',
    descripcion: 'Inca Kola / Coca Cola / Sprite (especificar en observaciones)',
    precioVentaBase: 9.00, costoAproximado: 3.20, moneda: 'PEN',
    permiteModificadores: false, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-CAFE-AMERICANO', categoriaId: 'CAT-BEBIDAS-CALIENTES', codigo: 'BEB501', nombre: 'Café Americano Grande',
    descripcion: 'Café 100% orgánico peruano, grano tostado, doble shot americano',
    precioVentaBase: 12.00, costoAproximado: 4.20, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-TE-VERDE', categoriaId: 'CAT-BEBIDAS-CALIENTES', codigo: 'BEB502', nombre: 'Té Verde Infusión',
    descripcion: 'Té verde orgánico con hierbas aromáticas del jardín del lodge',
    precioVentaBase: 10.00, costoAproximado: 3.50, moneda: 'PEN',
    permiteModificadores: false, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-CUSQUENA', categoriaId: 'CAT-ALCOHOL', codigo: 'BAR601', nombre: 'Cerveza Cusqueña Trigo 620ml',
    descripcion: 'Cerveza de trigo malta peruana, envase retornable de 620ml',
    precioVentaBase: 15.00, costoAproximado: 6.20, moneda: 'PEN',
    permiteModificadores: false, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-PISCO-SOUR', categoriaId: 'CAT-ALCOHOL', codigo: 'BAR602', nombre: 'Pisco Sour Clásico',
    descripcion: 'Pisco puro 50ml, jugo de limón, jarabe de goma, clara de huevo, 3 gotas de amargo de angostura',
    precioVentaBase: 28.00, costoAproximado: 10.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-VINO-BOTELLA', categoriaId: 'CAT-ALCOHOL', codigo: 'BAR603', nombre: 'Vino Tinto Tinto Reserva - Botella 750ml',
    descripcion: 'Vino tinto reserva de los valles de Ica, marida perfecto con carnes rojas y parrilla',
    precioVentaBase: 120.00, costoAproximado: 48.00, moneda: 'PEN',
    permiteModificadores: false, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-POSTRE-TRES-LECHES', categoriaId: 'CAT-POSTRES', codigo: 'POST701', nombre: 'Torta de Tres Leches',
    descripcion: 'Esponjosa torta bañada en leche evaporada, leche condensada y leche entera, decorada con merengue italiano',
    precioVentaBase: 22.00, costoAproximado: 8.00, moneda: 'PEN',
    permiteModificadores: false, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-MAZAMORRA-MORADA', categoriaId: 'CAT-POSTRES', codigo: 'POST702', nombre: 'Mazamorra Morada con Arroz con Leche',
    descripcion: 'Mazamorra morada de maíz morado peruano con frutas, acompañado de porción de arroz con leche cremoso y canela',
    precioVentaBase: 20.00, costoAproximado: 7.20, moneda: 'PEN',
    permiteModificadores: false, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-MINI-SNACK', categoriaId: 'CAT-MINIBAR', codigo: 'MINI801', nombre: 'Paquete Snack Galletas Chocolate',
    descripcion: 'Caja de galletas rellenas chocolate minibar habitación',
    precioVentaBase: 16.00, costoAproximado: 6.00, moneda: 'PEN',
    permiteModificadores: false, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
];

const impuestoIGV: ImpuestoTarifa = {
  id: 'IMP-IGV-18', nombre: 'IGV 18%', codigo: 'IGV', tipo: 'PORCENTAJE',
  valor: 18.00, descripcion: 'Impuesto General a las Ventas - Perú', afectaBaseImponible: true, ...auditSeed
};

const impuestoSelva: ImpuestoTarifa = {
  id: 'IMP-SELVA-5', nombre: 'IGV Selva 5% Adicional', codigo: 'IGV_SELVA', tipo: 'PORCENTAJE',
  valor: 5.00, descripcion: 'Impuesto adicional a la venta en zona de selva baja', afectaBaseImponible: true, ...auditSeed
};

const propinasSugeridas = [5, 7, 10];

const modificadoresFBSeed: ModificadorProducto[] = [
  {
    id: 'MOD-SIN-CEBOLLA', codigo: 'SINCEBOLLA', nombre: 'Sin cebolla', tipo: 'SELECCION_MULTIPLE',
    opciones: [{ id: 'OP-SIN-CEBOLLA', texto: 'No llevar cebolla', costoAdicional: 0, seleccionadoPorDefecto: false }],
    aplicaA: 'CUALQUIER_PRODUCTO', aplicableCategoriaIds: [], estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'MOD-BIEN-COCIDO', codigo: 'BIENCOCIDO', nombre: 'Carne bien cocida', tipo: 'SELECCION_UNICA',
    opciones: [
      { id: 'OP-JUGOSO', texto: 'Jugoso (término medio)', costoAdicional: 0, seleccionadoPorDefecto: true },
      { id: 'OP-BIEN-COCIDO', texto: 'Bien cocido / Well done', costoAdicional: 0, seleccionadoPorDefecto: false },
    ],
    aplicaA: 'PRODUCTOS_ESPECIFICOS', aplicableCategoriaIds: ['CAT-PLATOS'], estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'MOD-QUESO-EXTRA', codigo: 'MASQUESO', nombre: '+Queso Extra', tipo: 'SELECCION_UNICA',
    opciones: [
      { id: 'OP-QUESO-SI', texto: 'Agregar queso extra (+ S/ 4.00)', costoAdicional: 4.00, seleccionadoPorDefecto: false },
      { id: 'OP-QUESO-NO', texto: 'Sin queso extra', costoAdicional: 0, seleccionadoPorDefecto: true },
    ],
    aplicaA: 'CUALQUIER_PRODUCTO', aplicableCategoriaIds: [], estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'MOD-HIELO', codigo: 'HIELO', nombre: 'Con hielo / Sin hielo', tipo: 'SELECCION_UNICA',
    opciones: [
      { id: 'OP-CON-HIELO', texto: 'Con hielo', costoAdicional: 0, seleccionadoPorDefecto: true },
      { id: 'OP-SIN-HIELO', texto: 'Sin hielo', costoAdicional: 0, seleccionadoPorDefecto: false },
    ],
    aplicaA: 'PRODUCTOS_ESPECIFICOS', aplicableCategoriaIds: ['CAT-BEBIDAS-FRIAS', 'CAT-ALCOHOL'], estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'MOD-AZUCAR', codigo: 'AZUCAR', nombre: 'Nivel de azúcar', tipo: 'SELECCION_UNICA',
    opciones: [
      { id: 'OP-AZUCAR-SIN', texto: 'Sin azúcar', costoAdicional: 0, seleccionadoPorDefecto: false },
      { id: 'OP-AZUCAR-POCA', texto: 'Poca azúcar', costoAdicional: 0, seleccionadoPorDefecto: true },
      { id: 'OP-AZUCAR-MEDIA', texto: 'Normal', costoAdicional: 0, seleccionadoPorDefecto: false },
      { id: 'OP-AZUCAR-MUCHA', texto: 'Extra dulce', costoAdicional: 0, seleccionadoPorDefecto: false },
    ],
    aplicaA: 'PRODUCTOS_ESPECIFICOS', aplicableCategoriaIds: ['CAT-BEBIDAS-FRIAS', 'CAT-BEBIDAS-CALIENTES'], estado: 'ACTIVO', ...auditSeed
  },
];

const productosFBSeed: ProductoFB[] = productosFBSeedBase.map((p) => {
  const presenta = presentacionesBase(p.id, p.precioVentaBase, 'Porción');
  const modIds: string[] = [];
  if (p.permiteModificadores) {
    if (p.categoriaId === 'CAT-BEBIDAS-FRIAS' || p.categoriaId === 'CAT-ALCOHOL') modIds.push('MOD-HIELO');
    if (p.categoriaId === 'CAT-BEBIDAS-FRIAS' || p.categoriaId === 'CAT-BEBIDAS-CALIENTES') modIds.push('MOD-AZUCAR');
    if (p.categoriaId === 'CAT-PLATOS' || p.categoriaId === 'CAT-ENTRADAS') modIds.push('MOD-SIN-CEBOLLA', 'MOD-QUESO-EXTRA');
    if (p.id === 'PROD-PLATO-LOMO') modIds.push('MOD-BIEN-COCIDO');
  }
  const alergIds: string[] = [];
  if (p.id === 'PROD-ENT-CEVICHE' || p.id === 'PROD-PLATO-PESCADO') alergIds.push('AL-PESCADO', 'AL-MARISCOS');
  if (p.id === 'PROD-PISCO-SOUR') alergIds.push('AL-HUEVO');
  if (p.id === 'PROD-POSTRE-TRES-LECHES' || p.id === 'PROD-MAZAMORRA-MORADA') alergIds.push('AL-LACTOSA', 'AL-GLUTEN', 'AL-HUEVO');
  if (p.id === 'PROD-ENT-ENSALADA-QUINUA') alergIds.push('AL-SOYA');
  const estac: EstacionCocinaFK[] = [];
  if (p.categoriaId === 'CAT-DESAYUNOS' || p.categoriaId === 'CAT-PLATOS') estac.push('COCINA_CALIENTES');
  if (p.id === 'PROD-ENT-ENSALADA-QUINUA') estac.push('COCINA_FRIOS');
  if (p.id === 'PROD-ENT-CEVICHE') estac.push('COCINA_FRIOS');
  if (p.id === 'PROD-PLATO-LOMO' || p.id === 'PROD-PLATO-PESCADO') estac.push('GRILL_PARRILLA');
  if (p.categoriaId === 'CAT-ALCOHOL' || p.categoriaId === 'CAT-BEBIDAS-FRIAS' || p.categoriaId === 'CAT-BEBIDAS-CALIENTES') estac.push('BAR');
  if (p.categoriaId === 'CAT-POSTRES') estac.push('PASTELERIA_POSTRES');
  return {
    ...p,
    presentacionesIds: presenta.map((pr) => pr.id),
    presentacionesActivasIds: presenta.map((pr) => pr.id),
    modificadoresIds: [...new Set(modIds)],
    alergenosIds: [...new Set(alergIds)],
    impuestosIds: ['IMP-IGV-18'],
    estacionesCocinaIds: [...new Set(estac)],
  };
});

const tiposHabitacionSeed: TipoHabitacion[] = [
  {
    id: 'TIPO-CABANA-DOBLE', nombre: 'Cabaña Doble', codigo: 'CAB-DOBLE',
    descripcion: 'Cabaña de madera con cama matrimonial king size + baño privado + balcón con hamaca al río',
    capacidadAdultos: 2, capacidadNinos: 0, camas: [{ tipoCama: 'KING', cantidad: 1 }],
    superficieM2: 28, vista: 'RIO', amenities: ['AIRE_ACONDICIONADO', 'AGUA_CALIENTE', 'WIFI_5G', 'TV_SMART', 'BANO_PRIVADO', 'MINIBAR', 'CAJA_FUERTE', 'SECADOR'],
    precioBaseNoche: 280.00, monedaPrecioBase: 'PEN', estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'TIPO-CABANA-TRIPLE', nombre: 'Cabaña Triple', codigo: 'CAB-TRIPLE',
    descripcion: 'Cabaña con 1 cama queen + 1 cama twin individual. Para 3 personas o familia pequeña.',
    capacidadAdultos: 3, capacidadNinos: 1, camas: [{ tipoCama: 'QUEEN', cantidad: 1 }, { tipoCama: 'TWIN', cantidad: 1 }],
    superficieM2: 34, vista: 'SELVA_MONTANA', amenities: ['AIRE_ACONDICIONADO', 'AGUA_CALIENTE', 'WIFI_5G', 'TV_SMART', 'BANO_PRIVADO', 'MINIBAR', 'CAJA_FUERTE', 'SECADOR', 'TERRAZA'],
    precioBaseNoche: 360.00, monedaPrecioBase: 'PEN', estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'TIPO-DOBLE-ECONOMICA', nombre: 'Habitación Doble Económica', codigo: 'DOB-ECON',
    descripcion: 'Habitación privada doble con baño, sin balcón. Opción económica.',
    capacidadAdultos: 2, capacidadNinos: 1, camas: [{ tipoCama: 'FULL', cantidad: 1 }],
    superficieM2: 20, vista: 'JARDIN', amenities: ['VENTILADOR_TECHO', 'AGUA_CALIENTE', 'WIFI_2_4G', 'BANO_PRIVADO', 'MINIBAR_BASICO'],
    precioBaseNoche: 220.00, monedaPrecioBase: 'PEN', estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'TIPO-SUITE-VISTA', nombre: 'Suite con Vista al Río', codigo: 'SUI-VISTA',
    descripcion: 'Suite premium, jacuzzi privado en terraza, sala de estar independiente, minibar premium, vista panorámica al río y cerros.',
    capacidadAdultos: 2, capacidadNinos: 2, camas: [{ tipoCama: 'KING', cantidad: 1 }],
    superficieM2: 52, vista: 'RIO_PANORAMICA', amenities: ['AIRE_ACONDICIONADO', 'AGUA_CALIENTE', 'WIFI_5G', 'TV_SMART_55', 'BANO_PRIVADO', 'JACUZZI_PRIVADO', 'MINIBAR_PREMIUM', 'CAJA_FUERTE', 'SECADOR', 'BATA_PANTUFLAS', 'TERRAZA'],
    precioBaseNoche: 520.00, monedaPrecioBase: 'PEN', estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'TIPO-FAMILIAR-4P', nombre: 'Familiar 4 Personas', codigo: 'FAM-4P',
    descripcion: 'Cabaña familiar con 1 cama king + 2 camas twin + 1 sofá cama opcional. Ideal para 4 personas o 2 adultos + 2 niños.',
    capacidadAdultos: 4, capacidadNinos: 3, camas: [{ tipoCama: 'KING', cantidad: 1 }, { tipoCama: 'TWIN', cantidad: 2 }],
    superficieM2: 42, vista: 'JARDIN_RIO', amenities: ['AIRE_ACONDICIONADO', 'AGUA_CALIENTE', 'WIFI_5G', 'TV_SMART', 'BANO_PRIVADO_DOBLE', 'MINIBAR', 'CAJA_FUERTE', 'SECADOR', 'TERRAZA', 'INFANTIL'],
    precioBaseNoche: 420.00, monedaPrecioBase: 'PEN', estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'TIPO-FAMILIAR-5P', nombre: 'Familiar 5 Personas Grande', codigo: 'FAM-5P',
    descripcion: 'Cabaña grande con 1 cama king + 3 camas twin. Zona común living + mini cocina equipada. Perfecta familias grandes o grupos.',
    capacidadAdultos: 5, capacidadNinos: 3, camas: [{ tipoCama: 'KING', cantidad: 1 }, { tipoCama: 'TWIN', cantidad: 3 }],
    superficieM2: 56, vista: 'SELVA_MONTANA', amenities: ['AIRE_ACONDICIONADO', 'AGUA_CALIENTE', 'WIFI_5G', 'TV_SMART', 'BANO_PRIVADO_DOBLE', 'MINIBAR', 'CAJA_FUERTE', 'SECADOR', 'TERRAZA', 'INFANTIL', 'MINI_COCINA'],
    precioBaseNoche: 500.00, monedaPrecioBase: 'PEN', estado: 'ACTIVO', ...auditSeed
  },
];

const habitacionesSeed: Habitacion[] = [
  { id: 'HAB-CAB-01', codigo: 'CAB-01', nombre: 'Cabaña 01', tipoHabitacionId: 'TIPO-CABANA-DOBLE', numeroPiso: 1, numeroPuerta: 'C-01', ubicacionDescripcion: 'Al norte, primera fila frente al río', vistaEfectiva: 'RIO', estado: 'OCUPADA', estadoLimpieza: 'LIMPIA', ultimaLimpiezaAt: hoy(), amenidadesExtra: [], observaciones: '', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-CABANA-DOBLE') as TipoHabitacion },
  { id: 'HAB-CAB-02', codigo: 'CAB-02', nombre: 'Cabaña 02', tipoHabitacionId: 'TIPO-CABANA-DOBLE', numeroPiso: 1, numeroPuerta: 'C-02', ubicacionDescripcion: 'Segunda cabaña, frente al jardín y río', vistaEfectiva: 'JARDIN_RIO', estado: 'LIBRE', estadoLimpieza: 'LIMPIA', ultimaLimpiezaAt: hoy(), amenidadesExtra: [], observaciones: '', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-CABANA-DOBLE') as TipoHabitacion },
  { id: 'HAB-FAM-03', codigo: 'FAM-03', nombre: 'Familiar 03', tipoHabitacionId: 'TIPO-FAMILIAR-4P', numeroPiso: 1, numeroPuerta: 'F-03', ubicacionDescripcion: 'Zona familiar, cerca área piscina', vistaEfectiva: 'PISCINA_JARDIN', estado: 'OCUPADA', estadoLimpieza: 'LIMPIA', ultimaLimpiezaAt: hoy(), amenidadesExtra: ['CUNA_BEBE'], observaciones: 'Cuna bebé colocada en habitación', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-FAMILIAR-4P') as TipoHabitacion },
  { id: 'HAB-CAB-04', codigo: 'CAB-04', nombre: 'Cabaña 04', tipoHabitacionId: 'TIPO-CABANA-TRIPLE', numeroPiso: 1, numeroPuerta: 'C-04', ubicacionDescripcion: 'Zona noreste, terraza con sillones', vistaEfectiva: 'SELVA_MONTANA', estado: 'LIMPIEZA', estadoLimpieza: 'EN_PROGRESO', ultimaLimpiezaAt: addDaysISO(hoy(), 0), amenidadesExtra: [], observaciones: '', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-CABANA-TRIPLE') as TipoHabitacion },
  { id: 'HAB-DOB-05', codigo: 'DOB-05', nombre: 'Doble 05', tipoHabitacionId: 'TIPO-DOBLE-ECONOMICA', numeroPiso: 2, numeroPuerta: '2-05', ubicacionDescripcion: 'Edificio segundo piso pasillo izquierdo', vistaEfectiva: 'JARDIN', estado: 'LIBRE', estadoLimpieza: 'LIMPIA', ultimaLimpiezaAt: hoy(), amenidadesExtra: [], observaciones: '', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-DOBLE-ECONOMICA') as TipoHabitacion },
  { id: 'HAB-SUI-06', codigo: 'SUI-06', nombre: 'Suite 06', tipoHabitacionId: 'TIPO-SUITE-VISTA', numeroPiso: 2, numeroPuerta: '2-06', ubicacionDescripcion: 'Esquina noroeste, jacuzzi terraza', vistaEfectiva: 'RIO_PANORAMICA', estado: 'MANTENIMIENTO', estadoLimpieza: 'PENDIENTE', ultimaLimpiezaAt: addDaysISO(hoy(), -2), amenidadesExtra: [], observaciones: 'Mantenimiento jacuzzi programado: 20-21 Sep', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-SUITE-VISTA') as TipoHabitacion },
  { id: 'HAB-CAB-07', codigo: 'CAB-07', nombre: 'Cabaña 07', tipoHabitacionId: 'TIPO-CABANA-DOBLE', numeroPiso: 1, numeroPuerta: 'C-07', ubicacionDescripcion: 'Sector bosque, más privada', vistaEfectiva: 'BOSQUE', estado: 'LIBRE', estadoLimpieza: 'LIMPIA', ultimaLimpiezaAt: hoy(), amenidadesExtra: [], observaciones: '', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-CABANA-DOBLE') as TipoHabitacion },
  { id: 'HAB-FAM-08', codigo: 'FAM-08', nombre: 'Familiar 08', tipoHabitacionId: 'TIPO-FAMILIAR-5P', numeroPiso: 1, numeroPuerta: 'F-08', ubicacionDescripcion: 'Zona familiar cerca área juegos niños', vistaEfectiva: 'JARDIN', estado: 'OCUPADA', estadoLimpieza: 'LIMPIA', ultimaLimpiezaAt: hoy(), amenidadesExtra: ['INFANTIL'], observaciones: '', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-FAMILIAR-5P') as TipoHabitacion },
  { id: 'HAB-CAB-09', codigo: 'CAB-09', nombre: 'Cabaña 09', tipoHabitacionId: 'TIPO-CABANA-TRIPLE', numeroPiso: 1, numeroPuerta: 'C-09', ubicacionDescripcion: 'Cerca restaurante', vistaEfectiva: 'JARDIN', estado: 'LIBRE', estadoLimpieza: 'LIMPIA', ultimaLimpiezaAt: hoy(), amenidadesExtra: [], observaciones: '', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-CABANA-TRIPLE') as TipoHabitacion },
  { id: 'HAB-SUI-10', codigo: 'SUI-10', nombre: 'Suite 10', tipoHabitacionId: 'TIPO-SUITE-VISTA', numeroPiso: 2, numeroPuerta: '2-10', ubicacionDescripcion: 'Piso superior, jacuzzi y sala', vistaEfectiva: 'RIO_PANORAMICA', estado: 'LIBRE', estadoLimpieza: 'LIMPIA', ultimaLimpiezaAt: hoy(), amenidadesExtra: [], observaciones: '', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-SUITE-VISTA') as TipoHabitacion },
  { id: 'HAB-FAM-11', codigo: 'FAM-11', nombre: 'Familiar 11', tipoHabitacionId: 'TIPO-FAMILIAR-4P', numeroPiso: 1, numeroPuerta: 'F-11', ubicacionDescripcion: 'Zona norte tranquila', vistaEfectiva: 'BOSQUE', estado: 'RESERVADA', estadoLimpieza: 'LIMPIA', ultimaLimpiezaAt: hoy(), amenidadesExtra: [], observaciones: '', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-FAMILIAR-4P') as TipoHabitacion },
  { id: 'HAB-CAB-12', codigo: 'CAB-12', nombre: 'Cabaña 12', tipoHabitacionId: 'TIPO-CABANA-DOBLE', numeroPiso: 1, numeroPuerta: 'C-12', ubicacionDescripcion: 'Última cabaña, sendero hacia cascadas', vistaEfectiva: 'BOSQUE', estado: 'LIBRE', estadoLimpieza: 'INSPECCIONADA', ultimaLimpiezaAt: hoy(), amenidadesExtra: [], observaciones: 'Inspeccionada 10:30 sin novedad', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-CABANA-DOBLE') as TipoHabitacion },
];

const tarifasSeed: Tarifa[] = [
  {
    id: 'TAR-STANDARD-CAB-DOB', tipoHabitacionId: 'TIPO-CABANA-DOBLE', nombre: 'Tarifa Estándar Cabaña Doble',
    descripcion: 'Tarifa base diaria temporada normal',
    tipoTarifa: 'DIARIA', moneda: 'PEN',
    precioPorNoche: 280.00,
    precioPorPersonaExtra: 70.00, precioPorNinoExtra: 35.00,
    politicaCancelacionId: 'POL-CANCEL-48H',
    fechaInicioVigencia: addDaysISO(hoy(), -365),
    fechaFinVigencia: addDaysISO(hoy(), 730),
    impuestosIds: ['IMP-IGV-18', 'IMP-SELVA-5'],
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'TAR-STANDARD-FAM4', tipoHabitacionId: 'TIPO-FAMILIAR-4P', nombre: 'Tarifa Familiar 4P',
    descripcion: 'Tarifa estándar familiar',
    tipoTarifa: 'DIARIA', moneda: 'PEN',
    precioPorNoche: 420.00,
    precioPorPersonaExtra: 80.00, precioPorNinoExtra: 40.00,
    politicaCancelacionId: 'POL-CANCEL-72H',
    fechaInicioVigencia: addDaysISO(hoy(), -365),
    fechaFinVigencia: addDaysISO(hoy(), 730),
    impuestosIds: ['IMP-IGV-18', 'IMP-SELVA-5'],
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'TAR-STANDARD-SUI', tipoHabitacionId: 'TIPO-SUITE-VISTA', nombre: 'Tarifa Suite Río',
    descripcion: 'Tarifa premium suite jacuzzi',
    tipoTarifa: 'DIARIA', moneda: 'PEN',
    precioPorNoche: 520.00,
    precioPorPersonaExtra: 90.00, precioPorNinoExtra: 45.00,
    politicaCancelacionId: 'POL-CANCEL-7D',
    fechaInicioVigencia: addDaysISO(hoy(), -365),
    fechaFinVigencia: addDaysISO(hoy(), 730),
    impuestosIds: ['IMP-IGV-18', 'IMP-SELVA-5'],
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'TAR-PACK-DESAYUNO', tipoHabitacionId: 'TIPO-CABANA-DOBLE', nombre: 'Pack Alojamiento + Desayuno Buffet 2p',
    descripcion: 'Promoción incluye alojamiento 1 noche + desayuno buffet para 2 personas',
    tipoTarifa: 'PAQUETE', moneda: 'PEN',
    precioPorNoche: 350.00,
    precioPorPersonaExtra: 45.00, precioPorNinoExtra: 22.50,
    politicaCancelacionId: 'POL-CANCEL-48H',
    fechaInicioVigencia: addDaysISO(hoy(), -30),
    fechaFinVigencia: addDaysISO(hoy(), 90),
    impuestosIds: ['IMP-IGV-18'],
    estado: 'ACTIVO', ...auditSeed
  },
];

const temporadasSeed: Temporada[] = [
  {
    id: 'TEMP-ALTA-VAC', nombre: 'Temporada Alta - Vacaciones Escolares (Julio-Ago)',
    fechaInicio: new Date(new Date().getFullYear(), 6, 1).toISOString(),
    fechaFin: new Date(new Date().getFullYear(), 7, 31).toISOString(),
    tipo: 'ALTA',
    factorPrecioPorcentaje: +20.0,
    colorEtiqueta: 'danger',
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'TEMP-ALTA-FIN', nombre: 'Temporada Alta - Fin de Año / Navidad',
    fechaInicio: new Date(new Date().getFullYear(), 11, 15).toISOString(),
    fechaFin: new Date(new Date().getFullYear() + 1, 0, 10).toISOString(),
    tipo: 'ALTA',
    factorPrecioPorcentaje: +30.0,
    colorEtiqueta: 'danger',
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'TEMP-MEDIA-SS', nombre: 'Temporada Media - Semana Santa',
    fechaInicio: new Date(new Date().getFullYear(), 3, 1).toISOString(),
    fechaFin: new Date(new Date().getFullYear(), 3, 30).toISOString(),
    tipo: 'MEDIA',
    factorPrecioPorcentaje: +10.0,
    colorEtiqueta: 'warning',
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'TEMP-BAJA-MANT', nombre: 'Temporada Baja - Mantenimiento',
    fechaInicio: new Date(new Date().getFullYear(), 0, 10).toISOString(),
    fechaFin: new Date(new Date().getFullYear(), 2, 30).toISOString(),
    tipo: 'BAJA',
    factorPrecioPorcentaje: -15.0,
    colorEtiqueta: 'success',
    estado: 'ACTIVO', ...auditSeed
  },
];

const politicasCancelacionSeed: PoliticaCancelacion[] = [
  {
    id: 'POL-CANCEL-48H', nombre: 'Estándar 48h',
    plazoHorasCancelacionGratis: 48,
    multaPorcentajeCancelacionTardia: 30,
    multaPorcentajeNoShow: 100,
    monedaMultaFija: 'PEN', multaFijaNoShow: 0,
    permiteCambiarFechas: true, limiteCambiosFechas: 2,
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'POL-CANCEL-72H', nombre: 'Familiar 72h',
    plazoHorasCancelacionGratis: 72,
    multaPorcentajeCancelacionTardia: 25,
    multaPorcentajeNoShow: 100,
    monedaMultaFija: 'PEN', multaFijaNoShow: 0,
    permiteCambiarFechas: true, limiteCambiosFechas: 3,
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'POL-CANCEL-7D', nombre: 'Premium Suite 7 días',
    plazoHorasCancelacionGratis: 7 * 24,
    multaPorcentajeCancelacionTardia: 40,
    multaPorcentajeNoShow: 100,
    monedaMultaFija: 'PEN', multaFijaNoShow: 0,
    permiteCambiarFechas: true, limiteCambiosFechas: 4,
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'POL-NO-REEMBOLSABLE', nombre: 'No Reembolsable (Oferta)',
    plazoHorasCancelacionGratis: 0,
    multaPorcentajeCancelacionTardia: 100,
    multaPorcentajeNoShow: 100,
    monedaMultaFija: 'PEN', multaFijaNoShow: 0,
    permiteCambiarFechas: false, limiteCambiosFechas: 0,
    estado: 'ACTIVO', ...auditSeed
  },
];

const codigosPromoSeed: CodigoPromocional[] = [
  {
    id: 'PROMO-WELCOME-10', codigo: 'BIENVENIDO10',
    nombre: 'Bienvenida 10% off',
    descripcion: 'Descuento 10% por primera reserva',
    tipoDescuento: 'PORCENTAJE', valorDescuento: 10.00,
    minimoNoches: 2, minimoMonto: 500,
    fechaInicio: hoy(),
    fechaFin: addDaysISO(hoy(), 180),
    usosMaximosTotales: 500, usosPorCliente: 1,
    aplicaATiposHabitacionIds: [],
    aplicaATarifasIds: [],
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROMO-3N-50OFF', codigo: '3NOCHES50',
    nombre: '3 noches - 50 PEN off',
    descripcion: 'Descuento fijo 50 soles por 3 noches o más',
    tipoDescuento: 'MONTO_FIJO', valorDescuento: 50.00,
    minimoNoches: 3, minimoMonto: 0,
    fechaInicio: hoy(),
    fechaFin: addDaysISO(hoy(), 90),
    usosMaximosTotales: 300, usosPorCliente: 1,
    aplicaATiposHabitacionIds: [],
    aplicaATarifasIds: [],
    estado: 'ACTIVO', ...auditSeed
  },
];

const huespedesSeed: Huesped[] = [
  {
    id: 'HUE-JPEREZ-001', tipoDocumento: 'DNI', numeroDocumento: '40123456',
    nombres: 'Juan', apellidos: 'Pérez Gómez', nombreCompleto: 'Juan Pérez Gómez',
    fechaNacimiento: '1987-05-14', genero: 'MASCULINO',
    nacionalidad: 'PERUANO', paisResidencia: 'PE', ciudadResidencia: 'Lima',
    telefono1: '+51 987 654 321', telefono2: '', email: 'juan.perez@example.com',
    direccionFiscal: 'Av. Arequipa 1234, Miraflores, Lima',
    emailFiscal: 'juan.perez@example.com',
    rucEmpresa: '', razonSocialEmpresa: '',
    alergias: [], condicionesMedicas: ['Hipertensión arterial leve - medicación diaria matutina'],
    preferenciasAlimentarias: ['Sin frutos secos'],
    contactoEmergencia: {
      nombres: 'María Gómez', relacionParentesco: 'Esposa',
      telefono: '+51 912 345 678', emailAlternativo: 'maria.gomez@example.com',
    },
    fechaPrimeraEstadia: addDaysISO(hoy(), -365),
    fechaUltimaEstadia: hoy(),
    totalVisitas: 5,
    totalNochesAcumuladas: 17,
    montoGastoAcumuladoHistorico: 8_950.00,
    monedaGastoAcumulado: 'PEN',
    nivelProgramaFidelidad: 'PLATA',
    puntosFidelidadAcumulados: 2_430,
    puntosFidelidadCanjeados: 900,
    tags: ['VIP repetidor', 'Pago siempre efectivo'],
    aceptaNotificacionesWhatsApp: true, aceptaNotificacionesEmail: true, aceptaNotificacionesSMS: false,
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'HUE-MLOPEZ-002', tipoDocumento: 'CE', numeroDocumento: '001556677',
    nombres: 'María Fernanda', apellidos: 'López Urrutia', nombreCompleto: 'María Fernanda López Urrutia',
    fechaNacimiento: '1992-11-08', genero: 'FEMENINO',
    nacionalidad: 'CHILENA', paisResidencia: 'CL', ciudadResidencia: 'Santiago',
    telefono1: '+56 9 9876 5432', telefono2: '', email: 'maria.lopez@example.cl',
    direccionFiscal: 'Las Condes 3245, Santiago',
    emailFiscal: 'facturacion@empresacl.cl',
    rucEmpresa: '', razonSocialEmpresa: '',
    alergias: ['Alergia a penicilina'], condicionesMedicas: [],
    preferenciasAlimentarias: ['Vegetariana'],
    contactoEmergencia: {
      nombres: 'Jorge López', relacionParentesco: 'Padre',
      telefono: '+56 2 555 5555', emailAlternativo: '',
    },
    fechaPrimeraEstadia: hoy(),
    fechaUltimaEstadia: hoy(),
    totalVisitas: 1,
    totalNochesAcumuladas: 0,
    montoGastoAcumuladoHistorico: 0,
    monedaGastoAcumulado: 'PEN',
    nivelProgramaFidelidad: 'NUEVO',
    puntosFidelidadAcumulados: 0,
    puntosFidelidadCanjeados: 0,
    tags: ['Primera vez en Perú'],
    aceptaNotificacionesWhatsApp: true, aceptaNotificacionesEmail: true, aceptaNotificacionesSMS: false,
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'HUE-LQUISPE-003', tipoDocumento: 'DNI', numeroDocumento: '45321765',
    nombres: 'Luis Alberto', apellidos: 'Quispe Apaza', nombreCompleto: 'Luis Alberto Quispe Apaza',
    fechaNacimiento: '1984-02-23', genero: 'MASCULINO',
    nacionalidad: 'PERUANO', paisResidencia: 'PE', ciudadResidencia: 'Arequipa',
    telefono1: '+51 955 111 222', telefono2: '+51 54 123456', email: 'luis.quispe@example.com',
    direccionFiscal: 'Av. Ejército 1000, Arequipa',
    emailFiscal: 'luis.quispe@example.com',
    rucEmpresa: '20453217650', razonSocialEmpresa: 'Transportes Quispe S.A.C.',
    alergias: [], condicionesMedicas: [],
    preferenciasAlimentarias: ['Sin picante'],
    contactoEmergencia: {
      nombres: 'Elena Apaza', relacionParentesco: 'Cónyuge',
      telefono: '+51 955 333 444', emailAlternativo: '',
    },
    fechaPrimeraEstadia: addDaysISO(hoy(), -180),
    fechaUltimaEstadia: hoy(),
    totalVisitas: 3,
    totalNochesAcumuladas: 8,
    montoGastoAcumuladoHistorico: 3_210.00,
    monedaGastoAcumulado: 'PEN',
    nivelProgramaFidelidad: 'BRONCE',
    puntosFidelidadAcumulados: 540,
    puntosFidelidadCanjeados: 0,
    tags: ['Factura electrónica RUC', 'Pago transferencia'],
    aceptaNotificacionesWhatsApp: true, aceptaNotificacionesEmail: true, aceptaNotificacionesSMS: true,
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'HUE-ARAMOS-004', tipoDocumento: 'PASAPORTE', numeroDocumento: 'ABC123987',
    nombres: 'Ana Carolina', apellidos: 'Ramos Ferreira', nombreCompleto: 'Ana Carolina Ramos Ferreira',
    fechaNacimiento: '1995-07-19', genero: 'FEMENINO',
    nacionalidad: 'BRASILEÑA', paisResidencia: 'BR', ciudadResidencia: 'Sao Paulo',
    telefono1: '+55 11 99999-0000', telefono2: '', email: 'ana.ramos@example.com.br',
    direccionFiscal: 'Rua Augusta, 1000 - Bela Vista, Sao Paulo',
    emailFiscal: 'ana.ramos@example.com.br',
    rucEmpresa: '', razonSocialEmpresa: '',
    alergias: ['Polen'], condicionesMedicas: [],
    preferenciasAlimentarias: [],
    contactoEmergencia: {
      nombres: 'Carlos Ferreira', relacionParentesco: 'Hermano',
      telefono: '+55 11 98888-7777', emailAlternativo: '',
    },
    fechaPrimeraEstadia: hoy(),
    fechaUltimaEstadia: hoy(),
    totalVisitas: 1,
    totalNochesAcumuladas: 0,
    montoGastoAcumuladoHistorico: 0,
    monedaGastoAcumulado: 'PEN',
    nivelProgramaFidelidad: 'NUEVO',
    puntosFidelidadAcumulados: 0,
    puntosFidelidadCanjeados: 0,
    tags: ['Grupo 4 pax con amigos', 'Portugués hablante'],
    aceptaNotificacionesWhatsApp: true, aceptaNotificacionesEmail: true, aceptaNotificacionesSMS: false,
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'HUE-JVARGAS-005', tipoDocumento: 'DNI', numeroDocumento: '41888999',
    nombres: 'José Antonio', apellidos: 'Vargas Morales', nombreCompleto: 'José Antonio Vargas Morales',
    fechaNacimiento: '1980-08-04', genero: 'MASCULINO',
    nacionalidad: 'PERUANO', paisResidencia: 'PE', ciudadResidencia: 'Trujillo',
    telefono1: '+51 966 777 888', telefono2: '', email: 'jose.vargas@example.com',
    direccionFiscal: 'Jirón Gamarra 456, Trujillo',
    emailFiscal: 'jose.vargas@example.com',
    rucEmpresa: '', razonSocialEmpresa: '',
    alergias: [], condicionesMedicas: [],
    preferenciasAlimentarias: ['Ceviche siempre', 'Cerveza bien fría'],
    contactoEmergencia: {
      nombres: 'Patricia Morales', relacionParentesco: 'Cónyuge',
      telefono: '+51 966 000 111', emailAlternativo: '',
    },
    fechaPrimeraEstadia: addDaysISO(hoy(), -90),
    fechaUltimaEstadia: hoy(),
    totalVisitas: 2,
    totalNochesAcumuladas: 6,
    montoGastoAcumuladoHistorico: 2_540.00,
    monedaGastoAcumulado: 'PEN',
    nivelProgramaFidelidad: 'BRONCE',
    puntosFidelidadAcumulados: 340,
    puntosFidelidadCanjeados: 0,
    tags: ['Fanático de tours a la selva'],
    aceptaNotificacionesWhatsApp: true, aceptaNotificacionesEmail: true, aceptaNotificacionesSMS: true,
    estado: 'ACTIVO', ...auditSeed
  },
];

const rolesSeed: Rol[] = [
  {
    id: 'ROL-SUPER-ADMIN', nombre: 'Super Administrador', codigo: 'SUPER_ADMIN',
    descripcion: 'Acceso TOTAL a todos los módulos y configuraciones del sistema',
    permisos: [
      { modulo: 'DASHBOARD', permiso: 'ADMIN' },
      { modulo: 'HABITACIONES', permiso: 'ADMIN' },
      { modulo: 'TARIFAS', permiso: 'ADMIN' },
      { modulo: 'RESERVAS', permiso: 'ADMIN' },
      { modulo: 'HUESPEDES', permiso: 'ADMIN' },
      { modulo: 'CHECKIN_CHECKOUT', permiso: 'ADMIN' },
      { modulo: 'FOLIOS', permiso: 'ADMIN' },
      { modulo: 'CAJA_PAGOS', permiso: 'ADMIN' },
      { modulo: 'FACTURACION_SUNAT', permiso: 'ADMIN' },
      { modulo: 'HOUSEKEEPING', permiso: 'ADMIN' },
      { modulo: 'MANTENIMIENTO', permiso: 'ADMIN' },
      { modulo: 'REPORTES', permiso: 'ADMIN' },
      { modulo: 'POS_FB', permiso: 'ADMIN' },
      { modulo: 'INVENTARIO', permiso: 'ADMIN' },
      { modulo: 'USUARIOS_ROLES', permiso: 'ADMIN' },
      { modulo: 'CONFIGURACION_SISTEMA', permiso: 'ADMIN' },
      { modulo: 'AUDITORIA', permiso: 'ADMIN' },
    ],
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'ROL-ADMIN', nombre: 'Administración', codigo: 'ADMIN',
    descripcion: 'Personal de gerencia: paneles generales, reportes, configuraciones',
    permisos: [
      { modulo: 'DASHBOARD', permiso: 'ADMIN' },
      { modulo: 'HABITACIONES', permiso: 'LECTURA' },
      { modulo: 'RESERVAS', permiso: 'ADMIN' },
      { modulo: 'HUESPEDES', permiso: 'ADMIN' },
      { modulo: 'CHECKIN_CHECKOUT', permiso: 'ADMIN' },
      { modulo: 'FOLIOS', permiso: 'ADMIN' },
      { modulo: 'CAJA_PAGOS', permiso: 'ADMIN' },
      { modulo: 'FACTURACION_SUNAT', permiso: 'ADMIN' },
      { modulo: 'REPORTES', permiso: 'ADMIN' },
      { modulo: 'POS_FB', permiso: 'ADMIN' },
      { modulo: 'CONFIGURACION_SISTEMA', permiso: 'ADMIN' },
      { modulo: 'AUDITORIA', permiso: 'LECTURA' },
    ],
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'ROL-RECEPCION', nombre: 'Recepción', codigo: 'RECEPCION',
    descripcion: 'Recepcionistas: reservas, check-in, check-out, folios, cobros',
    permisos: [
      { modulo: 'DASHBOARD', permiso: 'LECTURA' },
      { modulo: 'RESERVAS', permiso: 'ADMIN' },
      { modulo: 'HUESPEDES', permiso: 'ADMIN' },
      { modulo: 'CHECKIN_CHECKOUT', permiso: 'ADMIN' },
      { modulo: 'FOLIOS', permiso: 'ADMIN' },
      { modulo: 'CAJA_PAGOS', permiso: 'ADMIN' },
    ],
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'ROL-MOZO', nombre: 'Mozo / Servicio al Cliente', codigo: 'MOZO',
    descripcion: 'Mozos de restaurante y servicio a cuartos (room service)',
    permisos: [
      { modulo: 'POS_FB', permiso: 'ADMIN' },
    ],
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'ROL-COCINA', nombre: 'Cocina / KDS', codigo: 'COCINA',
    descripcion: 'Jefe de cocina, cocineros, pasteleros. Solo KDS de comandas.',
    permisos: [
      { modulo: 'POS_FB', permiso: 'LECTURA' },
    ],
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'ROL-BAR', nombre: 'Bar / Bartender', codigo: 'BAR',
    descripcion: 'Bartender / Barman. KDS de estación BAR.',
    permisos: [
      { modulo: 'POS_FB', permiso: 'LECTURA' },
    ],
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'ROL-HOUSEKEEPING', nombre: 'Housekeeping / Limpieza', codigo: 'HOUSEKEEPING',
    descripcion: 'Personal de limpieza: ver habitaciones sucias, marcar limpia',
    permisos: [
      { modulo: 'HOUSEKEEPING', permiso: 'ADMIN' },
    ],
    estado: 'ACTIVO', ...auditSeed
  },
];

const usuariosSeed: Usuario[] = [
  {
    id: 'USR-MOISES-0001', nombreUsuario: 'moises', pinLogin: null,
    nombres: 'Moisés', apellidos: 'Ochoa Sotomayor',
    iniciales: 'MO', email: 'moisesohs@gmail.com', emailVerificado: true,
    telefono: '+51 987 123 000', whatsapp: '+51 987 123 000',
    rolId: 'ROL-ADMIN', rol: rolesSeed.find((r) => r.id === 'ROL-ADMIN')!,
    permisos: rolesSeed.find((r) => r.id === 'ROL-ADMIN')!.permisos,
    puestos: ['JEFE_ADMINISTRATIVO'],
    turnosAsignadosIds: [],
    cajaHabitualId: null,
    ultimoAccesoAt: nowISO(),
    ipUltimoAcceso: '127.0.0.1',
    sesionesActivas: 1,
    mustChangePassword: false,
    intentosFallidos: 0,
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'USR-RECEP-0002', nombreUsuario: 'recepcion', pinLogin: null,
    nombres: 'Rosa María', apellidos: 'Torres Quispe',
    iniciales: 'RT', email: 'recepcion@casasumaqallpa.pe', emailVerificado: true,
    telefono: '+51 987 000 111', whatsapp: '+51 987 000 111',
    rolId: 'ROL-RECEPCION', rol: rolesSeed.find((r) => r.id === 'ROL-RECEPCION')!,
    permisos: rolesSeed.find((r) => r.id === 'ROL-RECEPCION')!.permisos,
    puestos: ['RECEPCIONISTA'],
    turnosAsignadosIds: [],
    cajaHabitualId: null,
    ultimoAccesoAt: nowISO(),
    ipUltimoAcceso: '127.0.0.1',
    sesionesActivas: 0,
    mustChangePassword: false,
    intentosFallidos: 0,
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'USR-MOZO-0003', nombreUsuario: 'mozoluis', pinLogin: null,
    nombres: 'Luis Enrique', apellidos: 'Mendoza Ccahuana',
    iniciales: 'LM', email: 'luis.mendoza@casasumaqallpa.pe', emailVerificado: true,
    telefono: '+51 987 222 333', whatsapp: '+51 987 222 333',
    rolId: 'ROL-MOZO', rol: rolesSeed.find((r) => r.id === 'ROL-MOZO')!,
    permisos: rolesSeed.find((r) => r.id === 'ROL-MOZO')!.permisos,
    puestos: ['MOZO_RESTAURANTE'],
    turnosAsignadosIds: [],
    cajaHabitualId: null,
    ultimoAccesoAt: nowISO(),
    ipUltimoAcceso: '127.0.0.1',
    sesionesActivas: 0,
    mustChangePassword: false,
    intentosFallidos: 0,
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'USR-MOZO-0004', nombreUsuario: 'mozoana', pinLogin: null,
    nombres: 'Ana Lucía', apellidos: 'Ramos Pacheco',
    iniciales: 'AR', email: 'ana.ramos@casasumaqallpa.pe', emailVerificado: true,
    telefono: '+51 987 444 555', whatsapp: '+51 987 444 555',
    rolId: 'ROL-MOZO', rol: rolesSeed.find((r) => r.id === 'ROL-MOZO')!,
    permisos: rolesSeed.find((r) => r.id === 'ROL-MOZO')!.permisos,
    puestos: ['MOZO_RESTAURANTE', 'ROOM_SERVICE'],
    turnosAsignadosIds: [],
    cajaHabitualId: null,
    ultimoAccesoAt: nowISO(),
    ipUltimoAcceso: '127.0.0.1',
    sesionesActivas: 0,
    mustChangePassword: false,
    intentosFallidos: 0,
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'USR-RS-0005', nombreUsuario: 'roomservice', pinLogin: null,
    nombres: 'Pedro', apellidos: 'Ccallo Flores',
    iniciales: 'RS', email: 'room.service@casasumaqallpa.pe', emailVerificado: true,
    telefono: '+51 987 666 777', whatsapp: '+51 987 666 777',
    rolId: 'ROL-MOZO', rol: rolesSeed.find((r) => r.id === 'ROL-MOZO')!,
    permisos: rolesSeed.find((r) => r.id === 'ROL-MOZO')!.permisos,
    puestos: ['ROOM_SERVICE'],
    turnosAsignadosIds: [],
    cajaHabitualId: null,
    ultimoAccesoAt: nowISO(),
    ipUltimoAcceso: '127.0.0.1',
    sesionesActivas: 0,
    mustChangePassword: false,
    intentosFallidos: 0,
    estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'USR-HK-0006', nombreUsuario: 'hklimpieza', pinLogin: null,
    nombres: 'Elvira', apellidos: 'Huamán Quispe',
    iniciales: 'EH', email: 'limpieza@casasumaqallpa.pe', emailVerificado: true,
    telefono: '+51 987 888 999', whatsapp: '+51 987 888 999',
    rolId: 'ROL-HOUSEKEEPING', rol: rolesSeed.find((r) => r.id === 'ROL-HOUSEKEEPING')!,
    permisos: rolesSeed.find((r) => r.id === 'ROL-HOUSEKEEPING')!.permisos,
    puestos: ['SUPERVISORA_LIMPIEZA'],
    turnosAsignadosIds: [],
    cajaHabitualId: null,
    ultimoAccesoAt: nowISO(),
    ipUltimoAcceso: '127.0.0.1',
    sesionesActivas: 0,
    mustChangePassword: false,
    intentosFallidos: 0,
    estado: 'ACTIVO', ...auditSeed
  },
];

const puntoVentaPrincipal: PuntoVenta = {
  id: 'PV-RESTAURANTE-01',
  nombre: 'Restaurante Principal',
  codigoPuntoVenta: 'C-RST',
  tipo: 'RESTAURANTE_CON_MESAS',
  descripcion: 'Restaurante principal buffet y a la carta. 5 mesas principales + terraza + room service vinculado.',
  ubicacion: 'Planta baja, frente a piscina y jardín principal',
  numeroSerieEquipo: null,
  impuestoPredeterminadoId: 'IMP-IGV-18',
  impuestosAdicionalesIds: ['IMP-SELVA-5'],
  monedaPredeterminada: 'PEN',
  propinaSugeridaPorcentaje: 10.0,
  permitePropinaVoluntaria: true,
  permiteDescuentos: true,
  descuentoMaximoPorcentaje: 20.00,
  horariosAtencion: [
    {
      id: 'HR-RST-DESAY',
      puntoVentaId: 'PV-RESTAURANTE-01',
      nombre: 'Desayuno Buffet',
      diaInicio: 'LUNES', diaFin: 'DOMINGO',
      horaApertura: '07:00', horaCierre: '10:30',
      estado: 'ACTIVO', ...auditSeed
    },
    {
      id: 'HR-RST-ALMU',
      puntoVentaId: 'PV-RESTAURANTE-01',
      nombre: 'Almuerzo Carta',
      diaInicio: 'LUNES', diaFin: 'DOMINGO',
      horaApertura: '12:30', horaCierre: '16:00',
      estado: 'ACTIVO', ...auditSeed
    },
    {
      id: 'HR-RST-CENA',
      puntoVentaId: 'PV-RESTAURANTE-01',
      nombre: 'Cena',
      diaInicio: 'LUNES', diaFin: 'DOMINGO',
      horaApertura: '18:30', horaCierre: '22:30',
      estado: 'ACTIVO', ...auditSeed
    },
    {
      id: 'HR-RST-RS',
      puntoVentaId: 'PV-RESTAURANTE-01',
      nombre: 'Room Service Continuo',
      diaInicio: 'LUNES', diaFin: 'DOMINGO',
      horaApertura: '00:01', horaCierre: '23:59',
      estado: 'ACTIVO', ...auditSeed
    },
  ],
  usuarioEncargadoId: 'USR-RECEP-0002',
  estado: 'ACTIVO', ...auditSeed
};

const mesasSeed: Mesa[] = [
  { id: 'MESA-M1', puntoVentaId: 'PV-RESTAURANTE-01', codigo: 'M-01', nombreVisible: 'Mesa 1', zona: 'SALON_PRINCIPAL', capacidadMaxPax: 4, capacidadActualUsada: 4, tipo: 'REDONDA', estado: 'OCUPADA', esCombinable: true, mesaCombinadaIds: [], habitacionAsignadaId: null, proximaLimpiezaAt: null, observaciones: '', ...auditSeed },
  { id: 'MESA-M2', puntoVentaId: 'PV-RESTAURANTE-01', codigo: 'M-02', nombreVisible: 'Mesa 2', zona: 'SALON_PRINCIPAL', capacidadMaxPax: 2, capacidadActualUsada: 2, tipo: 'CUADRADA', estado: 'OCUPADA', esCombinable: true, mesaCombinadaIds: [], habitacionAsignadaId: null, proximaLimpiezaAt: null, observaciones: '', ...auditSeed },
  { id: 'MESA-M3', puntoVentaId: 'PV-RESTAURANTE-01', codigo: 'M-03', nombreVisible: 'Mesa 3', zona: 'SALON_PRINCIPAL', capacidadMaxPax: 6, capacidadActualUsada: 0, tipo: 'RECTANGULAR', estado: 'LIBRE', esCombinable: true, mesaCombinadaIds: [], habitacionAsignadaId: null, proximaLimpiezaAt: null, observaciones: '', ...auditSeed },
  { id: 'MESA-M4', puntoVentaId: 'PV-RESTAURANTE-01', codigo: 'M-04', nombreVisible: 'Mesa 4', zona: 'SALON_PRINCIPAL', capacidadMaxPax: 4, capacidadActualUsada: 0, tipo: 'REDONDA', estado: 'SUCIA', esCombinable: true, mesaCombinadaIds: [], habitacionAsignadaId: null, proximaLimpiezaAt: nowISO(), observaciones: 'Se retiró hace 5 min, esperando limpieza', ...auditSeed },
  { id: 'MESA-M5', puntoVentaId: 'PV-RESTAURANTE-01', codigo: 'M-05', nombreVisible: 'Mesa 5', zona: 'SALON_PRINCIPAL', capacidadMaxPax: 2, capacidadActualUsada: 2, tipo: 'CUADRADA', estado: 'OCUPADA', esCombinable: true, mesaCombinadaIds: [], habitacionAsignadaId: null, proximaLimpiezaAt: null, observaciones: '', ...auditSeed },
  { id: 'MESA-T1', puntoVentaId: 'PV-RESTAURANTE-01', codigo: 'T-01', nombreVisible: 'Terraza 1', zona: 'TERRAZA_PISCINA', capacidadMaxPax: 4, capacidadActualUsada: 4, tipo: 'REDONDA', estado: 'OCUPADA', esCombinable: true, mesaCombinadaIds: [], habitacionAsignadaId: null, proximaLimpiezaAt: null, observaciones: '', ...auditSeed },
  { id: 'MESA-H101', puntoVentaId: 'PV-RESTAURANTE-01', codigo: 'H-101', nombreVisible: 'Hab. 101', zona: 'ROOM_SERVICE', capacidadMaxPax: 2, capacidadActualUsada: 2, tipo: 'ROOM_SERVICE', estado: 'OCUPADA', esCombinable: false, mesaCombinadaIds: [], habitacionAsignadaId: 'HAB-CAB-01', proximaLimpiezaAt: null, observaciones: 'Vinculada a habitación CAB-01. Cargo automático al folio', ...auditSeed },
  { id: 'MESA-H103', puntoVentaId: 'PV-RESTAURANTE-01', codigo: 'H-103', nombreVisible: 'Hab. 103', zona: 'ROOM_SERVICE', capacidadMaxPax: 4, capacidadActualUsada: 4, tipo: 'ROOM_SERVICE', estado: 'OCUPADA', esCombinable: false, mesaCombinadaIds: [], habitacionAsignadaId: 'HAB-FAM-03', proximaLimpiezaAt: null, observaciones: 'Vinculada a habitación FAM-03. Cargo automático al folio. Prioridad ALTA', ...auditSeed },
];

export type Create<T> = Omit<T, 'id' | keyof AuditFields>;
export type Update<T> = Partial<Omit<T, 'id' | keyof AuditFields>> & Pick<AuditFields, 'updatedBy'>;

// ===== RESERVAS FIXTURES =====
const auditoriaReserva = (usuarioId = 'USR-RECEP-0002'): HistorialCambioReserva[] => {
  return [{
    id: generateUUID(),
    reservaId: '',
    timestamp: nowISO(),
    usuarioId,
    tipoCambio: 'CREACION',
    valorAnterior: null,
    valorNuevo: 'Reserva creada en sistema',
    comentario: 'Seed inicial automático',
    ...auditSeed
  }];
};

const reserva1Habitaciones = [
  {
    id: generateUUID(),
    reservaId: '',
    habitacionId: 'HAB-CAB-01',
    habitacion: habitacionesSeed.find((h) => h.id === 'HAB-CAB-01') as Habitacion,
    tipoHabitacionId: 'TIPO-CABANA-DOBLE',
    tarifaId: 'TAR-STANDARD-CAB-DOB',
    fechaCheckinPropuesto: hoy(),
    fechaCheckoutPropuesto: addDaysISO(hoy(), 3),
    totalNoches: 3,
    precioBaseAcordadoPorNoche: 280.00,
    monedaPrecioAcordado: 'PEN' as const,
    estadoOcupacion: 'CHECKED_IN' as const,
    observaciones: 'Preferencia cama king size con almohadas de pluma',
    ...auditSeed
  },
];

const reserva1: Reserva = {
  id: 'RES-R1001',
  codigoReserva: 'R-1001',
  huespedId: 'HUE-JPEREZ-001',
  huesped: huespedesSeed.find((h) => h.id === 'HUE-JPEREZ-001') as Huesped,
  estado: 'CHECKED_IN',
  origen: 'DIRECTA',
  canalReservaId: 'CANAL-DIRECTA',
  agenteOtaId: null,
  codigoOtaConirmacion: null,
  fechaCreacion: hoy(),
  fechaModificacion: hoy(),
  fechaCheckin: hoy(),
  fechaCheckout: addDaysISO(hoy(), 3),
  fechaCheckinReal: hoy(),
  fechaCheckoutReal: null,
  totalNoches: 3,
  totalAdultos: 2,
  totalNinos: 1,
  totalPersonas: 3,
  tipoReserva: 'ALOJAMIENTO',
  habitaciones: reserva1Habitaciones.map((rh) => ({ ...rh, reservaId: 'RES-R1001' })),
  acompanhantes: [
    {
      id: generateUUID(),
      reservaId: 'RES-R1001',
      tipoDocumento: 'DNI',
      numeroDocumento: '40000001',
      nombres: 'Sofía Mariana',
      apellidos: 'Pérez Gómez',
      fechaNacimiento: '2018-03-17',
      genero: 'FEMENINO',
      nacionalidad: 'PERUANO',
      esMenorEdad: true,
      parentescoConTitular: 'Hija',
      observaciones: 'Cuna bebé no requerida - usa cama adicional',
      ...auditSeed
    },
  ],
  tarifaId: 'TAR-STANDARD-CAB-DOB',
  politicaCancelacionId: 'POL-CANCEL-48H',
  temporadaId: null,
  codigoPromocionalId: null,
  subTotalSinImpuestos: 840.00,
  totalImpuestos: 193.20,
  descuentosTotal: 0,
  cargoPorPersonasExtra: 35.00,
  cargoPorNinosExtra: 0,
  otrosCargosAlojamiento: 0,
  moneda: 'PEN',
  montoTotalReserva: 1068.20,
  estadoPago: 'PAGO_PARCIAL',
  saldoPendiente: 768.20,
  montoPagadoAnticipado: 300.00,
  pagoGarantia: {
    requiereGarantia: true,
    tipoGarantia: 'TARJETA_PREAUTORIZADA',
    tarjetaUltimos4: '9876',
    autorizacionCodigo: 'AUTH-789456-OK',
    montoBloqueado: 300.00,
    fechaHoraVencimientoBloqueo: addDaysISO(hoy(), 4),
    monedaGarantia: 'PEN',
    ...auditSeed
  },
  esGarantiaNoShow: false,
  medioPago: 'TARJETA_CREDITO',
  notasInternas: 'Huésped VIP. Regalo de bienvenida: botella agua de coco + chocolate artesanal en habitación',
  requerimientosEspeciales: [
    { id: generateUUID(), reservaId: 'RES-R1001', categoria: 'HABITACION', descripcion: 'Vista al río', prioridad: 'ALTA', estado: 'CUMPLIDO', ...auditSeed },
    { id: generateUUID(), reservaId: 'RES-R1001', categoria: 'BIENVENIDA', descripcion: 'Carta manuscrita de bienvenida + flores frescas', prioridad: 'MEDIA', estado: 'PENDIENTE', ...auditSeed },
  ],
  checkInInfo: {
    fechaHoraCheckin: hoy(),
    recepcionistaId: 'USR-RECEP-0002',
    llaveEntregadaCodigo: 'KEY-CAB-01-MAG',
    cantidadLlavesEntregadas: 2,
    depósitoLlavesMonto: 0,
    documentoEntregado: true,
    firmaRegistroFisico: true,
    aceptaTerminosYCondiciones: true,
    aceptaPoliticaCancelacion: true,
    autorizaCargosExtras: true,
    observaciones: 'Cliente muy amable, solicita wake up call 06:30 am en habitación',
    ...auditSeed
  },
  checkOutInfo: null,
  historialCambios: auditoriaReserva().map((h) => ({ ...h, reservaId: 'RES-R1001' })),
  ...auditSeed
};

const reserva2: Reserva = {
  id: 'RES-R1002',
  codigoReserva: 'R-1002',
  huespedId: 'HUE-MLOPEZ-002',
  huesped: huespedesSeed.find((h) => h.id === 'HUE-MLOPEZ-002') as Huesped,
  estado: 'CONFIRMADA',
  origen: 'BOOKING',
  canalReservaId: 'CANAL-BOOKING',
  agenteOtaId: 'OTA-BOOKING',
  codigoOtaConirmacion: 'BK-77665544-PERU',
  fechaCreacion: addDaysISO(hoy(), -14),
  fechaModificacion: addDaysISO(hoy(), -2),
  fechaCheckin: addDaysISO(hoy(), 1),
  fechaCheckout: addDaysISO(hoy(), 4),
  fechaCheckinReal: null,
  fechaCheckoutReal: null,
  totalNoches: 3,
  totalAdultos: 2,
  totalNinos: 0,
  totalPersonas: 2,
  tipoReserva: 'ALOJAMIENTO',
  habitaciones: [
    {
      id: generateUUID(),
      reservaId: 'RES-R1002',
      habitacionId: 'HAB-SUI-10',
      habitacion: habitacionesSeed.find((h) => h.id === 'HAB-SUI-10') as Habitacion,
      tipoHabitacionId: 'TIPO-SUITE-VISTA',
      tarifaId: 'TAR-STANDARD-SUI',
      fechaCheckinPropuesto: addDaysISO(hoy(), 1),
      fechaCheckoutPropuesto: addDaysISO(hoy(), 4),
      totalNoches: 3,
      precioBaseAcordadoPorNoche: 520.00,
      monedaPrecioAcordado: 'PEN',
      estadoOcupacion: 'RESERVADA',
      observaciones: 'Solicitan jacuzzi con pétalos de rosas para el check-in',
      ...auditSeed
    },
  ],
  acompanhantes: [],
  tarifaId: 'TAR-STANDARD-SUI',
  politicaCancelacionId: 'POL-CANCEL-7D',
  temporadaId: null,
  codigoPromocionalId: null,
  subTotalSinImpuestos: 1560.00,
  totalImpuestos: 358.80,
  descuentosTotal: 0,
  cargoPorPersonasExtra: 0,
  cargoPorNinosExtra: 0,
  otrosCargosAlojamiento: 0,
  moneda: 'PEN',
  montoTotalReserva: 1918.80,
  estadoPago: 'PAGO_PARCIAL',
  saldoPendiente: 1418.80,
  montoPagadoAnticipado: 500.00,
  pagoGarantia: {
    requiereGarantia: true,
    tipoGarantia: 'TARJETA_PREAUTORIZADA',
    tarjetaUltimos4: '3344',
    autorizacionCodigo: 'AUTH-BK-5588-PRE',
    montoBloqueado: 500.00,
    fechaHoraVencimientoBloqueo: addDaysISO(hoy(), 8),
    monedaGarantia: 'PEN',
    ...auditSeed
  },
  esGarantiaNoShow: false,
  medioPago: 'TARJETA_CREDITO',
  notasInternas: 'Huésped chilena, primera vez en Perú. Habla español y portugués. Solicita tour a las cascadas el segundo día.',
  requerimientosEspeciales: [
    { id: generateUUID(), reservaId: 'RES-R1002', categoria: 'HABITACION', descripcion: 'Suite jacuzzi con pétalos rosas rojas', prioridad: 'ALTA', estado: 'PENDIENTE', ...auditSeed },
    { id: generateUUID(), reservaId: 'RES-R1002', categoria: 'TOURS', descripcion: 'Tour cascadas 2da día de 09:00 a 13:00 con almuerzo incluido', prioridad: 'MEDIA', estado: 'PENDIENTE', ...auditSeed },
    { id: generateUUID(), reservaId: 'RES-R1002', categoria: 'TRANSPORTE', descripcion: 'Traslado aeropuerto - lodge (llegada 21 Sep 06:30 am - vuelo LA2210)', prioridad: 'ALTA', estado: 'PENDIENTE', ...auditSeed },
  ],
  checkInInfo: null,
  checkOutInfo: null,
  historialCambios: auditoriaReserva().map((h) => ({ ...h, reservaId: 'RES-R1002', valorNuevo: 'Reserva confirmada desde Booking con garantía.' })),
  ...auditSeed
};

const reserva3: Reserva = {
  id: 'RES-R1003',
  codigoReserva: 'R-1003',
  huespedId: 'HUE-LQUISPE-003',
  huesped: huespedesSeed.find((h) => h.id === 'HUE-LQUISPE-003') as Huesped,
  estado: 'CHECKED_IN',
  origen: 'WHATSAPP',
  canalReservaId: 'CANAL-WHATSAPP',
  agenteOtaId: null,
  codigoOtaConirmacion: null,
  fechaCreacion: addDaysISO(hoy(), -7),
  fechaModificacion: hoy(),
  fechaCheckin: hoy(),
  fechaCheckout: addDaysISO(hoy(), 2),
  fechaCheckinReal: hoy(),
  fechaCheckoutReal: null,
  totalNoches: 2,
  totalAdultos: 3,
  totalNinos: 1,
  totalPersonas: 4,
  tipoReserva: 'ALOJAMIENTO',
  habitaciones: [
    {
      id: generateUUID(),
      reservaId: 'RES-R1003',
      habitacionId: 'HAB-FAM-03',
      habitacion: habitacionesSeed.find((h) => h.id === 'HAB-FAM-03') as Habitacion,
      tipoHabitacionId: 'TIPO-FAMILIAR-4P',
      tarifaId: 'TAR-STANDARD-FAM4',
      fechaCheckinPropuesto: hoy(),
      fechaCheckoutPropuesto: addDaysISO(hoy(), 2),
      totalNoches: 2,
      precioBaseAcordadoPorNoche: 420.00,
      monedaPrecioAcordado: 'PEN',
      estadoOcupacion: 'CHECKED_IN',
      observaciones: 'Familia: 2 adultos + 1 adolescente + 1 niño. Cuna bebé necesaria.',
      ...auditSeed
    },
  ],
  acompanhantes: [
    {
      id: generateUUID(), reservaId: 'RES-R1003', tipoDocumento: 'DNI', numeroDocumento: '45321001',
      nombres: 'Fiorella', apellidos: 'Apaza Quispe', fechaNacimiento: '2009-11-11', genero: 'FEMENINO',
      nacionalidad: 'PERUANO', esMenorEdad: true, parentescoConTitular: 'Hija mayor', observaciones: '', ...auditSeed
    },
    {
      id: generateUUID(), reservaId: 'RES-R1003', tipoDocumento: 'DNI', numeroDocumento: '45321002',
      nombres: 'Luis', apellidos: 'Quispe Apaza Jr.', fechaNacimiento: '2019-04-02', genero: 'MASCULINO',
      nacionalidad: 'PERUANO', esMenorEdad: true, parentescoConTitular: 'Hijo menor - necesita cuna bebé', observaciones: 'Cuna bebé', ...auditSeed
    },
  ],
  tarifaId: 'TAR-STANDARD-FAM4',
  politicaCancelacionId: 'POL-CANCEL-72H',
  temporadaId: null,
  codigoPromocionalId: 'PROMO-3N-50OFF',
  subTotalSinImpuestos: 840.00,
  totalImpuestos: 193.20,
  descuentosTotal: 50.00,
  cargoPorPersonasExtra: 40.00,
  cargoPorNinosExtra: 40.00,
  otrosCargosAlojamiento: 0,
  moneda: 'PEN',
  montoTotalReserva: 1063.20,
  estadoPago: 'PAGO_PARCIAL',
  saldoPendiente: 563.20,
  montoPagadoAnticipado: 500.00,
  pagoGarantia: {
    requiereGarantia: true,
    tipoGarantia: 'TRANSFERENCIA_DEPOSITO',
    tarjetaUltimos4: null,
    autorizacionCodigo: 'OP-0456-7890-TR',
    montoBloqueado: 500.00,
    fechaHoraVencimientoBloqueo: addDaysISO(hoy(), 3),
    monedaGarantia: 'PEN',
    ...auditSeed
  },
  esGarantiaNoShow: false,
  medioPago: 'TRANSFERENCIA',
  notasInternas: 'Factura electrónica a RUC 20453217650 - Transportes Quispe SAC. Subir factura a carpeta compartida luego del Check-out.',
  requerimientosEspeciales: [
    { id: generateUUID(), reservaId: 'RES-R1003', categoria: 'HABITACION', descripcion: 'Cuna bebé colocada + silla alta para comer', prioridad: 'ALTA', estado: 'CUMPLIDO', ...auditSeed },
    { id: generateUUID(), reservaId: 'RES-R1003', categoria: 'MISC', descripcion: 'Cumpleaños 18 años de Fiorella el 21 Sep. Pastel sorpresa post-cena 20:30.', prioridad: 'ALTA', estado: 'PENDIENTE', ...auditSeed },
  ],
  checkInInfo: {
    fechaHoraCheckin: hoy(),
    recepcionistaId: 'USR-RECEP-0002',
    llaveEntregadaCodigo: 'KEY-FAM-03-RFID',
    cantidadLlavesEntregadas: 4,
    depósitoLlavesMonto: 0,
    documentoEntregado: true,
    firmaRegistroFisico: true,
    aceptaTerminosYCondiciones: true,
    aceptaPoliticaCancelacion: true,
    autorizaCargosExtras: true,
    observaciones: 'Pagaron transferencia la semana pasada. Saldo se cancela en Check-out efectivo o tarjeta.',
    ...auditSeed
  },
  checkOutInfo: null,
  historialCambios: auditoriaReserva().map((h) => ({ ...h, reservaId: 'RES-R1003', valorNuevo: 'Reserva creada desde Whatsapp recepción. Pago 50% adelantado transferencia.' })),
  ...auditSeed
};

const reserva4: Reserva = {
  id: 'RES-R1004',
  codigoReserva: 'R-1004',
  huespedId: 'HUE-ARAMOS-004',
  huesped: huespedesSeed.find((h) => h.id === 'HUE-ARAMOS-004') as Huesped,
  estado: 'PENDIENTE',
  origen: 'WEB_OFICIAL',
  canalReservaId: 'CANAL-WEB',
  agenteOtaId: null,
  codigoOtaConirmacion: null,
  fechaCreacion: hoy(),
  fechaModificacion: hoy(),
  fechaCheckin: addDaysISO(hoy(), 5),
  fechaCheckout: addDaysISO(hoy(), 8),
  fechaCheckinReal: null,
  fechaCheckoutReal: null,
  totalNoches: 3,
  totalAdultos: 4,
  totalNinos: 0,
  totalPersonas: 4,
  tipoReserva: 'ALOJAMIENTO',
  habitaciones: [
    {
      id: generateUUID(),
      reservaId: 'RES-R1004',
      habitacionId: 'HAB-CAB-04',
      habitacion: habitacionesSeed.find((h) => h.id === 'HAB-CAB-04') as Habitacion,
      tipoHabitacionId: 'TIPO-CABANA-TRIPLE',
      tarifaId: 'TAR-STANDARD-CAB-DOB',
      fechaCheckinPropuesto: addDaysISO(hoy(), 5),
      fechaCheckoutPropuesto: addDaysISO(hoy(), 8),
      totalNoches: 3,
      precioBaseAcordadoPorNoche: 360.00,
      monedaPrecioAcordado: 'PEN',
      estadoOcupacion: 'RESERVADA',
      observaciones: '4 amigos brasileños. Solicitan 2 habitaciones separadas (triple + doble) cerca una de otra.',
      ...auditSeed
    },
    {
      id: generateUUID(),
      reservaId: 'RES-R1004',
      habitacionId: 'HAB-CAB-07',
      habitacion: habitacionesSeed.find((h) => h.id === 'HAB-CAB-07') as Habitacion,
      tipoHabitacionId: 'TIPO-CABANA-DOBLE',
      tarifaId: 'TAR-STANDARD-CAB-DOB',
      fechaCheckinPropuesto: addDaysISO(hoy(), 5),
      fechaCheckoutPropuesto: addDaysISO(hoy(), 8),
      totalNoches: 3,
      precioBaseAcordadoPorNoche: 280.00,
      monedaPrecioAcordado: 'PEN',
      estadoOcupacion: 'RESERVADA',
      observaciones: 'Cabaña doble cerca a CAB-04',
      ...auditSeed
    },
  ],
  acompanhantes: [],
  tarifaId: 'TAR-STANDARD-CAB-DOB',
  politicaCancelacionId: 'POL-CANCEL-48H',
  temporadaId: null,
  codigoPromocionalId: 'PROMO-WELCOME-10',
  subTotalSinImpuestos: 1920.00,
  totalImpuestos: 441.60,
  descuentosTotal: 236.16,
  cargoPorPersonasExtra: 140.00,
  cargoPorNinosExtra: 0,
  otrosCargosAlojamiento: 0,
  moneda: 'PEN',
  montoTotalReserva: 2265.44,
  estadoPago: 'PAGO_PENDIENTE',
  saldoPendiente: 2265.44,
  montoPagadoAnticipado: 0.00,
  pagoGarantia: {
    requiereGarantia: true,
    tipoGarantia: 'PENDIENTE_CONFIRMACION',
    tarjetaUltimos4: null,
    autorizacionCodigo: null,
    montoBloqueado: 0,
    fechaHoraVencimientoBloqueo: addDaysISO(hoy(), 2),
    monedaGarantia: 'PEN',
    ...auditSeed
  },
  esGarantiaNoShow: false,
  medioPago: 'PENDIENTE',
  notasInternas: '4 amigas brasileñas. Aplicar promoción de bienvenida 10%. Falta confirmación de pago y garantía en 48h.',
  requerimientosEspeciales: [
    { id: generateUUID(), reservaId: 'RES-R1004', categoria: 'HABITACION', descripcion: 'Asignar CAB-04 + CAB-07 cercanas (cerca)', prioridad: 'ALTA', estado: 'PENDIENTE', ...auditSeed },
    { id: generateUUID(), reservaId: 'RES-R1004', categoria: 'TOURS', descripcion: 'Interesadas en tour observación de aves amanecer. Consultar disponibilidad.', prioridad: 'BAJA', estado: 'PENDIENTE', ...auditSeed },
  ],
  checkInInfo: null,
  checkOutInfo: null,
  historialCambios: auditoriaReserva().map((h) => ({ ...h, reservaId: 'RES-R1004', valorNuevo: 'Reserva web oficial pendiente de confirmación y pago.' })),
  ...auditSeed
};

const reserva5: Reserva = {
  id: 'RES-R1005',
  codigoReserva: 'R-1005',
  huespedId: 'HUE-JVARGAS-005',
  huesped: huespedesSeed.find((h) => h.id === 'HUE-JVARGAS-005') as Huesped,
  estado: 'CHECKED_OUT',
  origen: 'DIRECTA',
  canalReservaId: 'CANAL-DIRECTA',
  agenteOtaId: null,
  codigoOtaConirmacion: null,
  fechaCreacion: addDaysISO(hoy(), -6),
  fechaModificacion: addDaysISO(hoy(), -1),
  fechaCheckin: addDaysISO(hoy(), -5),
  fechaCheckout: addDaysISO(hoy(), -2),
  fechaCheckinReal: addDaysISO(hoy(), -5),
  fechaCheckoutReal: addDaysISO(hoy(), -2),
  totalNoches: 3,
  totalAdultos: 2,
  totalNinos: 0,
  totalPersonas: 2,
  tipoReserva: 'ALOJAMIENTO',
  habitaciones: [
    {
      id: generateUUID(),
      reservaId: 'RES-R1005',
      habitacionId: 'HAB-DOB-05',
      habitacion: habitacionesSeed.find((h) => h.id === 'HAB-DOB-05') as Habitacion,
      tipoHabitacionId: 'TIPO-DOBLE-ECONOMICA',
      tarifaId: 'TAR-STANDARD-CAB-DOB',
      fechaCheckinPropuesto: addDaysISO(hoy(), -5),
      fechaCheckoutPropuesto: addDaysISO(hoy(), -2),
      totalNoches: 3,
      precioBaseAcordadoPorNoche: 220.00,
      monedaPrecioAcordado: 'PEN',
      estadoOcupacion: 'CHECKED_OUT',
      observaciones: 'Check-out normal, todo OK. Dejó buena reseña.',
      ...auditSeed
    },
  ],
  acompanhantes: [],
  tarifaId: 'TAR-STANDARD-CAB-DOB',
  politicaCancelacionId: 'POL-CANCEL-48H',
  temporadaId: null,
  codigoPromocionalId: null,
  subTotalSinImpuestos: 660.00,
  totalImpuestos: 151.80,
  descuentosTotal: 0.00,
  cargoPorPersonasExtra: 0.00,
  cargoPorNinosExtra: 0.00,
  otrosCargosAlojamiento: 0.00,
  moneda: 'PEN',
  montoTotalReserva: 811.80,
  estadoPago: 'PAGADO_TOTAL',
  saldoPendiente: 0.00,
  montoPagadoAnticipado: 811.80,
  pagoGarantia: {
    requiereGarantia: true,
    tipoGarantia: 'TARJETA_PREAUTORIZADA',
    tarjetaUltimos4: '1234',
    autorizacionCodigo: 'AUTH-PREV-OK-555',
    montoBloqueado: 811.80,
    fechaHoraVencimientoBloqueo: addDaysISO(hoy(), -2),
    monedaGarantia: 'PEN',
    ...auditSeed
  },
  esGarantiaNoShow: false,
  medioPago: 'TARJETA_CREDITO',
  notasInternas: 'Cliente feliz. Reservará de nuevo en Diciembre para vacaciones fin de año con toda la familia (6 personas).',
  requerimientosEspeciales: [
    { id: generateUUID(), reservaId: 'RES-R1005', categoria: 'BIENVENIDA', descripcion: 'Fruta de bienvenida por ser cliente frecuente', prioridad: 'MEDIA', estado: 'CUMPLIDO', ...auditSeed },
  ],
  checkInInfo: {
    fechaHoraCheckin: addDaysISO(hoy(), -5),
    recepcionistaId: 'USR-RECEP-0002',
    llaveEntregadaCodigo: 'KEY-DOB-05',
    cantidadLlavesEntregadas: 2,
    depósitoLlavesMonto: 0,
    documentoEntregado: true,
    firmaRegistroFisico: true,
    aceptaTerminosYCondiciones: true,
    aceptaPoliticaCancelacion: true,
    autorizaCargosExtras: true,
    observaciones: 'Check-in rápido en 5 min',
    ...auditSeed
  },
  checkOutInfo: {
    fechaHoraCheckout: addDaysISO(hoy(), -2),
    recepcionistaId: 'USR-RECEP-0002',
    llavesDevueltas: true,
    cantidadLlavesDevueltas: 2,
    estadoHabitacionEntregaFinal: 'SUCIA',
    folioIdCerrado: 'FOL-R1005',
    folio: null,
    totalCargosFolio: 965.80,
    totalImpuestosFolio: 177.40,
    descuentosAplicados: 0.00,
    totalPagadoCheckout: 965.80,
    metodoPagoCheckout: 'TARJETA_CREDITO',
    transaccionId: 'TXN-VISA-77889900-OK',
    comprobanteEmitidoId: 'CPE-BOLETA-00123',
    comprobanteNumero: 'B001-000123',
    comprobanteEnviadoCorreo: true,
    observacionesEntrega: 'Entregado boleta electrónica por correo. Cliente muy contento. Dejó 5 soles de propina recepción.',
    firmaRecepcionCliente: true,
    ...auditSeed
  },
  historialCambios: [
    ...auditoriaReserva().map((h) => ({ ...h, reservaId: 'RES-R1005', valorNuevo: 'Reserva Directa Trujillo.' })),
    {
      id: generateUUID(), reservaId: 'RES-R1005',
      timestamp: addDaysISO(hoy(), -2), usuarioId: 'USR-RECEP-0002', tipoCambio: 'CHECKOUT',
      valorAnterior: 'CHECKED_IN', valorNuevo: 'CHECKED_OUT',
      comentario: 'Check-out exitoso. Total pago: S/ 965.80. Cliente muy contento.',
      ...auditSeed
    },
  ],
  ...auditSeed
};

const reservasSeed: Reserva[] = [reserva1, reserva2, reserva3, reserva4, reserva5];

// ===== FOLIOS =====
const buildCargoAlojamiento = (folioId: string, rh: Reserva['habitaciones'][number], folioNum: string): CargoFolio => {
  const noches = rh.totalNoches;
  const monto = Number((noches * rh.precioBaseAcordadoPorNoche).toFixed(2));
  return {
    id: generateUUID(),
    folioId,
    tipo: 'ALOJAMIENTO',
    concepto: `Alojamiento ${noches} noche${noches > 1 ? 's' : ''} - Hab ${rh.habitacion.codigo}`,
    descripcion: `${noches} noches de alojamiento en habitación. Tarifa base S/ ${rh.precioBaseAcordadoPorNoche.toFixed(2)}`,
    origen: 'ALOJAMIENTO_RESERVA',
    referenciaId: rh.id,
    reservaId: rh.reservaId || '',
    habitacionId: rh.habitacionId,
    huespedId: '',
    productoInventarioId: null,
    comandaId: null,
    comandaDetalleId: null,
    cajaSesionId: null,
    usuarioId: 'USR-RECEP-0002',
    monto,
    moneda: 'PEN',
    impuestosIds: ['IMP-IGV-18', 'IMP-SELVA-5'],
    impuestosMontoDesglosado: [
      { impuestoId: 'IMP-IGV-18', impuestoNombre: 'IGV 18%', montoImpuesto: Number((monto * 0.18).toFixed(2)) },
      { impuestoId: 'IMP-SELVA-5', impuestoNombre: 'IGV Selva 5%', montoImpuesto: Number((monto * 0.05).toFixed(2)) },
    ],
    subtotal: Number((monto / 1.23).toFixed(2)),
    descuentosIds: [],
    descuentosMontoDesglosado: [],
    propinaMonto: 0,
    estado: 'PENDIENTE_COBRO',
    fechaCargo: hoy(),
    fechaAplicacion: hoy(),
    fechaVencimiento: addDaysISO(hoy(), rh.totalNoches),
    esAnulado: false,
    motivoAnulacion: '',
    comprobanteAsociadoId: null,
    comentarios: `Cargo automático check-in. Folio #${folioNum}`,
    ...auditSeed
  };
};

const folioCheckIn = (r: Reserva, folioNum: string, num = 'F-2026-0920'): Folio => {
  const rh = r.habitaciones[0];
  const huespedId = r.huespedId;
  const habitacionId = rh.habitacionId;
  const cargoAloj = buildCargoAlojamiento('', rh, folioNum);
  const cargos: CargoFolio[] = [{ ...cargoAloj, folioId: '' }];
  return {
    id: `FOL-${r.id}`,
    numeroFolio: num,
    reservaId: r.id,
    reserva: r,
    checkInId: r.checkInInfo ? `CHECKIN-${r.id}` : null,
    huespedId,
    huesped: r.huesped,
    habitacionId,
    habitacion: rh.habitacion,
    fechaApertura: r.fechaCheckinReal || r.fechaCheckin,
    fechaCierre: null,
    fechaCheckout: r.fechaCheckout,
    fechaCheckoutReal: null,
    estado: 'ABIERTO',
    esCuentaCompartida: false,
    foliosCompartidosIds: [],
    usuarioIdApertura: r.checkInInfo?.recepcionistaId || 'USR-RECEP-0002',
    usuarioIdCierre: null,
    moneda: 'PEN',
    cargos,
    pagos: [],
    subTotalSinImpuestos: cargos.reduce((sum, c) => sum + c.subtotal, 0),
    totalImpuestos: cargos.reduce((sum, c) => sum + (c.impuestosMontoDesglosado?.reduce((s, i) => s + i.montoImpuesto, 0) || 0), 0),
    totalPropinas: 0,
    totalDescuentos: 0,
    totalBonificacionesCortesia: 0,
    totalFolio: cargos.reduce((sum, c) => sum + c.monto, 0),
    totalPagado: 0,
    saldoPendiente: cargos.reduce((sum, c) => sum + c.monto, 0),
    limiteCreditoAutorizado: 3000,
    creditoExcedido: false,
    notasInternas: `Folio abierto en Check-in automático. Hab ${rh.habitacion.codigo}. Cualquier consumo POS se carga automáticamente.`,
    comprobantePrevioId: null,
    comprobanteFinalId: null,
    ...auditSeed
  };
};

const foliosSeed: Folio[] = [
  folioCheckIn(reserva1, 'F-2026-0920-001', 'F-2026-0920-001'),
  folioCheckIn(reserva3, 'F-2026-0920-002', 'F-2026-0920-002'),
];

// Pagos del folio cerrado de la reserva 5
const pagoFolioCerrado: PagoFolio = {
  id: generateUUID(),
  folioId: 'FOL-RES-R1005',
  cajaSesionId: null,
  usuarioId: 'USR-RECEP-0002',
  metodoPago: 'TARJETA_CREDITO',
  subMetodoPago: 'VISA',
  monto: 965.80,
  moneda: 'PEN',
  tipoCambioMonedaReferencia: 1.0,
  montoMonedaOriginal: 965.80,
  fechaHoraPago: addDaysISO(hoy(), -2),
  referenciaBancaria: 'TXN-VISA-77889900',
  comprobanteAsociadoId: 'CPE-BOLETA-00123',
  comprobanteNumero: 'B001-000123',
  estado: 'COMPLETADO',
  esPropina: false,
  esParcial: false,
  esDevolucion: false,
  pagoOriginalId: null,
  comprobanteEnvioCorreo: true,
  comprobanteEnvioWhatsApp: true,
  comprobantePDFUrl: null,
  cajeroNombre: null,
  aprobacionCodigo: 'APP-77889900-VISA',
  observaciones: 'Pago exitoso sin novedades. Check-out R-1005.',
  ...auditSeed
};

// ===== COMANDAS MOCK =====
const buildComandaDetalle = (comandaId: string, prod: ProductoFB, cant: number, observaciones = ''): ComandaDetalle => {
  const precio = prod.precioVentaBase;
  const linea: LineaComanda = {
    id: generateUUID(),
    numeroLinea: 1,
    productoId: prod.id,
    presentacionId: prod.presentacionesActivasIds[0],
    cantidad: cant,
    precioUnitario: precio,
    moneda: 'PEN',
    descuentoPorcentaje: 0,
    descuentoMonto: 0,
    observaciones,
    seleccionModificadores: [],
    alergenosOmitidosIds: [],
    impuestosIds: prod.impuestosIds,
    impuestosMontoDesglosado: prod.impuestosIds.map((id) => {
      const monto = (precio * cant) * (id === 'IMP-IGV-18' ? 0.18 : 0.05);
      return { impuestoId: id, impuestoNombre: id === 'IMP-IGV-18' ? 'IGV 18%' : 'IGV Selva 5%', montoImpuesto: Number(monto.toFixed(2)) };
    }),
    subtotal: Number((precio * cant / 1.23).toFixed(2)),
    montoLinea: Number((precio * cant).toFixed(2)),
    estadoPreparacion: 'PENDIENTE',
    estacionCocinaId: prod.estacionesCocinaIds[0] || null,
    usuarioIdAsignadoEstacion: null,
    horaSolicitado: nowISO(),
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
    ...auditSeed
  };
  return { ...linea, comandaId };
};

const buildComanda = (
  c: Mesa,
  r: Reserva | null,
  num: string,
  detalles: ComandaDetalle[],
  opts: Partial<Comanda> = {}
): Comanda => {
  const total = detalles.reduce((sum, d) => sum + d.montoLinea, 0);
  return {
    id: generateUUID(),
    puntoVentaId: c.puntoVentaId,
    puntoVenta: puntoVentaPrincipal,
    cajaSesionId: null,
    numeroCorrelativo: `C-${num}`,
    mesaId: c.id,
    mesa: c,
    habitacionId: c.habitacionAsignadaId || null,
    habitacion: c.habitacionAsignadaId ? (habitacionesSeed.find((h) => h.id === c.habitacionAsignadaId) as Habitacion) : null,
    folioId: c.habitacionAsignadaId && r ? `FOL-${r.id}` : null,
    reservaId: r?.id || null,
    reserva: r || null,
    huespedTitularId: r?.huespedId || null,
    huespedTitular: r?.huesped || null,
    tipoComanda: c.zona === 'ROOM_SERVICE' ? 'ROOM_SERVICE' : 'MESA_RESTAURANTE',
    tipoConsumo: c.zona === 'ROOM_SERVICE' ? 'CARGO_A_HABITACION' : 'COBRO_DIRECTO',
    prioridad: c.habitacionAsignadaId === 'HAB-FAM-03' ? 'ROOM_SERVICE_RAPIDO' : 'NORMAL',
    estado: opts.estado || 'ABIERTA',
    estadoEntrega: opts.estadoEntrega || 'EN_PROCESO',
    modoAtencion: c.zona === 'ROOM_SERVICE' ? 'ROOM_SERVICE' : 'EN_SALON',
    usuarioIdMozoApertura: opts.usuarioIdMozoApertura || 'USR-MOZO-0003',
    mozoAsignado: opts.mozoAsignado || null,
    turnoServicioId: null,
    fechaApertura: nowISO(),
    horaApertura: nowISO(),
    fechaCierre: null,
    horaCierre: null,
    paxAdultos: c.capacidadActualUsada,
    paxNinos: 0,
    moneda: 'PEN',
    detalles,
    totalNetoSinImpuestos: Number((total / 1.23).toFixed(2)),
    totalImpuestos: Number((total - (total / 1.23)).toFixed(2)),
    impuestosDetalle: [
      { impuestoId: 'IMP-IGV-18', impuestoNombre: 'IGV 18%', montoImpuesto: Number((total * 0.18 / 1.23).toFixed(2)) },
      { impuestoId: 'IMP-SELVA-5', impuestoNombre: 'IGV Selva 5%', montoImpuesto: Number((total * 0.05 / 1.23).toFixed(2)) },
    ],
    totalDescuentos: 0,
    descuentosAplicadosIds: [],
    propinaSugerida: Number((total * 0.10).toFixed(2)),
    propinaAplicadaMonto: 0,
    propinaReparticion: null,
    totalPropinas: 0,
    totalComanda: total,
    totalFinalConPropina: total,
    saldoPendiente: total,
    totalCobrado: 0,
    cobros: [],
    cierre: null,
    observacionesInternas: opts.observacionesInternas || '',
    horaEnvioKds: nowISO(),
    horaPrimeraEntrega: null,
    horaUltimaEntrega: null,
    ticketsKdsIds: [],
    facturasIds: [],
    ...auditSeed
  };
};

const prod = (id: string) => productosFBSeed.find((p) => p.id === id)!;

const comandasSeed: Comanda[] = [
  buildComanda(mesasSeed[0], null, '901', [
    buildComandaDetalle('', prod('PROD-ENT-ENSALADA-QUINUA'), 1, 'Sin cebolla + queso extra'),
    buildComandaDetalle('', prod('PROD-PLATO-LOMO'), 2, '1 bien cocido, 1 jugoso'),
    buildComandaDetalle('', prod('PROD-PLATO-TACACHO'), 1),
    buildComandaDetalle('', prod('PROD-JUGO-NARANJA'), 2),
    buildComandaDetalle('', prod('PROD-CUSQUENA'), 2),
    buildComandaDetalle('', prod('PROD-POSTRE-TRES-LECHES'), 1),
  ], {
    estado: 'EN_COCINA_BAR',
    estadoEntrega: 'EN_PROCESO',
    usuarioIdMozoApertura: 'USR-MOZO-0003',
  }),
  buildComanda(mesasSeed[1], null, '902', [
    buildComandaDetalle('', prod('PROD-ENT-CEVICHE'), 1),
    buildComandaDetalle('', prod('PROD-PLATO-PESCADO'), 1, 'Salsa 3 ajíes por favor'),
    buildComandaDetalle('', prod('PROD-AGUA-MINERAL'), 1),
  ], {
    estado: 'LISTA_PARA_ENTREGAR',
    estadoEntrega: 'PENDIENTE_ENTREGA_MOZO',
    usuarioIdMozoApertura: 'USR-MOZO-0004',
  }),
  buildComanda(mesasSeed[4], null, '903', [
    buildComandaDetalle('', prod('PROD-PLATO-JUANE'), 1),
    buildComandaDetalle('', prod('PROD-GASEOSA'), 1, 'Inca Kola'),
  ], {
    estado: 'ABIERTA',
    estadoEntrega: 'TOMANDO_ORDEN',
    usuarioIdMozoApertura: 'USR-MOZO-0003',
  }),
  buildComanda(mesasSeed[5], null, '904', [
    buildComandaDetalle('', prod('PROD-DESAY-BUFFET'), 3, ''),
    buildComandaDetalle('', prod('PROD-CAFE-AMERICANO'), 2),
    buildComandaDetalle('', prod('PROD-TE-VERDE'), 1),
    buildComandaDetalle('', prod('PROD-JUGO-NARANJA'), 2),
  ], {
    estado: 'CERRADA_COBRADA',
    estadoEntrega: 'TODOS_ENTREGADOS',
    usuarioIdMozoApertura: 'USR-MOZO-0004',
    cobros: [{
      id: generateUUID(),
      comandaId: '',
      folioId: null,
      cajaSesionId: null,
      usuarioIdCobro: 'USR-MOZO-0004',
      metodoPago: 'EFECTIVO',
      subMetodoPago: 'SOLES_EFECTIVO',
      monto: 198.0,
      moneda: 'PEN',
      montoPagadoCon: 200.00,
      montoVuelto: 2.00,
      fechaHoraCobro: nowISO(),
      comprobanteId: null,
      comprobanteNumero: null,
      referenciaBancaria: null,
      comprobanteEnvioCorreo: false,
      comprobanteEnvioWhatsApp: false,
      comprobantePDFUrl: null,
      estado: 'COMPLETADO',
      cierreCajaId: null,
      observaciones: 'Cliente pagó en efectivo 200, vuelto 2 soles',
      ...auditSeed
    }],
    cierre: {
      id: generateUUID(),
      comandaId: '',
      tipo: 'COBRO_DIRECTO',
      folioIdCargado: null,
      cajaSesionId: null,
      usuarioIdCierre: 'USR-MOZO-0004',
      fechaHoraCierre: nowISO(),
      observaciones: 'Cobro completo',
      ...auditSeed
    } as CierreComanda,
  }),
  buildComanda(mesasSeed[6], reserva1, '910', [
    buildComandaDetalle('', prod('PROD-DESAY-CONTINENTAL'), 2),
    buildComandaDetalle('', prod('PROD-CAFE-AMERICANO'), 2, 'Café americano poco azúcar'),
    buildComandaDetalle('', prod('PROD-JUGO-NARANJA'), 1),
    buildComandaDetalle('', prod('PROD-ENT-ENSALADA-QUINUA'), 1, 'Sin gluten, pide opcion sin quinua (cambiar por ensalada fresca)'),
    buildComandaDetalle('', prod('PROD-AGUA-MINERAL'), 1, 'Sin gas, bien fría'),
  ], {
    estado: 'EN_COCINA_BAR',
    estadoEntrega: 'EN_PROCESO',
    usuarioIdMozoApertura: 'USR-RS-0005',
    observacionesInternas: 'Room Service Hab 101 / CAB-01. Entregar con cubertería de 2 + servilletas tela. Aplicar cargo automático al folio #F-2026-0920-001.',
  }),
  buildComanda(mesasSeed[7], reserva3, '915', [
    buildComandaDetalle('', prod('PROD-DESAY-BUFFET'), 4),
    buildComandaDetalle('', prod('PROD-CAFE-AMERICANO'), 2),
    buildComandaDetalle('', prod('PROD-TE-VERDE'), 1),
    buildComandaDetalle('', prod('PROD-JUGO-NARANJA'), 2),
    buildComandaDetalle('', prod('PROD-CUSQUENA'), 4),
    buildComandaDetalle('', prod('PROD-PISCO-SOUR'), 2),
    buildComandaDetalle('', prod('PROD-PLATO-LOMO'), 2),
    buildComandaDetalle('', prod('PROD-POSTRE-TRES-LECHES'), 2, 'Pastel sorpresa incluido (cumpleaños 21 Sep Fiorella 18 años)'),
  ], {
    estado: 'ABIERTA',
    estadoEntrega: 'TOMANDO_ORDEN',
    usuarioIdMozoApertura: 'USR-RS-0005',
    observacionesInternas: 'Room Service Hab 103 / FAM-03. Carga automática a folio #F-2026-0920-002. Incluye pastel sorpresa cumpleaños 20:30 hrs (contactar pastelería). Prioridad ALTA.',
  }),
];

export const seed = {
  audit: auditSeed,
  alergenos: alergenosSeed,
  estacionesCocina: estacionesCocinaSeed,
  impuestos: [impuestoIGV, impuestoSelva],
  categoriasFB: categoriasFBSeed,
  productosFB: productosFBSeed,
  modificadoresFB: modificadoresFBSeed,
  presentacionesFB: productosFBSeed.flatMap((p) => presentacionesBase(p.id, p.precioVentaBase)),
  tiposHabitacion: tiposHabitacionSeed,
  habitaciones: habitacionesSeed,
  tarifas: tarifasSeed,
  temporadas: temporadasSeed,
  politicasCancelacion: politicasCancelacionSeed,
  codigosPromo: codigosPromoSeed,
  huespedes: huespedesSeed,
  roles: rolesSeed,
  usuarios: usuariosSeed,
  puntosVenta: [puntoVentaPrincipal],
  mesas: mesasSeed,
  reservas: reservasSeed,
  folios: foliosSeed,
  pagosFolio: [pagoFolioCerrado],
  comandas: comandasSeed,
  propinasSugeridasPorcentaje: propinasSugeridas,
  meta: {
    generateUUID,
    nowISO,
    addDaysISO,
    hoy,
  },
};

export const seedUtil = {
  generateUUID,
  nowISO,
  addDaysISO,
  hoy,
};
