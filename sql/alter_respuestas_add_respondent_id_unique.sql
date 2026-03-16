-- Ejecutar en Supabase SQL Editor
-- Permite bloquear doble respuesta por dispositivo

ALTER TABLE public.respuestas
  ADD COLUMN IF NOT EXISTS respondent_id text;

CREATE UNIQUE INDEX IF NOT EXISTS respuestas_respondent_id_unique
  ON public.respuestas (respondent_id)
  WHERE respondent_id IS NOT NULL;