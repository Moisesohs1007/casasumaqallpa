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
  { id: 'CAT-DESAYUNOS', nombre: '🥣 Desayunos', orden: 1, descripcion: 'Servicio de 6 a.m. a 9 a.m. · Incluye Jugo, Café, Té de cortesía', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-JUGOS', nombre: '🥤 Jugos Naturales', orden: 2, descripcion: 'Jugos recién exprimidos (Papaya, Piña, Naranja, Fresa)', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-BEBIDAS-FRIAS', nombre: '🧊 Bebidas Frías', orden: 3, descripcion: 'Agua mineral, Gaseosa 1/2L, Gatorade, Chicha Morada 1L, Limonada 1L, Maracuyá 1L', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-BEBIDAS-CALIENTES', nombre: '☕ Bebidas Calientes', orden: 4, descripcion: 'Infusiones (7 variedades), Café, Cappuccino, Chocolate con Leche, Leche', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-BEBIDAS-ALCOHOL', nombre: '🍻 Bebidas (Cerveza/Vino)', orden: 5, descripcion: 'Cerveza Artesanal 15, Vino Santiago Queirolo 25, Calientito Tradicional 20 (cortesía: Boca, Magdalena y borgoñita)', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-SANDWICH', nombre: '🥪 Sandwich', orden: 6, descripcion: 'Sándwiches fríos y calientes (Queso, Huevo, Aceituna, Pollo a la plancha)', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-ENTRADAS', nombre: '🥗 Entradas', orden: 7, descripcion: 'Almuerzo y/o Cena · Ensalada Fresca, Ensalada de Atún, Papa a la Huancaína, Tequeños', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-SOPAS', nombre: '🍲 Sopas', orden: 8, descripcion: 'Caldo de Gallina 25, Sopa a la Minuta 20, Sopa de Papa Cashqui 15, Crema de Zapallo 15', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-PLATOS', nombre: '🍽️ Platos Principales', orden: 9, descripcion: 'Almuerzo y/o Cena · Criollo, Marino, Amazónico · Lomo Saltado 30, Picante de Cuy 35, Trucha Frita 32', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-PIZZAS', nombre: '🍕 Pizzas', orden: 10, descripcion: 'Pizza Personal (Americana 29, Hawaiana 30, Pepperoni 32). Tamaño Mediana = adicional S/ 12', estado: 'ACTIVO', ...auditSeed },
  { id: 'CAT-POSTRES', nombre: '🍰 Postres', orden: 11, descripcion: 'Waffles 15, Crepe con Helados 15, Ensalada de Frutas 15, Helados 7. Derecho Corcho S/ 10 botella de vino', estado: 'ACTIVO', ...auditSeed },
];

const presentacionesBase = (productoId: string, precio: number, unidad = 'Porción'): PresentacionProducto[] => {
  const baseId = `${productoId}-P1`;
  return [
    { id: baseId, productoId, nombre: unidad, precio, costoAproximado: Number((precio * 0.4).toFixed(2)), stockControl: false, unidadMedida: 'UNIDAD', ...auditSeed },
  ];
};

const productosFBSeedBase: Array<Omit<ProductoFB, 'presentacionesIds' | 'presentacionesActivasIds' | 'modificadoresIds' | 'alergenosIds' | 'impuestosIds' | 'estacionesCocinaIds'>> = [
  /* ================ 🥣 DESAYUNOS (Orden 1) ================ */
  {
    id: 'PROD-DESAY-LOMOALJUGO', categoriaId: 'CAT-DESAYUNOS', codigo: 'DES001', nombre: 'Lomo al Jugo',
    descripcion: '2 Panes, Jugo, Café. Desayuno criollo caliente.',
    precioVentaBase: 20.00, costoAproximado: 8.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-DESAY-CONTINENTAL', categoriaId: 'CAT-DESAYUNOS', codigo: 'DES002', nombre: 'Continental',
    descripcion: '2 Panes, fiambres (jamón+queso), fruta o ensalada, Jugo, Café.',
    precioVentaBase: 20.00, costoAproximado: 7.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-DESAY-AMERICANO', categoriaId: 'CAT-DESAYUNOS', codigo: 'DES003', nombre: 'Americano',
    descripcion: '2 Tortillas, Manzanilla, mermelada, Jugo, Café.',
    precioVentaBase: 15.00, costoAproximado: 5.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-DESAY-REGIONAL-YUNGAINO', categoriaId: 'CAT-DESAYUNOS', codigo: 'DES004', nombre: 'Regional - Yungaino',
    descripcion: '2 Panes, 1 tamal (relleno de chicharrón o cojo). Jugo, Café.',
    precioVentaBase: 20.00, costoAproximado: 8.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },

  /* ================ 🥤 JUGOS NATURALES (Orden 2) ================ */
  {
    id: 'PROD-JUGO-PAPAYA', categoriaId: 'CAT-JUGOS', codigo: 'JUG001', nombre: 'Jugo de Papaya',
    descripcion: 'Papaya natural recién licuada.',
    precioVentaBase: 6.00, costoAproximado: 2.20, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-JUGO-PINA', categoriaId: 'CAT-JUGOS', codigo: 'JUG002', nombre: 'Jugo de Piña',
    descripcion: 'Piña natural fresca.',
    precioVentaBase: 6.00, costoAproximado: 2.20, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-JUGO-NARANJA', categoriaId: 'CAT-JUGOS', codigo: 'JUG003', nombre: 'Jugo de Naranja',
    descripcion: 'Exprimido al momento.',
    precioVentaBase: 7.00, costoAproximado: 2.60, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-JUGO-FRESA', categoriaId: 'CAT-JUGOS', codigo: 'JUG004', nombre: 'Jugo de Fresa',
    descripcion: 'Fresas naturales licuadas.',
    precioVentaBase: 7.00, costoAproximado: 2.60, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },

  /* ================ 🧊 BEBIDAS FRÍAS (Orden 3) ================ */
  {
    id: 'PROD-AGUA-MINERAL', categoriaId: 'CAT-BEBIDAS-FRIAS', codigo: 'BEB401', nombre: 'Agua Mineral',
    descripcion: 'Agua mineral sin gas, S/ 3.00.',
    precioVentaBase: 3.00, costoAproximado: 1.20, moneda: 'PEN',
    permiteModificadores: false, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-GASEOSA', categoriaId: 'CAT-BEBIDAS-FRIAS', codigo: 'BEB402', nombre: 'Gaseosa (1/2 L)',
    descripcion: 'Inca Kola / Coca Cola / Sprite, 500ml. Especificar marca en observaciones.',
    precioVentaBase: 5.00, costoAproximado: 2.00, moneda: 'PEN',
    permiteModificadores: false, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-GATORADE', categoriaId: 'CAT-BEBIDAS-FRIAS', codigo: 'BEB403', nombre: 'Gatorade (1L)',
    descripcion: 'Bebida isotónica 1 Litro.',
    precioVentaBase: 4.00, costoAproximado: 1.60, moneda: 'PEN',
    permiteModificadores: false, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-CHICHA-MORADA-1L', categoriaId: 'CAT-BEBIDAS-FRIAS', codigo: 'BEB404', nombre: 'Chicha Morada (1L)',
    descripcion: 'Chicha morada tradicional.',
    precioVentaBase: 14.00, costoAproximado: 5.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-LIMONADA-1L', categoriaId: 'CAT-BEBIDAS-FRIAS', codigo: 'BEB405', nombre: 'Limonada (1L)',
    descripcion: 'Limonada natural 1 litro.',
    precioVentaBase: 14.00, costoAproximado: 5.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-MARACUYA-1L', categoriaId: 'CAT-BEBIDAS-FRIAS', codigo: 'BEB406', nombre: 'Maracuyá (1L)',
    descripcion: 'Jugo de maracuyá 1 litro.',
    precioVentaBase: 14.00, costoAproximado: 5.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },

  /* ================ ☕ BEBIDAS CALIENTES (Orden 4) ================ */
  {
    id: 'PROD-INFUSIONES', categoriaId: 'CAT-BEBIDAS-CALIENTES', codigo: 'BEB501', nombre: 'Infusiones',
    descripcion: '7 variedades: Té, Anís, Manzanillo, Cedrón, Hierba luisa, Muña, Café tostado. S/ 3.00',
    precioVentaBase: 3.00, costoAproximado: 1.10, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-CAFE', categoriaId: 'CAT-BEBIDAS-CALIENTES', codigo: 'BEB502', nombre: 'Café',
    descripcion: 'Café tradicional peruano. S/ 5.00',
    precioVentaBase: 5.00, costoAproximado: 1.80, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-CAPPUCCINO', categoriaId: 'CAT-BEBIDAS-CALIENTES', codigo: 'BEB503', nombre: 'Cappuccino',
    descripcion: 'Café + leche espumada. S/ 8.50',
    precioVentaBase: 8.50, costoAproximado: 3.20, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-CHOCOLATE-CON-LECHE', categoriaId: 'CAT-BEBIDAS-CALIENTES', codigo: 'BEB504', nombre: 'Chocolate con Leche',
    descripcion: 'Chocolate caliente con leche. S/ 7.00',
    precioVentaBase: 7.00, costoAproximado: 2.60, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-LECHE', categoriaId: 'CAT-BEBIDAS-CALIENTES', codigo: 'BEB505', nombre: 'Leche',
    descripcion: 'Leche entera tibia. S/ 5.50',
    precioVentaBase: 5.50, costoAproximado: 2.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },

  /* ================ 🍻 BEBIDAS ALCOHOL / Bar (Orden 5) ================ */
  {
    id: 'PROD-CERVEZA-ARTESANAL', categoriaId: 'CAT-BEBIDAS-ALCOHOL', codigo: 'BAR601', nombre: 'Cerveza Artesanal',
    descripcion: 'Cerveza artesanal local. S/ 15.00',
    precioVentaBase: 15.00, costoAproximado: 6.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-VINO-SANTIAGO-QUEIROLO', categoriaId: 'CAT-BEBIDAS-ALCOHOL', codigo: 'BAR602', nombre: 'Vino Santiago Queirolo',
    descripcion: 'Botella 750ml. S/ 25.00 (Boca, Magdalena y borgoñita).',
    precioVentaBase: 25.00, costoAproximado: 10.00, moneda: 'PEN',
    permiteModificadores: false, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-CALIENTITO-TRADICIONAL', categoriaId: 'CAT-BEBIDAS-ALCOHOL', codigo: 'BAR603', nombre: 'Calientito Tradicional 1LT',
    descripcion: 'Bebida tradicional de yerva luisa, flor de Jamaica, naranja, limón y piña. S/ 20.00.',
    precioVentaBase: 20.00, costoAproximado: 7.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },

  /* ================ 🥪 SANDWICH (Orden 6) ================ */
  {
    id: 'PROD-SANDWICH-QUESO', categoriaId: 'CAT-SANDWICH', codigo: 'SW701', nombre: 'Sándwich Queso',
    descripcion: 'Pan + queso fresco / fundido. S/ 5.00.',
    precioVentaBase: 5.00, costoAproximado: 1.80, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-SANDWICH-HUEVO', categoriaId: 'CAT-SANDWICH', codigo: 'SW702', nombre: 'Sándwich Huevo',
    descripcion: 'Huevo pasado por agua + pan. S/ 5.00.',
    precioVentaBase: 5.00, costoAproximado: 1.80, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-SANDWICH-ACEITUNA', categoriaId: 'CAT-SANDWICH', codigo: 'SW703', nombre: 'Sándwich Aceituna',
    descripcion: 'Pan con aceitunas, opcional jamón. S/ 5.00.',
    precioVentaBase: 5.00, costoAproximado: 1.80, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-SANDWICH-POLLO-PLANCHA', categoriaId: 'CAT-SANDWICH', codigo: 'SW704', nombre: 'Sándwich Pollo a la Plancha',
    descripcion: 'Pollo grill + salsas. S/ 12.00.',
    precioVentaBase: 12.00, costoAproximado: 4.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },

  /* ================ 🥗 ENTRADAS (Orden 7) ================ */
  {
    id: 'PROD-ENT-ENSALADA-FRESCA', categoriaId: 'CAT-ENTRADAS', codigo: 'ENT801', nombre: 'Ensalada Fresca',
    descripcion: 'Pechuga, lechuga, palta y tomate. S/ 15.00',
    precioVentaBase: 15.00, costoAproximado: 5.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-ENT-ENSALADA-ATUN', categoriaId: 'CAT-ENTRADAS', codigo: 'ENT802', nombre: 'Ensalada de Atún',
    descripcion: 'Filete de atún en aceitunas, lechuga, huevo duro, cebolla, canchita y vinagreta.',
    precioVentaBase: 20.00, costoAproximado: 7.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-ENT-PAPA-HUANCAINA', categoriaId: 'CAT-ENTRADAS', codigo: 'ENT803', nombre: 'Papa a la Huancaína',
    descripcion: 'Papas sancochadas, crema a la huancaína, lechuga, huevo duro y aceitunas.',
    precioVentaBase: 12.00, costoAproximado: 4.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-ENT-TEQUENOS', categoriaId: 'CAT-ENTRADAS', codigo: 'ENT804', nombre: 'Tequeños',
    descripcion: 'Anticucho con queso grifo jimenado acompañado de una crema de palta.',
    precioVentaBase: 15.00, costoAproximado: 5.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },

  /* ================ 🍲 SOPAS (Orden 8) ================ */
  {
    id: 'PROD-SOPA-CALDO-GALLINA', categoriaId: 'CAT-SOPAS', codigo: 'SOP901', nombre: 'Caldo de Gallina',
    descripcion: 'Acompañado de Papa sancochada y Huevo. S/ 25.00',
    precioVentaBase: 25.00, costoAproximado: 9.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-SOPA-MINUTA', categoriaId: 'CAT-SOPAS', codigo: 'SOP902', nombre: 'Sopa a la Minuta',
    descripcion: 'Acompañada de Pan tostado. S/ 20.00',
    precioVentaBase: 20.00, costoAproximado: 7.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-SOPA-PAPA-CASHQUI', categoriaId: 'CAT-SOPAS', codigo: 'SOP903', nombre: 'Sopa de Papa Cashqui',
    descripcion: 'Repel: aceite, huacate, ajos y hierbas aromáticas. S/ 15.00',
    precioVentaBase: 15.00, costoAproximado: 5.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-SOPA-CREMA-ZAPALLO', categoriaId: 'CAT-SOPAS', codigo: 'SOP904', nombre: 'Crema de Zapallo',
    descripcion: 'A base de zapallo y hierbas aromáticas. S/ 15.00',
    precioVentaBase: 15.00, costoAproximado: 5.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },

  /* ================ 🍽️ PLATOS PRINCIPALES (Orden 9) ================ */
  {
    id: 'PROD-PLATO-LOMO-SALTADO', categoriaId: 'CAT-PLATOS', codigo: 'PLA1001', nombre: 'Lomo Saltado',
    descripcion: 'Lomo fino salteado, papas fritas y/o arroz blanco al wok. S/ 30.00',
    precioVentaBase: 30.00, costoAproximado: 11.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-PLATO-TALLARIN-SALTADO', categoriaId: 'CAT-PLATOS', codigo: 'PLA1002', nombre: 'Tallarín Saltado',
    descripcion: 'Lomo fino salteado, queso mozzarella, pimiento y ajo. S/ 30.00',
    precioVentaBase: 30.00, costoAproximado: 11.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-PLATO-PICANTE-CUY', categoriaId: 'CAT-PLATOS', codigo: 'PLA1003', nombre: 'Picante de Cuy',
    descripcion: '½ Cuy, pepian sancochado, aderezos a base de mani, arroz amarillo o rocoto andino.',
    precioVentaBase: 35.00, costoAproximado: 13.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-PLATO-TRUCHA-PLANCHA', categoriaId: 'CAT-PLATOS', codigo: 'PLA1004', nombre: 'Trucha a la Plancha',
    descripcion: 'Papas fritas o doradas, ensalada fresca. S/ 30.00',
    precioVentaBase: 30.00, costoAproximado: 11.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-PLATO-TRUCHA-FRITA', categoriaId: 'CAT-PLATOS', codigo: 'PLA1005', nombre: 'Trucha Frita',
    descripcion: 'Papas fritas o doradas, ensalada fresca. S/ 32.00',
    precioVentaBase: 32.00, costoAproximado: 12.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-PLATO-POLLO-PLANCHA', categoriaId: 'CAT-PLATOS', codigo: 'PLA1006', nombre: 'Pollo a la Plancha',
    descripcion: 'Con puré de doradas, ensalada fresca. S/ 28.00',
    precioVentaBase: 28.00, costoAproximado: 10.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-PLATO-CHULETA-PARRILLA', categoriaId: 'CAT-PLATOS', codigo: 'PLA1007', nombre: 'Chuleta a la Parrilla',
    descripcion: 'Papas fritas o doradas, ensalada de estación. S/ 28.00',
    precioVentaBase: 28.00, costoAproximado: 10.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-PLATO-ESTOFADO-POLLO', categoriaId: 'CAT-PLATOS', codigo: 'PLA1008', nombre: 'Estofado de Pollo',
    descripcion: 'Acompañado de papas sancochadas y arroz. S/ 25.00',
    precioVentaBase: 25.00, costoAproximado: 9.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-PLATO-GUISO-POLLO', categoriaId: 'CAT-PLATOS', codigo: 'PLA1009', nombre: 'Guiso de Pollo',
    descripcion: 'Acompañado de Arroz. S/ 25.00',
    precioVentaBase: 25.00, costoAproximado: 9.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },

  /* ================ 🍕 PIZZAS (Orden 10) ================ */
  {
    id: 'PROD-PIZZA-AMERICANA', categoriaId: 'CAT-PIZZAS', codigo: 'PIZ1101', nombre: 'Pizza Americana (Personal)',
    descripcion: 'Jamoncito y queso mozzarella, pimiento y orégano. S/ 29.00. Mediana = +S/ 12.',
    precioVentaBase: 29.00, costoAproximado: 11.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-PIZZA-HAWAIANA', categoriaId: 'CAT-PIZZAS', codigo: 'PIZ1102', nombre: 'Pizza Hawaiana (Personal)',
    descripcion: 'Jamoncito, queso mozzarella, piña. S/ 30.00. Mediana = +S/ 12.',
    precioVentaBase: 30.00, costoAproximado: 11.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-PIZZA-PEPPERONI', categoriaId: 'CAT-PIZZAS', codigo: 'PIZ1103', nombre: 'Pizza de Pepperoni (Personal)',
    descripcion: 'Jamoncito, queso mozzarella y pepperoni. S/ 32.00. Mediana = +S/ 12.',
    precioVentaBase: 32.00, costoAproximado: 12.00, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },

  /* ================ 🍰 POSTRES + DERECHO CORCHO (Orden 11) ================ */
  {
    id: 'PROD-POSTRE-WAFFLES', categoriaId: 'CAT-POSTRES', codigo: 'POS1201', nombre: 'Waffles',
    descripcion: 'Con frutas de bosque, miel y/o fudge de chocolate. S/ 15.00',
    precioVentaBase: 15.00, costoAproximado: 5.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-POSTRE-CREPE-HELADOS', categoriaId: 'CAT-POSTRES', codigo: 'POS1202', nombre: 'Crepe con Helados',
    descripcion: 'Fudge de chocolate, galletas, helado de vainilla. S/ 15.00',
    precioVentaBase: 15.00, costoAproximado: 5.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-POSTRE-ENSALADA-FRUTAS', categoriaId: 'CAT-POSTRES', codigo: 'POS1203', nombre: 'Ensalada de Frutas',
    descripcion: 'Frutas de estación, miel y/o yogurt. S/ 15.00',
    precioVentaBase: 15.00, costoAproximado: 5.50, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: true, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-POSTRE-HELADOS', categoriaId: 'CAT-POSTRES', codigo: 'POS1204', nombre: 'Helados',
    descripcion: 'Porción de helado de sabores estacionales. S/ 7.00',
    precioVentaBase: 7.00, costoAproximado: 2.60, moneda: 'PEN',
    permiteModificadores: true, requierePreparacion: false, estado: 'ACTIVO', ...auditSeed
  },
  {
    id: 'PROD-DERECHO-CORCHO', categoriaId: 'CAT-POSTRES', codigo: 'POS1205', nombre: 'Derecho de Corcho (Botella de vino)',
    descripcion: 'Cargo por consumo de botella de vino fuera del menú. Atención: Previa reservación. S/ 10.00',
    precioVentaBase: 10.00, costoAproximado: 0, moneda: 'PEN',
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
  const presenta = presentacionesBase(p.id, p.precioVentaBase, (
    p.categoriaId === 'CAT-PIZZAS' ? 'Personal (Mediana = +S/ 12)' :
    p.categoriaId === 'CAT-SANDWICH' ? 'Unidad' :
    p.categoriaId === 'CAT-BEBIDAS-ALCOHOL' && p.id === 'PROD-VINO-SANTIAGO-QUEIROLO' ? 'Botella 750ml' :
    p.categoriaId === 'CAT-BEBIDAS-FRIAS' ? (
      p.id === 'PROD-GASEOSA' ? '500ml (1/2L)' :
      p.id === 'PROD-AGUA-MINERAL' ? 'Unidad' :
      p.id === 'PROD-GATORADE' ? '1L' :
      p.id === 'PROD-CHICHA-MORADA-1L' || p.id === 'PROD-LIMONADA-1L' || p.id === 'PROD-MARACUYA-1L' ? '1L' : 'Unidad'
    ) : 'Porción'
  ));
  const modIds: string[] = [];
  if (p.permiteModificadores) {
    if (['CAT-BEBIDAS-FRIAS','CAT-JUGOS','CAT-BEBIDAS-ALCOHOL'].includes(String(p.categoriaId))) modIds.push('MOD-HIELO');
    if (['CAT-BEBIDAS-FRIAS','CAT-BEBIDAS-CALIENTES','CAT-JUGOS'].includes(String(p.categoriaId))) modIds.push('MOD-AZUCAR');
    if (['CAT-PLATOS','CAT-ENTRADAS','CAT-SOPAS','CAT-SANDWICH','CAT-PIZZAS','CAT-DESAYUNOS'].includes(String(p.categoriaId))) {
      modIds.push('MOD-SIN-CEBOLLA');
      if (['CAT-PLATOS','CAT-PIZZAS','CAT-SANDWICH'].includes(String(p.categoriaId))) modIds.push('MOD-QUESO-EXTRA');
    }
    if (['PROD-PLATO-LOMO-SALTADO','PROD-PLATO-TRUCHA-PLANCHA','PROD-PLATO-TRUCHA-FRITA','PROD-PLATO-POLLO-PLANCHA','PROD-PLATO-CHULETA-PARRILLA'].includes(String(p.id))) modIds.push('MOD-BIEN-COCIDO');
  }
  const alergIds: string[] = [];
  if (p.categoriaId === 'CAT-POSTRES' || p.id === 'PROD-PLATO-TALLARIN-SALTADO' || p.id === 'PROD-POSTRE-HELADOS') alergIds.push('AL-LACTOSA', 'AL-GLUTEN', 'AL-HUEVO');
  if (p.categoriaId === 'CAT-PLATOS' && (p.id.includes('TRUCHA') || p.id.includes('PESCADO') || p.id === 'PROD-ENT-ENSALADA-ATUN')) alergIds.push('AL-PESCADO', 'AL-MARISCOS');
  if (p.categoriaId === 'CAT-ENTRADAS' && (p.id === 'PROD-ENT-ENSALADA-ATUN' || p.id === 'PROD-ENT-ENSALADA-FRESCA' || p.id === 'PROD-ENT-PAPA-HUANCAINA' || p.id === 'PROD-ENT-TEQUENOS')) alergIds.push('AL-LACTOSA');
  if (p.categoriaId === 'CAT-PIZZAS') alergIds.push('AL-GLUTEN', 'AL-LACTOSA');
  if (p.categoriaId === 'CAT-DESAYUNOS') alergIds.push('AL-GLUTEN', 'AL-HUEVO', 'AL-LACTOSA');
  const estac: EstacionCocinaFK[] = [];
  if (['CAT-DESAYUNOS','CAT-PLATOS','CAT-SANDWICH','CAT-PIZZAS','CAT-SOPAS'].includes(String(p.categoriaId))) estac.push('COCINA_CALIENTES');
  if (p.categoriaId === 'CAT-ENTRADAS') estac.push(p.id === 'PROD-ENT-ENSALADA-FRESCA' || p.id === 'PROD-ENT-ENSALADA-ATUN' ? 'COCINA_FRIOS' : 'COCINA_CALIENTES');
  if (['PROD-PLATO-LOMO-SALTADO','PROD-PLATO-TALLARIN-SALTADO','PROD-PLATO-TRUCHA-FRITA','PROD-PLATO-TRUCHA-PLANCHA','PROD-PLATO-POLLO-PLANCHA','PROD-PLATO-CHULETA-PARRILLA'].includes(String(p.id))) estac.push('GRILL_PARRILLA');
  if (['CAT-BEBIDAS-ALCOHOL','CAT-BEBIDAS-FRIAS','CAT-BEBIDAS-CALIENTES','CAT-JUGOS'].includes(String(p.categoriaId))) estac.push('BAR');
  if (['CAT-POSTRES','CAT-SOPAS'].includes(String(p.categoriaId)) && p.categoriaId === 'CAT-POSTRES') estac.push('PASTELERIA_POSTRES');
  if (['CAT-SOPAS'].includes(String(p.categoriaId))) estac.push('COCINA_CALIENTES');
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
  { id: 'HAB-CAB-04', codigo: 'CAB-04', nombre: 'Cabaña 04', tipoHabitacionId: 'TIPO-CABANA-TRIPLE', numeroPiso: 1, numeroPuerta: 'C-04', ubicacionDescripcion: 'Zona noreste, terraza con sillones', vistaEfectiva: 'SELVA_MONTANA', estado: 'OCUPADA', estadoLimpieza: 'LIMPIA', ultimaLimpiezaAt: addDaysISO(hoy(), -1), amenidadesExtra: [], observaciones: '', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-CABANA-TRIPLE') as TipoHabitacion },
  { id: 'HAB-DOB-05', codigo: 'DOB-05', nombre: 'Doble 05', tipoHabitacionId: 'TIPO-DOBLE-ECONOMICA', numeroPiso: 2, numeroPuerta: '2-05', ubicacionDescripcion: 'Edificio segundo piso pasillo izquierdo', vistaEfectiva: 'JARDIN', estado: 'LIBRE', estadoLimpieza: 'LIMPIA', ultimaLimpiezaAt: hoy(), amenidadesExtra: [], observaciones: '', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-DOBLE-ECONOMICA') as TipoHabitacion },
  { id: 'HAB-SUI-06', codigo: 'SUI-06', nombre: 'Suite 06', tipoHabitacionId: 'TIPO-SUITE-VISTA', numeroPiso: 2, numeroPuerta: '2-06', ubicacionDescripcion: 'Esquina noroeste, jacuzzi terraza', vistaEfectiva: 'RIO_PANORAMICA', estado: 'MANTENIMIENTO', estadoLimpieza: 'PENDIENTE', ultimaLimpiezaAt: addDaysISO(hoy(), -2), amenidadesExtra: [], observaciones: 'Mantenimiento jacuzzi programado: 20-21 Sep', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-SUITE-VISTA') as TipoHabitacion },
  { id: 'HAB-CAB-07', codigo: 'CAB-07', nombre: 'Cabaña 07', tipoHabitacionId: 'TIPO-CABANA-DOBLE', numeroPiso: 1, numeroPuerta: 'C-07', ubicacionDescripcion: 'Sector bosque, más privada', vistaEfectiva: 'BOSQUE', estado: 'LIBRE', estadoLimpieza: 'LIMPIA', ultimaLimpiezaAt: hoy(), amenidadesExtra: [], observaciones: '', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-CABANA-DOBLE') as TipoHabitacion },
  { id: 'HAB-FAM-08', codigo: 'FAM-08', nombre: 'Familiar 08', tipoHabitacionId: 'TIPO-FAMILIAR-5P', numeroPiso: 1, numeroPuerta: 'F-08', ubicacionDescripcion: 'Zona familiar cerca área juegos niños', vistaEfectiva: 'JARDIN', estado: 'LIBRE', estadoLimpieza: 'LIMPIA', ultimaLimpiezaAt: hoy(), amenidadesExtra: ['INFANTIL'], observaciones: '', ...auditSeed, tipoHabitacion: tiposHabitacionSeed.find((t) => t.id === 'TIPO-FAMILIAR-5P') as TipoHabitacion },
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
  estado: 'CHECKED_IN',
  origen: 'WEB_OFICIAL',
  canalReservaId: 'CANAL-WEB',
  agenteOtaId: null,
  codigoOtaConirmacion: null,
  fechaCreacion: addDaysISO(hoy(), -20),
  fechaModificacion: addDaysISO(hoy(), -1),
  fechaCheckin: addDaysISO(hoy(), -1),
  fechaCheckout: addDaysISO(hoy(), 2),
  fechaCheckinReal: addDaysISO(hoy(), -1) + 'T15:12:00-05:00',
  fechaCheckoutReal: null,
  totalNoches: 3,
  totalAdultos: 3,
  totalNinos: 0,
  totalPersonas: 3,
  tipoReserva: 'ALOJAMIENTO',
  habitaciones: [
    {
      id: generateUUID(),
      reservaId: 'RES-R1004',
      habitacionId: 'HAB-CAB-04',
      habitacion: habitacionesSeed.find((h) => h.id === 'HAB-CAB-04') as Habitacion,
      tipoHabitacionId: 'TIPO-CABANA-TRIPLE',
      tarifaId: 'TAR-STANDARD-CAB-DOB',
      fechaCheckinPropuesto: addDaysISO(hoy(), -1),
      fechaCheckoutPropuesto: addDaysISO(hoy(), 2),
      totalNoches: 3,
      precioBaseAcordadoPorNoche: 360.00,
      monedaPrecioAcordado: 'PEN',
      estadoOcupacion: 'CHECKED_IN',
      llaveCodigo: 'CAB-04',
      observaciones: '3 amigas brasileñas. Cabaña triple con baño privado y balcón.',
      ...auditSeed
    },
  ],
  acompanhantes: [],
  tarifaId: 'TAR-STANDARD-CAB-DOB',
  politicaCancelacionId: 'POL-CANCEL-48H',
  temporadaId: null,
  codigoPromocionalId: 'PROMO-WELCOME-10',
  subTotalSinImpuestos: 1080.00,
  totalImpuestos: 248.40,
  descuentosTotal: 132.84,
  cargoPorPersonasExtra: 0,
  cargoPorNinosExtra: 0,
  otrosCargosAlojamiento: 0,
  moneda: 'PEN',
  montoTotalReserva: 1195.56,
  estadoPago: 'PAGO_PARCIAL',
  saldoPendiente: 995.56,
  montoPagadoAnticipado: 200.00,
  pagoGarantia: {
    requiereGarantia: true,
    tipoGarantia: 'YAPE',
    tarjetaUltimos4: null,
    autorizacionCodigo: 'YAPE-R1004-7788',
    montoBloqueado: 398.52,
    fechaHoraVencimientoBloqueo: addDaysISO(hoy(), 3),
    monedaGarantia: 'PEN',
    ...auditSeed
  },
  esGarantiaNoShow: true,
  medioPago: 'YAPE',
  notasInternas: '3 amigas brasileñas. Check-in realizado 15:12 20 sep. Llave CAB-04 entregada. Pago adelanto S/200.00 en YAPE.',
  requerimientosEspeciales: [
    { id: generateUUID(), reservaId: 'RES-R1004', categoria: 'HABITACION', descripcion: 'Asignar CAB-04 (cabaña triple con balcón y vista parcial al jardín).', prioridad: 'ALTA', estado: 'CUMPLIDO', ...auditSeed },
    { id: generateUUID(), reservaId: 'RES-R1004', categoria: 'TOURS', descripcion: 'Interesadas en tour observación de aves amanecer. Consultar disponibilidad y precio actual.', prioridad: 'BAJA', estado: 'PENDIENTE', ...auditSeed },
  ],
  checkInInfo: {
    usuarioCheckInId: 'USR-MOISES-0001',
    fechaHoraCheckIn: addDaysISO(hoy(), -1) + 'T15:12:00-05:00',
    llaveEntregada: true,
    llaveCodigo: 'CAB-04',
    documentoEntregado: true,
    documentoTipo: 'PASAPORTE',
    documentoNumero: 'BR-11223344',
    documentoFotoUrl: null,
    medioPagoUsado: 'YAPE',
    montoPagoAdelanto: 200.00,
    observaciones: '3 amigas brasileñas. Check-in exitoso. Llave entregada. Pago adelanto S/200.00 YAPE.',
    ...auditSeed
  },
  checkOutInfo: null,
  historialCambios: [
    ...auditoriaReserva().slice(0, 1).map((h) => ({ ...h, reservaId: 'RES-R1004', valorNuevo: 'Reserva web oficial (3 pax, 3 noches cabaña triple) creada.' })),
    { id: generateUUID(), reservaId: 'RES-R1004', campoModificado: 'estado', valorAnterior: 'PENDIENTE', valorNuevo: 'CHECKED_IN', fechaHoraCambio: addDaysISO(hoy(), -1) + 'T15:12:00-05:00', usuarioId: 'USR-MOISES-0001', observacion: 'Check-in realizado. Entrega llave CAB-04. Pago adelanto S/200.00.', ...auditSeed },
  ],
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
  const pu = Number(rh.precioBaseAcordadoPorNoche.toFixed(2));
  const total = Number((noches * pu).toFixed(2));
  // SUNAT Perú: el precio por noche de tarifa ya INCLUYE impuestos (IGV18 + IGV Selva 5% = 23% total).
  // Regla: NO calcular impuesto sobre nominal (evita "doble IGV"). Se desagrupa primero baseImponible.
  // Lodge de Selva: por defecto TODAS las habitaciones cobran IGV Selva 5%.
  const impIdsTarifa = (rh as any).impuestosIds || (rh as any).tarifa?.impuestosIds || ['IMP-IGV-18', 'IMP-SELVA-5'];
  const tieneSelva = Array.isArray(impIdsTarifa) ? impIdsTarifa.includes('IMP-SELVA-5') : true;
  const divisor = tieneSelva ? 1.23 : 1.18;
  const subtotal = Number((total / divisor).toFixed(2));
  const imp18 = Number((subtotal * 0.18).toFixed(2));
  const imp5 = tieneSelva ? Number((subtotal * 0.05).toFixed(2)) : 0;
  const impuestosIdsFinal: string[] = ['IMP-IGV-18'];
  if (tieneSelva) impuestosIdsFinal.push('IMP-SELVA-5');
  const impuestosMontoDesglosadoFinal: any[] = [{ impuestoId: 'IMP-IGV-18', impuestoNombre: 'IGV 18%', montoImpuesto: imp18 }];
  if (tieneSelva) impuestosMontoDesglosadoFinal.push({ impuestoId: 'IMP-SELVA-5', impuestoNombre: 'IGV Selva 5%', montoImpuesto: imp5 });
  return {
    id: generateUUID(),
    folioId,
    numeroLinea: 1,
    tipoConcepto: 'ALOJAMIENTO',
    concepto: `Alojamiento ${noches} noche${noches > 1 ? 's' : ''} · Hab ${rh.habitacion.codigo}`,
    descripcion: `${noches} noches de alojamiento en habitación. Tarifa base S/ ${pu.toFixed(2)} / noche. Folio #${folioNum}`,
    categoria: 'Alojamiento',
    habitacionId: rh.habitacionId,
    reservaId: rh.reservaId || '',
    referenciaId: rh.id,
    referenciaExternaId: rh.id,
    comandaId: undefined,
    comandaDetalleId: undefined,
    productoInventarioId: undefined,
    cajaSesionId: undefined,
    huespedId: '',
    cantidad: noches,
    unidadMedida: 'NOCHE',
    precioUnitario: pu,
    descuentoMonto: 0,
    descuentoPorcentaje: 0,
    montoImpuesto: Number((imp18 + imp5).toFixed(2)),
    impuestoPorcentaje: tieneSelva ? 23 : 18,
    subtotal,
    total,
    monto: total,
    moneda: 'PEN',
    impuestosIds: impuestosIdsFinal,
    impuestosMontoDesglosado: impuestosMontoDesglosadoFinal,
    descuentosIds: [],
    descuentosMontoDesglosado: [],
    propinaMonto: 0,
    cargoAuto: true,
    origenCargo: 'AUTO_NOCHE_ALOJAMIENTO',
    usuarioId: 'USR-RECEP-0002',
    usuarioRegistroId: 'USR-RECEP-0002',
    nombreUsuarioAplicaCargo: 'Recepción',
    estado: 'PENDIENTE_COBRO',
    fechaCargo: hoy(),
    fechaAplicacion: hoy(),
    fechaVencimiento: addDaysISO(hoy(), rh.totalNoches),
    esAnulado: false,
    anulado: false,
    motivoAnulacion: '',
    comprobanteAsociadoId: undefined,
    comentarios: `Cargo automático check-in. Folio #${folioNum}. R: ${rh.reservaId}`,
    createdAt: hoy(),
    updatedAt: hoy(),
    createdBy: 'USR-RECEP-0002',
    updatedBy: 'USR-RECEP-0002',
  };
};

const folioCheckIn = (r: Reserva, folioNum: string, num = 'F-2026-0920'): Folio => {
  const rh = r.habitaciones[0];
  const huespedId = r.huespedId;
  const habitacionId = rh.habitacionId;
  const folioId = `FOL-${r.id}`;
  const cargoAloj = buildCargoAlojamiento(folioId, rh, folioNum);
  const cargos: CargoFolio[] = [cargoAloj];
  const subTot = cargos.reduce((sum, c) => sum + Number(c.subtotal || 0), 0);
  const totImp = cargos.reduce((sum, c) => sum + (c.impuestosMontoDesglosado?.reduce((s, i) => s + Number(i.montoImpuesto || 0), 0) || 0), 0);
  const tot = cargos.reduce((sum, c) => sum + Number(c.total || c.monto || 0), 0);
  return {
    id: folioId,
    codigo: folioNum,
    numeroFolio: num,
    reservaId: r.id,
    reserva: r,
    checkInId: r.checkInInfo ? `CHECKIN-${r.id}` : undefined,
    huespedId,
    huesped: r.huesped,
    habitacionId,
    habitacion: rh.habitacion,
    fechaApertura: r.fechaCheckinReal || r.fechaCheckin,
    fechaCierre: undefined,
    fechaCheckout: r.fechaCheckout,
    fechaCheckoutReal: undefined,
    estado: r.checkInInfo ? 'ABIERTO' as any : 'PENDIENTE_COBRO' as any,
    esCuentaCompartida: false,
    foliosCompartidosIds: [],
    usuarioIdApertura: r.checkInInfo?.recepcionistaId || 'USR-RECEP-0002',
    usuarioIdCierre: undefined,
    moneda: 'PEN',
    cargos,
    pagos: [],
    subTotalSinImpuestos: Number(subTot.toFixed(2)),
    totalImpuestos: Number(totImp.toFixed(2)),
    totalPropinas: 0,
    totalDescuentos: 0,
    totalBonificacionesCortesia: 0,
    totalFolio: Number(tot.toFixed(2)),
    totalPagado: 0,
    saldoPendiente: Number(tot.toFixed(2)),
    limiteCreditoAutorizado: 3000,
    creditoExcedido: false,
    notasInternas: `Folio abierto en Check-in automático. Hab ${rh.habitacion.codigo}. Cualquier consumo POS se carga automáticamente.`,
    comprobantePrevioId: undefined,
    comprobanteFinalId: undefined,
    createdAt: hoy(),
    updatedAt: hoy(),
    createdBy: 'USR-RECEP-0002',
    updatedBy: 'USR-RECEP-0002',
  };
};

const foliosSeed: Folio[] = [
  folioCheckIn(reserva1, 'F-2026-0920-001', 'F-2026-0920-001'),
  folioCheckIn(reserva3, 'F-2026-0920-002', 'F-2026-0920-002'),
  (() => {
    // R-1004 CAB-04 check-in (user captura A3 folio F-2E88)
    try {
      return folioCheckIn(reserva4, 'F-2E88', 'F-2E88');
    } catch {
      return folioCheckIn(reserva3, 'F-2E88', 'F-2E88');
    }
  })(),
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
  const precio = Number(prod.precioVentaBase) || 0;
  const nominal = Number((precio * cant).toFixed(2));
  const impuestosActivos = (Array.isArray(prod.impuestosIds) && prod.impuestosIds.length > 0) ? prod.impuestosIds : ['IMP-IGV-18', 'IMP-SELVA-5'];
  const tieneSelva = impuestosActivos.includes('IMP-SELVA-5');
  const divisorDesagrupacion = tieneSelva ? 1.23 : 1.18;
  const baseImponible = Number((nominal / divisorDesagrupacion).toFixed(2));
  const impuestosMontoDesglosado = impuestosActivos.map((id) => {
    const monto = id === 'IMP-IGV-18' ? baseImponible * 0.18 : baseImponible * 0.05;
    return { impuestoId: id, impuestoNombre: id === 'IMP-IGV-18' ? 'IGV 18%' : 'IGV Selva 5%', montoImpuesto: Number(monto.toFixed(2)) };
  });
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
    impuestosIds: impuestosActivos,
    impuestosMontoDesglosado,
    subtotal: baseImponible,
    montoLinea: nominal,
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
  // IMP: cabecera calculada desde los items (no /1.23 siempre) porque no todos productos tienen SELVA5
  const totalSubtotal = detalles.reduce((s, d) => s + Number(d.subtotal || 0), 0);
  const totalIGV18 = detalles.reduce((s, d) => {
    const arr = d.impuestosMontoDesglosado || [];
    const i = arr.find(x => String(x.impuestoId || '').includes('IGV') && !String(x.impuestoId || '').includes('Selva'));
    return s + Number(i?.montoImpuesto || 0);
  }, 0);
  const totalSelva5 = detalles.reduce((s, d) => {
    const arr = d.impuestosMontoDesglosado || [];
    const i = arr.find(x => String(x.impuestoId || '').includes('Selva') || String(x.impuestoId || '').includes('SELVA'));
    return s + Number(i?.montoImpuesto || 0);
  }, 0);
  const impuestosDetalle: any[] = [];
  if (totalIGV18 > 0) impuestosDetalle.push({ impuestoId: 'IMP-IGV-18', impuestoNombre: 'IGV 18%', montoImpuesto: Number(totalIGV18.toFixed(2)) });
  if (totalSelva5 > 0) impuestosDetalle.push({ impuestoId: 'IMP-SELVA-5', impuestoNombre: 'IGV Selva 5%', montoImpuesto: Number(totalSelva5.toFixed(2)) });
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
    totalNetoSinImpuestos: Number(totalSubtotal.toFixed(2)),
    totalImpuestos: Number((totalIGV18 + totalSelva5).toFixed(2)),
    impuestosDetalle,
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

const prod = (id: string): ProductoFB => {
  const encontrado = productosFBSeed.find((p) => p.id === id);
  if (encontrado) return encontrado;
  // Fallback 100% seguro anti "prod2 undefined": devuelve Agua Mineral (existe siempre). Evita crash si queda algún ID antiguo olvidado.
  return productosFBSeed.find((p) => p.id === 'PROD-AGUA-MINERAL') || productosFBSeed[productosFBSeed.length - 1] || productosFBSeed[0];
};

const comandasSeed: Comanda[] = [
  buildComanda(mesasSeed[0], null, '901', [
    buildComandaDetalle('', prod('PROD-ENT-ENSALADA-ATUN'), 1, 'Sin cebolla + queso extra'),
    buildComandaDetalle('', prod('PROD-PLATO-LOMO-SALTADO'), 2, '1 bien cocido, 1 jugoso'),
    buildComandaDetalle('', prod('PROD-PLATO-ESTOFADO-POLLO'), 1),
    buildComandaDetalle('', prod('PROD-JUGO-NARANJA'), 2),
    buildComandaDetalle('', prod('PROD-CERVEZA-ARTESANAL'), 2),
    buildComandaDetalle('', prod('PROD-POSTRE-WAFFLES'), 1),
  ], {
    estado: 'EN_COCINA_BAR',
    estadoEntrega: 'EN_PROCESO',
    usuarioIdMozoApertura: 'USR-MOZO-0003',
  }),
  buildComanda(mesasSeed[1], null, '902', [
    buildComandaDetalle('', prod('PROD-ENT-ENSALADA-FRESCA'), 1),
    buildComandaDetalle('', prod('PROD-PLATO-TRUCHA-PLANCHA'), 1, 'Salsa 3 ajíes por favor'),
    buildComandaDetalle('', prod('PROD-AGUA-MINERAL'), 1),
  ], {
    estado: 'LISTA_PARA_ENTREGAR',
    estadoEntrega: 'PENDIENTE_ENTREGA_MOZO',
    usuarioIdMozoApertura: 'USR-MOZO-0004',
  }),
  buildComanda(mesasSeed[4], null, '903', [
    buildComandaDetalle('', prod('PROD-PLATO-PICANTE-CUY'), 1),
    buildComandaDetalle('', prod('PROD-GASEOSA'), 1, 'Inca Kola'),
  ], {
    estado: 'ABIERTA',
    estadoEntrega: 'TOMANDO_ORDEN',
    usuarioIdMozoApertura: 'USR-MOZO-0003',
  }),
  buildComanda(mesasSeed[5], null, '904', [
    buildComandaDetalle('', prod('PROD-DESAY-LOMOALJUGO'), 3, ''),
    buildComandaDetalle('', prod('PROD-CAFE'), 2),
    buildComandaDetalle('', prod('PROD-INFUSIONES'), 1),
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
      monto: 98.0,
      moneda: 'PEN',
      montoPagadoCon: 100.00,
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
      observaciones: 'Cliente pagó en efectivo S/ 100, vuelto S/ 2 soles',
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
    buildComandaDetalle('', prod('PROD-CAFE'), 2, 'Café poco azúcar'),
    buildComandaDetalle('', prod('PROD-JUGO-NARANJA'), 1),
    buildComandaDetalle('', prod('PROD-ENT-ENSALADA-FRESCA'), 1, 'Sin gluten, pide opción sin croutons'),
    buildComandaDetalle('', prod('PROD-AGUA-MINERAL'), 1, 'Sin gas, bien fría'),
  ], {
    estado: 'EN_COCINA_BAR',
    estadoEntrega: 'EN_PROCESO',
    usuarioIdMozoApertura: 'USR-RS-0005',
    observacionesInternas: 'Room Service Hab 101 / CAB-01. Entregar con cubertería de 2 + servilletas tela. Aplicar cargo automático al folio #F-2026-0920-001.',
  }),
  buildComanda(mesasSeed[7], reserva3, '915', [
    buildComandaDetalle('', prod('PROD-DESAY-LOMOALJUGO'), 4),
    buildComandaDetalle('', prod('PROD-CAFE'), 2),
    buildComandaDetalle('', prod('PROD-INFUSIONES'), 1),
    buildComandaDetalle('', prod('PROD-JUGO-NARANJA'), 2),
    buildComandaDetalle('', prod('PROD-CERVEZA-ARTESANAL'), 4),
    buildComandaDetalle('', prod('PROD-VINO-SANTIAGO-QUEIROLO'), 2),
    buildComandaDetalle('', prod('PROD-PLATO-LOMO-SALTADO'), 2),
    buildComandaDetalle('', prod('PROD-POSTRE-WAFFLES'), 2, 'Pastel sorpresa incluido (cumpleaños 21 Sep Fiorella 18 años)'),
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
