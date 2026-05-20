# Rio Foods CRM

CRM de logística y distribución para Rio Foods. Pensado para gestionar pedidos por WhatsApp, control de bot de IA, productos, contactos y repartos.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** con paleta Rio Foods (negro / rojo / blanco)
- **Supabase** (Postgres + Storage) para base de datos online centralizada
- **jsPDF** para exportar reportes

## Funcionalidades

- 🔐 Login con usuario único (Federico)
- 📊 Dashboard con métricas en tiempo real
- 🛒 Pedidos con items, precios y estados (pendiente / preparado / entregado / cancelado)
- 🚚 Repartos del día con agregado de productos para preparar y hoja de ruta exportable a PDF
- 💬 Conversaciones de WhatsApp con toggle de bot por chat
- 👥 Contactos con filtros: todos / clientes / leads calificados
- 📦 Productos con tipo (kg / unidad), precio editable e imagen opcional
- 📱 Responsive (PC y mobile)
- ☁️ Base de datos centralizada multidispositivo

## Setup

### 1. Crear proyecto en Supabase

1. Andá a [supabase.com](https://supabase.com) y creá un proyecto nuevo (gratis).
2. Una vez creado, andá a **Project Settings → API** y copiá:
   - `Project URL`
   - `anon public` key
3. Andá a **SQL Editor → New Query**, pegá el contenido de `supabase/schema.sql` y dale Run.

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Editá `.env.local` y completá:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
NEXT_PUBLIC_BOT_WEBHOOK_URL=    # opcional, ver abajo
```

### 3. Instalar y correr

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000`. Tocá "Ingresar como Federico" y listo.

## Deploy

Recomendado: **Vercel** (gratis, deploy en 2 minutos).

```bash
npm install -g vercel
vercel
```

En Vercel, ir a **Project Settings → Environment Variables** y pegar las mismas variables de `.env.local`.

Cualquier dispositivo (PC, celular) accede a la misma URL y comparte los datos en Supabase.

## Integración con el bot de WhatsApp

El sistema NO mueve directamente tu bot — lo gobierna por dos vías:

**1. Lectura de productos por tu agente de IA.**
Tu bot debe leer la tabla `productos` de Supabase para conocer el catálogo y precios actualizados. Ejemplo de query desde n8n / cualquier backend:

```sql
select id, nombre, descripcion, tipo, precio
from productos
where activo = true;
```

Cuando Federico edita un producto en el CRM, el cambio se ve inmediatamente para el bot.

**2. Toggle de bot por chat.**
Cuando se activa/desactiva el bot desde una conversación, ocurren dos cosas:
- Se actualiza `conversaciones.bot_activo` y `contactos.bot_activo` en Supabase.
- Si está configurado `NEXT_PUBLIC_BOT_WEBHOOK_URL`, se hace un POST con:

```json
{
  "event": "bot_toggle",
  "contacto_id": "uuid",
  "telefono": "+549...",
  "bot_activo": true | false
}
```

Tu backend (n8n / Evolution / Meta Cloud API) debe escuchar ese webhook y silenciar/activar el bot para ese contacto. Alternativamente, el bot puede leer en cada mensaje entrante si `contactos.bot_activo = true` antes de responder.

**3. Ingesta de conversaciones.**
Tu backend de WhatsApp debe escribir en las tablas `conversaciones` y `mensajes` cada vez que llegue o salga un mensaje. Estructura recomendada:

```sql
-- Mensaje entrante
insert into conversaciones (contacto_id, ultimo_mensaje, ultimo_mensaje_at)
values ('...', 'Hola, quiero pedir', now())
on conflict (contacto_id) do update set ...;

insert into mensajes (conversacion_id, contenido, direccion, enviado_por)
values ('...', 'Hola, quiero pedir', 'entrante', 'cliente');
```

## Estructura del proyecto

```
riofoods/
├── app/
│   ├── login/              # Pantalla de login con logo
│   ├── dashboard/          # Métricas y atajos
│   ├── pedidos/            # CRUD de pedidos + filtros + PDF
│   ├── repartos/           # Hoja de ruta diaria
│   ├── conversaciones/     # Chats con toggle bot
│   ├── contactos/          # Clientes y leads con filtros
│   ├── productos/          # Catálogo con imágenes
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── AppShell.tsx        # Sidebar + topbar responsive
│   └── SupabaseWarning.tsx
├── lib/
│   ├── supabase.ts
│   ├── auth.ts
│   ├── types.ts
│   └── format.ts
├── public/
│   └── logo.png            # Logo Rio Foods
├── supabase/
│   └── schema.sql          # SQL completo
└── package.json
```

## Notas

- Login es local (un click). No es un sistema de auth seguro — pensado para uso interno con un único operador.
- Las imágenes de productos se guardan en el bucket `productos` de Supabase Storage (lectura pública).
- El historial mantiene los nombres y precios al momento del pedido (snapshot), así si después editás un producto los pedidos viejos no cambian.
