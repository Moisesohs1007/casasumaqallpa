create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.impuestos (
  id text primary key,
  nombre text not null,
  tipo text,
  valor numeric(12,2),
  descripcion text,
  estado text default 'ACTIVO',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.alergenos (
  id text primary key,
  nombre text not null,
  descripcion text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.categorias_fb (
  id text primary key,
  nombre text not null,
  orden integer default 0,
  descripcion text,
  estado text default 'ACTIVO',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.productos_fb (
  id text primary key,
  categoria_id text references public.categorias_fb(id) on delete set null,
  codigo text,
  nombre text not null,
  descripcion text,
  precio_venta_base numeric(12,2) default 0,
  costo_aproximado numeric(12,2) default 0,
  moneda text default 'PEN',
  estado text default 'ACTIVO',
  presentaciones_activas_ids jsonb not null default '[]'::jsonb,
  modificadores_ids jsonb not null default '[]'::jsonb,
  alergenos_ids jsonb not null default '[]'::jsonb,
  impuestos_ids jsonb not null default '[]'::jsonb,
  estaciones_cocina_ids jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.presentaciones_fb (
  id text primary key,
  producto_id text not null references public.productos_fb(id) on delete cascade,
  nombre text not null,
  precio numeric(12,2) default 0,
  costo_aproximado numeric(12,2) default 0,
  unidad_medida text,
  stock_control boolean default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.modificadores_fb (
  id text primary key,
  nombre text not null,
  descripcion text,
  aplica_a text,
  estado text default 'ACTIVO',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.tipos_habitacion (
  id text primary key,
  nombre text not null,
  descripcion text,
  capacidad_adultos integer default 0,
  capacidad_ninos integer default 0,
  precio_base_noche numeric(12,2) default 0,
  estado text default 'ACTIVO',
  camas jsonb not null default '[]'::jsonb,
  servicios jsonb not null default '[]'::jsonb,
  fotos jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.habitaciones (
  id text primary key,
  tipo_habitacion_id text not null references public.tipos_habitacion(id) on delete restrict,
  codigo text not null unique,
  nombre text,
  piso text,
  ubicacion text,
  vista_efectiva text,
  estado text not null,
  estado_limpieza text,
  notas_internas text,
  bloqueada_hasta timestamptz,
  motivo_bloqueo text,
  ultima_limpieza_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.temporadas (
  id text primary key,
  nombre text not null,
  tipo text,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  factor_precio_porcentaje numeric(8,2),
  color_etiqueta text,
  descripcion text,
  estado text default 'ACTIVO',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.politicas_cancelacion (
  id text primary key,
  nombre text not null,
  plazo_horas_cancelacion_gratis integer,
  multa_porcentaje_cancelacion_tardia numeric(8,2),
  multa_porcentaje_no_show numeric(8,2),
  multa_fija_no_show numeric(12,2),
  moneda_multa_fija text,
  permite_cambiar_fechas boolean default false,
  limite_cambios_fechas integer,
  estado text default 'ACTIVO',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.codigos_promo (
  id text primary key,
  codigo text not null unique,
  nombre text,
  descripcion text,
  tipo_descuento text,
  valor_descuento numeric(12,2) default 0,
  minimo_noches integer,
  minimo_monto numeric(12,2),
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  usos_maximos_totales integer,
  usos_por_cliente integer,
  usos_realizados integer default 0,
  estado text default 'ACTIVO',
  aplica_a_tipos_habitacion_ids jsonb not null default '[]'::jsonb,
  aplica_a_tarifas_ids jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.tarifas (
  id text primary key,
  tipo_habitacion_id text not null references public.tipos_habitacion(id) on delete restrict,
  politica_cancelacion_id text references public.politicas_cancelacion(id) on delete set null,
  temporada_id text references public.temporadas(id) on delete set null,
  nombre text not null,
  moneda text default 'PEN',
  regimen text,
  precio_base_por_noche numeric(12,2) default 0,
  cargos_extra_persona numeric(12,2) default 0,
  cargos_extra_nino numeric(12,2) default 0,
  minimo_noches integer default 1,
  maximo_noches integer,
  fecha_inicio_vigencia timestamptz,
  fecha_fin_vigencia timestamptz,
  estado text default 'ACTIVO',
  impuestos jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.huespedes (
  id text primary key,
  uuid text,
  tipo_documento text,
  numero_documento text not null,
  nombres text not null,
  apellidos text not null,
  nombre_completo text,
  fecha_nacimiento date,
  genero text,
  nacionalidad text,
  pais_residencia text,
  ciudad_residencia text,
  direccion_fiscal text,
  telefono1 text,
  telefono2 text,
  email text,
  email_fiscal text,
  estado text default 'ACTIVO',
  nivel_programa_fidelidad text,
  total_visitas integer default 0,
  total_noches_acumuladas integer default 0,
  monto_gasto_acumulado_historico numeric(14,2) default 0,
  puntos_fidelidad_acumulados integer default 0,
  puntos_fidelidad_canjeados integer default 0,
  fecha_primera_estadia timestamptz,
  fecha_ultima_estadia timestamptz,
  contacto_emergencia jsonb,
  alergias jsonb not null default '[]'::jsonb,
  condiciones_medicas jsonb not null default '[]'::jsonb,
  preferencias_alimentarias jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,
  unique (tipo_documento, numero_documento)
);

create table if not exists public.roles (
  id text primary key,
  nombre text not null unique,
  descripcion text,
  nivel_jerarquia integer default 0,
  estado text default 'ACTIVO',
  permisos jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.usuarios (
  id text primary key,
  uuid text,
  rol_id text references public.roles(id) on delete set null,
  iniciales text,
  nombres text not null,
  apellidos text not null,
  correo_electronico text not null unique,
  estado text default 'ACTIVO',
  password_hash text,
  telefono text,
  ultimo_acceso timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.puntos_venta (
  id text primary key,
  nombre text not null,
  codigo_punto_venta text,
  tipo text,
  descripcion text,
  moneda_predeterminada text default 'PEN',
  estado text default 'ACTIVO',
  horario_atencion jsonb not null default '[]'::jsonb,
  estaciones_cocina_ids jsonb not null default '[]'::jsonb,
  tipos_comandas_permitidos jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.mesas (
  id text primary key,
  punto_venta_id text not null references public.puntos_venta(id) on delete cascade,
  codigo text,
  nombre_visible text,
  zona text,
  tipo text,
  estado text default 'LIBRE',
  capacidad_max_pax integer default 0,
  capacidad_actual_usada integer default 0,
  es_combinable boolean default false,
  habitacion_asignada_id text references public.habitaciones(id) on delete set null,
  mesa_combinada_ids jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.reservas (
  id text primary key,
  codigo_reserva text not null unique,
  huesped_id text references public.huespedes(id) on delete set null,
  origen text,
  sub_origen text,
  estado text not null,
  fecha_creacion timestamptz,
  fecha_confirmacion timestamptz,
  fecha_checkin timestamptz not null,
  fecha_checkout timestamptz not null,
  fecha_checkin_real timestamptz,
  fecha_checkout_real timestamptz,
  total_noches integer default 0,
  total_personas integer default 0,
  adultos integer default 0,
  ninos integer default 0,
  moneda text default 'PEN',
  politica_cancelacion_id text references public.politicas_cancelacion(id) on delete set null,
  codigo_promocional_id text references public.codigos_promo(id) on delete set null,
  monto_total_reserva numeric(14,2) default 0,
  subtotal_alojamiento numeric(14,2) default 0,
  impuestos numeric(14,2) default 0,
  descuentos numeric(14,2) default 0,
  pago_garantia jsonb,
  huesped jsonb,
  habitaciones jsonb not null default '[]'::jsonb,
  acompanantes jsonb not null default '[]'::jsonb,
  historial_cambios jsonb not null default '[]'::jsonb,
  checkin_info jsonb,
  checkout_info jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.folios (
  id text primary key,
  codigo text,
  numero_folio text unique,
  reserva_id text references public.reservas(id) on delete set null,
  huesped_id text references public.huespedes(id) on delete set null,
  habitacion_id text references public.habitaciones(id) on delete set null,
  checkin_id text,
  estado text not null,
  fecha_apertura timestamptz not null,
  fecha_cierre timestamptz,
  fecha_checkout timestamptz,
  fecha_checkout_real timestamptz,
  moneda text default 'PEN',
  es_cuenta_compartida boolean default false,
  folios_compartidos_ids jsonb not null default '[]'::jsonb,
  usuario_id_apertura text,
  usuario_id_cierre text,
  subtotal_sin_impuestos numeric(14,2) default 0,
  total_impuestos numeric(14,2) default 0,
  total_propinas numeric(14,2) default 0,
  total_descuentos numeric(14,2) default 0,
  total_bonificaciones_cortesia numeric(14,2) default 0,
  total_folio numeric(14,2) default 0,
  total_pagado numeric(14,2) default 0,
  saldo_pendiente numeric(14,2) default 0,
  limite_credito_autorizado numeric(14,2) default 0,
  credito_excedido boolean default false,
  notas_internas text,
  cargos jsonb not null default '[]'::jsonb,
  pagos jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.cargos_folio (
  id text primary key,
  folio_id text not null references public.folios(id) on delete cascade,
  reserva_id text references public.reservas(id) on delete set null,
  habitacion_id text references public.habitaciones(id) on delete set null,
  huesped_id text references public.huespedes(id) on delete set null,
  comanda_id text,
  comanda_detalle_id text,
  referencia_id text,
  referencia_externa_id text,
  numero_linea integer default 1,
  tipo text,
  tipo_concepto text,
  concepto text not null,
  descripcion text,
  origen text,
  origen_cargo text,
  estado text default 'PENDIENTE_COBRO',
  cantidad numeric(12,2) default 1,
  unidad_medida text,
  precio_unitario numeric(12,2) default 0,
  monto numeric(14,2) default 0,
  subtotal numeric(14,2) default 0,
  total numeric(14,2) default 0,
  monto_impuesto numeric(14,2) default 0,
  impuesto_porcentaje numeric(8,2),
  descuento_monto numeric(14,2) default 0,
  descuento_porcentaje numeric(8,2),
  propina_monto numeric(14,2) default 0,
  moneda text default 'PEN',
  fecha_cargo timestamptz,
  fecha_aplicacion timestamptz,
  fecha_vencimiento timestamptz,
  cargo_auto boolean default false,
  anulado boolean default false,
  es_anulado boolean default false,
  motivo_anulacion text,
  impuestos_ids jsonb not null default '[]'::jsonb,
  impuestos_monto_desglosado jsonb not null default '[]'::jsonb,
  descuentos_ids jsonb not null default '[]'::jsonb,
  descuentos_monto_desglosado jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.pagos_folio (
  id text primary key,
  folio_id text not null references public.folios(id) on delete cascade,
  reserva_id text references public.reservas(id) on delete set null,
  habitacion_id text references public.habitaciones(id) on delete set null,
  caja_sesion_id text,
  usuario_id text,
  metodo_pago text,
  sub_metodo_pago text,
  monto numeric(14,2) default 0,
  moneda text default 'PEN',
  tipo_cambio_moneda_referencia numeric(12,4) default 1,
  monto_moneda_original numeric(14,2),
  fecha_hora_pago timestamptz,
  referencia_bancaria text,
  comprobante_asociado_id text,
  comprobante_numero text,
  estado text,
  es_propina boolean default false,
  es_parcial boolean default false,
  es_devolucion boolean default false,
  pago_original_id text,
  comprobante_envio_correo boolean default false,
  comprobante_envio_whatsapp boolean default false,
  comprobante_pdf_url text,
  cajero_nombre text,
  aprobacion_codigo text,
  observaciones text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.comandas (
  id text primary key,
  punto_venta_id text not null references public.puntos_venta(id) on delete restrict,
  mesa_id text references public.mesas(id) on delete set null,
  habitacion_id text references public.habitaciones(id) on delete set null,
  folio_id text references public.folios(id) on delete set null,
  reserva_id text references public.reservas(id) on delete set null,
  huesped_titular_id text references public.huespedes(id) on delete set null,
  numero_correlativo text not null,
  tipo_comanda text,
  tipo_consumo text,
  prioridad text,
  estado text not null,
  estado_entrega text,
  modo_atencion text,
  usuario_id_mozo_apertura text,
  turno_servicio_id text,
  fecha_apertura timestamptz not null,
  hora_apertura timestamptz,
  fecha_cierre timestamptz,
  hora_cierre timestamptz,
  hora_envio_kds timestamptz,
  pax_adultos integer default 0,
  pax_ninos integer default 0,
  moneda text default 'PEN',
  total_neto_sin_impuestos numeric(14,2) default 0,
  total_impuestos numeric(14,2) default 0,
  total_descuentos numeric(14,2) default 0,
  propina_sugerida numeric(14,2) default 0,
  propina_aplicada_monto numeric(14,2) default 0,
  total_propinas numeric(14,2) default 0,
  total_comanda numeric(14,2) default 0,
  total_final_con_propina numeric(14,2) default 0,
  saldo_pendiente numeric(14,2) default 0,
  total_cobrado numeric(14,2) default 0,
  impuestos_detalle jsonb not null default '[]'::jsonb,
  detalles jsonb not null default '[]'::jsonb,
  cobros jsonb not null default '[]'::jsonb,
  cierre jsonb,
  observaciones_internas text,
  tickets_kds_ids jsonb not null default '[]'::jsonb,
  facturas_ids jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create table if not exists public.comandas_detalles (
  id text primary key,
  comanda_id text not null references public.comandas(id) on delete cascade,
  producto_id text references public.productos_fb(id) on delete set null,
  presentacion_id text,
  numero_linea integer default 1,
  cantidad numeric(12,2) default 1,
  precio_unitario numeric(12,2) default 0,
  subtotal numeric(14,2) default 0,
  monto_linea numeric(14,2) default 0,
  moneda text default 'PEN',
  estado_preparacion text,
  observaciones text,
  comentarios_internos text,
  estacion_cocina_id text,
  usuario_id_asignado_estacion text,
  hora_solicitado timestamptz,
  hora_inicio_preparacion timestamptz,
  hora_termino_preparacion timestamptz,
  hora_entregado timestamptz,
  es_modificacion boolean default false,
  es_cortesia boolean default false,
  es_complemento_cargo boolean default false,
  ticket_impreso_kds boolean default false,
  impuestos_ids jsonb not null default '[]'::jsonb,
  impuestos_monto_desglosado jsonb not null default '[]'::jsonb,
  seleccion_modificadores jsonb not null default '[]'::jsonb,
  alergenos_omitidos_ids jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create index if not exists idx_habitaciones_tipo on public.habitaciones(tipo_habitacion_id);
create index if not exists idx_habitaciones_estado on public.habitaciones(estado);
create index if not exists idx_tarifas_tipo_habitacion on public.tarifas(tipo_habitacion_id);
create index if not exists idx_huespedes_documento on public.huespedes(tipo_documento, numero_documento);
create index if not exists idx_huespedes_nombre_completo on public.huespedes(nombre_completo);
create index if not exists idx_reservas_huesped on public.reservas(huesped_id);
create index if not exists idx_reservas_estado on public.reservas(estado);
create index if not exists idx_reservas_checkin on public.reservas(fecha_checkin);
create index if not exists idx_reservas_checkout on public.reservas(fecha_checkout);
create index if not exists idx_folios_reserva on public.folios(reserva_id);
create index if not exists idx_folios_habitacion on public.folios(habitacion_id);
create index if not exists idx_folios_estado on public.folios(estado);
create index if not exists idx_cargos_folio_folio on public.cargos_folio(folio_id);
create index if not exists idx_cargos_folio_comanda on public.cargos_folio(comanda_id);
create index if not exists idx_pagos_folio_folio on public.pagos_folio(folio_id);
create index if not exists idx_mesas_punto_venta on public.mesas(punto_venta_id);
create index if not exists idx_mesas_habitacion on public.mesas(habitacion_asignada_id);
create index if not exists idx_comandas_punto_venta on public.comandas(punto_venta_id);
create index if not exists idx_comandas_estado on public.comandas(estado);
create index if not exists idx_comandas_folio on public.comandas(folio_id);
create index if not exists idx_comandas_habitacion on public.comandas(habitacion_id);
create index if not exists idx_comandas_detalles_comanda on public.comandas_detalles(comanda_id);
create index if not exists idx_productos_fb_categoria on public.productos_fb(categoria_id);

do $$
declare
  t text;
begin
  foreach t in array array[
    'impuestos',
    'alergenos',
    'categorias_fb',
    'productos_fb',
    'presentaciones_fb',
    'modificadores_fb',
    'tipos_habitacion',
    'habitaciones',
    'temporadas',
    'politicas_cancelacion',
    'codigos_promo',
    'tarifas',
    'huespedes',
    'roles',
    'usuarios',
    'puntos_venta',
    'mesas',
    'reservas',
    'folios',
    'cargos_folio',
    'pagos_folio',
    'comandas',
    'comandas_detalles'
  ]
  loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s', t);
    execute format('create trigger trg_%1$s_updated_at before update on public.%1$s for each row execute function public.set_updated_at()', t);
    execute format('alter table public.%1$s enable row level security', t);
    execute format('drop policy if exists %1$s_anon_all on public.%1$s', t);
    execute format('create policy %1$s_anon_all on public.%1$s for all to anon using (true) with check (true)', t);
    execute format('drop policy if exists %1$s_authenticated_all on public.%1$s', t);
    execute format('create policy %1$s_authenticated_all on public.%1$s for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
