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

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
