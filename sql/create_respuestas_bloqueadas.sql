-- Ejecutar en Supabase SQL Editor
-- Registra bloqueos para evitar que un encuestado rechazado vuelva a intentar con otros datos

CREATE TABLE IF NOT EXISTS public.respuestas_bloqueadas (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  nombre text NOT NULL,
  edad integer NOT NULL,
  sexo text NOT NULL,
  pais_residencia text NOT NULL,
  nacionalidad text NOT NULL,
  respondent_id text NOT NULL,
  motivo_bloqueo text NOT NULL,
  ip_address text,
  ip_country text
);

CREATE UNIQUE INDEX IF NOT EXISTS respuestas_bloqueadas_respondent_id_unique
  ON public.respuestas_bloqueadas (respondent_id);
