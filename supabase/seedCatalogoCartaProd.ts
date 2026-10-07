import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
      if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); process.env[m[1]] = v; }
    }
  }
} catch { /* ignore */ }

const URL = process.env.VITE_SUPABASE_URL!;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(URL, SR);

const impuestoIGV = async (): Promise<string | null> => {
  const { data } = await supabase.from('impuestos').select('id').eq('nombre', 'IGV 18%').limit(1);
  if (data && data[0]) return data[0].id;
  const { data: created } = await supabase.from('impuestos').insert({
    nombre: 'IGV 18%',
    tipo: 'PORCENTAJE',
    valor: 18,
    es_por_defecto: true,
    estado: 'ACTIVO',
  }).select('id').single();
  return created?.id ?? null;
};

const CATEGORIAS = [
  { codigo: 'CAT-CER', nombre: '🍺 Cervezas', orden: 1, color: '#ff9500', descripcion: 'Cervezas nacionales e importadas' },
  { codigo: 'CAT-GAS', nombre: '🥤 Gaseosas & Aguas', orden: 2, color: '#007aff', descripcion: 'Gaseosas, aguas minerales y jugos en botella' },
  { codigo: 'CAT-BCAL', nombre: '☕ Bebidas Calientes', orden: 3, color: '#8b4513', descripcion: 'Cafés, tés y chocolates calientes' },
  { codigo: 'CAT-BFRIAS', nombre: '🧃 Bebidas Frías Naturales', orden: 4, color: '#34c759', descripcion: 'Jugos naturales, limonadas y chicha' },
  { codigo: 'CAT-ENT', nombre: '🥗 Entradas', orden: 5, color: '#af52de', descripcion: 'Entradas frías y calientes' },
  { codigo: 'CAT-PP', nombre: '🍽️ Platos Principales', orden: 6, color: '#ff3b30', descripcion: 'Platos típicos peruanos y a la carta' },
  { codigo: 'CAT-POST', nombre: '🍰 Postres', orden: 7, color: '#ff2d55', descripcion: 'Postres criollos y tradicionales' },
  { codigo: 'CAT-SNACK', nombre: '🍿 Snacks & Aperitivos', orden: 8, color: '#ffcc00', descripcion: 'Aperitivos rápidos y snacks' },
];

type ProdSeed = {
  codigo: string;
  nombre: string;
  desc: string;
  categoriaCodigo: string;
  precio: number;
  costo: number;
  stockControl: boolean;
  stockMinimo?: number;
  um: string;
};

const PRODUCTOS: ProdSeed[] = [
  // CERVEZAS
  { codigo: 'CER-001', nombre: 'Cusqueña Dorada 620ml', desc: 'Cerveza Cusqueña Dorada botella retornable', categoriaCodigo: 'CAT-CER', precio: 18, costo: 9, stockControl: true, stockMinimo: 12, um: 'UND' },
  { codigo: 'CER-002', nombre: 'Cusqueña Trigo 620ml', desc: 'Cerveza Cusqueña de Trigo botella', categoriaCodigo: 'CAT-CER', precio: 18, costo: 9.5, stockControl: true, stockMinimo: 12, um: 'UND' },
  { codigo: 'CER-003', nombre: 'Cusqueña Negra 620ml', desc: 'Cerveza Cusqueña Negra oscura', categoriaCodigo: 'CAT-CER', precio: 18, costo: 9, stockControl: true, stockMinimo: 6, um: 'UND' },
  { codigo: 'CER-004', nombre: 'Pilsen Callao 620ml', desc: 'Cerveza Pilsen Callao botella', categoriaCodigo: 'CAT-CER', precio: 17, costo: 8.5, stockControl: true, stockMinimo: 12, um: 'UND' },
  { codigo: 'CER-005', nombre: 'Arequipeña Lager 620ml', desc: 'Cerveza Arequipeña Lager', categoriaCodigo: 'CAT-CER', precio: 17, costo: 8.5, stockControl: true, stockMinimo: 6, um: 'UND' },
  { codigo: 'CER-006', nombre: 'Corona Extra 355ml', desc: 'Cerveza importada Corona', categoriaCodigo: 'CAT-CER', precio: 20, costo: 12, stockControl: true, stockMinimo: 6, um: 'UND' },
  { codigo: 'CER-007', nombre: 'Brahma Malta 350ml', desc: 'Malta Brahma sin alcohol', categoriaCodigo: 'CAT-CER', precio: 9, costo: 4, stockControl: true, stockMinimo: 6, um: 'UND' },

  // GASEOSAS & AGUAS
  { codigo: 'GAS-001', nombre: 'Inca Kola 500ml', desc: 'Gaseosa Inca Kola personal', categoriaCodigo: 'CAT-GAS', precio: 6, costo: 2.5, stockControl: true, stockMinimo: 20, um: 'UND' },
  { codigo: 'GAS-002', nombre: 'Coca Cola 500ml', desc: 'Gaseosa Coca Cola personal', categoriaCodigo: 'CAT-GAS', precio: 6, costo: 2.5, stockControl: true, stockMinimo: 20, um: 'UND' },
  { codigo: 'GAS-003', nombre: 'Fanta Naranja 500ml', desc: 'Gaseosa Fanta Naranja personal', categoriaCodigo: 'CAT-GAS', precio: 6, costo: 2.5, stockControl: true, stockMinimo: 10, um: 'UND' },
  { codigo: 'GAS-004', nombre: 'Sprite Lima 500ml', desc: 'Gaseosa Sprite Lima personal', categoriaCodigo: 'CAT-GAS', precio: 6, costo: 2.5, stockControl: true, stockMinimo: 10, um: 'UND' },
  { codigo: 'GAS-005', nombre: 'Agua Mineral con Gas 500ml', desc: 'Agua San Luis con gas 500ml', categoriaCodigo: 'CAT-GAS', precio: 5, costo: 2, stockControl: true, stockMinimo: 24, um: 'UND' },
  { codigo: 'GAS-006', nombre: 'Agua Mineral sin Gas 500ml', desc: 'Agua San Luis sin gas 500ml', categoriaCodigo: 'CAT-GAS', precio: 5, costo: 2, stockControl: true, stockMinimo: 24, um: 'UND' },
  { codigo: 'GAS-007', nombre: 'Agua sin Gas 1.5L', desc: 'Agua San Luis 1.5 litros familiar', categoriaCodigo: 'CAT-GAS', precio: 8, costo: 3.5, stockControl: true, stockMinimo: 12, um: 'UND' },
  { codigo: 'GAS-008', nombre: 'Red Bull Energy 250ml', desc: 'Bebida energizante Red Bull', categoriaCodigo: 'CAT-GAS', precio: 18, costo: 10, stockControl: true, stockMinimo: 6, um: 'UND' },

  // BEBIDAS CALIENTES
  { codigo: 'BCAL-001', nombre: 'Café Americano', desc: 'Café solo 150ml', categoriaCodigo: 'CAT-BCAL', precio: 8, costo: 2, stockControl: false, um: 'UND' },
  { codigo: 'BCAL-002', nombre: 'Café con Leche', desc: 'Café con leche 200ml', categoriaCodigo: 'CAT-BCAL', precio: 10, costo: 3, stockControl: false, um: 'UND' },
  { codigo: 'BCAL-003', nombre: 'Café Cortado', desc: 'Café macchiato con leche', categoriaCodigo: 'CAT-BCAL', precio: 9, costo: 2.5, stockControl: false, um: 'UND' },
  { codigo: 'BCAL-004', nombre: 'Té de Muña', desc: 'Té de hierbas muña andina', categoriaCodigo: 'CAT-BCAL', precio: 7, costo: 1.5, stockControl: false, um: 'UND' },
  { codigo: 'BCAL-005', nombre: 'Té de Manzanilla', desc: 'Té de manzanilla relajante', categoriaCodigo: 'CAT-BCAL', precio: 7, costo: 1.5, stockControl: false, um: 'UND' },
  { codigo: 'BCAL-006', nombre: 'Té de Coca', desc: 'Mate de coca tradicional', categoriaCodigo: 'CAT-BCAL', precio: 8, costo: 2, stockControl: false, um: 'UND' },
  { codigo: 'BCAL-007', nombre: 'Chocolate Caliente', desc: 'Chocolate caliente con leche 200ml', categoriaCodigo: 'CAT-BCAL', precio: 12, costo: 4, stockControl: false, um: 'UND' },
  { codigo: 'BCAL-008', nombre: 'Mate de Té Clásico', desc: 'Mate cocido con leche opcional', categoriaCodigo: 'CAT-BCAL', precio: 7, costo: 1.5, stockControl: false, um: 'UND' },

  // BEBIDAS FRÍAS NATURALES
  { codigo: 'BFRIA-001', nombre: 'Jugo de Naranja Natural 400ml', desc: 'Jugo de naranja recién exprimido', categoriaCodigo: 'CAT-BFRIAS', precio: 12, costo: 4, stockControl: false, um: 'UND' },
  { codigo: 'BFRIA-002', nombre: 'Jugo de Maracuyá 400ml', desc: 'Jugo de maracuyá natural', categoriaCodigo: 'CAT-BFRIAS', precio: 14, costo: 4.5, stockControl: false, um: 'UND' },
  { codigo: 'BFRIA-003', nombre: 'Limonada Frozen', desc: 'Limonada con hielo triturado y menta', categoriaCodigo: 'CAT-BFRIAS', precio: 12, costo: 3, stockControl: false, um: 'UND' },
  { codigo: 'BFRIA-004', nombre: 'Chicha Morada 500ml', desc: 'Chicha morada con piura y dulce', categoriaCodigo: 'CAT-BFRIAS', precio: 10, costo: 3, stockControl: false, um: 'UND' },
  { codigo: 'BFRIA-005', nombre: 'Emoliente 500ml', desc: 'Emoliente con hierbas y miel', categoriaCodigo: 'CAT-BFRIAS', precio: 10, costo: 2.5, stockControl: false, um: 'UND' },
  { codigo: 'BFRIA-006', nombre: 'Jugo de Tumbo 400ml', desc: 'Jugo de tumbo natural', categoriaCodigo: 'CAT-BFRIAS', precio: 14, costo: 4.5, stockControl: false, um: 'UND' },
  { codigo: 'BFRIA-007', nombre: 'Avena con Frutas 400ml', desc: 'Avena licuada con fruta y leche', categoriaCodigo: 'CAT-BFRIAS', precio: 14, costo: 4, stockControl: false, um: 'UND' },

  // ENTRADAS
  { codigo: 'ENT-001', nombre: 'Papa a la Huancaína', desc: 'Papa amarilla con salsa huancaína, queso, huevo y aceituna', categoriaCodigo: 'CAT-ENT', precio: 22, costo: 7, stockControl: false, um: 'UND' },
  { codigo: 'ENT-002', nombre: 'Causa Limeña de Pollo', desc: 'Causa rellena de pollo y palta', categoriaCodigo: 'CAT-ENT', precio: 26, costo: 9, stockControl: false, um: 'UND' },
  { codigo: 'ENT-003', nombre: 'Causa de Atún', desc: 'Causa rellena de atún y mayonesa', categoriaCodigo: 'CAT-ENT', precio: 25, costo: 8.5, stockControl: false, um: 'UND' },
  { codigo: 'ENT-004', nombre: 'Ceviche de Corvina (Porción)', desc: 'Ceviche de pescado fresco porción entrada', categoriaCodigo: 'CAT-ENT', precio: 32, costo: 14, stockControl: false, um: 'UND' },
  { codigo: 'ENT-005', nombre: 'Chicharrón de Calamar', desc: 'Calamares apanados fritos con crema de rocoto', categoriaCodigo: 'CAT-ENT', precio: 30, costo: 12, stockControl: false, um: 'UND' },
  { codigo: 'ENT-006', nombre: 'Anticuchos de Corazón x2', desc: '2 brochetas de anticucho con papa y choclo', categoriaCodigo: 'CAT-ENT', precio: 24, costo: 8, stockControl: false, um: 'UND' },
  { codigo: 'ENT-007', nombre: 'Tequeños de Queso x4', desc: 'Rollitos empanizados de queso fresco', categoriaCodigo: 'CAT-ENT', precio: 20, costo: 6, stockControl: false, um: 'UND' },
  { codigo: 'ENT-008', nombre: 'Sopa del Día', desc: 'Entrada de sopa casera del día (crema o caldo)', categoriaCodigo: 'CAT-ENT', precio: 14, costo: 4, stockControl: false, um: 'UND' },

  // PLATOS PRINCIPALES
  { codigo: 'PP-001', nombre: 'Lomo Saltado', desc: 'Salteado de lomo fino con cebolla, tomate, papas fritas y arroz', categoriaCodigo: 'CAT-PP', precio: 48, costo: 18, stockControl: false, um: 'UND' },
  { codigo: 'PP-002', nombre: 'Aji de Gallina', desc: 'Pollo deshilachado en salsa de ají amarillo, arroz y papa', categoriaCodigo: 'CAT-PP', precio: 38, costo: 12, stockControl: false, um: 'UND' },
  { codigo: 'PP-003', nombre: 'Ceviche Mixto (plato)', desc: 'Pescado fresco, camarones, conchas y calamares', categoriaCodigo: 'CAT-PP', precio: 52, costo: 24, stockControl: false, um: 'UND' },
  { codigo: 'PP-004', nombre: 'Seco de Cabrito', desc: 'Cabrito estofado con chicha de jora, frijoles y arroz', categoriaCodigo: 'CAT-PP', precio: 58, costo: 22, stockControl: false, um: 'UND' },
  { codigo: 'PP-005', nombre: 'Seco de Cordero', desc: 'Estofado de cordero con hierbas andinas', categoriaCodigo: 'CAT-PP', precio: 62, costo: 26, stockControl: false, um: 'UND' },
  { codigo: 'PP-006', nombre: 'Trucha Frita a la Plancha', desc: 'Trucha fresca de la región entera, arroz y ensalada', categoriaCodigo: 'CAT-PP', precio: 42, costo: 14, stockControl: false, um: 'UND' },
  { codigo: 'PP-007', nombre: 'Trucha Sudada', desc: 'Trucha cocida con tomate, cebolla, ajo y culantro', categoriaCodigo: 'CAT-PP', precio: 40, costo: 13, stockControl: false, um: 'UND' },
  { codigo: 'PP-008', nombre: 'Pollo a la Brasa 1/4', desc: 'Cuarto de pollo al espeto con papas fritas y ensalada', categoriaCodigo: 'CAT-PP', precio: 32, costo: 10, stockControl: false, um: 'UND' },
  { codigo: 'PP-009', nombre: 'Pollo a la Brasa 1/2', desc: 'Medio pollo al espeto con papas y ensalada', categoriaCodigo: 'CAT-PP', precio: 55, costo: 18, stockControl: false, um: 'UND' },
  { codigo: 'PP-010', nombre: 'Parrillada Mixta (2 personas)', desc: 'Lomo, pollo, chorizo, anticucho, molleja, papas y ensalada', categoriaCodigo: 'CAT-PP', precio: 95, costo: 38, stockControl: false, um: 'UND' },
  { codigo: 'PP-011', nombre: 'Cuy Chactado', desc: 'Cuy frito a la piedra, papas y ensalada típico andino', categoriaCodigo: 'CAT-PP', precio: 65, costo: 24, stockControl: false, um: 'UND' },
  { codigo: 'PP-012', nombre: 'Sopa de Quinua con Pollo', desc: 'Sopa nutritiva de quinua con verduras y pollo', categoriaCodigo: 'CAT-PP', precio: 30, costo: 9, stockControl: false, um: 'UND' },
  { codigo: 'PP-013', nombre: 'Olluquito con Charqui', desc: 'Guiso de olluco con charqui y arroz típico', categoriaCodigo: 'CAT-PP', precio: 38, costo: 12, stockControl: false, um: 'UND' },
  { codigo: 'PP-014', nombre: 'Picante de Cuy', desc: 'Cuy estofado picante con maní y ají', categoriaCodigo: 'CAT-PP', precio: 60, costo: 22, stockControl: false, um: 'UND' },
  { codigo: 'PP-015', nombre: 'Hamburguesa de Res Completa', desc: 'Carne res 180g, papas fritas y ensalada', categoriaCodigo: 'CAT-PP', precio: 32, costo: 11, stockControl: false, um: 'UND' },
  { codigo: 'PP-016', nombre: 'Sandwich de Lomo Lomito', desc: 'Pan francés, lomo saltado, huevo, palta y papas', categoriaCodigo: 'CAT-PP', precio: 36, costo: 13, stockControl: false, um: 'UND' },

  // POSTRES
  { codigo: 'POST-001', nombre: 'Suspiro a la Limeña', desc: 'Merengue con dulce de leche almíbar de oporto', categoriaCodigo: 'CAT-POST', precio: 16, costo: 5, stockControl: false, um: 'UND' },
  { codigo: 'POST-002', nombre: 'Mazamorra Morada', desc: 'Mazamorra de maíz morado con chancaca', categoriaCodigo: 'CAT-POST', precio: 12, costo: 3.5, stockControl: false, um: 'UND' },
  { codigo: 'POST-003', nombre: 'Arroz con Leche', desc: 'Arroz con leche, canela y pasas', categoriaCodigo: 'CAT-POST', precio: 12, costo: 3, stockControl: false, um: 'UND' },
  { codigo: 'POST-004', nombre: 'Crema Volteada', desc: 'Flan de caramelo peruano', categoriaCodigo: 'CAT-POST', precio: 14, costo: 4, stockControl: false, um: 'UND' },
  { codigo: 'POST-005', nombre: 'Picarones x3', desc: 'Buñuelos de zapallo con miel de chancaca', categoriaCodigo: 'CAT-POST', precio: 16, costo: 4, stockControl: false, um: 'UND' },
  { codigo: 'POST-006', nombre: 'Helado 3 Sabores', desc: 'Copa de helado de vainilla, chocolate y fresa', categoriaCodigo: 'CAT-POST', precio: 14, costo: 5, stockControl: false, um: 'UND' },
  { codigo: 'POST-007', nombre: 'Queso Helado', desc: 'Postre típico de queso helado tradicional', categoriaCodigo: 'CAT-POST', precio: 12, costo: 3.5, stockControl: false, um: 'UND' },
  { codigo: 'POST-008', nombre: 'Tarta de Manzana', desc: 'Porción tarta de manzana caliente con helado opcional', categoriaCodigo: 'CAT-POST', precio: 15, costo: 5, stockControl: false, um: 'UND' },

  // SNACKS
  { codigo: 'SNK-001', nombre: 'Canchita Serrana', desc: 'Maíz canchita frita con sal', categoriaCodigo: 'CAT-SNACK', precio: 6, costo: 1.5, stockControl: false, um: 'UND' },
  { codigo: 'SNK-002', nombre: 'Chifles de Plátano', desc: 'Frituras de plátano verde', categoriaCodigo: 'CAT-SNACK', precio: 7, costo: 2, stockControl: false, um: 'UND' },
  { codigo: 'SNK-003', nombre: 'Galletas Variadas x3', desc: 'Pack de galletas surtidas', categoriaCodigo: 'CAT-SNACK', precio: 6, costo: 2, stockControl: true, stockMinimo: 10, um: 'UND' },
  { codigo: 'SNK-004', nombre: 'Chocolate Sublime 30g', desc: 'Chocolate Sublime clásico', categoriaCodigo: 'CAT-SNACK', precio: 5, costo: 2.5, stockControl: true, stockMinimo: 15, um: 'UND' },
  { codigo: 'SNK-005', nombre: "Papas Fritas Lay's Clásicas", desc: 'Bolsa individual papas fritas', categoriaCodigo: 'CAT-SNACK', precio: 6, costo: 3, stockControl: true, stockMinimo: 10, um: 'UND' },
  { codigo: 'SNK-006', nombre: 'Bono Galleta Rellena', desc: 'Galleta bono rellena de chocolate', categoriaCodigo: 'CAT-SNACK', precio: 4, costo: 1.8, stockControl: true, stockMinimo: 10, um: 'UND' },
  { codigo: 'SNK-007', nombre: 'Piqueo Mixto para 2', desc: 'Chifles, canchita, salchicha, chorizo, queso frito y cremas', categoriaCodigo: 'CAT-SNACK', precio: 38, costo: 12, stockControl: false, um: 'UND' },
  { codigo: 'SNK-008', nombre: 'Golosinas Infantiles x3', desc: 'Chocolates, golosinas para niños', categoriaCodigo: 'CAT-SNACK', precio: 8, costo: 3, stockControl: true, stockMinimo: 8, um: 'UND' },
];

(async () => {
  console.log('🔗 Conectando Supabase...');
  const igvId = await impuestoIGV();
  console.log('✅ IGV id:', igvId);

  const { data: existCat } = await supabase.from('categorias_fb').select('id,nombre,codigo');
  const existCodigos = new Set((existCat ?? []).map((c: any) => c.codigo));
  const catIdPorCodigo: Record<string, string> = {};

  console.log('📝 Insertando categorías (existentes:', existCodigos.size, '/ total:', CATEGORIAS.length, ')');
  for (const c of CATEGORIAS) {
    if (existCodigos.has(c.codigo)) {
      const hit = (existCat as any[]).find((e: any) => e.codigo === c.codigo)!;
      catIdPorCodigo[c.codigo] = hit.id;
      continue;
    }
    const { data, error } = await supabase.from('categorias_fb').insert({
      nombre: c.nombre,
      orden: c.orden,
      descripcion: c.descripcion,
      estado: 'ACTIVO',
      payload: { codigo: c.codigo, colorEtiqueta: c.color },
      created_at: new Date().toISOString(),
    }).select('id').single();
    if (error) { console.error('❌ CAT error', c.nombre, error.message); continue; }
    catIdPorCodigo[c.codigo] = data!.id;
    console.log(' + Categoría insertada:', c.nombre);
  }

  const { data: existProd } = await supabase.from('productos_fb').select('id,codigo');
  const existProdCodigos = new Set((existProd ?? []).map((p: any) => p.codigo));
  console.log('📝 Insertando productos (existentes:', existProdCodigos.size, '/ total:', PRODUCTOS.length, ')');
  let inserted = 0, skipped = 0;
  for (const p of PRODUCTOS) {
    if (existProdCodigos.has(p.codigo)) { skipped++; continue; }
    const categoriaId = catIdPorCodigo[p.categoriaCodigo];
    if (!categoriaId) { console.warn('⚠️ sin categoría', p.codigo); continue; }
    const payload: any = {
      unidadMedida: p.um,
      stockControl: p.stockControl,
      stockActual: 0,
      stockMinimo: p.stockMinimo ?? 0,
      orden: 0,
      imagenUrl: null,
      observaciones: p.desc,
    };
    const insert: any = {
      categoria_id: categoriaId,
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.desc,
      precio_venta_base: p.precio,
      costo_aproximado: p.costo,
      moneda: 'PEN',
      estado: 'ACTIVO',
      presentaciones_activas_ids: [],
      modificadores_ids: [],
      alergenos_ids: [],
      impuestos_ids: igvId ? [igvId] : [],
      estaciones_cocina_ids: [],
      payload,
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('productos_fb').insert(insert);
    if (error) { console.error('❌ PROD error', p.codigo, p.nombre, error.message); continue; }
    inserted++;
  }
  console.log(`✅ Finalizado: insertados ${inserted} / skip ${skipped} existentes. Stock bebidas embotelladas = 0, stockMinimo establecido.`);
})().catch(e => { console.error(e); process.exit(1); });
