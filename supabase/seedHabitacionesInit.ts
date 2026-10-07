// ============================================================
// SCRIPT AUTOMATIZADO - SEMILLA HABITACIONES EN SUPABASE CLOUD
// ------------------------------------------------------------
// RAZÓN: Por defecto, InMemoryDB se inicializa con seed LOCAL
// cada vez que carga la página. Si Supabase está VACÍO, los
// cambios de estado (MANTENIMIENTO→LIBRE) no persisten al F5.
//
// EJECUCIÓN (0 popups):
//   node ./node_modules/tsx/dist/cli.mjs supabase/seedHabitacionesInit.ts
//
// QUÉ HACE:
//   1. Conecta a Supabase con service_role.
//   2. Verifica tablas: tipos_habitacion, habitaciones, tarifas, politicas_cancelacion.
//   3. Si tabla está VACÍA → INSERT datos reales del lodge.
//   4. Si NO está vacía → UPSERT por ID (actualiza datos base SIN pisa estado
//      de habitaciones del usuario, pisa solo campos fijos: código, tipo, ubicación).
// ============================================================
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env');
function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(ENV_PATH)) return out;
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  content.split(/\r?\n/).forEach((ln) => {
    const i = ln.indexOf('=');
    if (i === -1 || ln.trim().startsWith('#')) return;
    const k = ln.slice(0, i).trim();
    let v = ln.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
    out[k] = v;
  });
  return out;
}
const env = loadEnv();
const SB_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SB_SERVICE = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_SERVICE) {
  console.error('[ERROR] Faltan VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}
const sb = createClient(SB_URL, SB_SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const nowISO = () => new Date().toISOString();

// -------- DATOS REALES DEL LODGE - COLUMNAS QUE EXISTEN EN SCHEMA VERDADERO --------
const TIPOS_HAB: any[] = [
  { id: 'TIPO-DOBLE-P2', nombre: 'Habitación Doble Piso 2', descripcion: 'Habitación doble en 2do piso', capacidad_adultos: 2, capacidad_ninos: 1, precio_base_noche: 180, estado: 'ACTIVO', camas: [{ tipo: 'DOBLE', cantidad: 1 }], servicios: ['WIFI','AGUA_CALIENTE','DESAYUNO_OPC'], fotos: [], created_at: nowISO(), updated_at: nowISO(), created_by: 'system-seed', updated_by: 'system-seed' },
  { id: 'TIPO-SUITE',    nombre: 'Suite',                     descripcion: 'Suite principal con sala',       capacidad_adultos: 2, capacidad_ninos: 2, precio_base_noche: 380, estado: 'ACTIVO', camas: [{ tipo: 'KING', cantidad: 1 }], servicios: ['WIFI','AGUA_CALIENTE','TV_CABLE','MINIBAR'], fotos: [], created_at: nowISO(), updated_at: nowISO(), created_by: 'system-seed', updated_by: 'system-seed' },
  { id: 'TIPO-CABANA',   nombre: 'Cabaña',                    descripcion: 'Cabaña independiente rústico',   capacidad_adultos: 2, capacidad_ninos: 0, precio_base_noche: 260, estado: 'ACTIVO', camas: [{ tipo: 'QUEEN', cantidad: 1 }], servicios: ['WIFI','AGUA_CALIENTE'], fotos: [], created_at: nowISO(), updated_at: nowISO(), created_by: 'system-seed', updated_by: 'system-seed' },
];
const HAB_HABS: any[] = [
  { id: 'HAB-H201', codigo: 'H201', nombre: 'Habitación 201', tipo_habitacion_id: 'TIPO-DOBLE-P2', piso: '2', ubicacion: 'Piso 2 · Frente',  estado: 'LIBRE', estado_limpieza: 'LIMPIA', vista_efectiva: 'VISTA_CALLE',       motivo_bloqueo: null, notas_internas: null, created_at: nowISO(), updated_at: nowISO(), created_by: 'system-seed', updated_by: 'system-seed' },
  { id: 'HAB-H202', codigo: 'H202', nombre: 'Habitación 202', tipo_habitacion_id: 'TIPO-DOBLE-P2', piso: '2', ubicacion: 'Piso 2 · Interior',estado: 'LIBRE', estado_limpieza: 'LIMPIA', vista_efectiva: 'INTERIOR',          motivo_bloqueo: null, notas_internas: null, created_at: nowISO(), updated_at: nowISO(), created_by: 'system-seed', updated_by: 'system-seed' },
  { id: 'HAB-H203', codigo: 'H203', nombre: 'Habitación 203', tipo_habitacion_id: 'TIPO-DOBLE-P2', piso: '2', ubicacion: 'Piso 2 · Fondo',   estado: 'LIBRE', estado_limpieza: 'LIMPIA', vista_efectiva: 'VISTA_JARDIN',      motivo_bloqueo: null, notas_internas: null, created_at: nowISO(), updated_at: nowISO(), created_by: 'system-seed', updated_by: 'system-seed' },
  { id: 'HAB-SUITE',codigo: 'SUITE',nombre: 'Suite Principal',tipo_habitacion_id: 'TIPO-SUITE',    piso: '3', ubicacion: 'Piso 3',          estado: 'LIBRE', estado_limpieza: 'LIMPIA', vista_efectiva: 'VISTA_PANORAMICA',  motivo_bloqueo: null, notas_internas: null, created_at: nowISO(), updated_at: nowISO(), created_by: 'system-seed', updated_by: 'system-seed' },
  { id: 'HAB-CABANA',codigo:'CABAÑA',nombre:'Cabaña Independiente',tipo_habitacion_id:'TIPO-CABANA',piso:'1',ubicacion:'Jardín trasero',    estado: 'LIBRE', estado_limpieza: 'LIMPIA', vista_efectiva: 'VISTA_JARDIN',      motivo_bloqueo: null, notas_internas: null, created_at: nowISO(), updated_at: nowISO(), created_by: 'system-seed', updated_by: 'system-seed' },
];
const POL_CANC: any[] = [
  { id: 'POL-GENERAL', nombre: 'Política General', plazo_horas_cancelacion_gratis: 72, multa_porcentaje_cancelacion_tardia: 50, multa_porcentaje_no_show: 100, multa_fija_no_show: null, moneda_multa_fija: 'PEN', permite_cambiar_fechas: true, limite_cambios_fechas: 1, estado: 'ACTIVO', created_at: nowISO(), updated_at: nowISO(), created_by: 'system-seed', updated_by: 'system-seed' },
];
const TARIFAS: any[] = [
  { id: 'TAR-DOBLE-GEN', nombre: 'Tarifa Hab Doble', tipo_habitacion_id: 'TIPO-DOBLE-P2', politica_cancelacion_id: 'POL-GENERAL', moneda: 'PEN', regimen: 'SOLO_ALOJAMIENTO', precio_base_por_noche: 180, estado: 'ACTIVO', created_at: nowISO(), updated_at: nowISO(), created_by: 'system-seed', updated_by: 'system-seed' },
  { id: 'TAR-SUITE-GEN', nombre: 'Tarifa Suite',    tipo_habitacion_id: 'TIPO-SUITE',    politica_cancelacion_id: 'POL-GENERAL', moneda: 'PEN', regimen: 'SOLO_ALOJAMIENTO', precio_base_por_noche: 380, estado: 'ACTIVO', created_at: nowISO(), updated_at: nowISO(), created_by: 'system-seed', updated_by: 'system-seed' },
  { id: 'TAR-CAB-GEN',   nombre: 'Tarifa Cabaña',   tipo_habitacion_id: 'TIPO-CABANA',   politica_cancelacion_id: 'POL-GENERAL', moneda: 'PEN', regimen: 'SOLO_ALOJAMIENTO', precio_base_por_noche: 260, estado: 'ACTIVO', created_at: nowISO(), updated_at: nowISO(), created_by: 'system-seed', updated_by: 'system-seed' },
];

async function upsertTable<T extends { id: string }>(table: string, rows: T[], label: string) {
  console.log(`\n[${label}] Verificando tabla ${table}...`);
  const { count, error: e1 } = await sb.from(table).select('*', { count: 'exact', head: true });
  if (e1) { console.error(`  ERROR count ${table}:`, e1.message); process.exit(2); }
  const vacia = !count;
  console.log(`  → ${count ?? 0} fila(s). ${vacia ? 'INSERT inicial...' : 'UPSERT por id (preserva estado hab user)...'}`);

  if (vacia) {
    const { error } = await sb.from(table).insert(rows);
    if (error) { console.error(`  ERROR insert ${table}:`, error.message); process.exit(3); }
    console.log(`  OK insert ${rows.length} filas.`);
  } else {
    let rowsMerge: T[] = rows;
    if (table === 'habitaciones') {
      const ids = rows.map((r: any) => r.id);
      const { data: existentes, error: eExist } = await sb.from(table).select('*').in('id', ids);
      if (eExist) { console.error(`  ERROR fetch existentes ${table}:`, eExist.message); process.exit(4); }
      const map = new Map((existentes || []).map((x: any) => [x.id, x]));
      rowsMerge = rows.map((r: any) => {
        const old = map.get(r.id);
        return {
          ...r,
          estado: old?.estado ?? r.estado,
          estado_limpieza: old?.estado_limpieza ?? r.estado_limpieza,
          motivo_bloqueo: old?.motivo_bloqueo ?? r.motivo_bloqueo,
          bloqueada_hasta: old?.bloqueada_hasta ?? r.bloqueada_hasta ?? null,
          ultima_limpieza_at: old?.ultima_limpieza_at ?? r.ultima_limpieza_at ?? null,
          notas_internas: old?.notas_internas ?? r.notas_internas,
          updated_at: old?.updated_at ?? r.updated_at,
          updated_by: old?.updated_by ?? r.updated_by,
        } as T;
      });
    }
    const { error } = await sb.from(table).upsert(rowsMerge, { onConflict: 'id', ignoreDuplicates: false });
    if (error) { console.error(`  ERROR upsert ${table}:`, error.message); process.exit(5); }
    console.log(`  OK upsert ${rowsMerge.length} filas.`);
  }
}

async function main() {
  console.log('========================================================');
  console.log('SCRIPT: seedHabitacionesInit.ts · Upsert datos reales lodge Supabase');
  console.log('========================================================');
  await upsertTable('tipos_habitacion', TIPOS_HAB, '1/4');
  await upsertTable('politicas_cancelacion', POL_CANC, '2/4');
  await upsertTable('tarifas', TARIFAS, '3/4');
  await upsertTable('habitaciones', HAB_HABS, '4/4');

  // Verificación final
  console.log('\n📋 VERIFICACIÓN FINAL:');
  const [t1, t2, t3, t4] = await Promise.all([
    sb.from('tipos_habitacion').select('id, nombre, precio_base_noche').order('precio_base_noche'),
    sb.from('habitaciones').select('id, codigo, estado, tipo_habitacion_id, estado_limpieza, motivo_bloqueo').order('codigo'),
    sb.from('tarifas').select('id, tipo_habitacion_id, precio_base_por_noche'),
    sb.from('politicas_cancelacion').select('id, nombre'),
  ]);
  console.log('  - Tipos habitación:', (t1.data || []).length, (t1.data || []).map((x: any) => `${x.nombre}=S/${x.precio_base_noche}`).join(' | '));
  console.log('  - Habitaciones:', (t2.data || []).length);
  (t2.data || []).forEach((h: any) => {
    const badge = h.estado === 'MANTENIMIENTO' ? ` [MANT: ${h.motivo_bloqueo || '—'}]` : '';
    console.log(`     · ${h.codigo} → ${h.estado} (limp: ${h.estado_limpieza})${badge}`);
  });
  console.log('  - Tarifas:', (t3.data || []).length, (t3.data || []).map((x: any) => `${x.id}=S/${x.precio_base_por_noche}`).join(' | '));
  console.log('  - Políticas cancelación:', (t4.data || []).map((p: any) => p.nombre).join(', '));
  console.log('\n✅ FIN. Datos semilla aplicados a Supabase Cloud. Ahora la UI persiste estados al F5.');
  process.exit(0);
}

main().catch((e) => {
  console.error('[FATAL] Excepción:', e);
  process.exit(99);
});
