-- =====================================================
-- RIO FOODS CRM - Esquema de base de datos
-- Pegar todo en: Supabase > SQL Editor > New Query > Run
-- =====================================================

-- Productos
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  tipo text not null check (tipo in ('kg', 'unidad')),
  precio numeric(10,2) not null default 0,
  imagen_url text,
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Contactos (clientes + leads)
create table if not exists contactos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text unique,
  direccion text,
  notas text,
  tipo text not null default 'lead' check (tipo in ('cliente', 'lead_calificado', 'lead')),
  bot_activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Conversaciones (cabecera de chat por contacto)
create table if not exists conversaciones (
  id uuid primary key default gen_random_uuid(),
  contacto_id uuid references contactos(id) on delete cascade,
  ultimo_mensaje text,
  ultimo_mensaje_at timestamptz default now(),
  no_leidos int default 0,
  bot_activo boolean default true,
  created_at timestamptz default now()
);

-- Mensajes individuales
create table if not exists mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid references conversaciones(id) on delete cascade,
  contenido text not null,
  direccion text not null check (direccion in ('entrante', 'saliente')),
  enviado_por text check (enviado_por in ('cliente', 'bot', 'humano')),
  created_at timestamptz default now()
);

-- Pedidos
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  contacto_id uuid references contactos(id) on delete set null,
  fecha_entrega date not null,
  estado text default 'pendiente' check (estado in ('pendiente', 'preparado', 'entregado', 'cancelado')),
  notas text,
  total numeric(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Items de pedido
create table if not exists pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  producto_nombre text not null,
  tipo text not null,
  cantidad numeric(10,3) not null,
  precio_unit numeric(10,2) not null,
  subtotal numeric(10,2) generated always as (cantidad * precio_unit) stored
);

-- Índices
create index if not exists idx_pedidos_fecha on pedidos(fecha_entrega);
create index if not exists idx_pedidos_contacto on pedidos(contacto_id);
create index if not exists idx_mensajes_conv on mensajes(conversacion_id, created_at desc);
create index if not exists idx_contactos_tipo on contactos(tipo);

-- =====================================================
-- DATOS DE EJEMPLO (cretas + clásicos)
-- =====================================================
insert into productos (nombre, descripcion, tipo, precio) values
  ('Creta de carne x12', 'Caja de 12 cretas de carne', 'unidad', 8500),
  ('Creta de pollo x12', 'Caja de 12 cretas de pollo', 'unidad', 8500),
  ('Creta de jamón y queso x12', 'Caja de 12 cretas de jamón y queso', 'unidad', 9000),
  ('Creta caprese x12', 'Caja de 12 cretas caprese (tomate, albahaca, muzza)', 'unidad', 9500),
  ('Milanesa de ternera', 'Milanesa de nalga, rebozado clásico', 'kg', 12000),
  ('Milanesa de pollo', 'Milanesa de suprema', 'kg', 11000),
  ('Milanesa napolitana', 'Con jamón, queso y salsa', 'kg', 14000),
  ('Empanada x12', 'Docena de empanadas mixtas', 'unidad', 7500),
  ('Tarta de verdura', 'Tarta familiar (8 porciones)', 'unidad', 6500),
  ('Canelones x6', '6 canelones de verdura y ricota', 'unidad', 7000)
on conflict do nothing;

insert into contactos (nombre, telefono, tipo) values
  ('Federico Demo', '+5493515551234', 'cliente'),
  ('María González', '+5493515559876', 'cliente'),
  ('Lead interesado', '+5493515550001', 'lead_calificado')
on conflict (telefono) do nothing;

-- =====================================================
-- STORAGE: bucket para imágenes de productos
-- =====================================================
-- Ejecutar en Supabase > Storage > Create bucket "productos" (PUBLIC)
-- O ejecutar este SQL en SQL Editor:
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict do nothing;

-- Política para que cualquiera pueda leer (lectura pública de imágenes)
create policy "productos_public_read" on storage.objects
  for select using (bucket_id = 'productos');

-- Política para que cualquiera pueda subir (en producción restringir a usuarios autenticados)
create policy "productos_public_insert" on storage.objects
  for insert with check (bucket_id = 'productos');
