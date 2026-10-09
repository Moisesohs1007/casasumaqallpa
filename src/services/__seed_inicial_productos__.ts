// @ts-nocheck
import { db, seedUtil } from './__db__';
import { dbRemota } from './__supabase_db__';
import * as pendingSync from './__pending_sync__';

const TIMEOUT_REMOTO_MS = 3500;
const timeoutPromise = (ms: number) => new Promise<never>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT_REMOTO')), ms));
async function _remotoConQueue(method, key, matchId, payload, remotoCallFn): Promise<void> {
  if (!dbRemota.isOnline()) { pendingSync.enqueue(key, method, matchId, payload); return; }
  try {
    const res = await Promise.race([remotoCallFn(), timeoutPromise(TIMEOUT_REMOTO_MS)]);
    if (!res && method !== 'remove') throw new Error('respuesta remota vacía');
  } catch (e) {
    console.warn('[Seed._remotoConQueue] remoto falló → enqueue. Key=', key, 'm=', method, 'id=', matchId, 'err=', (e && e.message) || e);
    pendingSync.enqueue(key, method, matchId, payload);
  }
}

const KEY_CAT = 'categoriasFB';
const KEY_PROD = 'productosFB';
const KEY_ALERG = 'alergenos';
const IMP_IGV = 'IMP-IGV-18';
const USR = 'seed-inicial';

export const SEED_CATEGORIAS = [
  { id: 'CAT-DESAYUNOS', nombre: 'Desayunos', descripcion: 'Carta desayunos oficial: Lomo al Jugo, Continental, Americano, Regional-Yungaíno', tipo: 'ALIMENTO', usaStock: false, orden: 10, color: '#FFE4B5' },
  { id: 'CAT-JUGOS', nombre: 'Jugos', descripcion: 'Jugos naturales oficiales 500ml: Papaya, Piña, Naranja, Fresa', tipo: 'BEBIDA', usaStock: false, orden: 20, color: '#D4EFDF' },
  { id: 'CAT-SANDWICHES', nombre: 'Sándwiches', descripcion: 'Sándwiches de carta: Queso, Huevo, Aceituna y Pollo a la Plancha', tipo: 'ALIMENTO', usaStock: false, orden: 30, color: '#FADBD8' },
  { id: 'CAT-BEBIDAS-CALIENTES', nombre: 'Bebidas Calientes', descripcion: 'Infusiones, Café, Cappuccino, Chocolate con Leche, Leche (sin stock físico)', tipo: 'BEBIDA', usaStock: false, orden: 40, color: '#F6DDCC' },
  { id: 'CAT-ENTRADAS', nombre: 'Entradas', descripcion: 'Entradas carta: Ensaladas, Papa a la Huancaína, Tequeños', tipo: 'ALIMENTO', usaStock: false, orden: 50, color: '#D5F5E3' },
  { id: 'CAT-SOPAS', nombre: 'Sopas', descripcion: 'Carta de sopas: Caldo de Gallina, Sopa a la Minuta, Sopa de Quinua, Crema de Zapallo', tipo: 'ALIMENTO', usaStock: false, orden: 60, color: '#FCF3CF' },
  { id: 'CAT-PLATOS-PRINCIPALES', nombre: 'Platos Principales', descripcion: 'Carta principal: Lomo Saltado, Tallarín Saltado, Picante de Cuy, Trucha a la Plancha', tipo: 'ALIMENTO', usaStock: false, orden: 70, color: '#EBDEF0' },
  { id: 'CAT-PIZZAS', nombre: 'Pizzas', descripcion: 'Pizzas Americana / Hawaiana / Pepperoni en tamaños Personal y Mediana', tipo: 'ALIMENTO', usaStock: false, orden: 80, color: '#FDEDEC' },
  { id: 'CAT-POSTRES', nombre: 'Postres', descripcion: 'Dulces y postres disponibles en casa', tipo: 'ALIMENTO', usaStock: false, orden: 90, color: '#FFF2CC' },
  { id: 'CAT-BEBIDAS-FRIAS', nombre: 'Bebidas Frías', descripcion: 'Agua, gaseosas 1/2L, Gatorade, Chicha 1L, Limonada 1L, Maracuyá 1L (stock)', tipo: 'BEBIDA', usaStock: true, orden: 100, color: '#D6EAF8' },
  { id: 'CAT-BAR-ALCOHOL', nombre: 'Bar / Alcohol', descripcion: 'Carta oficial: Cerveza Artesanal, Vino Santiago Queirolo, Cubetto 1L (stock)', tipo: 'BEBIDA', usaStock: true, orden: 110, color: '#D1F2EB' },
  { id: 'CAT-SNACKS', nombre: 'Snacks / Amenities', descripcion: 'Snacks empaquetados, toallas extra, amenities de habitación (control de stock)', tipo: 'VENTA', usaStock: true, orden: 120, color: '#E8DAEF' },
  { id: 'CAT-SERVICIOS-EXTRAS', nombre: 'Servicios Extras', descripcion: 'Taxi, tour, lavandería, masaje, servicio a habitación manual (intangible)', tipo: 'SERVICIO', usaStock: false, orden: 130, color: '#FEF9E7' },
];

export const SEED_ALERGENOS = [
  { id: 'ALER-GLUTEN', nombre: 'Gluten / Trigo', icono: '🌾' },
  { id: 'ALER-LACTEO', nombre: 'Lácteos', icono: '🥛' },
  { id: 'ALER-CACAHUATE', nombre: 'Cacahuates / Frutos secos', icono: '🥜' },
  { id: 'ALER-HUEVO', nombre: 'Huevo', icono: '🥚' },
  { id: 'ALER-PESCADO', nombre: 'Pescado / Mariscos', icono: '🐟' },
  { id: 'ALER-SOYA', nombre: 'Soya', icono: '🫘' },
];

function codigoCat(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

export const SEED_PRODUCTOS_CARTA = [
  // ========== CAT-DESAYUNOS (preparados, sin stock - OFICIALES PDF) ==========
  { id: 'PROD-DES-001', codigo: codigoCat('DES', 1), categoriaId: 'CAT-DESAYUNOS', nombre: 'Lomo al Jugo', descripcion: '2 Panes, Jugo, Café.', precioVentaBase: 20.00, stockControl: false, orden: 1 },
  { id: 'PROD-DES-002', codigo: codigoCat('DES', 2), categoriaId: 'CAT-DESAYUNOS', nombre: 'Continental', descripcion: '2 Panes, Huevo (revuelto, frito o sancochado), Jugo, Café', precioVentaBase: 20.00, stockControl: false, orden: 2 },
  { id: 'PROD-DES-003', codigo: codigoCat('DES', 3), categoriaId: 'CAT-DESAYUNOS', nombre: 'Americano', descripcion: '2 Tostadas, Mantequilla, Mermelada, Jugo, Café', precioVentaBase: 15.00, stockControl: false, orden: 3 },
  { id: 'PROD-DES-004', codigo: codigoCat('DES', 4), categoriaId: 'CAT-DESAYUNOS', nombre: 'Regional - Yungaíno', descripcion: '2 Panes, 1 tamal (relleno de chicharrón o cuy), Jugo, Café', precioVentaBase: 20.00, stockControl: false, orden: 4 },

  // ========== CAT-JUGOS (oficiales PDF 500ml) ==========
  { id: 'PROD-JUG-001', codigo: codigoCat('JUG', 1), categoriaId: 'CAT-JUGOS', nombre: 'Papaya', descripcion: 'Jugo natural de papaya 500ml', precioVentaBase: 6.00, stockControl: false, orden: 1 },
  { id: 'PROD-JUG-002', codigo: codigoCat('JUG', 2), categoriaId: 'CAT-JUGOS', nombre: 'Piña', descripcion: 'Jugo natural de piña 500ml', precioVentaBase: 6.00, stockControl: false, orden: 2 },
  { id: 'PROD-JUG-003', codigo: codigoCat('JUG', 3), categoriaId: 'CAT-JUGOS', nombre: 'Naranja', descripcion: 'Jugo exprimido fresco 500ml', precioVentaBase: 8.00, stockControl: false, orden: 3 },
  { id: 'PROD-JUG-004', codigo: codigoCat('JUG', 4), categoriaId: 'CAT-JUGOS', nombre: 'Fresa', descripcion: 'Jugo de fresa natural 500ml', precioVentaBase: 7.00, stockControl: false, orden: 4 },

  // ========== CAT-SANDWICHES (oficiales PDF) ==========
  { id: 'PROD-SAN-001', codigo: codigoCat('SAN', 1), categoriaId: 'CAT-SANDWICHES', nombre: 'Sándwich de Queso', descripcion: 'Pan con queso', precioVentaBase: 5.00, stockControl: false, orden: 1 },
  { id: 'PROD-SAN-002', codigo: codigoCat('SAN', 2), categoriaId: 'CAT-SANDWICHES', nombre: 'Sándwich de Huevo', descripcion: 'Pan con huevo', precioVentaBase: 5.00, stockControl: false, orden: 2 },
  { id: 'PROD-SAN-003', codigo: codigoCat('SAN', 3), categoriaId: 'CAT-SANDWICHES', nombre: 'Sándwich de Aceituna', descripcion: 'Pan con aceituna', precioVentaBase: 5.00, stockControl: false, orden: 3 },
  { id: 'PROD-SAN-004', codigo: codigoCat('SAN', 4), categoriaId: 'CAT-SANDWICHES', nombre: 'Pollo a la Plancha', descripcion: 'Sándwich de pollo a la plancha', precioVentaBase: 12.00, stockControl: false, orden: 4 },

  // ========== CAT-BEBIDAS-CALIENTES (oficiales PDF, sin stock) ==========
  { id: 'PROD-BC-001', codigo: codigoCat('BC', 1), categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Infusiones', descripcion: 'Té, Anís, Hierbabuena, Muña, Manzanilla (a elección)', precioVentaBase: 3.00, stockControl: false, orden: 1 },
  { id: 'PROD-BC-002', codigo: codigoCat('BC', 2), categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Café', descripcion: 'Café de grano exportación', precioVentaBase: 5.00, stockControl: false, orden: 2 },
  { id: 'PROD-BC-003', codigo: codigoCat('BC', 3), categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Cappuccino', descripcion: 'Café con espuma de leche', precioVentaBase: 8.00, stockControl: false, orden: 3 },
  { id: 'PROD-BC-004', codigo: codigoCat('BC', 4), categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Chocolate con Leche', descripcion: 'Chocolate caliente con leche', precioVentaBase: 7.00, stockControl: false, orden: 4 },
  { id: 'PROD-BC-005', codigo: codigoCat('BC', 5), categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Leche', descripcion: 'Leche caliente entera', precioVentaBase: 5.00, stockControl: false, orden: 5 },

  // ========== CAT-ENTRADAS (oficiales PDF) ==========
  { id: 'PROD-ENT-001', codigo: codigoCat('ENT', 1), categoriaId: 'CAT-ENTRADAS', nombre: 'Ensalada Fresca', descripcion: 'Mix de hojas, palta y tomate', precioVentaBase: 15.00, stockControl: false, orden: 1 },
  { id: 'PROD-ENT-002', codigo: codigoCat('ENT', 2), categoriaId: 'CAT-ENTRADAS', nombre: 'Ensalada de Atún', descripcion: 'Ensalada fresca con filete de atún', precioVentaBase: 20.00, stockControl: false, orden: 2 },
  { id: 'PROD-ENT-003', codigo: codigoCat('ENT', 3), categoriaId: 'CAT-ENTRADAS', nombre: 'Papa a la Huancaína', descripcion: 'Papa sancochada con salsa de ají amarillo, queso fresco y aceitunas negras', precioVentaBase: 12.00, stockControl: false, orden: 3 },
  { id: 'PROD-ENT-004', codigo: codigoCat('ENT', 4), categoriaId: 'CAT-ENTRADAS', nombre: 'Tequeños', descripcion: 'Ración de 4 piezas de queso crema frito acompañado de salsa de ají', precioVentaBase: 11.00, stockControl: false, orden: 4 },

  // ========== CAT-SOPAS (NUEVA CATEGORÍA oficiales PDF pág 2) ==========
  { id: 'PROD-SOP-001', codigo: codigoCat('SOP', 1), categoriaId: 'CAT-SOPAS', nombre: 'Caldo de Gallina', descripcion: 'Acompañado de papa amarilla y fideo casero', precioVentaBase: 20.00, stockControl: false, orden: 1 },
  { id: 'PROD-SOP-002', codigo: codigoCat('SOP', 2), categoriaId: 'CAT-SOPAS', nombre: 'Sopa a la Minuta', descripcion: 'Acompañada de papa amarilla y huevo frito', precioVentaBase: 20.00, stockControl: false, orden: 2 },
  { id: 'PROD-SOP-003', codigo: codigoCat('SOP', 3), categoriaId: 'CAT-SOPAS', nombre: 'Sopa de Quinua', descripcion: 'Papa amarilla, quinua y hierbas aromáticas', precioVentaBase: 15.00, stockControl: false, orden: 3 },
  { id: 'PROD-SOP-004', codigo: codigoCat('SOP', 4), categoriaId: 'CAT-SOPAS', nombre: 'Crema de Zapallo', descripcion: 'A base de zapallo y hierbas aromáticas', precioVentaBase: 15.00, stockControl: false, orden: 4 },

  // ========== CAT-PLATOS-PRINCIPALES (oficiales PDF pág 2) ==========
  { id: 'PROD-PLA-001', codigo: codigoCat('PLA', 1), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Lomo Saltado', descripcion: 'Lomo fino salteado con papas fritas y arroz blanco', precioVentaBase: 30.00, stockControl: false, orden: 1 },
  { id: 'PROD-PLA-002', codigo: codigoCat('PLA', 2), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Tallarín Saltado', descripcion: 'Tallarín salteado con lomo fino', precioVentaBase: 30.00, stockControl: false, orden: 2 },
  { id: 'PROD-PLA-003', codigo: codigoCat('PLA', 3), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Picante de Cuy', descripcion: 'Cuy trozado con maní, ají amarillo, papa amarilla y arroz', precioVentaBase: 35.00, stockControl: false, orden: 3 },
  { id: 'PROD-PLA-004', codigo: codigoCat('PLA', 4), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Trucha a la Plancha', descripcion: 'Trucha fresca a la plancha acompañada de yuca, ensalada y arroz', precioVentaBase: 30.00, stockControl: false, orden: 4 },

  // ========== CAT-PIZZAS (oficiales PDF × 2 tamaños cada sabor) ==========
  // PERSONAL (1 persona)
  { id: 'PROD-PIZ-001', codigo: codigoCat('PIZ', 1), categoriaId: 'CAT-PIZZAS', nombre: 'Pizza Americana (Personal)', descripcion: 'Salsa de tomate, jamón, queso mozzarella, aceitunas. 1 porción.', precioVentaBase: 20.00, stockControl: false, orden: 1 },
  { id: 'PROD-PIZ-002', codigo: codigoCat('PIZ', 2), categoriaId: 'CAT-PIZZAS', nombre: 'Pizza Hawaiana (Personal)', descripcion: 'Jamón, piña natural, queso mozzarella. 1 porción.', precioVentaBase: 20.00, stockControl: false, orden: 2 },
  { id: 'PROD-PIZ-003', codigo: codigoCat('PIZ', 3), categoriaId: 'CAT-PIZZAS', nombre: 'Pizza de Pepperoni (Personal)', descripcion: 'Pepperoni, queso mozzarella, orégano y aceitunas. 1 porción.', precioVentaBase: 20.00, stockControl: false, orden: 3 },
  // MEDIANA (2 personas)
  { id: 'PROD-PIZ-004', codigo: codigoCat('PIZ', 4), categoriaId: 'CAT-PIZZAS', nombre: 'Pizza Americana (Mediana)', descripcion: 'Salsa de tomate, jamón, queso mozzarella, aceitunas. Mediana para 2 personas.', precioVentaBase: 32.00, stockControl: false, orden: 4 },
  { id: 'PROD-PIZ-005', codigo: codigoCat('PIZ', 5), categoriaId: 'CAT-PIZZAS', nombre: 'Pizza Hawaiana (Mediana)', descripcion: 'Jamón, piña natural, queso mozzarella. Mediana para 2 personas.', precioVentaBase: 32.00, stockControl: false, orden: 5 },
  { id: 'PROD-PIZ-006', codigo: codigoCat('PIZ', 6), categoriaId: 'CAT-PIZZAS', nombre: 'Pizza de Pepperoni (Mediana)', descripcion: 'Pepperoni, queso mozzarella, orégano y aceitunas. Mediana para 2 personas.', precioVentaBase: 32.00, stockControl: false, orden: 6 },

  // ========== CAT-POSTRES (como no aparecen en PDF, mantenemos los más vendidos + no inventamos nuevos) ==========
  { id: 'PROD-POS-001', codigo: codigoCat('POS', 1), categoriaId: 'CAT-POSTRES', nombre: 'Flan Casero con Dulce de Leche', descripcion: 'Flan de leche + dulce de leche casero', precioVentaBase: 8.00, stockControl: false, orden: 1 },
  { id: 'PROD-POS-002', codigo: codigoCat('POS', 2), categoriaId: 'CAT-POSTRES', nombre: 'Suspiro a la Limeña', descripcion: 'Postre clásico con manjar blanco y merengue', precioVentaBase: 9.00, stockControl: false, orden: 2 },
  { id: 'PROD-POS-003', codigo: codigoCat('POS', 3), categoriaId: 'CAT-POSTRES', nombre: 'Frutas de Temporada', descripcion: 'Plato de frutas cortadas con yogur natural', precioVentaBase: 8.00, stockControl: false, orden: 3 },

  // ========== CAT-BEBIDAS-FRIAS (oficiales PDF, stock físico) ==========
  { id: 'PROD-BF-001', codigo: 'BEB401', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Agua Mineral', descripcion: 'Agua mineral natural sin gas 500ml', precioVentaBase: 3.00, stockControl: true, stockActual: 72, stockMinimo: 24, orden: 1 },
  { id: 'PROD-BF-002', codigo: 'BEB402', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Gaseosa (1/2 L)', descripcion: 'Gaseosa 500ml variedades (Coca, Inca Kola, Sprite, Fanta)', precioVentaBase: 5.00, stockControl: true, stockActual: 60, stockMinimo: 20, orden: 2 },
  { id: 'PROD-BF-003', codigo: 'BEB403', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Gatorade', descripcion: 'Hidratante isotónico Gatorade 500ml variedades', precioVentaBase: 4.00, stockControl: true, stockActual: 24, stockMinimo: 8, orden: 3 },
  { id: 'PROD-BF-004', codigo: 'BEB404', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Chicha Morada (1L)', descripcion: 'Chicha morada casera botella 1 litro', precioVentaBase: 14.00, stockControl: true, stockActual: 20, stockMinimo: 8, orden: 4 },
  { id: 'PROD-BF-005', codigo: 'BEB405', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Limonada (1L)', descripcion: 'Limonada natural botella 1 litro', precioVentaBase: 14.00, stockControl: true, stockActual: 20, stockMinimo: 6, orden: 5 },
  { id: 'PROD-BF-006', codigo: 'BEB406', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Maracuyá (1L)', descripcion: 'Jugo de maracuyá natural botella 1 litro', precioVentaBase: 14.00, stockControl: true, stockActual: 18, stockMinimo: 6, orden: 6 },

  // ========== CAT-BAR-ALCOHOL (oficiales PDF, solo 3 items carta; stock físico) ==========
  { id: 'PROD-BAR-001', codigo: 'BAR601', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Cerveza Artesanal', descripcion: 'Cerveza artesanal de la región', precioVentaBase: 15.00, stockControl: true, stockActual: 24, stockMinimo: 8, orden: 1 },
  { id: 'PROD-BAR-002', codigo: 'BAR602', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Vino Santiago Queirolo', descripcion: 'Vino Santiago Queirolo medio (tinto, blanco o rosé)', precioVentaBase: 25.00, stockControl: true, stockActual: 16, stockMinimo: 6, orden: 2 },
  { id: 'PROD-BAR-003', codigo: 'BAR603', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Cubetto 1L', descripcion: 'Refresco tradicional de garrafón de vino, fruta de temporada, casara, limón y piña. 1 Litro.', precioVentaBase: 20.00, stockControl: true, stockActual: 12, stockMinimo: 4, orden: 3 },

  // ========== CAT-SNACKS (no aparecen en PDF, se mantiene stock físico existente) ==========
  { id: 'PROD-SNK-001', codigo: 'SNK-001', categoriaId: 'CAT-SNACKS', nombre: 'Snack / Galleta', descripcion: 'Galleta surtida para snack bar', precioVentaBase: 3.00, stockControl: true, stockActual: 48, stockMinimo: 16, orden: 1 },
  { id: 'PROD-SNK-002', codigo: 'SNK-002', categoriaId: 'CAT-SNACKS', nombre: 'Lays Clásicas 100g', descripcion: 'Papas fritas Lay\'s clásicas', precioVentaBase: 5.00, stockControl: true, stockActual: 30, stockMinimo: 10, orden: 2 },
  { id: 'PROD-SNK-003', codigo: 'SNK-003', categoriaId: 'CAT-SNACKS', nombre: 'Cheetos Flamin Hot', descripcion: 'Snack de queso picante 90g', precioVentaBase: 5.00, stockControl: true, stockActual: 28, stockMinimo: 10, orden: 3 },
  { id: 'PROD-SNK-004', codigo: 'SNK-004', categoriaId: 'CAT-SNACKS', nombre: 'Barra de Cereal Nuez', descripcion: 'Barra energética con frutos secos', precioVentaBase: 4.00, stockControl: true, stockActual: 24, stockMinimo: 8, orden: 4 },
  { id: 'PROD-SNK-005', codigo: 'SNK-005', categoriaId: 'CAT-SNACKS', nombre: 'Chocolatina Jet', descripcion: 'Chocolatina mediana', precioVentaBase: 3.50, stockControl: true, stockActual: 30, stockMinimo: 10, orden: 5 },
  { id: 'PROD-SNK-006', codigo: 'SNK-006', categoriaId: 'CAT-SNACKS', nombre: 'Maní Salado 100g', descripcion: 'Maní frito salado bolsa', precioVentaBase: 4.00, stockControl: true, stockActual: 28, stockMinimo: 10, orden: 6 },
  { id: 'PROD-SNK-007', codigo: 'SNK-007', categoriaId: 'CAT-SNACKS', nombre: 'Dulces Surtidos Nacionales', descripcion: 'Mix Teja, King Kong, Alfajores', precioVentaBase: 5.00, stockControl: true, stockActual: 20, stockMinimo: 6, orden: 7 },
  { id: 'PROD-SNK-008', codigo: 'EXT-001', categoriaId: 'CAT-SNACKS', nombre: 'Toalla Extra', descripcion: 'Toalla adicional para piscina o habitación', precioVentaBase: 15.00, stockControl: true, stockActual: 20, stockMinimo: 5, orden: 8 },
  { id: 'PROD-SNK-009', codigo: 'EXT-002', categoriaId: 'CAT-SNACKS', nombre: 'Botella de Agua para Piscina 1L', descripcion: 'Agua piscina (paquete 2 botellas)', precioVentaBase: 8.00, stockControl: true, stockActual: 30, stockMinimo: 10, orden: 9 },
  { id: 'PROD-SNK-010', codigo: 'EXT-005', categoriaId: 'CAT-SNACKS', nombre: 'Kit Aseo Baño Extra', descripcion: 'Shampoo + jabón + toalla pequeña', precioVentaBase: 12.00, stockControl: true, stockActual: 18, stockMinimo: 6, orden: 10 },

  // ========== CAT-SERVICIOS-EXTRAS (intangible; fuera de carta PDF pero necesarios para operación) ==========
  { id: 'PROD-EXT-001', codigo: codigoCat('EXT', 1), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Taxi Aeropuerto Tarapoto (TPP)', descripcion: 'Traslado desde/aeropuerto TPP (1-4 pax)', precioVentaBase: 45.00, stockControl: false, orden: 1 },
  { id: 'PROD-EXT-002', codigo: codigoCat('EXT', 2), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Taxi Centro - Aeropuerto', descripcion: 'Traslado dentro de Tarapoto / centro hacia terminal', precioVentaBase: 20.00, stockControl: false, orden: 2 },
  { id: 'PROD-EXT-003', codigo: codigoCat('EXT', 3), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Tour Catarata de Ahuashiyacu', descripcion: 'Excursión de 1/2 día. Incluye guía + transporte + entrada', precioVentaBase: 60.00, stockControl: false, orden: 3 },
  { id: 'PROD-EXT-004', codigo: codigoCat('EXT', 4), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Tour Laguna Azul Sauce', descripcion: 'Excursión día completo con almuerzo', precioVentaBase: 75.00, stockControl: false, orden: 4 },
  { id: 'PROD-EXT-005', codigo: codigoCat('EXT', 5), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Lavandería 5kg', descripcion: 'Lavado + secado + planchado hasta 5kg', precioVentaBase: 20.00, stockControl: false, orden: 5 },
  { id: 'PROD-EXT-006', codigo: codigoCat('EXT', 6), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Planchado Individual', descripcion: 'Planchado por prenda', precioVentaBase: 3.00, stockControl: false, orden: 6 },
  { id: 'PROD-EXT-007', codigo: codigoCat('EXT', 7), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Masaje Terapéutico 30min', descripcion: 'Masaje relajante 30 min a habitación', precioVentaBase: 50.00, stockControl: false, orden: 7 },
  { id: 'PROD-EXT-008', codigo: codigoCat('EXT', 8), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Masaje 60min Corporal', descripcion: 'Masaje completo 60 min', precioVentaBase: 85.00, stockControl: false, orden: 8 },
  { id: 'PROD-EXT-009', codigo: codigoCat('EXT', 9), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Servicio de Habitación Delivery', descripcion: 'Cargo fijo pedido a habitación (no incluye platos)', precioVentaBase: 5.00, stockControl: false, orden: 9 },
  { id: 'PROD-EXT-010', codigo: codigoCat('EXT', 10), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Alquiler Moto 8h', descripcion: 'Alquiler moto 150cc 8h día', precioVentaBase: 30.00, stockControl: false, orden: 10 },
  { id: 'PROD-EXT-011', codigo: codigoCat('EXT', 11), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Alquiler Bicicleta día', descripcion: 'Bicicleta de montaña uso durante todo el día', precioVentaBase: 15.00, stockControl: false, orden: 11 },
  { id: 'PROD-EXT-012', codigo: codigoCat('EXT', 12), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Renta Cocheras para Huésped', descripcion: 'Estacionamiento cubierto día/noche', precioVentaBase: 8.00, stockControl: false, orden: 12 },
  { id: 'PROD-EXT-013', codigo: codigoCat('EXT', 13), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Servicio de Guardaequipaje', descripcion: 'Custodia maletas tras check-out o antes check-in', precioVentaBase: 10.00, stockControl: false, orden: 13 },
  { id: 'PROD-EXT-014', codigo: codigoCat('EXT', 14), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Decoración Romántica Habitación', descripcion: 'Flores, pétalos, chocolates, velas. Pedido 4h anticipación', precioVentaBase: 60.00, stockControl: false, orden: 14 },
  { id: 'PROD-EXT-015', codigo: codigoCat('EXT', 15), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Cumpleaños Sorpresa Mini', descripcion: 'Pastel, globos, vela, tarjeta. Pedido 24h', precioVentaBase: 40.00, stockControl: false, orden: 15 },
  { id: 'PROD-EXT-016', codigo: codigoCat('EXT', 16), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Desayuno a la Habitación (entrega)', descripcion: 'Delivery de desayuno ya pagado / en menú + S/5 entrega', precioVentaBase: 5.00, stockControl: false, orden: 16 },
  { id: 'PROD-EXT-017', codigo: codigoCat('EXT', 17), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Saco adicional de Calefacción', descripcion: 'Saco térmico + frazada adicional noche fría', precioVentaBase: 10.00, stockControl: false, orden: 17 },
  { id: 'PROD-EXT-018', codigo: codigoCat('EXT', 18), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Actividad Yoga Piscina (clase 1h)', descripcion: 'Clase guiada yoga frente piscina mañana 6am', precioVentaBase: 25.00, stockControl: false, orden: 18 },
];

async function _insertCatOrProd(key: string, idUnico: string, dataFinal: any, method: 'add' | 'update') {
  try {
    await _remotoConQueue(method, key, idUnico, dataFinal, () => {
      if (method === 'update') return dbRemota.updateAsync(key, idUnico, dataFinal);
      return dbRemota.addAsync(key, dataFinal);
    });
  } catch (_) {}
}

export function ensureSeedInicialAlergenos(force = false): number {
  let creados = 0;
  const existentes = db.all<any>(KEY_ALERG) || [];
  const mapExist = new Map(existentes.map(x => [x.id, x]));
  for (const seed of SEED_ALERGENOS) {
    if (!mapExist.has(seed.id) || force) {
      const data = { ...seed, estado: 'ACTIVO', createdAt: seedUtil.nowISO(), updatedAt: seedUtil.nowISO(), createdBy: USR, updatedBy: USR };
      if (!mapExist.has(seed.id)) {
        db.add<any>(KEY_ALERG, data);
        const final = { ...data };
        (async () => { await _insertCatOrProd(KEY_ALERG, seed.id, final, 'add'); })().catch(() => {});
        creados++;
      } else if (force) {
        const upd = { ...seed, updatedAt: seedUtil.nowISO(), updatedBy: USR };
        db.update<any>(KEY_ALERG, seed.id, upd);
        const final = { ...upd, id: seed.id };
        (async () => { await _insertCatOrProd(KEY_ALERG, seed.id, final, 'update'); })().catch(() => {});
      }
    }
  }
  return creados;
}

export function ensureSeedInicialCategorias(force = false): number {
  let creados = 0;
  const existentes = db.all<any>(KEY_CAT) || [];
  const mapExist = new Map(existentes.map(x => [x.id, x]));
  for (const seed of SEED_CATEGORIAS) {
    if (!mapExist.has(seed.id) || force) {
      const data = { ...seed, estado: 'ACTIVO', createdAt: seedUtil.nowISO(), updatedAt: seedUtil.nowISO(), createdBy: USR, updatedBy: USR };
      if (!mapExist.has(seed.id)) {
        db.add<any>(KEY_CAT, data);
        const final = { ...data };
        (async () => { await _insertCatOrProd(KEY_CAT, seed.id, final, 'add'); })().catch(() => {});
        creados++;
      } else if (force) {
        const upd = { ...seed, updatedAt: seedUtil.nowISO(), updatedBy: USR };
        db.update<any>(KEY_CAT, seed.id, upd);
        const final = { ...upd, id: seed.id };
        (async () => { await _insertCatOrProd(KEY_CAT, seed.id, final, 'update'); })().catch(() => {});
      }
    }
  }
  return creados;
}

export function ensureSeedInicialProductos(force = false): number {
  let creados = 0;
  const existentes = db.all<any>(KEY_PROD) || [];
  const mapExist = new Map(existentes.map(x => [x.id, x]));
  for (const s of SEED_PRODUCTOS_CARTA) {
    const exist = mapExist.get(s.id);
    if (!exist || force) {
      const data = {
        id: s.id,
        codigo: s.codigo,
        nombre: s.nombre,
        descripcion: s.descripcion || '',
        categoriaId: s.categoriaId,
        precioVentaBase: Number(s.precioVentaBase || 0),
        costoAproximado: Number((s.precioVentaBase || 0) * 0.35),
        impuestosIds: s.impuestosIds && s.impuestosIds.length ? s.impuestosIds : [IMP_IGV],
        unidadMedida: s.unidadMedida || 'UND',
        estado: 'ACTIVO',
        stockControl: !!s.stockControl,
        stockActual: Number(s.stockActual || 0),
        stockMinimo: Number(s.stockMinimo || 0),
        orden: s.orden ?? 0,
        imagenUrl: null,
        observaciones: `seed-inicial-${seedUtil.hoy()}`,
        createdAt: exist?.createdAt || seedUtil.nowISO(),
        updatedAt: seedUtil.nowISO(),
        createdBy: exist?.createdBy || USR,
        updatedBy: USR,
        payload: {
          stockControl: !!s.stockControl,
          stockActual: Number(s.stockActual || 0),
          stockMinimo: Number(s.stockMinimo || 0),
          movimientosStock: !!s.stockControl ? [{
            id: seedUtil.generateUUID(),
            fecha: seedUtil.nowISO(),
            delta: Number(s.stockActual || 0),
            stockAnterior: 0,
            stockNuevo: Number(s.stockActual || 0),
            motivo: 'Stock inicial seed',
            usuarioId: USR,
            referenciaId: 'SEED-INICIAL',
            referenciaTipo: 'SEED',
          }] : [],
        },
      };
      if (!exist) {
        db.add<any>(KEY_PROD, data);
        const final = { ...data };
        (async () => { await _insertCatOrProd(KEY_PROD, data.id, final, 'add'); })().catch(() => {});
        creados++;
      } else if (force) {
        const mergePayload = { ...(exist.payload && typeof exist.payload === 'object' ? exist.payload : {}), ...data.payload };
        const updData: any = { ...data, payload: mergePayload };
        delete updData.id;
        db.update<any>(KEY_PROD, s.id, updData);
        const final = { id: s.id, ...updData };
        (async () => { await _insertCatOrProd(KEY_PROD, s.id, final, 'update'); })().catch(() => {});
      }
    }
  }

  if (force) {
    const idsOficiales = new Set(SEED_PRODUCTOS_CARTA.map(x => x.id));
    const idsCatsOficiales = new Set(SEED_CATEGORIAS.map(x => x.id));
    for (const existente of existentes) {
      if (!idsOficiales.has(existente.id)) {
        try {
          db.remove(KEY_PROD, existente.id);
          (async () => {
            try { await dbRemota.removeAsync(KEY_PROD, existente.id); } catch (_) {}
          })().catch(() => {});
        } catch (_) {}
      }
    }
    try {
      const catsExistentes = db.all<any>(KEY_CAT) || [];
      for (const catExistente of catsExistentes) {
        if (!idsCatsOficiales.has(catExistente.id)) {
          try {
            db.remove(KEY_CAT, catExistente.id);
            (async () => {
              try { await dbRemota.removeAsync(KEY_CAT, catExistente.id); } catch (_) {}
            })().catch(() => {});
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  return creados;
}

export function ensureSeedInicialCompleto(force = false): { categoriasCreadas: number; productosCreados: number; alergenosCreados: number; total: number } {
  const cats = ensureSeedInicialCategorias(force);
  const aler = ensureSeedInicialAlergenos(force);
  const prods = ensureSeedInicialProductos(force);
  return {
    categoriasCreadas: cats,
    alergenosCreados: aler,
    productosCreados: prods,
    total: cats + aler + prods,
  };
}

export function estaCatalogoVacio(): boolean {
  try {
    const prods = (db.all<any>(KEY_PROD) || []).length;
    const cats = (db.all<any>(KEY_CAT) || []).length;
    return prods === 0 || cats === 0;
  } catch (_) {
    return true;
  }
}

export default {
  ensureSeedInicialCompleto,
  ensureSeedInicialCategorias,
  ensureSeedInicialAlergenos,
  ensureSeedInicialProductos,
  estaCatalogoVacio,
  SEED_CATEGORIAS,
  SEED_PRODUCTOS_CARTA,
  SEED_ALERGENOS,
};
