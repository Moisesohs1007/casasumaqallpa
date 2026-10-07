-- ========================================================
-- 20261006_000004_alter_habitaciones_capacidad.sql
-- Agrega columnas de capacidad a la tabla public.habitaciones
-- (antes solo estaban en tipos_habitacion y mesas).
-- Capacidad editables POR habitación en Panel Admin Perfil.
-- ========================================================

ALTER TABLE IF EXISTS public.habitaciones
  ADD COLUMN IF NOT EXISTS capacidad_max_pax integer DEFAULT 2;

ALTER TABLE IF EXISTS public.habitaciones
  ADD COLUMN IF NOT EXISTS capacidad_personas integer DEFAULT 2;

ALTER TABLE IF EXISTS public.habitaciones
  ADD COLUMN IF NOT EXISTS capacidad_actual_usada integer DEFAULT 0;

COMMENT ON COLUMN public.habitaciones.capacidad_max_pax IS 'Máximo de personas permitidas en esta habitación (adultos + niños). Editable en Panel Admin Perfil.';
COMMENT ON COLUMN public.habitaciones.capacidad_personas IS 'Alias legacy de capacidad_max_pax para compatibilidad con InMemoryDB.';
COMMENT ON COLUMN public.habitaciones.capacidad_actual_usada IS 'Personas actualmente alojadas (actualizado en check-in/check-out).';

-- Backfill: si la columna acaba de ser creada y vale NULL/0, se inicializa
-- desde la capacidad del tipo de habitación FK.
UPDATE public.habitaciones h
SET
  capacidad_max_pax = COALESCE(
    NULLIF(h.capacidad_max_pax, 0),
    (
      SELECT COALESCE(NULLIF(t.capacidad_adultos, 0), 2) + COALESCE(t.capacidad_ninos, 0)
      FROM public.tipos_habitacion t
      WHERE t.id = h.tipo_habitacion_id
    ),
    2
  ),
  capacidad_personas = COALESCE(
    NULLIF(h.capacidad_personas, 0),
    (
      SELECT COALESCE(NULLIF(t.capacidad_adultos, 0), 2) + COALESCE(t.capacidad_ninos, 0)
      FROM public.tipos_habitacion t
      WHERE t.id = h.tipo_habitacion_id
    ),
    2
  ),
  capacidad_actual_usada = COALESCE(h.capacidad_actual_usada, 0)
WHERE TRUE;
