# AyudaVenezuela 🤝

Plataforma comunitaria que **conecta a quienes ofrecen ayuda con quienes la necesitan**
tras los terremotos del **24 de junio de 2026** (magnitud 7.2 y 7.5) que afectaron a
Caracas, La Guaira y el centro de Venezuela.

Cada persona publica lo que **necesita** (🆘) o lo que **ofrece** (🙌) —transporte,
refugio, alimentos, salud, rescate, materiales— y el resto contacta directamente por
**WhatsApp**. Sin registro, enfocado en Caracas y sus municipios.

## Características

- Tablón filtrable por **tipo** (necesita / ofrece), **ciudad/zona** y **categoría**.
- Publicación sin login, con contacto directo por WhatsApp.
- Diseño **mobile-first** en español, codificado por color (rojo = necesita, verde = ofrece).
- **Modo demo**: funciona sin base de datos (datos de ejemplo en memoria) para probar al instante.
- Backend opcional con **Supabase** (Postgres) para datos reales y persistentes.
- Páginas: `/` (tablón), `/publicar` (formulario), `/recursos` (organizaciones oficiales y seguridad).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase · Vercel.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000  (arranca en modo demo)
```

## Conectar base de datos real (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En el **SQL Editor**, ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql).
3. Copia las credenciales (Project Settings → API):

   ```bash
   cp .env.local.example .env.local
   # Rellena:
   # NEXT_PUBLIC_SUPABASE_URL=...
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

4. Reinicia `npm run dev`. El banner de "modo demo" desaparece y las publicaciones se guardan en Supabase.

> La tabla usa Row Level Security con lectura e inserción públicas (tablón abierto de
> emergencia). Para reducir abuso a futuro: rate limiting, captcha o moderación.

## Desplegar en Vercel

1. Sube el repo a GitHub e impórtalo en [vercel.com](https://vercel.com), **o** usa la CLI:
   ```bash
   npx vercel        # preview
   npx vercel --prod # producción
   ```
2. Añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en
   **Project → Settings → Environment Variables**.

## Estructura

```
app/
  page.tsx          Tablón principal (server, force-dynamic)
  publicar/         Formulario de publicación
  recursos/         Organizaciones oficiales y consejos de seguridad
  actions.ts        Server action: crear publicación (con validación)
components/          Header, Footer, Board (filtros), PostCard, PostForm
lib/
  data.ts           Categorías, ciudades/zonas y datos de ejemplo
  db.ts             Capa de datos: Supabase o memoria (modo demo)
  supabase.ts       Cliente de Supabase
  format.ts         WhatsApp + tiempo relativo en español
supabase/schema.sql Esquema de la base de datos
```

---

Iniciativa comunitaria sin fines de lucro. Verifica siempre con quién hablas antes de
compartir datos o entregar recursos.
