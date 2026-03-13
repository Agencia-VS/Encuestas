-- Ejecutar en Supabase SQL Editor
ALTER TABLE public.respuestas
  ADD COLUMN IF NOT EXISTS pais_residencia text,
  ADD COLUMN IF NOT EXISTS nacionalidad text;
