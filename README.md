# Encuestas - Agencia VS

Proyecto Next.js para landing y formulario de encuesta con identidad corporativa de Agencia VS.

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir http://localhost:3000.

## Logo desde Cloudinary

Para cargar el logo desde una URL publica, configura estas variables en tu `.env.local`:

```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu_cloud_name
NEXT_PUBLIC_AGENCY_LOGO_PUBLIC_URL=https://tu-dominio.com/logo-oficial.png
NEXT_PUBLIC_AGENCY_LOGO_FAREWELL_PUBLIC_URL=https://tu-dominio.com/logo-despedida.png

# Opcional: transformaciones Cloudinary (default: f_auto,q_auto,w_900)
NEXT_PUBLIC_CLOUDINARY_LOGO_TRANSFORM=f_auto,q_auto,w_900

# Opcional: transformaciones para logo de despedida (default: f_auto,q_auto,w_320)
NEXT_PUBLIC_CLOUDINARY_LOGO_FAREWELL_TRANSFORM=f_auto,q_auto,w_320
```

Notas:

- Si falta alguna variable, se usa el fallback local en `public/logo-agencia-vs.svg`.
- Si `NEXT_PUBLIC_AGENCY_LOGO_PUBLIC_URL` ya apunta a `res.cloudinary.com`, se usa tal cual.
- Si falta `NEXT_PUBLIC_AGENCY_LOGO_FAREWELL_PUBLIC_URL`, la despedida usa el mismo logo principal.

## Admin y acceso

El panel de estadisticas vive en `/admin` y usa Supabase Auth.

Variables necesarias en entorno de servidor:

```bash
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Opcional: restringe el admin a correos especificos
ADMIN_ALLOWED_EMAILS=admin1@tu-dominio.com,admin2@tu-dominio.com
```

Notas:

- El login en `/admin` usa usuario/contrasena de Supabase Auth.
- Si defines `ADMIN_ALLOWED_EMAILS`, solo esos correos pueden obtener stats del endpoint `/api/admin/stats`.
- Si no defines `ADMIN_ALLOWED_EMAILS`, cualquier usuario autenticado en tu proyecto de Supabase puede entrar al panel.

## Tabla respuestas

El formulario ahora guarda tambien:

- `pais_residencia`
- `nacionalidad`

Antes de desplegar, ejecuta en Supabase SQL Editor el script:

- `sql/alter_respuestas_add_pais_nacionalidad.sql`

## Segmentacion objetivo (Chile)

La encuesta aplica filtro de target:

- `pais_residencia = Chile` **o** `nacionalidad = Chile`
- casos permitidos: chilenos en Chile, chilenos en el extranjero y migrantes en Chile

Adicionalmente:

- edad minima: 18 anos
- doble respuesta: se bloquea por `respondent_id` (identificador por dispositivo)

Adicionalmente, cuando el hosting entrega pais por IP (`x-vercel-ip-country`, `cf-ipcountry` o `cloudfront-viewer-country`), el backend valida que sea `CL`.

Si quieres guardar metadatos de IP en la tabla, ejecuta tambien:

- `sql/alter_respuestas_add_ip_segmentation.sql`

Para habilitar el bloqueo de respuestas duplicadas en base de datos, ejecuta tambien:

- `sql/alter_respuestas_add_respondent_id_unique.sql`

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
