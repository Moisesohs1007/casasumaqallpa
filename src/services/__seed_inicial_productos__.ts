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
  { id: 'CAT-DESAYUNOS', nombre: 'Desayunos', descripcion: 'Carta de desayunos continental y criollo', tipo: 'ALIMENTO', usaStock: false, orden: 10, color: '#FFE4B5' },
  { id: 'CAT-JUGOS', nombre: 'Jugos', descripcion: 'Jugos naturales, batidos y refrescos fríos', tipo: 'BEBIDA', usaStock: false, orden: 20, color: '#D4EFDF' },
  { id: 'CAT-BEBIDAS-CALIENTES', nombre: 'Bebidas Calientes', descripcion: 'Café, chocolate, té, infusiones', tipo: 'BEBIDA', usaStock: true, orden: 30, color: '#F6DDCC' },
  { id: 'CAT-SANDWICHES', nombre: 'Sándwiches', descripcion: 'Sándwiches, tostadas y bocadillos', tipo: 'ALIMENTO', usaStock: false, orden: 40, color: '#FADBD8' },
  { id: 'CAT-ENTRADAS', nombre: 'Entradas', descripcion: 'Aperitivos, ensaladas y entradas', tipo: 'ALIMENTO', usaStock: false, orden: 50, color: '#D5F5E3' },
  { id: 'CAT-PLATOS-PRINCIPALES', nombre: 'Platos Principales', descripcion: 'Carta principal criolla, regional y cordero', tipo: 'ALIMENTO', usaStock: false, orden: 60, color: '#EBDEF0' },
  { id: 'CAT-PIZZAS', nombre: 'Pizzas', descripcion: 'Pizzas artesanales', tipo: 'ALIMENTO', usaStock: false, orden: 70, color: '#FDEDEC' },
  { id: 'CAT-POSTRES', nombre: 'Postres', descripcion: 'Dulces, flanes, mousses y cafés especiales dulces', tipo: 'ALIMENTO', usaStock: false, orden: 80, color: '#FFF2CC' },
  { id: 'CAT-BEBIDAS-FRIAS', nombre: 'Bebidas Frías', descripcion: 'Agua, gaseosas, jugos embotellados (control de stock)', tipo: 'BEBIDA', usaStock: true, orden: 90, color: '#D6EAF8' },
  { id: 'CAT-BAR-ALCOHOL', nombre: 'Bar / Alcohol', descripcion: 'Cervezas, vinos, cócteles y licores (control de stock)', tipo: 'BEBIDA', usaStock: true, orden: 100, color: '#D1F2EB' },
  { id: 'CAT-SNACKS', nombre: 'Snacks / Extras', descripcion: 'Galletas, snacks, toallas, paquetes (control de stock)', tipo: 'VENTA', usaStock: true, orden: 110, color: '#E8DAEF' },
  { id: 'CAT-SERVICIOS-EXTRAS', nombre: 'Servicios Extras', descripcion: 'Taxi, tour, lavandería, servicio de habitación manual', tipo: 'SERVICIO', usaStock: false, orden: 120, color: '#FEF9E7' },
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
  // ========== CAT-DESAYUNOS (preparados, sin stock) ==========
  { id: 'PROD-DES-001', codigo: codigoCat('DES', 1), categoriaId: 'CAT-DESAYUNOS', nombre: 'Desayuno Americano', descripcion: 'Café + huevos revueltos + pan + jugo natural + fruta', precioVentaBase: 15.00, stockControl: false, orden: 1 },
  { id: 'PROD-DES-002', codigo: codigoCat('DES', 2), categoriaId: 'CAT-DESAYUNOS', nombre: 'Desayuno Continental', descripcion: 'Jugo + tostadas pan integral con jamón/queso + café + yogur + fruta', precioVentaBase: 20.00, stockControl: false, orden: 2 },
  { id: 'PROD-DES-003', codigo: codigoCat('DES', 3), categoriaId: 'CAT-DESAYUNOS', nombre: 'Desayuno Regional Yungaíno', descripcion: 'Sangrecita + chicharrón de cerdo + maíz tostado + pan con manteca + café + jugo', precioVentaBase: 20.00, stockControl: false, orden: 3 },
  { id: 'PROD-DES-004', codigo: codigoCat('DES', 4), categoriaId: 'CAT-DESAYUNOS', nombre: 'Desayuno Criollo', descripcion: 'Tostada de panettone + tamal + chicha morada + café', precioVentaBase: 18.00, stockControl: false, orden: 4 },
  { id: 'PROD-DES-005', codigo: codigoCat('DES', 5), categoriaId: 'CAT-DESAYUNOS', nombre: 'Tostadas Francesas', descripcion: '3 tostadas bañadas en huevo con miel, plátano frito y café', precioVentaBase: 17.00, stockControl: false, orden: 5 },
  { id: 'PROD-DES-006', codigo: codigoCat('DES', 6), categoriaId: 'CAT-DESAYUNOS', nombre: 'Omelette de Jamón y Queso', descripcion: '3 huevos con jamón, queso, cebolla + pan + café', precioVentaBase: 18.00, stockControl: false, orden: 6 },
  { id: 'PROD-DES-007', codigo: codigoCat('DES', 7), categoriaId: 'CAT-DESAYUNOS', nombre: 'Cereal con Leche', descripcion: 'Cereal integral + leche + yogur + fruta cortada', precioVentaBase: 12.00, stockControl: false, orden: 7 },
  { id: 'PROD-DES-008', codigo: codigoCat('DES', 8), categoriaId: 'CAT-DESAYUNOS', nombre: 'Desayuno Vegano', descripcion: 'Avena cocida + fruta + semillas + jugo + café', precioVentaBase: 18.00, stockControl: false, orden: 8 },

  // ========== CAT-JUGOS ==========
  { id: 'PROD-JUG-001', codigo: codigoCat('JUG', 1), categoriaId: 'CAT-JUGOS', nombre: 'Jugo de Naranja Natural', descripcion: '1 vaso grande exprimido fresco 500ml', precioVentaBase: 8.00, stockControl: false, orden: 1 },
  { id: 'PROD-JUG-002', codigo: codigoCat('JUG', 2), categoriaId: 'CAT-JUGOS', nombre: 'Jugo de Maracuyá', descripcion: '500ml fresco natural', precioVentaBase: 8.00, stockControl: false, orden: 2 },
  { id: 'PROD-JUG-003', codigo: codigoCat('JUG', 3), categoriaId: 'CAT-JUGOS', nombre: 'Jugo de Lúcuma', descripcion: 'Jugo cremoso de lúcuma con leche 500ml', precioVentaBase: 9.00, stockControl: false, orden: 3 },
  { id: 'PROD-JUG-004', codigo: codigoCat('JUG', 4), categoriaId: 'CAT-JUGOS', nombre: 'Chicha Morada', descripcion: 'Chicha morada casera con piura, 500ml', precioVentaBase: 7.00, stockControl: false, orden: 4 },
  { id: 'PROD-JUG-005', codigo: codigoCat('JUG', 5), categoriaId: 'CAT-JUGOS', nombre: 'Limonada Clásica', descripcion: 'Limonada con hierbabuena 500ml', precioVentaBase: 6.00, stockControl: false, orden: 5 },
  { id: 'PROD-JUG-006', codigo: codigoCat('JUG', 6), categoriaId: 'CAT-JUGOS', nombre: 'Batido de Fresa con Leche', descripcion: '500ml cremoso + hielo', precioVentaBase: 9.00, stockControl: false, orden: 6 },
  { id: 'PROD-JUG-007', codigo: codigoCat('JUG', 7), categoriaId: 'CAT-JUGOS', nombre: 'Jugo Detox Verde', descripcion: 'Espinaca, apio, piña, manzana 500ml', precioVentaBase: 10.00, stockControl: false, orden: 7 },

  // ========== CAT-BEBIDAS-CALIENTES ==========
  { id: 'PROD-BC-001', codigo: codigoCat('BC', 1), categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Café Americano', descripcion: 'Café de grano exportación 300ml', precioVentaBase: 6.00, stockControl: true, stockActual: 120, stockMinimo: 20, orden: 1 },
  { id: 'PROD-BC-002', codigo: codigoCat('BC', 2), categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Café con Leche', descripcion: 'Café + leche 350ml', precioVentaBase: 7.00, stockControl: true, stockActual: 120, stockMinimo: 20, orden: 2 },
  { id: 'PROD-BC-003', codigo: codigoCat('BC', 3), categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Café Capuccino', descripcion: 'Café + espuma + canela 350ml', precioVentaBase: 8.00, stockControl: true, stockActual: 80, stockMinimo: 15, orden: 3 },
  { id: 'PROD-BC-004', codigo: codigoCat('BC', 4), categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Café Espresso Doble', descripcion: '2 shots espresso 60ml', precioVentaBase: 6.00, stockControl: true, stockActual: 100, stockMinimo: 20, orden: 4 },
  { id: 'PROD-BC-005', codigo: codigoCat('BC', 5), categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Chocolate Caliente', descripcion: 'Chocolate 70% cacao + leche 400ml', precioVentaBase: 8.00, stockControl: true, stockActual: 80, stockMinimo: 15, orden: 5 },
  { id: 'PROD-BC-006', codigo: codigoCat('BC', 6), categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Té de Hierbas', descripcion: 'Infusión anís/manzzanilla/limón', precioVentaBase: 5.00, stockControl: true, stockActual: 100, stockMinimo: 20, orden: 6 },
  { id: 'PROD-BC-007', codigo: codigoCat('BC', 7), categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Café Doble Kinkao', descripcion: 'Kinkao de la región, doble filtración', precioVentaBase: 7.00, stockControl: true, stockActual: 80, stockMinimo: 15, orden: 7 },
  { id: 'PROD-BC-008', codigo: codigoCat('BC', 8), categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Té Negro Inglés', descripcion: 'Tetley con leche opcional', precioVentaBase: 5.00, stockControl: true, stockActual: 100, stockMinimo: 20, orden: 8 },

  // ========== CAT-SANDWICHES ==========
  { id: 'PROD-SAN-001', codigo: codigoCat('SAN', 1), categoriaId: 'CAT-SANDWICHES', nombre: 'Sándwich de Jamón y Queso', descripcion: 'Pan bimbo + jamón americana + queso edam + lechuga tomate + papas', precioVentaBase: 14.00, stockControl: false, orden: 1 },
  { id: 'PROD-SAN-002', codigo: codigoCat('SAN', 2), categoriaId: 'CAT-SANDWICHES', nombre: 'Sándwich de Pollo a la Plancha', descripcion: 'Pan artesanal + pollo + lechuga + mayonesa + tomate + papas', precioVentaBase: 18.00, stockControl: false, orden: 2 },
  { id: 'PROD-SAN-003', codigo: codigoCat('SAN', 3), categoriaId: 'CAT-SANDWICHES', nombre: 'Choripán Criollo', descripcion: 'Pan francés + chorizo a la parrilla + salsas criollas', precioVentaBase: 17.00, stockControl: false, orden: 3 },
  { id: 'PROD-SAN-004', codigo: codigoCat('SAN', 4), categoriaId: 'CAT-SANDWICHES', nombre: 'Tostada de Palta', descripcion: 'Palta + huevo pochado + tostada integral + café', precioVentaBase: 15.00, stockControl: false, orden: 4 },
  { id: 'PROD-SAN-005', codigo: codigoCat('SAN', 5), categoriaId: 'CAT-SANDWICHES', nombre: 'Sándwich Vegetariano', descripcion: 'Queso fresco + tomate + palta + lechuga + aceitunas', precioVentaBase: 16.00, stockControl: false, orden: 5 },
  { id: 'PROD-SAN-006', codigo: codigoCat('SAN', 6), categoriaId: 'CAT-SANDWICHES', nombre: 'Club Sándwich Triple', descripcion: '3 capas jamón, queso, pollo, lechuga, tomate', precioVentaBase: 20.00, stockControl: false, orden: 6 },
  { id: 'PROD-SAN-007', codigo: codigoCat('SAN', 7), categoriaId: 'CAT-SANDWICHES', nombre: 'Hamburguesa Casera', descripcion: '200g de res + queso + tomate + lechuga + papas fritas', precioVentaBase: 20.00, stockControl: false, orden: 7 },

  // ========== CAT-ENTRADAS ==========
  { id: 'PROD-ENT-001', codigo: codigoCat('ENT', 1), categoriaId: 'CAT-ENTRADAS', nombre: 'Ensalada César', descripcion: 'Lechuga romana + crutones + parmesano + pollo opcional', precioVentaBase: 18.00, stockControl: false, orden: 1 },
  { id: 'PROD-ENT-002', codigo: codigoCat('ENT', 2), categoriaId: 'CAT-ENTRADAS', nombre: 'Causa Limeña', descripcion: 'Causa de atún con puré de papa amarilla + ají amarillo', precioVentaBase: 17.00, stockControl: false, orden: 2 },
  { id: 'PROD-ENT-003', codigo: codigoCat('ENT', 3), categoriaId: 'CAT-ENTRADAS', nombre: 'Sopa Criolla', descripcion: 'Sopa casera con pollo, verduras, fideo', precioVentaBase: 14.00, stockControl: false, orden: 3 },
  { id: 'PROD-ENT-004', codigo: codigoCat('ENT', 4), categoriaId: 'CAT-ENTRADAS', nombre: 'Tequeños de Queso', descripcion: '6 unidades de queso crema fritos con ají', precioVentaBase: 15.00, stockControl: false, orden: 4 },
  { id: 'PROD-ENT-005', codigo: codigoCat('ENT', 5), categoriaId: 'CAT-ENTRADAS', nombre: 'Chicharrón de Calamar', descripcion: 'Calamares fritos con yuca sancochada y salsas', precioVentaBase: 20.00, stockControl: false, orden: 5 },
  { id: 'PROD-ENT-006', codigo: codigoCat('ENT', 6), categoriaId: 'CAT-ENTRADAS', nombre: 'Ensalada Vegana Tropical', descripcion: 'Quinoa + mango + palta + tomates cherry', precioVentaBase: 18.00, stockControl: false, orden: 6 },
  { id: 'PROD-ENT-007', codigo: codigoCat('ENT', 7), categoriaId: 'CAT-ENTRADAS', nombre: 'Papa a la Huancaína', descripcion: 'Papa con salsa de ají amarillo y queso fresco + aceituna', precioVentaBase: 16.00, stockControl: false, orden: 7 },

  // ========== CAT-PLATOS-PRINCIPALES ==========
  { id: 'PROD-PLA-001', codigo: codigoCat('PLA', 1), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Cordero a la Cruz Regional', descripcion: 'Medio cordero asado leña 3-4 personas. Papas, ensalada criolla y salsa huancaína', precioVentaBase: 85.00, stockControl: false, orden: 1 },
  { id: 'PROD-PLA-002', codigo: codigoCat('PLA', 2), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Cuy Chactado Yungaíno', descripcion: 'Cuy chactado + papas fritas + ensalada + salsa criolla', precioVentaBase: 42.00, stockControl: false, orden: 2 },
  { id: 'PROD-PLA-003', codigo: codigoCat('PLA', 3), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Seco de Cabrito a la Norteña', descripcion: 'Cabrito con frijoles canarios, yuca y chicha de jora', precioVentaBase: 38.00, stockControl: false, orden: 3 },
  { id: 'PROD-PLA-004', codigo: codigoCat('PLA', 4), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Lomo Saltado Criollo', descripcion: 'Lomo fino salteado cebolla tomate + papas fritas + arroz', precioVentaBase: 30.00, stockControl: false, orden: 4 },
  { id: 'PROD-PLA-005', codigo: codigoCat('PLA', 5), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Aji de Gallina Casero', descripcion: 'Pollo + crema huancaína con ají amarillo + papa + arroz', precioVentaBase: 26.00, stockControl: false, orden: 5 },
  { id: 'PROD-PLA-006', codigo: codigoCat('PLA', 6), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Pollo al Horno Regional', descripcion: '1/2 pollo marinado cerveza + papas fritas + ensalada', precioVentaBase: 30.00, stockControl: false, orden: 6 },
  { id: 'PROD-PLA-007', codigo: codigoCat('PLA', 7), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Cazuela de Cordero', descripcion: 'Estofado de cordero con verduras + yuca + chuño + arroz', precioVentaBase: 36.00, stockControl: false, orden: 7 },
  { id: 'PROD-PLA-008', codigo: codigoCat('PLA', 8), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Ceviche de Corvina', descripcion: 'Corvina fresca + limón + cebolla roja + camote + choclo', precioVentaBase: 32.00, stockControl: false, orden: 8 },
  { id: 'PROD-PLA-009', codigo: codigoCat('PLA', 9), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Chaufa Amazónico', descripcion: 'Arroz salteado con pato, cebolla china, sillao + huevo frito', precioVentaBase: 28.00, stockControl: false, orden: 9 },
  { id: 'PROD-PLA-010', codigo: codigoCat('PLA', 10), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Olluquito con Charqui', descripcion: 'Olluco con charqui cordero + papa + arroz blanco', precioVentaBase: 26.00, stockControl: false, orden: 10 },
  { id: 'PROD-PLA-011', codigo: codigoCat('PLA', 11), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Milanesa de Pollo', descripcion: 'Pollo apanado + puré de papas + ensalada + fideos', precioVentaBase: 26.00, stockControl: false, orden: 11 },
  { id: 'PROD-PLA-012', codigo: codigoCat('PLA', 12), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Sopa a la Carta + Segundo del Día', descripcion: 'Sopa del menú del día + segundo ejecutivo + jugo del día', precioVentaBase: 22.00, stockControl: false, orden: 12 },
  { id: 'PROD-PLA-013', codigo: codigoCat('PLA', 13), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Pollo a la Brasa (1/4)', descripcion: '1/4 pollo brasa + papas fritas + ensalada', precioVentaBase: 24.00, stockControl: false, orden: 13 },
  { id: 'PROD-PLA-014', codigo: codigoCat('PLA', 14), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Almuerzo Ejecutivo Criollo', descripcion: 'Entrada (opc) + segundo del día + refresco + café', precioVentaBase: 28.00, stockControl: false, orden: 14 },
  { id: 'PROD-PLA-015', codigo: codigoCat('PLA', 15), categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Tamal de Cerdo + Chicha Morada', descripcion: 'Tamal criollo de cerdo + 500ml chicha morada', precioVentaBase: 14.00, stockControl: false, orden: 15 },

  // ========== CAT-PIZZAS ==========
  { id: 'PROD-PIZ-001', codigo: codigoCat('PIZ', 1), categoriaId: 'CAT-PIZZAS', nombre: 'Pizza Margherita Clásica', descripcion: 'Tomate, mozzarella, orégano, albahaca. Tamaño familiar 8 rebanadas', precioVentaBase: 45.00, stockControl: false, orden: 1 },
  { id: 'PROD-PIZ-002', codigo: codigoCat('PIZ', 2), categoriaId: 'CAT-PIZZAS', nombre: 'Pizza Pepperoni Americana', descripcion: 'Mozzarella, pepperoni, aceitunas, tomate. 8 rebanadas', precioVentaBase: 48.00, stockControl: false, orden: 2 },
  { id: 'PROD-PIZ-003', codigo: codigoCat('PIZ', 3), categoriaId: 'CAT-PIZZAS', nombre: 'Pizza Hawaiana', descripcion: 'Jamón, piña, mozzarella, tomate. 8 rebanadas', precioVentaBase: 48.00, stockControl: false, orden: 3 },
  { id: 'PROD-PIZ-004', codigo: codigoCat('PIZ', 4), categoriaId: 'CAT-PIZZAS', nombre: 'Pizza 4 Quesos Gourmet', descripcion: 'Mozzarella, parmesano, roquefort, edam + orégano', precioVentaBase: 52.00, stockControl: false, orden: 4 },
  { id: 'PROD-PIZ-005', codigo: codigoCat('PIZ', 5), categoriaId: 'CAT-PIZZAS', nombre: 'Pizza Pollo BBQ', descripcion: 'Pollo, cebolla, salsa barbacoa, bacon, mozzarella', precioVentaBase: 52.00, stockControl: false, orden: 5 },
  { id: 'PROD-PIZ-006', codigo: codigoCat('PIZ', 6), categoriaId: 'CAT-PIZZAS', nombre: 'Pizza Vegetariana', descripcion: 'Tomate, champiñón, pimiento, cebolla, aceitunas, maíz, palta', precioVentaBase: 48.00, stockControl: false, orden: 6 },

  // ========== CAT-POSTRES ==========
  { id: 'PROD-POS-001', codigo: codigoCat('POS', 1), categoriaId: 'CAT-POSTRES', nombre: 'Flan Casero con Dulce de Leche', descripcion: 'Flan de leche + dulce de leche casero', precioVentaBase: 8.00, stockControl: false, orden: 1 },
  { id: 'PROD-POS-002', codigo: codigoCat('POS', 2), categoriaId: 'CAT-POSTRES', nombre: 'Suspiro a la Limeña', descripcion: 'Postre clásico con manjarblanco y merengue', precioVentaBase: 9.00, stockControl: false, orden: 2 },
  { id: 'PROD-POS-003', codigo: codigoCat('POS', 3), categoriaId: 'CAT-POSTRES', nombre: 'Mousse de Lúcuma', descripcion: 'Mousse de lúcuma con galleta base + canela', precioVentaBase: 10.00, stockControl: false, orden: 3 },
  { id: 'PROD-POS-004', codigo: codigoCat('POS', 4), categoriaId: 'CAT-POSTRES', nombre: 'Tarta de Manzana Caliente', descripcion: 'Tarta de manzana con canela y helado opcional', precioVentaBase: 10.00, stockControl: false, orden: 4 },
  { id: 'PROD-POS-005', codigo: codigoCat('POS', 5), categoriaId: 'CAT-POSTRES', nombre: 'Copa de Helado de Vainilla', descripcion: '3 bolas de helado + chocolate o fresas (2 opciones)', precioVentaBase: 9.00, stockControl: false, orden: 5 },
  { id: 'PROD-POS-006', codigo: codigoCat('POS', 6), categoriaId: 'CAT-POSTRES', nombre: 'Panettone Fruta Confitada', descripcion: 'Porción panettone regional con mermelada + café', precioVentaBase: 7.00, stockControl: false, orden: 6 },
  { id: 'PROD-POS-007', codigo: codigoCat('POS', 7), categoriaId: 'CAT-POSTRES', nombre: 'Cheesecake de Maracuyá', descripcion: 'Cheesecake con mermelada de maracuyá', precioVentaBase: 11.00, stockControl: false, orden: 7 },
  { id: 'PROD-POS-008', codigo: codigoCat('POS', 8), categoriaId: 'CAT-POSTRES', nombre: 'Frutas de Temporada', descripcion: 'Plato de frutas cortadas con yogur natural', precioVentaBase: 8.00, stockControl: false, orden: 8 },

  // ========== CAT-BEBIDAS-FRIAS ==========
  { id: 'PROD-BF-001', codigo: 'BEB401', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Agua Mineral 1L', descripcion: 'Agua mineral natural sin gas', precioVentaBase: 5.00, stockControl: true, stockActual: 48, stockMinimo: 12, orden: 1 },
  { id: 'PROD-BF-002', codigo: 'BEB401B', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Agua Mineral 500ml', descripcion: 'Agua mineral natural', precioVentaBase: 3.50, stockControl: true, stockActual: 72, stockMinimo: 24, orden: 2 },
  { id: 'PROD-BF-003', codigo: 'BEB402A', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Coca Cola 500ml', descripcion: 'Gaseosa Coca Cola personal', precioVentaBase: 7.00, stockControl: true, stockActual: 24, stockMinimo: 12, orden: 3 },
  { id: 'PROD-BF-004', codigo: 'BEB402B', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Inca Kola 500ml', descripcion: 'Gaseosa Inca Kola Dorada', precioVentaBase: 7.00, stockControl: true, stockActual: 22, stockMinimo: 10, orden: 4 },
  { id: 'PROD-BF-005', codigo: 'BEB402C', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Sprite 500ml', descripcion: 'Gaseosa lima limón', precioVentaBase: 7.00, stockControl: true, stockActual: 11, stockMinimo: 10, orden: 5 },
  { id: 'PROD-BF-006', codigo: 'BEB402D', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Fanta Naranja 500ml', descripcion: 'Gaseosa naranja', precioVentaBase: 7.00, stockControl: true, stockActual: 12, stockMinimo: 8, orden: 6 },
  { id: 'PROD-BF-007', codigo: 'BEB403A', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Gatorade Manzana 1L', descripcion: 'Hidratante isotónico', precioVentaBase: 8.00, stockControl: true, stockActual: 18, stockMinimo: 8, orden: 7 },
  { id: 'PROD-BF-008', codigo: 'BEB403B', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Powerade Naranja 1L', descripcion: 'Isotónico Powerade naranja', precioVentaBase: 8.00, stockControl: true, stockActual: 14, stockMinimo: 8, orden: 8 },
  { id: 'PROD-BF-009', codigo: 'BEB404', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Red Bull 250ml', descripcion: 'Energizante Red Bull clásico', precioVentaBase: 12.00, stockControl: true, stockActual: 20, stockMinimo: 6, orden: 9 },
  { id: 'PROD-BF-010', codigo: 'BEB405', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Agua con Gas 500ml', descripcion: 'San Mateo con gas', precioVentaBase: 4.00, stockControl: true, stockActual: 40, stockMinimo: 10, orden: 10 },
  { id: 'PROD-BF-011', codigo: 'BEB406', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Jugo de Durazno Cifrut 500ml', descripcion: 'Jugo embotellado de durazno', precioVentaBase: 6.00, stockControl: true, stockActual: 18, stockMinimo: 10, orden: 11 },

  // ========== CAT-BAR-ALCOHOL ==========
  { id: 'PROD-BAR-001', codigo: 'BAR601A', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Pilsen Callao 620ml', descripcion: 'Cerveza pilsen botella', precioVentaBase: 8.00, stockControl: true, stockActual: 36, stockMinimo: 12, orden: 1 },
  { id: 'PROD-BAR-002', codigo: 'BAR601B', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Cusqueña Dorada 620ml', descripcion: 'Cerveza cusqueña botella', precioVentaBase: 9.00, stockControl: true, stockActual: 24, stockMinimo: 12, orden: 2 },
  { id: 'PROD-BAR-003', codigo: 'BAR601C', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Cusqueña Trigo 620ml', descripcion: 'Cerveza de trigo', precioVentaBase: 10.00, stockControl: true, stockActual: 18, stockMinimo: 8, orden: 3 },
  { id: 'PROD-BAR-004', codigo: 'BAR601D', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Arequipeña Lager 620ml', descripcion: 'Cerveza arequipeña', precioVentaBase: 9.00, stockControl: true, stockActual: 16, stockMinimo: 8, orden: 4 },
  { id: 'PROD-BAR-005', codigo: 'BAR601E', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Paceña 620ml', descripcion: 'Cerveza boliviana paceña', precioVentaBase: 9.00, stockControl: true, stockActual: 16, stockMinimo: 8, orden: 5 },
  { id: 'PROD-BAR-006', codigo: 'BAR602', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Corona 355ml', descripcion: 'Corona botella importada con limón', precioVentaBase: 12.00, stockControl: true, stockActual: 30, stockMinimo: 8, orden: 6 },
  { id: 'PROD-BAR-007', codigo: 'BAR603', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Club Suave Vino Tinto (vaso 150ml)', descripcion: 'Vino tinto selección por vaso', precioVentaBase: 14.00, stockControl: true, stockActual: 20, stockMinimo: 6, orden: 7 },
  { id: 'PROD-BAR-008', codigo: 'BAR604', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Caipirinha Cachaza', descripcion: 'Caipirinha clásica de limón + cachaza', precioVentaBase: 18.00, stockControl: true, stockActual: 30, stockMinimo: 10, orden: 8 },
  { id: 'PROD-BAR-009', codigo: 'BAR605', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Pisco Sour Clásico', descripcion: 'Pisco Acholado + limón + clara + amargo angostura', precioVentaBase: 20.00, stockControl: true, stockActual: 30, stockMinimo: 10, orden: 9 },
  { id: 'PROD-BAR-010', codigo: 'BAR606', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Algarrobina Cocktail', descripcion: 'Cóctel de algarrobina + pisco + yema', precioVentaBase: 22.00, stockControl: true, stockActual: 20, stockMinimo: 6, orden: 10 },
  { id: 'PROD-BAR-011', codigo: 'BAR607', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Whisky Sour Ballantines', descripcion: 'Doble de whisky con limón', precioVentaBase: 28.00, stockControl: true, stockActual: 20, stockMinimo: 6, orden: 11 },
  { id: 'PROD-BAR-012', codigo: 'BAR608', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Vodka Tonica', descripcion: 'Smirnoff + agua tonica + limón', precioVentaBase: 20.00, stockControl: true, stockActual: 25, stockMinimo: 8, orden: 12 },
  { id: 'PROD-BAR-013', codigo: 'BAR609', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Ron Cola Clásico', descripcion: 'Ron Barceló blanco + Coca Cola + limón', precioVentaBase: 18.00, stockControl: true, stockActual: 30, stockMinimo: 10, orden: 13 },
  { id: 'PROD-BAR-014', codigo: 'BAR610', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Chilcano Pisco', descripcion: 'Pisco + ginger ale + limón', precioVentaBase: 18.00, stockControl: true, stockActual: 30, stockMinimo: 10, orden: 14 },
  { id: 'PROD-BAR-015', codigo: 'BAR611', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Tequila Shot (50ml)', descripcion: 'Shot de tequila José Cuervo con sal y limón', precioVentaBase: 16.00, stockControl: true, stockActual: 30, stockMinimo: 10, orden: 15 },
  { id: 'PROD-BAR-016', codigo: 'BAR612', categoriaId: 'CAT-BAR-ALCOHOL', nombre: 'Chicha de Jora Casera 500ml', descripcion: 'Chicha de jora tradicional de la región', precioVentaBase: 10.00, stockControl: true, stockActual: 16, stockMinimo: 8, orden: 16 },

  // ========== CAT-SNACKS ==========
  { id: 'PROD-SNK-001', codigo: 'SNK-001', categoriaId: 'CAT-SNACKS', nombre: 'Snack / Galleta', descripcion: 'Galleta surtida para snack bar', precioVentaBase: 3.00, stockControl: true, stockActual: 48, stockMinimo: 16, orden: 1 },
  { id: 'PROD-SNK-002', codigo: 'SNK-002', categoriaId: 'CAT-SNACKS', nombre: 'Lays Clásicas 100g', descripcion: 'Papas fritas Lay"s clasicas', precioVentaBase: 5.00, stockControl: true, stockActual: 30, stockMinimo: 10, orden: 2 },
  { id: 'PROD-SNK-003', codigo: 'SNK-003', categoriaId: 'CAT-SNACKS', nombre: 'Cheetos Flamin Hot', descripcion: 'Snack de queso picante 90g', precioVentaBase: 5.00, stockControl: true, stockActual: 28, stockMinimo: 10, orden: 3 },
  { id: 'PROD-SNK-004', codigo: 'SNK-004', categoriaId: 'CAT-SNACKS', nombre: 'Barra de Cereal Nuez', descripcion: 'Barra energética con frutos secos', precioVentaBase: 4.00, stockControl: true, stockActual: 24, stockMinimo: 8, orden: 4 },
  { id: 'PROD-SNK-005', codigo: 'SNK-005', categoriaId: 'CAT-SNACKS', nombre: 'Chocolatina Jet', descripcion: 'Chocolatina mediana', precioVentaBase: 3.50, stockControl: true, stockActual: 30, stockMinimo: 10, orden: 5 },
  { id: 'PROD-SNK-006', codigo: 'SNK-006', categoriaId: 'CAT-SNACKS', nombre: 'Maní Salado 100g', descripcion: 'Maní frito salado bolsa', precioVentaBase: 4.00, stockControl: true, stockActual: 28, stockMinimo: 10, orden: 6 },
  { id: 'PROD-SNK-007', codigo: 'SNK-007', categoriaId: 'CAT-SNACKS', nombre: 'Dulces Surtidos Nacionales', descripcion: 'Mix Teja, King Kong, Alfajores', precioVentaBase: 5.00, stockControl: true, stockActual: 20, stockMinimo: 6, orden: 7 },
  { id: 'PROD-SNK-008', codigo: 'EXT-001', categoriaId: 'CAT-SNACKS', nombre: 'Toalla Extra', descripcion: 'Toalla adicional para piscina o habitación', precioVentaBase: 15.00, stockControl: true, stockActual: 20, stockMinimo: 5, orden: 8 },
  { id: 'PROD-SNK-009', codigo: 'EXT-002', categoriaId: 'CAT-SNACKS', nombre: 'Botella de Agua para Piscina 1L', descripcion: 'Agua piscina (paquete 2 botellas)', precioVentaBase: 8.00, stockControl: true, stockActual: 30, stockMinimo: 10, orden: 9 },
  { id: 'PROD-SNK-010', codigo: 'EXT-003', categoriaId: 'CAT-SNACKS', nombre: 'Sánduche de Queso Individual', descripcion: 'Pequeño sánduche snack', precioVentaBase: 9.00, stockControl: true, stockActual: 20, stockMinimo: 8, orden: 10 },
  { id: 'PROD-SNK-011', codigo: 'EXT-004', categoriaId: 'CAT-SNACKS', nombre: 'Café para llevar 350ml', descripcion: 'Café americano para llevar vaso desechable', precioVentaBase: 8.00, stockControl: true, stockActual: 40, stockMinimo: 12, orden: 11 },
  { id: 'PROD-SNK-012', codigo: 'EXT-005', categoriaId: 'CAT-SNACKS', nombre: 'Kit Aseo Baño Extra', descripcion: 'Shampoo + jabón + toalla pequeña', precioVentaBase: 12.00, stockControl: true, stockActual: 18, stockMinimo: 6, orden: 12 },

  // ========== CAT-SERVICIOS-EXTRAS ==========
  { id: 'PROD-EXT-001', codigo: codigoCat('EXT', 1), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Taxi Aeropuerto Tarapoto (TPP)', descripcion: 'Traslado desde/aeropuerto TPP (1-4 pax)', precioVentaBase: 45.00, stockControl: false, orden: 1 },
  { id: 'PROD-EXT-002', codigo: codigoCat('EXT', 2), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Taxi Centro - Aeropuerto', descripcion: 'Traslado dentro de Tarapoto / centro hacia terminal', precioVentaBase: 20.00, stockControl: false, orden: 2 },
  { id: 'PROD-EXT-003', codigo: codigoCat('EXT', 3), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Tour Catarata de Ahuashiyacu', descripcion: 'Excursión de 1/2 día. Incluye guía + transporte + entrada', precioVentaBase: 60.00, stockControl: false, orden: 3 },
  { id: 'PROD-EXT-004', codigo: codigoCat('EXT', 4), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Tour Laguna Azul Sauce', descripcion: 'Excursión día completo con almuerzo', precioVentaBase: 75.00, stockControl: false, orden: 4 },
  { id: 'PROD-EXT-005', codigo: codigoCat('EXT', 5), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Lavandería 5kg', descripcion: 'Lavado + secado + planchado hasta 5kg', precioVentaBase: 20.00, stockControl: false, orden: 5 },
  { id: 'PROD-EXT-006', codigo: codigoCat('EXT', 6), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Planchado Individual', descripcion: 'Planchado por prenda', precioVentaBase: 3.00, stockControl: false, orden: 6 },
  { id: 'PROD-EXT-007', codigo: codigoCat('EXT', 7), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Masaje Terapéutico 30min', descripcion: 'Masaje relajante 30 min a habitación', precioVentaBase: 50.00, stockControl: false, orden: 7 },
  { id: 'PROD-EXT-008', codigo: codigoCat('EXT', 8), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Masaje 60min Corporal', descripcion: 'Masaje completo 60 min', precioVentaBase: 85.00, stockControl: false, orden: 8 },
  { id: 'PROD-EXT-009', codigo: codigoCat('EXT', 9), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Servicio de Habitación Delivery', descripcion: 'Cargo fijo pedido a habitación (no incluye platos)', precioVentaBase: 5.00, stockControl: false, orden: 9 },
  { id: 'PROD-EXT-010', codigo: codigoCat('EXT', 10), categoriaId: 'CAT-SERVICIOS-EXTRAS', nombre: 'Soporte Excursión Moto Alquiler 8h', descripcion: 'Alquiler moto 150cc 8h día', precioVentaBase: 30.00, stockControl: false, orden: 10 },
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
        createdAt: seedUtil.nowISO(),
        updatedAt: seedUtil.nowISO(),
        createdBy: USR,
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
        const updData = { ...data, payload: mergePayload, id: undefined };
        db.update<any>(KEY_PROD, s.id, updData);
        const final = { id: s.id, ...updData };
        (async () => { await _insertCatOrProd(KEY_PROD, s.id, final, 'update'); })().catch(() => {});
      }
    }
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
