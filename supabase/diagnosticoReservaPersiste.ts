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
const SB_ANON = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!SB_URL) { console.error('[ERROR] VITE_SUPABASE_URL'); process.exit(1); }
const srv = createClient(SB_URL, SB_SERVICE || '', { auth: { persistSession: false, autoRefreshToken: false } });
const anon = SB_ANON ? createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = (Math.random() * 16) | 0;
  const v = c === 'x' ? r : (r & 0x3) | 0x8;
  return v.toString(16);
});

const nowISO = () => new Date().toISOString();

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (m, o) => (o > 0 ? '_' : '') + m.toLowerCase());
}
function toSnake(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnake);
  const out: any = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const sk = camelToSnake(k);
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      out[sk] = toSnake(v);
    } else {
      out[sk] = v;
    }
  }
  return out;
}
const HUESPEDES_WL = new Set([
  'id','uuid','tipo_documento','numero_documento','nombres','apellidos','nombre_completo','fecha_nacimiento',
  'genero','nacionalidad','pais_residencia','ciudad_residencia','direccion_fiscal','telefono1','telefono2',
  'email','email_fiscal','estado','nivel_programa_fidelidad','total_visitas','total_noches_acumuladas',
  'monto_gasto_acumulado_historico','puntos_fidelidad_acumulados','puntos_fidelidad_canjeados',
  'fecha_primera_estadia','fecha_ultima_estadia','contacto_emergencia','alergias','condiciones_medicas',
  'preferencias_alimentarias','tags','payload','created_at','updated_at','created_by','updated_by'
]);
const RESERVA_WL = new Set([
  'id','codigo_reserva','huesped_id','origen','sub_origen','estado','fecha_creacion','fecha_confirmacion',
  'fecha_checkin','fecha_checkout','fecha_checkin_real','fecha_checkout_real','total_noches','total_personas',
  'adultos','ninos','moneda','politica_cancelacion_id','codigo_promocional_id','monto_total_reserva',
  'subtotal_alojamiento','impuestos','descuentos','pago_garantia','huesped','habitaciones','acompanantes',
  'historial_cambios','checkin_info','checkout_info','payload','created_at','updated_at','created_by','updated_by'
]);
function applyWhitelistGen(snake: any, wl: Set<string>): any {
  const row: any = {};
  const extra: any = {};
  Object.entries(snake || {}).forEach(([k, v]) => {
    if (k === 'payload') return;
    if (wl.has(k)) row[k] = v;
    else extra[k] = v;
  });
  const base = (snake?.payload && typeof snake?.payload === 'object' && !Array.isArray(snake?.payload)) ? snake.payload : {};
  row.payload = { ...base, ...extra };
  return row;
}
const applyWhitelist = (s: any) => applyWhitelistGen(s, RESERVA_WL);

async function main() {
  console.log('=== DIAGNÓSTICO INSERCIÓN RESERVA EN SUPABASE CLOUD ===');
  console.log(`[URL] ${SB_URL}`);
  console.log(`[ANON KEY cargada?] ${SB_ANON ? 'SÍ (' + SB_ANON.slice(0, 12) + '...)' : 'NO'}`);
  console.log(`[SERVICE ROLE KEY cargada?] ${SB_SERVICE ? 'SÍ (' + SB_SERVICE.slice(0, 12) + '...)' : 'NO'}`);

  // 1) Pre-condición: obtener habitación + huesped (crear huesped temporal si no hay)
  const { data: habs, error: eh } = await srv.from('habitaciones').select('id, codigo, tipo_habitacion_id, estado').limit(1);
  if (eh) { console.error('[ERROR habitaciones]', eh.message); process.exit(2); }
  if (!habs || habs.length === 0) { console.error('[ERROR] No hay habitaciones en BD.'); process.exit(3); }
  const hab = habs[0];
  console.log(`[Habitación de prueba] id=${hab.id} codigo=${hab.codigo} estado=${hab.estado}`);

  const huespedId = uuid();
  const huespedSnake = toSnake({
    id: huespedId,
    tipoDocumento: 'DNI',
    numeroDocumento: '00000000',
    nombres: 'PRUEBA',
    apellidos: 'DIAGNOSTICO',
    nombreCompleto: 'PRUEBA DIAGNOSTICO',
    estado: 'ACTIVO',
    telefono1: '999999999',
    createdAt: nowISO(), updatedAt: nowISO(),
    createdBy: 'system-script', updatedBy: 'system-script',
  });
  const huespedRow = applyWhitelistGen(huespedSnake, HUESPEDES_WL);
  console.log('[Huesped insert] keys row: ' + Object.keys(huespedRow).sort().join(','));
  const { error: eH2 } = await srv.from('huespedes').upsert(huespedRow, { onConflict: 'id' });
  if (eH2) { console.error('[ERROR crear huesped]', eH2.message, JSON.stringify(huespedRow).slice(0, 200)); process.exit(4); }
  console.log(`[Huesped de prueba] id=${huespedId} OK`);

  // 2) Contar reservas antes
  const { count: c0, error: ec0 } = await srv.from('reservas').select('*', { count: 'exact', head: true });
  console.log(`[Reservas ANTES] count = ${c0}${ec0 ? ' ERROR: ' + ec0.message : ''}`);

  // 3) Construir payloadFinal EXACTO al que envía ReservaService.crear (camelCase)
  const idUnico = uuid();
  const codigo = `R-${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 90 + 10)}`;
  const checkin = new Date(); checkin.setDate(checkin.getDate() + 2);
  const checkout = new Date(checkin); checkout.setDate(checkout.getDate() + 2);
  const payloadFinal = {
    huespedId: huespedId,
    origen: 'WEB_OFICIAL',
    subOrigen: 'SCRIPT_DIAGNOSTICO',
    estado: 'PENDIENTE',
    fechaCheckin: checkin.toISOString().slice(0, 10),
    fechaCheckout: checkout.toISOString().slice(0, 10),
    totalNoches: 2,
    totalPersonas: 2,
    adultos: 2,
    ninos: 0,
    moneda: 'PEN',
    politicaCancelacionId: null,
    codigoPromocionalId: null,
    montoTotalReserva: 400.0,
    subtotalAlojamiento: 400.0,
    impuestos: 0,
    descuentos: 0,
    pagoGarantia: { metodo: 'EFECTIVO', estado: 'PENDIENTE', monto: 0 },
    huesped: { id: huespedId, nombres: 'PRUEBA', apellidos: 'DIAGNOSTICO', nombreCompleto: 'PRUEBA DIAGNOSTICO', documento: '00000000' },
    habitaciones: [{
      habitacionId: hab.id,
      codigoHabitacion: hab.codigo,
      tipoHabitacionId: hab.tipo_habitacion_id,
      checkin: checkin.toISOString().slice(0, 10),
      checkout: checkout.toISOString().slice(0, 10),
      noches: 2,
      precioBasePorNoche: 200.0,
      tarifaId: null,
    }],
    acompanantes: [],
    historialCambios: [{ id: uuid(), tipoCambio: 'CREACION', fechaHora: nowISO(), usuarioResponsableId: 'system-script', descripcion: 'Creada por script diagnóstico', valorAnterior: null, valorNuevo: null }],
    checkinInfo: null,
    checkoutInfo: null,
    id: idUnico,
    codigoReserva: codigo,
    fechaCreacion: nowISO(),
    fechaModificacion: nowISO(),
    createdBy: 'system-script',
    updatedBy: 'system-script',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  const snake = toSnake(payloadFinal);
  const rowWhitelist = applyWhitelist(snake);
  console.log('\n[PAYLOAD que se inserta] keys: ' + Object.keys(rowWhitelist).sort().join(','));
  console.log(' - keys extra enviadas a payload: ' + Object.keys(rowWhitelist.payload || {}).sort().join(','));

  // ===== 3a) INTENTO CON SERVICE ROLE =====
  console.log('\n--- Intento 1: SERVICE ROLE KEY ---');
  const { data: insSrv, error: eSrv } = await srv.from('reservas').insert(rowWhitelist).select().maybeSingle();
  if (eSrv) console.error('[SERVICE ROLE ERROR] code=', (eSrv as any)?.code, 'message=', eSrv.message, 'details=', JSON.stringify((eSrv as any)?.details || {}), 'hint=', (eSrv as any)?.hint);
  else console.log(`[SERVICE ROLE OK] insertado id=${insSrv?.id} codigo=${insSrv?.codigo_reserva}`);

  // ===== 3b) INTENTO CON ANON KEY (igual que frontend) =====
  const idUnico2 = uuid();
  const codigo2 = `R-${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 90 + 10)}`;
  const rowAnon = applyWhitelist(toSnake({ ...payloadFinal, id: idUnico2, codigoReserva: codigo2 }));
  console.log('\n--- Intento 2: ANON KEY (igual que front) ---');
  if (!anon) {
    console.log('[SKIP] No hay VITE_SUPABASE_ANON_KEY en .env');
  } else {
    const { data: insAnon, error: eAnon } = await anon.from('reservas').insert(rowAnon).select().maybeSingle();
    if (eAnon) console.error('[ANON KEY ERROR] code=', (eAnon as any)?.code, 'message=', eAnon.message, 'details=', JSON.stringify((eAnon as any)?.details || {}), 'hint=', (eAnon as any)?.hint);
    else console.log(`[ANON OK] insertado id=${insAnon?.id} codigo=${insAnon?.codigo_reserva}`);
  }

  // ===== 3c) INTENTO 3: IGUAL QUE SupabaseDB.addAsync (código adaptado real) =====
  const idUnico3 = uuid();
  const codigo3 = `R-${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 90 + 10)}`;
  const payload3 = { ...payloadFinal, id: idUnico3, codigoReserva: codigo3 };
  const snake3 = toSnake(payload3);
  // Código igual L150-175 __supabase_db__.ts: wl reservas → applyWhitelist
  snake3.payload = (payload3 as any).payload || {};
  const row3 = applyWhitelist(snake3);
  console.log('\n--- Intento 3: CÓDIGO EXACTO __supabase_db__.ts addAsync reservas (ANON KEY) ---');
  if (!anon) console.log('[SKIP] No hay ANON KEY');
  else {
    const { data: d3, error: e3 } = await anon.from('reservas').insert(row3).select().maybeSingle();
    if (e3) console.error('[ERROR addAsync real equiv] code=', (e3 as any)?.code, 'message=', e3.message, 'details=', JSON.stringify((e3 as any)?.details || {}));
    else console.log(`[OK addAsync real] id=${d3?.id} cod=${d3?.codigo_reserva}`);
  }

  // ===== 4) Count DESPUÉS =====
  const { count: c1, error: ec1 } = await srv.from('reservas').select('*', { count: 'exact', head: true });
  console.log(`\n[Reservas DESPUÉS] count = ${c1} (antes ${c0}; delta = ${(c1 || 0) - (c0 || 0)})${ec1 ? ' ERROR count: ' + ec1.message : ''}`);

  // ===== 5) Limpieza: borrar las 3 filas de PRUEBA SCRIPT =====
  console.log('\n[Limpieza] Borrando filas de prueba...');
  const idsDel = [idUnico]; if (insSrv?.id) idsDel.push(insSrv.id); if (idUnico2) idsDel.push(idUnico2); if (idUnico3) idsDel.push(idUnico3);
  if (idsDel.length) {
    const { error: ed } = await srv.from('reservas').delete().in('id', Array.from(new Set(idsDel)));
    if (ed) console.error('[ERROR delete prueba]', ed.message); else console.log('OK');
  }
  const { error: edh } = await srv.from('huespedes').delete().eq('id', huespedId);
  if (edh) console.error('[ERROR delete huesped]', edh.message);
  const { count: cFinal } = await srv.from('reservas').select('*', { count: 'exact', head: true });
  console.log(`[Count final post-cleanup] ${cFinal} reservas`);

  process.exit(0);
}
main().catch(e => { console.error('[FATAL]', e); process.exit(99); });
