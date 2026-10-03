import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toSnake } from '../src/services/_case.ts';
import { seed } from '../src/services/__seed__.ts';

// ---------- Config ----------
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
const envRaw = readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
for (const line of envRaw.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) envVars[m[1]] = (m[2] || '').replace(/^["']|["']$/g, '');
}

const URL = envVars.VITE_SUPABASE_URL;
const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error('❌ Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const sb = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

// ---------- WHITELIST columnas por tabla (1:1 con Postgres real) ----------
// Cualquier campo que NO esté aquí es dropeado automáticamente del payload
const COLUMNS_WHITELIST: Record<string, string[]> = {
  impuestos: ['id','nombre','tipo','valor','descripcion','estado','payload','created_at','updated_at','created_by','updated_by'],
  alergenos: ['id','nombre','descripcion','payload','created_at','updated_at','created_by','updated_by'],
  categorias_fb: ['id','nombre','orden','descripcion','estado','payload','created_at','updated_at','created_by','updated_by'],
  productos_fb: ['id','categoria_id','codigo','nombre','descripcion','precio_venta_base','costo_aproximado','moneda','estado','presentaciones_activas_ids','modificadores_ids','alergenos_ids','impuestos_ids','estaciones_cocina_ids','payload','created_at','updated_at','created_by','updated_by'],
  presentaciones_fb: ['id','producto_id','nombre','precio','costo_aproximado','unidad_medida','stock_control','payload','created_at','updated_at','created_by','updated_by'],
  modificadores_fb: ['id','nombre','descripcion','aplica_a','estado','payload','created_at','updated_at','created_by','updated_by'],
  tipos_habitacion: ['id','nombre','descripcion','capacidad_adultos','capacidad_ninos','precio_base_noche','estado','camas','servicios','fotos','payload','created_at','updated_at','created_by','updated_by'],
  temporadas: ['id','nombre','tipo','fecha_inicio','fecha_fin','factor_precio_porcentaje','color_etiqueta','descripcion','estado','payload','created_at','updated_at','created_by','updated_by'],
  politicas_cancelacion: ['id','nombre','plazo_horas_cancelacion_gratis','multa_porcentaje_cancelacion_tardia','multa_porcentaje_no_show','multa_fija_no_show','moneda_multa_fija','permite_cambiar_fechas','limite_cambios_fechas','estado','payload','created_at','updated_at','created_by','updated_by'],
  codigos_promo: ['id','codigo','nombre','descripcion','tipo_descuento','valor_descuento','minimo_noches','minimo_monto','fecha_inicio','fecha_fin','usos_maximos_totales','usos_por_cliente','usos_realizados','estado','aplica_a_tipos_habitacion_ids','aplica_a_tarifas_ids','payload','created_at','updated_at','created_by','updated_by'],
  tarifas: ['id','tipo_habitacion_id','politica_cancelacion_id','temporada_id','nombre','moneda','regimen','precio_base_por_noche','cargos_extra_persona','cargos_extra_nino','minimo_noches','maximo_noches','fecha_inicio_vigencia','fecha_fin_vigencia','estado','impuestos','payload','created_at','updated_at','created_by','updated_by'],
  habitaciones: ['id','tipo_habitacion_id','codigo','nombre','piso','ubicacion','vista_efectiva','estado','estado_limpieza','notas_internas','bloqueada_hasta','motivo_bloqueo','ultima_limpieza_at','payload','created_at','updated_at','created_by','updated_by'],
  roles: ['id','nombre','descripcion','nivel_jerarquia','estado','permisos','payload','created_at','updated_at','created_by','updated_by'],
  usuarios: ['id','uuid','rol_id','iniciales','nombres','apellidos','correo_electronico','estado','password_hash','telefono','ultimo_acceso','payload','created_at','updated_at','created_by','updated_by'],
  huespedes: ['id','uuid','tipo_documento','numero_documento','nombres','apellidos','nombre_completo','fecha_nacimiento','genero','nacionalidad','pais_residencia','ciudad_residencia','direccion_fiscal','telefono1','telefono2','email','email_fiscal','estado','nivel_programa_fidelidad','total_visitas','total_noches_acumuladas','monto_gasto_acumulado_historico','puntos_fidelidad_acumulados','puntos_fidelidad_canjeados','fecha_primera_estadia','fecha_ultima_estadia','contacto_emergencia','alergias','condiciones_medicas','preferencias_alimentarias','tags','payload','created_at','updated_at','created_by','updated_by'],
  puntos_venta: ['id','nombre','codigo_punto_venta','tipo','descripcion','moneda_predeterminada','estado','horario_atencion','estaciones_cocina_ids','tipos_comandas_permitidos','payload','created_at','updated_at','created_by','updated_by'],
  mesas: ['id','punto_venta_id','codigo','nombre_visible','zona','tipo','estado','capacidad_max_pax','capacidad_actual_usada','es_combinable','habitacion_asignada_id','mesa_combinada_ids','payload','created_at','updated_at','created_by','updated_by'],
  reservas: ['id','codigo_reserva','huesped_id','origen','sub_origen','estado','fecha_creacion','fecha_confirmacion','fecha_checkin','fecha_checkout','fecha_checkin_real','fecha_checkout_real','total_noches','total_personas','adultos','ninos','moneda','politica_cancelacion_id','codigo_promocional_id','monto_total_reserva','subtotal_alojamiento','impuestos','descuentos','pago_garantia','huesped','habitaciones','historial_cambios','checkin_info','checkout_info','payload','created_at','updated_at','created_by','updated_by'],
  folios: ['id','codigo','numero_folio','reserva_id','huesped_id','habitacion_id','checkin_id','estado','fecha_apertura','fecha_cierre','fecha_checkout','fecha_checkout_real','moneda','es_cuenta_compartida','folios_compartidos_ids','usuario_id_apertura','usuario_id_cierre','subtotal_sin_impuestos','total_impuestos','total_propinas','total_descuentos','total_bonificaciones_cortesia','total_folio','total_pagado','saldo_pendiente','limite_credito_autorizado','credito_excedido','notas_internas','cargos','pagos','payload','created_at','updated_at','created_by','updated_by'],
  cargos_folio: ['id','folio_id','reserva_id','habitacion_id','huesped_id','comanda_id','comanda_detalle_id','referencia_id','referencia_externa_id','numero_linea','tipo','tipo_concepto','concepto','descripcion','origen','origen_cargo','estado','cantidad','unidad_medida','precio_unitario','monto','subtotal','total','monto_impuesto','impuesto_porcentaje','descuento_monto','descuento_porcentaje','propina_monto','moneda','fecha_cargo','fecha_aplicacion','fecha_vencimiento','cargo_auto','anulado','es_anulado','motivo_anulacion','impuestos_ids','impuestos_monto_desglosado','descuentos_ids','descuentos_monto_desglosado','payload','created_at','updated_at','created_by','updated_by'],
  pagos_folio: ['id','folio_id','reserva_id','habitacion_id','caja_sesion_id','usuario_id','metodo_pago','sub_metodo_pago','monto','moneda','tipo_cambio_moneda_referencia','monto_moneda_original','fecha_hora_pago','referencia_bancaria','comprobante_asociado_id','comprobante_numero','estado','es_propina','es_parcial','es_devolucion','pago_original_id','comprobante_envio_correo','comprobante_envio_whatsapp','comprobante_pdf_url','cajero_nombre','aprobacion_codigo','observaciones','payload','created_at','updated_at','created_by','updated_by'],
  comandas: ['id','punto_venta_id','mesa_id','habitacion_id','folio_id','reserva_id','huesped_titular_id','numero_correlativo','tipo_comanda','tipo_consumo','prioridad','estado','estado_entrega','modo_atencion','usuario_id_mozo_apertura','turno_servicio_id','fecha_apertura','hora_apertura','fecha_cierre','hora_cierre','hora_envio_kds','pax_adultos','pax_ninos','moneda','total_neto_sin_impuestos','total_impuestos','total_descuentos','propina_sugerida','propina_aplicada_monto','total_propinas','total_comanda','total_final_con_propina','saldo_pendiente','total_cobrado','impuestos_detalle','detalles','cobros','cierre','observaciones_internas','tickets_kds_ids','facturas_ids','payload','created_at','updated_at','created_by','updated_by'],
  comandas_detalles: ['id','comanda_id','producto_id','presentacion_id','numero_linea','cantidad','precio_unitario','subtotal','monto_linea','moneda','estado_preparacion','observaciones','comentarios_internos','estacion_cocina_id','usuario_id_asignado_estacion','hora_solicitado','hora_inicio_preparacion','hora_termino_preparacion','hora_entregado','es_modificacion','es_cortesia','es_complemento_cargo','ticket_impreso_kds','impuestos_ids','impuestos_monto_desglosado','seleccion_modificadores','alergenos_omitidos_ids','payload','created_at','updated_at','created_by','updated_by'],
};

function stripRow(table: string, row: any): any {
  const cols = COLUMNS_WHITELIST[table];
  if (!cols) return row;
  const out: any = {};
  for (const c of cols) if (row[c] !== undefined) out[c] = row[c];
  return out;
}

// ---------- Tablas (misma secuencia, con safe rowsFn) ----------
const TABLES: Array<{ key: string; table: string; rowsFn: () => any[] }> = [
  { key: 'impuestos',            table: 'impuestos',            rowsFn: () => (seed as any).impuestos || [] },
  { key: 'alergenos',            table: 'alergenos',            rowsFn: () => (seed as any).alergenos || [] },
  { key: 'categoriasFB',         table: 'categorias_fb',        rowsFn: () => (seed as any).categoriasFB || [] },
  { key: 'tiposHabitacion',      table: 'tipos_habitacion',     rowsFn: () => (seed as any).tiposHabitacion || [] },
  { key: 'temporadas',           table: 'temporadas',           rowsFn: () => (seed as any).temporadas || [] },
  { key: 'politicasCancelacion', table: 'politicas_cancelacion',rowsFn: () => (seed as any).politicasCancelacion || [] },
  { key: 'codigosPromo',         table: 'codigos_promo',        rowsFn: () => (seed as any).codigosPromo || [] },
  { key: 'productosFB',          table: 'productos_fb',         rowsFn: () => (seed as any).productosFB || [] },
  { key: 'presentacionesFB',     table: 'presentaciones_fb',    rowsFn: () => (seed as any).presentacionesFB || [] },
  { key: 'modificadoresFB',      table: 'modificadores_fb',     rowsFn: () => (seed as any).modificadoresFB || [] },
  { key: 'habitaciones',         table: 'habitaciones',         rowsFn: () => ((seed as any).habitaciones || []).map((h: any) => { const { tipoHabitacion: _t, ...rest } = h; return rest; }) },
  { key: 'tarifas',              table: 'tarifas',              rowsFn: () => (seed as any).tarifas || [] },
  { key: 'roles',                table: 'roles',                rowsFn: () => (seed as any).roles || [] },
  { key: 'usuarios',             table: 'usuarios',             rowsFn: () => (seed as any).usuarios || [] },
  { key: 'huespedes',            table: 'huespedes',            rowsFn: () => (seed as any).huespedes || [] },
  { key: 'puntosVenta',          table: 'puntos_venta',         rowsFn: () => (seed as any).puntosVenta || [] },
  { key: 'mesas',                table: 'mesas',                rowsFn: () => (seed as any).mesas || [] },
  { key: 'reservas',             table: 'reservas',             rowsFn: () => ((seed as any).reservas || []).map((r: any) => { const { huesped: _h, habitaciones: _ha, ...rest } = r; return rest; }) },
  { key: 'folios',               table: 'folios',               rowsFn: () => ((seed as any).folios || []).map((f: any) => { const { huesped: _h, habitacion: _ha, reserva: _r, cargos: _c, pagos: _p, ...rest } = f; return rest; }) },
  { key: 'cargosFolio',          table: 'cargos_folio',         rowsFn: () => {
      const folios = (seed as any).folios || [];
      const extra = folios.flatMap((f: any) => ((f as any).cargos || []).map((c: any) => ({ ...c, folioId: f.id })));
      return [
        ...((seed as any).cargosFolio || []),
        ...extra,
      ];
  }},
  { key: 'pagosFolio',           table: 'pagos_folio',          rowsFn: () => {
      const folios = (seed as any).folios || [];
      const extra = folios.flatMap((f: any) => ((f as any).pagos || []).map((p: any) => ({ ...p, folioId: f.id })));
      return [
        ...((seed as any).pagosFolio || []),
        ...extra,
      ];
  }},
  { key: 'comandas',             table: 'comandas',             rowsFn: () => ((seed as any).comandas || []).map((c: any) => { const { mesa: _m, habitacion: _h, detalles: _d, cobros: _c, cierre: _ci, ...rest } = c; return rest; }) },
  { key: 'comandasDetalles',     table: 'comandas_detalles',    rowsFn: () => ((seed as any).comandas || []).flatMap((c: any) => ((c as any).detalles || []).map((d: any) => ({ ...d, comandaId: c.id }))) },
];

function doctorRow(r: any): any {
  if (!r || typeof r !== 'object') return r;
  const out: any = Array.isArray(r) ? [] : {};
  for (const [k, v] of Object.entries(r)) {
    if (v === null || v === undefined) {
      if (k === 'correo_electronico') out[k] = 'demo@casa-sumaq-allpa.local';
      else if (k === 'email') out[k] = 'huesped@demo.local';
      else if (k === 'nombres') out[k] = '(Sin nombre)';
      else if (k === 'apellidos') out[k] = '-';
      else out[k] = v;
      continue;
    }
    if (typeof v === 'string') {
      // Fechas corruptas tipo "...zt15:12:00-05:00" → extraer ISO válido
      if (/^\d{4}-\d{2}-\d{2}T/.test(v) && /z(t\d)/i.test(v)) {
        const iso = v.replace(/z?t?\d{1,2}:\d{2}:\d{2}[\-\+]\d{2}:\d{2}$/i, 'Z');
        const d = new Date(iso);
        out[k] = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
        continue;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const d = new Date(v + 'T00:00:00Z');
        out[k] = d.toISOString();
        continue;
      }
      out[k] = v;
    } else if (typeof v === 'object') {
      out[k] = doctorRow(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Trackea IDs insertados x tabla para curar FKs de hijos (no inserta filas que referencien papá inexistente)
const insertedIds: Record<string, Set<string>> = {};

function afterStripDoctor(table: string, row: any): any {
  if (!row) return row;
  const r: any = { ...row };
  if (table === 'usuarios') {
    // 100% unique: random + id slice (evita duplicate unique key)
    const rand = Math.random().toString(36).slice(2, 8);
    const baseId = String(r.id || ('usr-' + rand));
    const nombreBase = (r.nombre_usuario || r.iniciales || 'usr').toString().toLowerCase().replace(/[^a-z0-9]/g, '') || 'usr';
    r.correo_electronico = `${nombreBase}-${rand}-${baseId.slice(-4)}@casa-sumaq-allpa.local`;
    if (!r.ultimo_acceso) r.ultimo_acceso = new Date().toISOString();
    if (!r.password_hash) r.password_hash = '$2b$08$demo_hash_' + rand;
  }
  if (table === 'huespedes') {
    const baseId = String(r.id || 'hue');
    if (!r.email) r.email = `hue-${baseId.slice(0, 10)}@demo.local`;
    if (!r.nombre_completo) r.nombre_completo = [r.nombres, r.apellidos].filter(Boolean).join(' ') || 'Huésped Demo';
  }
  // FK hija que no exista -> null (permite insertar papá primero; si filtro FK lo dejamos pasar x DEFERRED)
  return r;
}

function hasValidFK(idVal: any, okSet: Set<string>): boolean {
  return !idVal || okSet.has(idVal);
}

async function upsertChunk(table: string, chunk: any[]): Promise<{ inserted: number; error?: string }> {
  // Doctor post-whitelist (NOT NULL como usuarios.correo_electronico)
  chunk = chunk.map(r => afterStripDoctor(table, r));

  const habOK  = insertedIds['habitaciones']  || new Set<string>();
  const hueOK  = insertedIds['huespedes']     || new Set<string>();
  const resOK  = insertedIds['reservas']      || new Set<string>();
  const folOK  = insertedIds['folios']        || new Set<string>();
  const pvOK   = insertedIds['puntos_venta']  || new Set<string>();
  const mesaOK = insertedIds['mesas']         || new Set<string>();
  const comOK  = insertedIds['comandas']      || new Set<string>();
  const prodOK = insertedIds['productos_fb']  || new Set<string>();

  let filtered = chunk;
  if (table === 'cargos_folio' || table === 'pagos_folio') {
    filtered = chunk.filter(r =>
      hasValidFK(r.folio_id, folOK) &&
      hasValidFK(r.reserva_id, resOK) &&
      hasValidFK(r.habitacion_id, habOK) &&
      hasValidFK(r.huesped_id, hueOK)
    );
  }
  if (table === 'comandas') {
    filtered = chunk.filter(r =>
      hasValidFK(r.folio_id, folOK) &&
      hasValidFK(r.mesa_id, mesaOK) &&
      hasValidFK(r.habitacion_id, habOK) &&
      hasValidFK(r.reserva_id, resOK) &&
      hasValidFK(r.huesped_titular_id, hueOK) &&
      hasValidFK(r.punto_venta_id, pvOK)
    );
  }
  if (table === 'comandas_detalles') {
    filtered = chunk.filter(r =>
      hasValidFK(r.comanda_id, comOK) &&
      hasValidFK(r.producto_id, prodOK)
    );
  }
  if (!filtered.length) return { inserted: 0 };

  const { error } = await sb.from(table).upsert(filtered, {
    onConflict: 'id', ignoreDuplicates: false, defaultToNull: true,
  } as any);
  if (error) return { inserted: 0, error: error.message };

  const ids = insertedIds[table] || new Set<string>();
  for (const r of filtered) if (r.id) ids.add(r.id);
  insertedIds[table] = ids;
  return { inserted: filtered.length };
}

async function runSql(sql: string) {
  try {
    const { error } = await (sb as any).from('_noop_').select().limit(0); // no-op for typing
    void error;
  } catch {}
  // Raw SQL via rpc wrapper? No — Supabase JS SDK no soporta .sql() directo; usamos pg_typeof workaround: hacemos set x sentencia x transacción.
  // En su lugar usamos rpc a set_config con TEXTO (funciona sin superuser para SET CONSTRAINTS en transacción).
  // Pero SET CONSTRAINTS es transaccional — así que para insert individuales: NULLify foreign keys a papás inexistentes.
  try {
    await sb.rpc('set_config', { name: 'constraint_exclusion', value: 'partition', is_local: true } as any);
  } catch {}
}

async function main() {
  console.log('🚀 Subiendo seed a Supabase →', URL);
  // 1) Warm up + set loose config (no requiere superuser). FK constraint: limpiamos referencias huérfanas a NULL.
  await runSql('--');

  for (const t of TABLES) {
    let rows: any[] = [];
    try { rows = t.rowsFn() || []; } catch (e: any) {
      console.error(`❌ ${t.table} rowsFn EXCEPTION →`, e?.message || e);
      continue;
    }
    if (!rows.length) { console.log(`⏭  ${t.table}: 0 filas, skip.`); continue; }

    // Pre-FK-cleanup global para esta tabla (elimina FKs a papás que sabemos no existen).
    rows = rows.map((r: any) => {
      const rr: any = { ...r };
      if (t.table === 'cargos_folio' || t.table === 'pagos_folio') {
        const hueOK = insertedIds['huespedes'] || new Set<string>();
        if (rr.huespedId && !hueOK.has(rr.huespedId)) rr.huespedId = null;
        const habOK = insertedIds['habitaciones'] || new Set<string>();
        if (rr.habitacionId && !habOK.has(rr.habitacionId)) rr.habitacionId = null;
        const resOK = insertedIds['reservas'] || new Set<string>();
        if (rr.reservaId && !resOK.has(rr.reservaId)) rr.reservaId = null;
      }
      return rr;
    });

    const payload = rows
      .map(r => doctorRow(r))
      .map(r => toSnake(r))
      .map(r => stripRow(t.table, r));

    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < payload.length; i += BATCH) {
      const chunk = payload.slice(i, i + BATCH);
      const r = await upsertChunk(t.table, chunk);
      if (r.error) {
        // Último resort: limpiar FKs inválidas en el chunk y reintentar 1 vez
        const repaired = chunk.map((row: any) => {
          const out: any = { ...row };
          for (const k of Object.keys(out)) {
            if (k.endsWith('_id') && out[k]) {
              const parentTable = k.slice(0, -3);
              const set = insertedIds[parentTable];
              if (set && !set.has(out[k])) out[k] = null;
            }
          }
          return out;
        });
        const r2 = await upsertChunk(t.table, repaired);
        if (r2.error) {
          console.error(`❌ ${t.table} chunk ${i} →`, r2.error);
        } else if (r2.inserted) {
          inserted += r2.inserted;
        }
      } else if (r.inserted) {
        inserted += r.inserted;
      }
    }
    if (inserted) console.log(`✅ ${t.table}: ${inserted} filas insertadas`);
    else console.log(`⏭  ${t.table}: 0 filas válidas, skip.`);
  }
  console.log('\n🎉 SEED COMPLETADO. Revisa Supabase → Table Editor para ver los datos.');
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
