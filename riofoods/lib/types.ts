export type TipoProducto = 'kg' | 'unidad';
export type TipoContacto = 'cliente' | 'lead_calificado' | 'lead';
export type EstadoPedido = 'pendiente' | 'preparado' | 'entregado' | 'cancelado';

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string | null;
  tipo: TipoProducto;
  precio: number;
  costo: number;
  imagen_url?: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductoCosto {
  id: string;
  producto_id: string;
  costo: number;
  notas?: string | null;
  created_at: string;
}

export interface Contacto {
  id: string;
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  lat?: number | null;
  lng?: number | null;
  notas?: string | null;
  tipo: TipoContacto;
  bot_activo: boolean;
  created_at?: string;
}

export interface Conversacion {
  id: string;
  contacto_id: string;
  ultimo_mensaje?: string | null;
  ultimo_mensaje_at?: string | null;
  no_leidos: number;
  bot_activo: boolean;
  contacto?: Contacto;
}

export interface Mensaje {
  id: string;
  conversacion_id: string;
  contenido: string;
  direccion: 'entrante' | 'saliente';
  enviado_por: 'cliente' | 'bot' | 'humano';
  created_at: string;
}

export interface PedidoItem {
  id?: string;
  pedido_id?: string;
  producto_id?: string | null;
  producto_nombre: string;
  tipo: TipoProducto;
  cantidad: number;
  precio_unit: number;
  costo_unit: number;
  subtotal?: number;
}

export interface Pedido {
  id: string;
  contacto_id: string | null;
  fecha_entrega: string;
  estado: EstadoPedido;
  notas?: string | null;
  total: number;
  created_at?: string;
  contacto?: Contacto;
  items?: PedidoItem[];
}

// Helpers de ganancia
export const gananciaPedido = (p: Pedido): number => {
  if (!p.items) return 0;
  return p.items.reduce(
    (s, i) => s + (Number(i.precio_unit) - Number(i.costo_unit || 0)) * Number(i.cantidad),
    0
  );
};

export const costoPedido = (p: Pedido): number => {
  if (!p.items) return 0;
  return p.items.reduce(
    (s, i) => s + Number(i.costo_unit || 0) * Number(i.cantidad),
    0
  );
};

export const margenPct = (precio: number, costo: number): number => {
  if (!precio || precio === 0) return 0;
  return ((precio - costo) / precio) * 100;
};
