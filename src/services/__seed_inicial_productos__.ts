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
  { id: 'CAT-DESAYUNOS', codigo: 'DES', nombre: 'Desayunos', descripcion: 'Desayunos de la carta', tipo: 'ALIMENTO', usaStock: false, orden: 1, color: '#FFE4B5' },
  { id: 'CAT-BEBIDAS-FRIAS', codigo: 'BF', nombre: 'Bebidas Frías', descripcion: 'Bebidas frías de la carta', tipo: 'BEBIDA', usaStock: true, orden: 2, color: '#D6EAF8' },
  { id: 'CAT-BEBIDAS-CALIENTES', codigo: 'BC', nombre: 'Bebidas Calientes', descripcion: 'Bebidas calientes de la carta', tipo: 'BEBIDA', usaStock: false, orden: 3, color: '#F6DDCC' },
  { id: 'CAT-BEBIDAS-ALCOHOL', codigo: 'BA', nombre: 'Bebidas (Alcohólicas)', descripcion: 'Cervezas, vinos y calientito', tipo: 'BEBIDA', usaStock: true, orden: 4, color: '#D1F2EB' },
  { id: 'CAT-JUGOS', codigo: 'JUG', nombre: 'Jugos', descripcion: 'Jugos naturales', tipo: 'BEBIDA', usaStock: false, orden: 5, color: '#D4EFDF' },
  { id: 'CAT-SANDWICH', codigo: 'SAN', nombre: 'Sándwich', descripcion: 'Sándwiches de la carta', tipo: 'ALIMENTO', usaStock: false, orden: 6, color: '#FADBD8' },
  { id: 'CAT-ENTRADAS', codigo: 'ENT', nombre: 'Entradas', descripcion: 'Entradas de la carta', tipo: 'ALIMENTO', usaStock: false, orden: 7, color: '#D5F5E3' },
  { id: 'CAT-SOPAS', codigo: 'SOP', nombre: 'Sopas', descripcion: 'Sopas de la carta', tipo: 'ALIMENTO', usaStock: false, orden: 8, color: '#FCF3CF' },
  { id: 'CAT-PLATOS-PRINCIPALES', codigo: 'PP', nombre: 'Platos Principales', descripcion: 'Platos principales de la carta', tipo: 'ALIMENTO', usaStock: false, orden: 9, color: '#EBDEF0' },
  { id: 'CAT-PIZZAS', codigo: 'PIZ', nombre: 'Pizzas', descripcion: 'Pizzas Personal y Mediana', tipo: 'ALIMENTO', usaStock: false, orden: 10, color: '#FDEDEC' },
  { id: 'CAT-POSTRES', codigo: 'POS', nombre: 'Postres', descripcion: 'Postres de la carta', tipo: 'ALIMENTO', usaStock: false, orden: 11, color: '#FFF2CC' },
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
  // ========== DESAYUNOS ==========
  { id: 'PROD-DES-001', codigo: 'DES-001', categoriaId: 'CAT-DESAYUNOS', nombre: 'Lomo al Jugo', descripcion: '2 Panes, Jugo, Café.', precioVentaBase: 20.00, stockControl: false, orden: 1 },
  { id: 'PROD-DES-002', codigo: 'DES-002', categoriaId: 'CAT-DESAYUNOS', nombre: 'Continental', descripcion: '2 Panes, Huevos (revuelto, frito o sancochado), Jugo, Café.', precioVentaBase: 20.00, stockControl: false, orden: 2 },
  { id: 'PROD-DES-003', codigo: 'DES-003', categoriaId: 'CAT-DESAYUNOS', nombre: 'Americano', descripcion: '2 Panos, Mermermelada, mantequilla, Jugo, Café.', precioVentaBase: 15.00, stockControl: false, orden: 3 },
  { id: 'PROD-DES-004', codigo: 'DES-004', categoriaId: 'CAT-DESAYUNOS', nombre: 'Regional - Yungaíno', descripcion: '2 Panes, 1 tamal / refresco de chicha morada o coya, Jugo, Café.', precioVentaBase: 20.00, stockControl: false, orden: 4 },

  // ========== BEBIDAS FRIAS ==========
  { id: 'PROD-BF-001', codigo: 'BF-001', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Agua Mineral', descripcion: '', precioVentaBase: 3.00, stockControl: true, stockActual: 72, stockMinimo: 24, orden: 1 },
  { id: 'PROD-BF-002', codigo: 'BF-002', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Gaseosa (1/2 L)', descripcion: '', precioVentaBase: 5.00, stockControl: true, stockActual: 60, stockMinimo: 20, orden: 2 },
  { id: 'PROD-BF-003', codigo: 'BF-003', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Gatorade', descripcion: '', precioVentaBase: 4.00, stockControl: true, stockActual: 24, stockMinimo: 8, orden: 3 },
  { id: 'PROD-BF-004', codigo: 'BF-004', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Chicha Morada (1L)', descripcion: '', precioVentaBase: 14.00, stockControl: true, stockActual: 20, stockMinimo: 8, orden: 4 },
  { id: 'PROD-BF-005', codigo: 'BF-005', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Limonada (1L)', descripcion: '', precioVentaBase: 14.00, stockControl: true, stockActual: 20, stockMinimo: 6, orden: 5 },
  { id: 'PROD-BF-006', codigo: 'BF-006', categoriaId: 'CAT-BEBIDAS-FRIAS', nombre: 'Maracuyá (1L)', descripcion: '', precioVentaBase: 14.00, stockControl: true, stockActual: 18, stockMinimo: 6, orden: 6 },

  // ========== BEBIDAS CALIENTES ==========
  { id: 'PROD-BC-001', codigo: 'BC-001', categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Infusiones', descripcion: 'Té, Anís, Manzanillo, Cedrón, Hierba Luisa, Muña.', precioVentaBase: 3.00, stockControl: false, orden: 1 },
  { id: 'PROD-BC-002', codigo: 'BC-002', categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Café', descripcion: '', precioVentaBase: 5.00, stockControl: false, orden: 2 },
  { id: 'PROD-BC-003', codigo: 'BC-003', categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Cappuccino', descripcion: '', precioVentaBase: 8.50, stockControl: false, orden: 3 },
  { id: 'PROD-BC-004', codigo: 'BC-004', categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Chocolate con Leche', descripcion: '', precioVentaBase: 7.00, stockControl: false, orden: 4 },
  { id: 'PROD-BC-005', codigo: 'BC-005', categoriaId: 'CAT-BEBIDAS-CALIENTES', nombre: 'Leche', descripcion: '', precioVentaBase: 5.50, stockControl: false, orden: 5 },

  // ========== BEBIDAS ALCOHOLICAS ==========
  { id: 'PROD-BA-001', codigo: 'BA-001', categoriaId: 'CAT-BEBIDAS-ALCOHOL', nombre: 'Cerveza Artesanal', descripcion: '', precioVentaBase: 15.00, stockControl: true, stockActual: 24, stockMinimo: 8, orden: 1 },
  { id: 'PROD-BA-002', codigo: 'BA-002', categoriaId: 'CAT-BEBIDAS-ALCOHOL', nombre: 'Vino Santiago Queirolo', descripcion: '(Rosé, Magdalena y borgoña).', precioVentaBase: 25.00, stockControl: true, stockActual: 16, stockMinimo: 6, orden: 2 },
  { id: 'PROD-BA-003', codigo: 'BA-003', categoriaId: 'CAT-BEBIDAS-ALCOHOL', nombre: 'Calientito', descripcion: '(Bebida tradicional de yerba loka, flor de jamaica, naranja, limón y piña).', precioVentaBase: 20.00, stockControl: true, stockActual: 12, stockMinimo: 4, orden: 3 },

  // ========== JUGOS ==========
  { id: 'PROD-JUG-001', codigo: 'JUG-001', categoriaId: 'CAT-JUGOS', nombre: 'Papaya', descripcion: '', precioVentaBase: 6.00, stockControl: false, orden: 1 },
  { id: 'PROD-JUG-002', codigo: 'JUG-002', categoriaId: 'CAT-JUGOS', nombre: 'Piña', descripcion: '', precioVentaBase: 6.00, stockControl: false, orden: 2 },
  { id: 'PROD-JUG-003', codigo: 'JUG-003', categoriaId: 'CAT-JUGOS', nombre: 'Naranja', descripcion: '', precioVentaBase: 7.00, stockControl: false, orden: 3 },
  { id: 'PROD-JUG-004', codigo: 'JUG-004', categoriaId: 'CAT-JUGOS', nombre: 'Fresa', descripcion: '', precioVentaBase: 7.00, stockControl: false, orden: 4 },

  // ========== SANDWICH ==========
  { id: 'PROD-SAN-001', codigo: 'SAN-001', categoriaId: 'CAT-SANDWICH', nombre: 'Queso', descripcion: '', precioVentaBase: 5.00, stockControl: false, orden: 1 },
  { id: 'PROD-SAN-002', codigo: 'SAN-002', categoriaId: 'CAT-SANDWICH', nombre: 'Huevo', descripcion: '', precioVentaBase: 5.00, stockControl: false, orden: 2 },
  { id: 'PROD-SAN-003', codigo: 'SAN-003', categoriaId: 'CAT-SANDWICH', nombre: 'Aceituna', descripcion: '', precioVentaBase: 5.00, stockControl: false, orden: 3 },
  { id: 'PROD-SAN-004', codigo: 'SAN-004', categoriaId: 'CAT-SANDWICH', nombre: 'Pollo a la Plancha', descripcion: '', precioVentaBase: 12.00, stockControl: false, orden: 4 },

  // ========== ENTRADAS ==========
  { id: 'PROD-ENT-001', codigo: 'ENT-001', categoriaId: 'CAT-ENTRADAS', nombre: 'Ensalada Fresca', descripcion: 'Pechuga, lechuga, pepinillo y tomate.', precioVentaBase: 15.00, stockControl: false, orden: 1 },
  { id: 'PROD-ENT-002', codigo: 'ENT-002', categoriaId: 'CAT-ENTRADAS', nombre: 'Ensalada de Atún', descripcion: 'Filete de atún en conserva, lechuga, huevo duro, cebolla, aceitunas y vinagreta.', precioVentaBase: 20.00, stockControl: false, orden: 2 },
  { id: 'PROD-ENT-003', codigo: 'ENT-003', categoriaId: 'CAT-ENTRADAS', nombre: 'Papa a la Huancaína', descripcion: 'Papas escalfadas, crema a la huancaína, lechuga, huevo duro y aceitunas.', precioVentaBase: 12.00, stockControl: false, orden: 3 },
  { id: 'PROD-ENT-004', codigo: 'ENT-004', categoriaId: 'CAT-ENTRADAS', nombre: 'Tequeños', descripcion: 'Bastones con queso y jamonada acompañados de crema de pato.', precioVentaBase: 15.00, stockControl: false, orden: 4 },

  // ========== SOPAS ==========
  { id: 'PROD-SOP-001', codigo: 'SOP-001', categoriaId: 'CAT-SOPAS', nombre: 'Caldo de Gallina', descripcion: 'Acompañado de Papas escaldadas y Huevo.', precioVentaBase: 25.00, stockControl: false, orden: 1 },
  { id: 'PROD-SOP-002', codigo: 'SOP-002', categoriaId: 'CAT-SOPAS', nombre: 'Sopa a la Minuta', descripcion: 'Acompañado de Pan tostado.', precioVentaBase: 20.00, stockControl: false, orden: 2 },
  { id: 'PROD-SOP-003', codigo: 'SOP-003', categoriaId: 'CAT-SOPAS', nombre: 'Sopa de Papa Cashqui', descripcion: 'Papas en trozos, huevo, queso y hierbas aromáticas.', precioVentaBase: 15.00, stockControl: false, orden: 3 },
  { id: 'PROD-SOP-004', codigo: 'SOP-004', categoriaId: 'CAT-SOPAS', nombre: 'Crema de Zapallo', descripcion: 'A base de zapallo y hierbas aromáticas.', precioVentaBase: 15.00, stockControl: false, orden: 4 },

  // ========== PLATOS PRINCIPALES ==========
  { id: 'PROD-PLA-001', codigo: 'PLA-001', categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Lomo Saltado', descripcion: 'Lomo frito regional, papas fritas y arroz.', precioVentaBase: 30.00, stockControl: false, orden: 1 },
  { id: 'PROD-PLA-002', codigo: 'PLA-002', categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Tallarín Saltado', descripcion: 'Lomo fino, queso mozzarella, pimientos y pisco.', precioVentaBase: 30.00, stockControl: false, orden: 2 },
  { id: 'PROD-PLA-003', codigo: 'PLA-003', categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Picante de Cuy', descripcion: 'El cuy, papas escalfadas, aderezo a base de ají amarillo y nuestro verde.', precioVentaBase: 35.00, stockControl: false, orden: 3 },
  { id: 'PROD-PLA-004', codigo: 'PLA-004', categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Trucha a la Plancha', descripcion: 'Papas fritas o ensalada, ensalada fresca.', precioVentaBase: 30.00, stockControl: false, orden: 4 },
  { id: 'PROD-PLA-005', codigo: 'PLA-005', categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Trucha Frita', descripcion: 'Papas fritas o ensalada, ensalada fresca.', precioVentaBase: 32.00, stockControl: false, orden: 5 },
  { id: 'PROD-PLA-006', codigo: 'PLA-006', categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Pollo a la Plancha', descripcion: 'Papas fritas o ensalada, ensalada fresca.', precioVentaBase: 28.00, stockControl: false, orden: 6 },
  { id: 'PROD-PLA-007', codigo: 'PLA-007', categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Chuleta a la Parrilla', descripcion: '', precioVentaBase: 28.00, stockControl: false, orden: 7 },
  { id: 'PROD-PLA-008', codigo: 'PLA-008', categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Estofado de Pollo', descripcion: 'Acompañado de papas tiamanchadas y arroz.', precioVentaBase: 25.00, stockControl: false, orden: 8 },
  { id: 'PROD-PLA-009', codigo: 'PLA-009', categoriaId: 'CAT-PLATOS-PRINCIPALES', nombre: 'Guiso de Pollo', descripcion: 'Acompañado de Arroz.', precioVentaBase: 25.00, stockControl: false, orden: 9 },

  // ========== PIZZAS (Personal y Mediana) ==========
  { id: 'PROD-PIZ-001', codigo: 'PIZ-001', categoriaId: 'CAT-PIZZAS', nombre: 'Pizza Americana (Personal)', descripcion: 'aceituna inglesa y queso mozzarella.', precioVentaBase: 29.00, stockControl: false, orden: 1 },
  { id: 'PROD-PIZ-002', codigo: 'PIZ-002', categoriaId: 'CAT-PIZZAS', nombre: 'Pizza Americana (Mediana)', descripcion: 'aceituna inglesa y queso mozzarella.', precioVentaBase: 41.00, stockControl: false, orden: 2 },
  { id: 'PROD-PIZ-003', codigo: 'PIZ-003', categoriaId: 'CAT-PIZZAS', nombre: 'Pizza Hawaiana (Personal)', descripcion: 'aceituna inglesa, queso mozzarella, piña y pavo.', precioVentaBase: 30.00, stockControl: false, orden: 3 },
  { id: 'PROD-PIZ-004', codigo: 'PIZ-004', categoriaId: 'CAT-PIZZAS', nombre: 'Pizza Hawaiana (Mediana)', descripcion: 'aceituna inglesa, queso mozzarella, piña y pavo.', precioVentaBase: 42.00, stockControl: false, orden: 4 },
  { id: 'PROD-PIZ-005', codigo: 'PIZ-005', categoriaId: 'CAT-PIZZAS', nombre: 'Pizza de Pepperoni (Personal)', descripcion: 'aceituna inglesa, queso mozzarella y pepperoni.', precioVentaBase: 32.00, stockControl: false, orden: 5 },
  { id: 'PROD-PIZ-006', codigo: 'PIZ-006', categoriaId: 'CAT-PIZZAS', nombre: 'Pizza de Pepperoni (Mediana)', descripcion: 'aceituna inglesa, queso mozzarella y pepperoni.', precioVentaBase: 44.00, stockControl: false, orden: 6 },

  // ========== POSTRES ==========
  { id: 'PROD-POS-001', codigo: 'POS-001', categoriaId: 'CAT-POSTRES', nombre: 'Waffles', descripcion: 'Con frutas del bosque, miel y/o fudge de chocolate.', precioVentaBase: 15.00, stockControl: false, orden: 1 },
  { id: 'PROD-POS-002', codigo: 'POS-002', categoriaId: 'CAT-POSTRES', nombre: 'Crepe con Helados', descripcion: 'Fudge de chocolate, gragas, helados de estación.', precioVentaBase: 15.00, stockControl: false, orden: 2 },
  { id: 'PROD-POS-003', codigo: 'POS-003', categoriaId: 'CAT-POSTRES', nombre: 'Ensalada de Frutas', descripcion: 'Frutas de estación, miel y/o yogur.', precioVentaBase: 15.00, stockControl: false, orden: 3 },
  { id: 'PROD-POS-004', codigo: 'POS-004', categoriaId: 'CAT-POSTRES', nombre: 'Helados', descripcion: '', precioVentaBase: 7.00, stockControl: false, orden: 4 },
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
