// ============================================================
// SCRIPT AUTOMATIZADO - LIMPIEZA RESERVAS DEMO SIN POPUPS
// Se ejecuta DIRECTAMENTE con service_role (sin TRAE supabase_apply_migration)
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
const SB_SERVICE =
  env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SB_URL || !SB_SERVICE) {
  console.error('[ERROR] Faltan VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

console.log('[INFO] Conectando Supabase...');
const sb = createClient(SB_URL, SB_SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ============================================================
// PASO 1: Buscar reservas demo R-1001/R-1005/R-1002
// ============================================================
async function main() {
  const cods = ['R-1001', 'R-1005', 'R-1002'];
  console.log('[1/6] Buscando reservas demo:', cods);
  const { data: reservasDemo, error: eR } = await sb
    .from('reservas')
    .select('id, codigo_reserva, huesped_id')
    .in('codigo_reserva', cods);

  if (eR) {
    console.error('[ERROR] No se pudieron consultar reservas:', eR);
    process.exit(2);
  }
  if (!reservasDemo || reservasDemo.length === 0) {
    console.log('[OK] No se encontraron reservas demo (ya estaban limpiadas).');
  } else {
    const reservaIds = reservasDemo.map((r: any) => r.id);
    console.log(`  -> Encontradas ${reservaIds.length}:`, reservasDemo.map((r: any) => r.codigo_reserva).join(', '));

    // ============================================================
    // PASO 2: Borrar comandas vinculadas
    // ============================================================
    console.log('[2/6] Borrando comandas vinculadas a reservas/folios...');
    const { error: eCom1 } = await sb.from('comandas').delete().in('reserva_id', reservaIds);
    if (eCom1) console.log('  WARN comandas por reserva:', eCom1.message);

    const { data: foliosByReserva } = await sb
      .from('folios')
      .select('id, reserva_id, habitacion_id')
      .in('reserva_id', reservaIds);
    const folioIds = (foliosByReserva || []).map((f: any) => f.id);
    const habitacionIds = (foliosByReserva || []).map((f: any) => f.habitacion_id).filter(Boolean) as string[];

    if (folioIds.length) {
      const { error: eComF } = await sb.from('comandas').delete().in('folio_id', folioIds);
      if (eComF) console.log('  WARN comandas por folio:', eComF.message);

      // ============================================================
      // PASO 3: Borrar pagos_folio y cargos_folio
      // ============================================================
      console.log('[3/6] Borrando pagos y cargos de folios...');
      const { error: ePF } = await sb.from('pagos_folio').delete().in('folio_id', folioIds);
      if (ePF) console.log('  WARN pagos por folio:', ePF.message);
      const { error: ePR } = await sb.from('pagos_folio').delete().in('reserva_id', reservaIds);
      if (ePR) console.log('  WARN pagos por reserva:', ePR.message);
      const { error: eCF } = await sb.from('cargos_folio').delete().in('folio_id', folioIds);
      if (eCF) console.log('  WARN cargos por folio:', eCF.message);
      const { error: eCR } = await sb.from('cargos_folio').delete().in('reserva_id', reservaIds);
      if (eCR) console.log('  WARN cargos por reserva:', eCR.message);

      // ============================================================
      // PASO 4: Borrar folios
      // ============================================================
      console.log('[4/6] Borrando folios...');
      const { error: eFol } = await sb.from('folios').delete().in('id', folioIds);
      if (eFol) console.log('  WARN folios:', eFol.message);
    }

    // ============================================================
    // PASO 5: Borrar reservas
    // ============================================================
    console.log('[5/6] Borrando reservas demo...');
    const { error: eDel } = await sb.from('reservas').delete().in('id', reservaIds);
    if (eDel) {
      console.error('[ERROR] No se pudieron borrar reservas:', eDel);
      process.exit(3);
    }
    console.log('  -> Reservas eliminadas OK.');

    // ============================================================
    // PASO 6: Reestablecer habitaciones a DISPONIBLE / MANTENIMIENTO
    // ============================================================
    console.log('[6/6] Reestableciendo estado habitaciones reales...');
    const codigosLibres = ['H201', 'H202', 'H203', 'SUITE'];
    const { error: eUp } = await sb
      .from('habitaciones')
      .update({ estado: 'DISPONIBLE', estado_limpieza: 'LIMPIA' })
      .in('codigo', codigosLibres);
    if (eUp) console.log('  WARN habitaciones libres:', eUp.message);
    const { error: eCab } = await sb
      .from('habitaciones')
      .update({ estado: 'MANTENIMIENTO', estado_limpieza: 'LIMPIA' })
      .eq('codigo', 'CABAÑA');
    if (eCab) console.log('  WARN cabaña:', eCab.message);
  }

  // Limpieza huérfanos defensiva (sin FK deletes)
  console.log('[EXTRA] Limpieza defensiva de filas huérfanas...');
  try {
    const { data: folOrf } = await sb
      .from('folios')
      .select('id')
      .is('reserva_id', null)
      .is('habitacion_id', null);
    if (folOrf && folOrf.length) {
      const ids = folOrf.map((f: any) => f.id);
      await sb.from('comandas').delete().in('folio_id', ids);
      await sb.from('pagos_folio').delete().in('folio_id', ids);
      await sb.from('cargos_folio').delete().in('folio_id', ids);
      await sb.from('folios').delete().in('id', ids);
      console.log('  ->', ids.length, 'folios huérfanos eliminados.');
    }
  } catch (e) {
    console.log('  WARN orphans:', (e as any).message);
  }

  // Verificación final
  const { data: verify } = await sb
    .from('reservas')
    .select('codigo_reserva, estado, fecha_checkin')
    .order('created_at', { ascending: false });
  console.log('\n✅ FIN. Reservas actuales en BD:', (verify || []).length === 0 ? '0 (SISTEMA LIMPIO - OPERACIÓN REAL)' : (verify || []).length + ' fila(s)');
  if (verify && verify.length) {
    console.log('  Listado:');
    verify.forEach((r: any) => console.log('   -', r.codigo_reserva, '|', r.estado, '|', r.fecha_checkin?.slice(0, 10)));
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('[FATAL] Excepción no manejada:', e);
  process.exit(99);
});
