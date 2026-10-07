// ============================================================
// SCRIPT - FIX DIRECTO EN SUPABASE CLOUD (service_role)
// ------------------------------------------------------------
// ACCIONES:
//  1. UPDATE habitaciones SET estado = 'LIBRE' para CABAÑA/H201/H202/H203/SUITE.
//     Antes: CABAÑA estaba en MANTENIMIENTO.
//  2. Listar todas las reservas en BD remota (para verificar si la que el usuario creó existe).
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
const sb = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  // ==================== 1) UPDATE habitaciones ====================
  const cods = ['H201','H202','H203','SUITE','CABAÑA'];
  console.log(`[1/2] UPDATE habitaciones SET estado='LIBRE', estado_limpieza='LIMPIA', motivo_bloqueo=NULL WHERE codigo IN (${cods.join(', ')}) ...`);
  const { error: eH } = await sb
    .from('habitaciones')
    .update({
      estado: 'LIBRE',
      estado_limpieza: 'LIMPIA',
      motivo_bloqueo: null,
      bloqueada_hasta: null,
      updated_at: new Date().toISOString(),
      updated_by: 'system-script-fix',
    })
    .in('codigo', cods);
  if (eH) { console.error(' ERROR UPDATE hab:', eH.message); process.exit(2); }
  console.log(' OK.');

  const { data: habs, error: eL } = await sb
    .from('habitaciones')
    .select('id, codigo, tipo_habitacion_id, estado, estado_limpieza, motivo_bloqueo')
    .order('codigo');
  if (eL) { console.error(' ERROR listado habs:', eL.message); process.exit(3); }
  console.log('\n📋 Estado actual habitaciones en SUPABASE CLOUD:');
  (habs || []).forEach((h: any) => {
    console.log(` · ${h.codigo} → ${h.estado} (${h.estado_limpieza})${h.motivo_bloqueo ? ' [motivo: ' + h.motivo_bloqueo + ']' : ''}`);
  });

  // ==================== 2) Verificar reservas en nube ====================
  console.log('\n[2/2] Verificando reservas existentes en SUPABASE CLOUD...');
  const { data: reservas, error: eR } = await sb
    .from('reservas')
    .select('id, codigo_reserva, estado, fecha_checkin, fecha_checkout, total_noches, monto_total_reserva, huesped, created_at')
    .order('created_at', { ascending: false });
  if (eR) { console.error(' ERROR listado reservas:', eR.message); process.exit(4); }
  if (!reservas || reservas.length === 0) {
    console.log('⚠️  NO HAY reservas en la nube. Cualquier reserva creada solo existió en RAM local y se perdió al cerrar. (se arregla en deploy: ReservaService dual-write + hidratación)');
  } else {
    console.log(`✅ ${reservas.length} reserva(s) encontrada(s) en SUPABASE CLOUD:`);
    reservas.forEach((r: any) => {
      const huesp = (r.huesped && (r.huesped.nombres || r.huesped.nombre_completo)) ? `${r.huesped.nombres || ''} ${r.huesped.apellidos || ''}${r.huesped.nombre_completo || ''}` : '—';
      console.log(`   · ${r.codigo_reserva} | ${r.estado} | ${(r.fecha_checkin || '').slice(0,10)} → ${(r.fecha_checkout || '').slice(0,10)} (${r.total_noches || '?'} noches) | S/${r.monto_total_reserva || '0.00'} | Huesped: ${huesp} | creada ${(r.created_at || '').slice(0,16).replace('T',' ')}`);
    });
  }

  console.log('\n✅ FIX DIRECTO BD terminado. Ahora deploy ReservaService dual-write.');
  process.exit(0);
}
main().catch((e) => { console.error('[FATAL]', e); process.exit(99); });
