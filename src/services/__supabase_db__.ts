// @ts-nocheck
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { toCamel, toSnake } from './_case';
import { seedUtil, type Create, type Update } from './__seed__';
import type {
  TipoHabitacion, Habitacion, Tarifa, Temporada, PoliticaCancelacion, CodigoPromocional,
  Reserva, Huesped, Folio, CargoFolio, PagoFolio,
  Usuario, Rol, PuntoVenta, CategoriaFB, ProductoFB, PresentacionProducto, ModificadorGrupo,
  AlergenoProducto, Mesa, Comanda, ComandaDetalle, ImpuestoTarifa,
} from '../types';

const SUPABASE_URL = (import.meta as any)?.env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[SupabaseDB] WARN: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no set (offline mode)');
}

export type CollectionKey =
  | 'alergenos' | 'categoriasFB' | 'productosFB' | 'presentacionesFB' | 'modificadoresFB' | 'impuestos'
  | 'tiposHabitacion' | 'habitaciones' | 'tarifas' | 'temporadas' | 'politicasCancelacion' | 'codigosPromo'
  | 'huespedes' | 'roles' | 'usuarios'
  | 'puntosVenta' | 'mesas' | 'reservas' | 'folios' | 'cargosFolio' | 'pagosFolio'
  | 'comandas' | 'comandasDetalles';

export const TABLE: Record<CollectionKey, string> = {
  alergenos: 'alergenos',
  categoriasFB: 'categorias_fb',
  productosFB: 'productos_fb',
  presentacionesFB: 'presentaciones_fb',
  modificadoresFB: 'modificadores_fb',
  impuestos: 'impuestos',
  tiposHabitacion: 'tipos_habitacion',
  habitaciones: 'habitaciones',
  tarifas: 'tarifas',
  temporadas: 'temporadas',
  politicasCancelacion: 'politicas_cancelacion',
  codigosPromo: 'codigos_promocionales',
  huespedes: 'huespedes',
  roles: 'roles',
  usuarios: 'usuarios',
  puntosVenta: 'puntos_venta',
  mesas: 'mesas',
  reservas: 'reservas',
  folios: 'folios',
  cargosFolio: 'cargos_folio',
  pagosFolio: 'pagos_folio',
  comandas: 'comandas',
  comandasDetalles: 'comandas_detalles',
};

const setFrom = (cols: readonly string[]) => new Set<string>(cols);

export const WHITELISTS: Partial<Record<CollectionKey, Set<string>>> = {
  impuestos: setFrom(['id','nombre','tipo','valor','descripcion','estado','payload','created_at','updated_at','created_by','updated_by']),
  alergenos: setFrom(['id','nombre','descripcion','payload','created_at','updated_at','created_by','updated_by']),
  categoriasFB: setFrom(['id','nombre','orden','descripcion','estado','payload','created_at','updated_at','created_by','updated_by']),
  productosFB: setFrom(['id','categoria_id','codigo','nombre','descripcion','precio_venta_base','costo_aproximado','moneda','estado','presentaciones_activas_ids','modificadores_ids','alergenos_ids','impuestos_ids','estaciones_cocina_ids','payload','created_at','updated_at','created_by','updated_by']),
  presentacionesFB: setFrom(['id','producto_id','nombre','precio','costo_aproximado','unidad_medida','stock_control','payload','created_at','updated_at','created_by','updated_by']),
  modificadoresFB: setFrom(['id','nombre','descripcion','aplica_a','estado','payload','created_at','updated_at','created_by','updated_by']),
  tiposHabitacion: setFrom(['id','nombre','descripcion','capacidad_adultos','capacidad_ninos','precio_base_noche','estado','camas','servicios','fotos','payload','created_at','updated_at','created_by','updated_by']),
  habitaciones: setFrom(['id','tipo_habitacion_id','codigo','nombre','piso','ubicacion','vista_efectiva','estado','estado_limpieza','notas_internas','bloqueada_hasta','motivo_bloqueo','ultima_limpieza_at','payload','created_at','updated_at','created_by','updated_by']),
  temporadas: setFrom(['id','nombre','tipo','fecha_inicio','fecha_fin','factor_precio_porcentaje','color_etiqueta','descripcion','estado','payload','created_at','updated_at','created_by','updated_by']),
  politicasCancelacion: setFrom(['id','nombre','plazo_horas_cancelacion_gratis','multa_porcentaje_cancelacion_tardia','multa_porcentaje_no_show','multa_fija_no_show','moneda_multa_fija','permite_cambiar_fechas','limite_cambios_fechas','estado','payload','created_at','updated_at','created_by','updated_by']),
  codigosPromo: setFrom(['id','codigo','nombre','descripcion','tipo_descuento','valor_descuento','minimo_noches','minimo_monto','fecha_inicio','fecha_fin','usos_maximos_totales','usos_por_cliente','usos_realizados','estado','aplica_a_tipos_habitacion_ids','aplica_a_tarifas_ids','payload','created_at','updated_at','created_by','updated_by']),
  tarifas: setFrom(['id','tipo_habitacion_id','politica_cancelacion_id','temporada_id','nombre','moneda','regimen','precio_base_por_noche','cargos_extra_persona','cargos_extra_nino','minimo_noches','maximo_noches','fecha_inicio_vigencia','fecha_fin_vigencia','estado','impuestos','payload','created_at','updated_at','created_by','updated_by']),
  huespedes: setFrom(['id','uuid','tipo_documento','numero_documento','nombres','apellidos','nombre_completo','fecha_nacimiento','genero','nacionalidad','pais_residencia','ciudad_residencia','direccion_fiscal','telefono1','telefono2','email','email_fiscal','estado','nivel_programa_fidelidad','total_visitas','total_noches_acumuladas','monto_gasto_acumulado_historico','puntos_fidelidad_acumulados','puntos_fidelidad_canjeados','fecha_primera_estadia','fecha_ultima_estadia','contacto_emergencia','alergias','condiciones_medicas','preferencias_alimentarias','tags','payload','created_at','updated_at','created_by','updated_by']),
  roles: setFrom(['id','nombre','descripcion','nivel_jerarquia','estado','permisos','payload','created_at','updated_at','created_by','updated_by']),
  usuarios: setFrom(['id','uuid','rol_id','iniciales','nombres','apellidos','correo_electronico','estado','password_hash','telefono','ultimo_acceso','payload','created_at','updated_at','created_by','updated_by']),
  puntosVenta: setFrom(['id','nombre','codigo_punto_venta','tipo','descripcion','moneda_predeterminada','estado','horario_atencion','estaciones_cocina_ids','tipos_comandas_permitidos','payload','created_at','updated_at','created_by','updated_by']),
  mesas: setFrom(['id','punto_venta_id','codigo','nombre_visible','zona','tipo','estado','capacidad_max_pax','capacidad_actual_usada','es_combinable','habitacion_asignada_id','mesa_combinada_ids','payload','created_at','updated_at','created_by','updated_by']),
  reservas: setFrom(['id','codigo_reserva','huesped_id','origen','sub_origen','estado','fecha_creacion','fecha_confirmacion','fecha_checkin','fecha_checkout','fecha_checkin_real','fecha_checkout_real','total_noches','total_personas','adultos','ninos','moneda','politica_cancelacion_id','codigo_promocional_id','monto_total_reserva','subtotal_alojamiento','impuestos','descuentos','pago_garantia','huesped','habitaciones','acompanantes','historial_cambios','checkin_info','checkout_info','payload','created_at','updated_at','created_by','updated_by']),
  folios: setFrom(['id','codigo','numero_folio','reserva_id','huesped_id','habitacion_id','checkin_id','estado','fecha_apertura','fecha_cierre','fecha_checkout','fecha_checkout_real','moneda','es_cuenta_compartida','folios_compartidos_ids','usuario_id_apertura','usuario_id_cierre','subtotal_sin_impuestos','total_impuestos','total_propinas','total_descuentos','total_bonificaciones_cortesia','total_folio','total_pagado','saldo_pendiente','limite_credito_autorizado','credito_excedido','notas_internas','cargos','pagos','payload','created_at','updated_at','created_by','updated_by']),
  cargosFolio: setFrom(['id','folio_id','reserva_id','habitacion_id','huesped_id','comanda_id','comanda_detalle_id','referencia_id','referencia_externa_id','numero_linea','tipo','tipo_concepto','concepto','descripcion','origen','origen_cargo','estado','cantidad','unidad_medida','precio_unitario','monto','subtotal','total','monto_impuesto','impuesto_porcentaje','descuento_monto','descuento_porcentaje','propina_monto','moneda','fecha_cargo','fecha_aplicacion','fecha_vencimiento','cargo_auto','anulado','es_anulado','motivo_anulacion','impuestos_ids','impuestos_monto_desglosado','descuentos_ids','descuentos_monto_desglosado','payload','created_at','updated_at','created_by','updated_by']),
  pagosFolio: setFrom(['id','folio_id','reserva_id','habitacion_id','caja_sesion_id','usuario_id','metodo_pago','sub_metodo_pago','monto','moneda','tipo_cambio_moneda_referencia','monto_moneda_original','fecha_hora_pago','referencia_bancaria','comprobante_asociado_id','comprobante_numero','estado','es_propina','es_parcial','es_devolucion','pago_original_id','comprobante_envio_correo','comprobante_envio_whatsapp','comprobante_pdf_url','cajero_nombre','aprobacion_codigo','observaciones','payload','created_at','updated_at','created_by','updated_by']),
  comandas: setFrom(['id','punto_venta_id','mesa_id','habitacion_id','folio_id','reserva_id','huesped_titular_id','numero_correlativo','tipo_comanda','tipo_consumo','prioridad','estado','estado_entrega','modo_atencion','usuario_id_mozo_apertura','turno_servicio_id','fecha_apertura','hora_apertura','fecha_cierre','hora_cierre','hora_envio_kds','pax_adultos','pax_ninos','moneda','total_neto_sin_impuestos','total_impuestos','total_descuentos','propina_sugerida','propina_aplicada_monto','total_propinas','total_comanda','total_final_con_propina','saldo_pendiente','total_cobrado','impuestos_detalle','detalles','cobros','cierre','observaciones_internas','tickets_kds_ids','facturas_ids','payload','created_at','updated_at','created_by','updated_by']),
  comandasDetalles: setFrom(['id','comanda_id','producto_id','presentacion_id','numero_linea','cantidad','precio_unitario','subtotal','monto_linea','moneda','estado_preparacion','observaciones','comentarios_internos','estacion_cocina_id','usuario_id_asignado_estacion','hora_solicitado','hora_inicio_preparacion','hora_termino_preparacion','hora_entregado','es_modificacion','es_cortesia','es_complemento_cargo','ticket_impreso_kds','impuestos_ids','impuestos_monto_desglosado','seleccion_modificadores','alergenos_omitidos_ids','payload','created_at','updated_at','created_by','updated_by']),
};

const CLONE = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const tryNum = (v: any): any => (typeof v === 'bigint' ? Number(v) : v);

export function normalizeRow<T>(r: any): T | undefined {
  if (!r) return undefined;
  const flat: any = {};
  for (const k of Object.keys(r)) flat[k] = tryNum(r[k]);
  try { if (typeof flat.payload === 'string') flat.payload = JSON.parse(flat.payload || '{}'); } catch (_e) {}
  if (flat.payload && typeof flat.payload === 'object' && !Array.isArray(flat.payload)) {
    for (const pk of Object.keys(flat.payload)) {
      if (flat[pk] === undefined || flat[pk] === null) flat[pk] = tryNum(flat.payload[pk]);
    }
  }
  return toCamel<T>(flat);
}

function applyWhitelist(snake: any, whitelist: Set<string>): any {
  const row: any = {};
  const extra: any = {};
  Object.entries(snake || {}).forEach(([k, v]) => {
    if (k === 'payload') return;
    if (whitelist.has(k)) row[k] = v;
    else extra[k] = v;
  });
  const base = (snake?.payload && typeof snake?.payload === 'object' && !Array.isArray(snake?.payload)) ? snake.payload : {};
  row.payload = { ...base, ...extra };
  return row;
}

export class SupabaseDB {
  public client: SupabaseClient | null = null;
  constructor() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      } catch (e) {
        console.error('[SupabaseDB] createClient error:', (e as any)?.message || e);
        this.client = null;
      }
    }
  }
  isOnline(): boolean { return !!this.client; }

  async allAsync<T extends object>(key: CollectionKey): Promise<T[]> {
    if (!this.client || !TABLE[key]) return [];
    try {
      const { data, error } = await this.client.from(TABLE[key]).select('*').limit(10000);
      if (error) { console.error(`[SupabaseDB.allAsync] ${TABLE[key]}:`, error.message); return []; }
      return (data || []).map((r) => normalizeRow<T>(r)).filter(Boolean) as T[];
    } catch (e) {
      console.error(`[SupabaseDB.allAsync] ${TABLE[key]} exception:`, (e as any)?.message || e);
      return [];
    }
  }

  async addAsync<T extends { id?: string; createdAt?: string; updatedAt?: string; createdBy?: string; updatedBy?: string }>(
    key: CollectionKey,
    item: Create<T>
  ): Promise<T> {
    const now = seedUtil.nowISO();
    const itemWithAudit: any = {
      id: (item as any).id || seedUtil.generateUUID(),
      createdAt: (item as any).createdAt || now,
      updatedAt: (item as any).updatedAt || now,
      createdBy: (item as any).createdBy || (item as any).userId || 'system-frontend',
      updatedBy: (item as any).updatedBy || 'system-frontend',
      ...(item as any),
    };
    if (!this.client || !TABLE[key]) return CLONE(itemWithAudit);
    try {
      let snake = toSnake(itemWithAudit);
      if (key === 'reservas' && !snake.codigo_reserva) {
        try {
          const { data: cods } = await this.client.from(TABLE[key]).select('codigo_reserva');
          let max = 1000;
          for (const r of cods || []) {
            const n = parseInt(String((r as any).codigo_reserva || '').replace(/^R-/i, ''), 10);
            if (Number.isFinite(n) && n > max) max = n;
          }
          snake.codigo_reserva = `R-${max + 1}`;
          itemWithAudit.codigoReserva = snake.codigo_reserva;
        } catch (_e) {
          snake.codigo_reserva = `R-${Date.now().toString().slice(-7)}`;
          itemWithAudit.codigoReserva = snake.codigo_reserva;
        }
      }
      const wl = WHITELISTS[key];
      if (wl) snake = applyWhitelist(snake, wl);
      else if (!snake.payload || typeof snake.payload !== 'object' || Array.isArray(snake.payload)) snake.payload = {};
      const { data, error } = await this.client.from(TABLE[key]).insert(snake).select().maybeSingle();
      if (error) {
        console.error(`[SupabaseDB.addAsync] ${TABLE[key]}:`, error.message, JSON.stringify(snake).slice(0, 150));
        return CLONE(itemWithAudit);
      }
      return (data ? normalizeRow<T>(data) : CLONE(itemWithAudit)) as T;
    } catch (e) {
      console.error(`[SupabaseDB.addAsync] ${TABLE[key]} exception:`, (e as any)?.message || e);
      return CLONE(itemWithAudit);
    }
  }

  async updateAsync<T extends { id: string; updatedAt?: string; updatedBy?: string }>(
    key: CollectionKey,
    id: string,
    changes: Update<T>
  ): Promise<T | undefined> {
    const patch: any = { ...(changes as any), id, updatedAt: seedUtil.nowISO() };
    if (!this.client || !TABLE[key]) return undefined;
    try {
      let snake = toSnake(patch);
      const wl = WHITELISTS[key];
      if (wl) {
        try {
          const { data: actual }: any = await this.client.from(TABLE[key]).select('payload').eq('id', id).maybeSingle();
          if (actual && actual.payload && typeof actual.payload === 'object' && !Array.isArray(actual.payload)) {
            snake.payload = { ...actual.payload, ...(snake.payload || {}) };
          }
        } catch (_e) {}
        snake = applyWhitelist(snake, wl);
      } else if (!snake.payload || typeof snake.payload !== 'object' || Array.isArray(snake.payload)) {
        snake.payload = {};
      }
      const { data, error } = await this.client.from(TABLE[key]).update(snake).eq('id', id).select().maybeSingle();
      if (error) { console.error(`[SupabaseDB.updateAsync] ${TABLE[key]}/${id}:`, error.message); return undefined; }
      return data ? normalizeRow<T>(data) : undefined;
    } catch (e) {
      console.error(`[SupabaseDB.updateAsync] ${TABLE[key]}/${id} exception:`, (e as any)?.message || e);
      return undefined;
    }
  }

  async removeAsync(key: CollectionKey, id: string): Promise<boolean> {
    if (!this.client || !TABLE[key]) return false;
    try {
      const { error } = await this.client.from(TABLE[key]).delete().eq('id', id);
      if (error) { console.error(`[SupabaseDB.removeAsync] ${TABLE[key]}/${id}:`, error.message); return false; }
      return true;
    } catch (e) {
      console.error(`[SupabaseDB.removeAsync] ${TABLE[key]}/${id} exception:`, (e as any)?.message || e);
      return false;
    }
  }
}

const instance = new SupabaseDB();
export const db = instance;
export const dbRemota = instance;
export const supabase = instance.client;
export default instance;
export { seedUtil, type Create, type Update };
export type {
  TipoHabitacion, Habitacion, Tarifa, Temporada, PoliticaCancelacion, CodigoPromocional,
  Reserva, Huesped, Folio, CargoFolio, PagoFolio,
  Usuario, Rol, PuntoVenta, CategoriaFB, ProductoFB, PresentacionProducto, ModificadorGrupo,
  AlergenoProducto, Mesa, Comanda, ComandaDetalle, ImpuestoTarifa,
};
