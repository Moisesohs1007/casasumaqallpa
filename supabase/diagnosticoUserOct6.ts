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
} catch {}
const URL = process.env.VITE_SUPABASE_URL!;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!;
console.log('URL:', URL ? URL.slice(0, 30) + '...' : 'NO SET');
console.log('SR set:', !!SR);
const supabase = createClient(URL, SR);

(async () => {
  console.log('\n===== 1. HABITACIONES (estado actual Supabase) =====');
  const { data: habs, error: eHab } = await supabase.from('habitaciones').select('id,codigo,nombre,estado,estado_limpieza,tipo_habitacion_id,notas_internas,motivo_bloqueo,payload,updated_at');
  if (eHab) { console.error('ERROR habitaciones:', eHab.message, eHab.details); process.exit(1); }
  console.log('count:', habs?.length ?? 0);
  for (const h of habs || []) {
    console.log(`  - [${h.codigo}] ${h.nombre} | estado=${h.estado} | limpieza=${h.estado_limpieza} | updatedAt=${h.updated_at?.slice(0, 19)} | payload=${JSON.stringify(h.payload ?? {})}`);
  }

  console.log('\n===== 2. CATEGORIAS_FB =====');
  const { data: cats, error: eCat } = await supabase.from('categorias_fb').select('id,nombre,orden,estado,payload');
  if (eCat) { console.error('ERROR cats:', eCat.message); process.exit(1); }
  console.log('count:', cats?.length ?? 0);
  for (const c of cats || []) console.log(`  - [${(c.payload as any)?.codigo ?? 'NO-COD'}] ${c.nombre} orden=${c.orden} estado=${c.estado}`);

  console.log('\n===== 3. PRODUCTOS_FB (count x categoria + primeros 3) =====');
  const { data: prods, error: eProd } = await supabase.from('productos_fb').select('id,codigo,nombre,categoria_id,precio_venta_base,costo_aproximado,estado,payload');
  if (eProd) { console.error('ERROR prods:', eProd.message); process.exit(1); }
  console.log('TOTAL productos_fb count:', prods?.length ?? 0);
  const byCat: Record<string, number> = {};
  for (const p of prods || []) { byCat[p.categoria_id] = (byCat[p.categoria_id] || 0) + 1; }
  for (const c of cats || []) console.log(`  CAT ${c.nombre} → ${byCat[c.id] ?? 0} productos`);
  console.log('Primeros 3 prod payload sample:');
  for (const p of (prods || []).slice(0, 3)) {
    const pay = p.payload ?? {};
    console.log(`  - [${p.codigo}] ${p.nombre} precio=${p.precio_venta_base} UM=${pay.unidadMedida} stockCtrl=${pay.stockControl} stockActual=${pay.stockActual} stockMin=${pay.stockMinimo}`);
  }

  console.log('\n===== 4. TIPOS_HABITACION =====');
  const { data: tipos, error: eTip } = await supabase.from('tipos_habitacion').select('id,nombre,capacidad_adultos,capacidad_ninos,precio_base_noche');
  if (eTip) console.error('ERROR tipos:', eTip.message);
  for (const t of tipos || []) console.log(`  - TIPO [${t.nombre}] capA=${t.capacidad_adultos} capN=${t.capacidad_ninos} precio=${t.precio_base_noche}`);

  console.log('\n✅ Diagnóstico finalizado');
})().catch(e => { console.error(e); process.exit(1); });
