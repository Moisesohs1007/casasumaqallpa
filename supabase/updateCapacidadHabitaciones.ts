/**
 * updateCapacidadHabitaciones.ts
 *
 * Actualiza capacidadMaximaPax en las 5 habitaciones reales via SDK service_role.
 * El SDK usa HABITACIONES_WHITELIST: las columnas que NO existen (capacidad_max_pax,
 * capacidad_personas, capacidad_actual_usada) se guardan automáticamente en el
 * JSONB payload, y normalizeRow los expande al nivel superior al leer.
 *
 * Ejecutar: node ./node_modules/tsx/dist/cli.mjs supabase/updateCapacidadHabitaciones.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ENV_PATH = path.join(process.cwd(), '.env');
function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const content = fs.readFileSync(ENV_PATH, 'utf8');
    content.split(/\r?\n/).forEach((ln) => {
      const i = ln.indexOf('=');
      if (i <= 0 || ln.trim().startsWith('#')) return;
      const k = ln.slice(0, i).trim();
      const v = ln.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      out[k] = v;
    });
  } catch (e: any) {
    console.error('[WARN] No se pudo leer .env:', e?.message || e);
  }
  return out;
}

const env = loadEnv();
const SB_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://yuoftlckoctrkkfajaii.supabase.co';
const SB_SERVICE = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_SERVICE) {
  console.error('[ERROR] Faltan VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const PATCHES: Array<{ codigo: string; capacidadMaximaPax: number; capacidadPersonas: number; capacidadActualUsada: number; }> = [
  { codigo: 'H201',   capacidadMaximaPax: 2, capacidadPersonas: 2, capacidadActualUsada: 0 },
  { codigo: 'H202',   capacidadMaximaPax: 2, capacidadPersonas: 2, capacidadActualUsada: 0 },
  { codigo: 'H203',   capacidadMaximaPax: 2, capacidadPersonas: 2, capacidadActualUsada: 0 },
  { codigo: 'SUITE',  capacidadMaximaPax: 3, capacidadPersonas: 3, capacidadActualUsada: 0 },
  { codigo: 'CABAÑA', capacidadMaximaPax: 2, capacidadPersonas: 2, capacidadActualUsada: 0 },
];

const toSnake = (o: any) => {
  const out: any = {};
  for (const k of Object.keys(o || {})) {
    const sk = k.replace(/[A-Z]/g, (m, i) => (i > 0 ? '_' : '') + m.toLowerCase());
    out[sk] = (o as any)[k];
  }
  return out;
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log(`\n🔗 Conectando a Supabase: ${SB_URL}\n`);

  console.log('🔍 Estado ANTES:');
  const { data: antes } = await supabase
    .from('habitaciones')
    .select('id, codigo, nombre, estado, payload')
    .order('codigo', { ascending: true });
  for (const h of antes || []) {
    const p = (h as any).payload || {};
    const cap = p.capacidad_max_pax ?? p.capacidadMaximaPax ?? p.capacidad_personas ?? p.capacidadPersonas ?? 'null';
    console.log(`   ${String((h as any).codigo).padEnd(7)} | estado=${String((h as any).estado).padEnd(13)} | cap_max_pax=${cap} ${typeof cap === 'number' ? '(guardado en payload)' : ''}`);
  }
  console.log('');

  for (const patch of PATCHES) {
    console.log(`⬆️  ${patch.codigo} → cap_max_pax=${patch.capacidadMaximaPax}...`);

    // 1) Leer payload actual para mergear (no perder campos ya guardados)
    const { data: actual } = await supabase.from('habitaciones').select('id, payload').eq('codigo', patch.codigo).maybeSingle() as any;
    const payloadBase = (actual && actual.payload && typeof actual.payload === 'object' && !Array.isArray(actual.payload)) ? actual.payload : {};

    // 2) Build patch: campos snake_case. Las que no están en whitelist van a payload.
    //    Como el cliente REST no conoce el whitelist (solo lo conoce el __supabase_db__ frontend),
    //    construimos el payload manualmente y enviamos payload mergeado + los campos en nivel
    //    superior si fallan; para simplificar, lo guardamos TODO en payload JSONB directamente.
    const mergedPayload = {
      ...payloadBase,
      ...toSnake(patch),
      updated_at: new Date().toISOString(),
      updated_by: 'system-capacidad',
    };
    const updateData: any = { payload: mergedPayload, updated_at: new Date().toISOString(), updated_by: 'system-capacidad' };

    const { error } = await supabase.from('habitaciones').update(updateData).eq('codigo', patch.codigo);
    if (error) console.error(`   ❌ ${patch.codigo} ERROR: ${JSON.stringify(error)}`);
    else console.log(`   ✅ ${patch.codigo} OK (payload.capacidad_max_pax=${(mergedPayload as any).capacidad_max_pax})`);
    await sleep(200);
  }

  console.log('\n🔍 Estado DESPUÉS:');
  const { data: despues } = await supabase
    .from('habitaciones')
    .select('codigo, estado, payload')
    .order('codigo', { ascending: true });
  for (const h of despues || []) {
    const p = (h as any).payload || {};
    const cap = p.capacidad_max_pax ?? p.capacidadMaximaPax ?? p.capacidad_personas ?? p.capacidadPersonas ?? 'null';
    console.log(`   ${String((h as any).codigo).padEnd(7)} | estado=${String((h as any).estado).padEnd(13)} | cap_max_pax=${cap} ✅ (payload JSONB)`);
  }
  console.log('\n✅ Finalizó actualización capacidad habitaciones (guardado en payload JSONB + merge con campos existentes).\n');
}

main().catch((e) => { console.error('💥 Excepción main:', e); process.exit(1); });
