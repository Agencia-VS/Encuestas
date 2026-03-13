-- Ejecutar en Supabase SQL Editor (opcional pero recomendado)
ALTER TABLE public.respuestas
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS ip_country text;
