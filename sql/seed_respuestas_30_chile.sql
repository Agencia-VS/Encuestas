-- Ejecutar en Supabase SQL Editor
-- Seed de 30 respuestas de prueba (todas Chile/Chile)

INSERT INTO public.respuestas (
  nombre,
  edad,
  sexo,
  pais_residencia,
  nacionalidad,
  respuesta_1,
  respuesta_2,
  respuesta_3
)
SELECT
  format('Persona %s', lpad(gs::text, 2, '0')) AS nombre,
  (18 + ((gs * 7) % 45))::int AS edad,
  (ARRAY['masculino', 'femenino', 'prefiero_no_decir'])[1 + ((gs - 1) % 3)] AS sexo,
  'Chile' AS pais_residencia,
  'Chile' AS nacionalidad,
  (ARRAY['Argentina', 'Brasil', 'Espana', 'Francia', 'Portugal', 'Inglaterra', 'Otro: Croacia'])[1 + ((gs - 1) % 7)] AS respuesta_1,
  (ARRAY['Messi', 'CR7', 'Mbappe', 'Neymar', 'Lamine Yamal', 'Valverde', 'Otro: Julian Alvarez'])[1 + (gs % 7)] AS respuesta_2,
  (ARRAY['Argentina', 'Brasil', 'Espana', 'Francia', 'Portugal', 'Uruguay', 'Otro: Alemania'])[1 + ((gs + 1) % 7)] AS respuesta_3
FROM generate_series(1, 30) AS gs;