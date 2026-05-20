'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import SupabaseWarning from '@/components/SupabaseWarning';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Pedido, Contacto, Producto, PedidoItem, EstadoPedido } from '@/lib/types';
import { fmtMoney, fmtFecha, hoyISO } from '@/lib/format';
import { Plus, X, Trash2, FileDown, Pencil, Search } from 'lucide-react';
import Link from 'next/link';

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Pedido | null>(null);
  const [filtroContacto, setFiltroContacto] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | ''>('');

  useEffect(() => {
    if (isSupabaseConfigured()) cargar();
  }, []);

  async function cargar() {
    const [pR, cR, prR] = await Promise.all([
      supabase
        .from('pedidos')
        .select('*, contacto:contactos(*), items:pedido_items(*)')
        .order('fecha_entrega', { ascending: false })
        .limit(200),
      supabase.from('contactos').select('*').order('nombre'),
      supabase.from('productos').select('*').eq('activo', true).order('nombre'),
    ]);
    setPedidos(pR.data || []);
    setContactos(cR.data || []);
    setProductos(prR.data || []);
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este pedido?')) return;
    await supabase.from('pedidos').delete().eq('id', id);
    cargar();
  }

  async function cambiarEstado(id: string, estado: EstadoPedido) {
    await supabase.from('pedidos').update({ estado }).eq('id', id);
    cargar();
  }

  const visibles = pedidos.filter((p) => {
    if (filtroContacto && p.contacto_id !== filtroContacto) return false;
    if (filtroDesde && p.fecha_entrega < filtroDesde) return false;
    if (filtroHasta && p.fecha_entrega > filtroHasta) return false;
    if (filtroEstado && p.estado !== filtroEstado) return false;
    return true;
  });

  const totalVisible = visibles.reduce((s, p) => s + Number(p.total || 0), 0);

  async function exportarPDF() {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc: any = new jsPDF();
    doc.setFontSize(16);
    doc.text('Rio Foods — Historial de pedidos', 14, 18);
    doc.setFontSize(10);
    doc.text(
      `${filtroDesde ? 'Desde ' + fmtFecha(filtroDesde) : ''} ${
        filtroHasta ? 'Hasta ' + fmtFecha(filtroHasta) : ''
      }`.trim() || 'Todos',
      14,
      25
    );
    const rows = visibles.map((p) => [
      fmtFecha(p.fecha_entrega),
      p.contacto?.nombre || '—',
      p.estado,
      p.items?.length || 0,
      fmtMoney(Number(p.total)),
    ]);
    doc.autoTable({
      startY: 32,
      head: [['Fecha', 'Cliente', 'Estado', 'Items', 'Total']],
      body: rows,
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 9 },
    });
    const finalY = doc.lastAutoTable?.finalY || 50;
    doc.setFontSize(11);
    doc.text(`Total: ${fmtMoney(totalVisible)} · ${visibles.length} pedidos`, 14, finalY + 10);
    doc.save(`pedidos-${hoyISO()}.pdf`);
  }

  return (
    <AppShell>
      <SupabaseWarning />
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-rio-white">Pedidos</h1>
          <p className="text-sm text-rio-muted">Historial completo y carga de nuevos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarPDF} className="btn">
            <FileDown size={16} /> PDF
          </button>
          <button
            onClick={() => {
              setEditando(null);
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} /> Nuevo pedido
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label>Cliente</label>
            <select value={filtroContacto} onChange={(e) => setFiltroContacto(e.target.value)}>
              <option value="">Todos</option>
              {contactos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Desde</label>
            <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} />
          </div>
          <div>
            <label>Hasta</label>
            <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} />
          </div>
          <div>
            <label>Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoPedido | '')}
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="preparado">Preparado</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="card">
          <p className="text-xs text-rio-muted">Pedidos</p>
          <p className="text-xl font-semibold text-rio-white mt-1">{visibles.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-rio-muted">Total</p>
          <p className="text-xl font-semibold text-rio-white mt-1">{fmtMoney(totalVisible)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-rio-muted">Promedio</p>
          <p className="text-xl font-semibold text-rio-white mt-1">
            {fmtMoney(visibles.length ? totalVisible / visibles.length : 0)}
          </p>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="card text-center py-12 text-rio-muted text-sm">
          No hay pedidos con esos filtros
        </div>
      ) : (
        <div className="space-y-2">
          {visibles.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-rio-white">{p.contacto?.nombre || '—'}</p>
                    <EstadoBadge estado={p.estado} />
                  </div>
                  <p className="text-xs text-rio-muted mt-0.5">
                    {fmtFecha(p.fecha_entrega)} · {p.items?.length || 0} ítems
                  </p>
                  {p.notas && <p className="text-xs text-rio-muted mt-1 italic">{p.notas}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-rio-red">{fmtMoney(Number(p.total))}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-rio-ash flex-wrap gap-2">
                <select
                  value={p.estado}
                  onChange={(e) => cambiarEstado(p.id, e.target.value as EstadoPedido)}
                  className="text-xs w-auto"
                  style={{ width: 'auto', padding: '4px 8px' }}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="preparado">Preparado</option>
                  <option value="entregado">Entregado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditando(p);
                      setShowModal(true);
                    }}
                    className="btn btn-ghost p-2"
                  >
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => eliminar(p.id)} className="btn btn-ghost p-2 text-rio-red">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PedidoModal
          pedido={editando}
          contactos={contactos}
          productos={productos}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            cargar();
          }}
        />
      )}
    </AppShell>
  );
}

function EstadoBadge({ estado }: { estado: EstadoPedido }) {
  const map: Record<EstadoPedido, { bg: string; label: string }> = {
    pendiente: { bg: 'bg-yellow-900/30 text-yellow-400', label: 'Pendiente' },
    preparado: { bg: 'bg-blue-900/30 text-blue-400', label: 'Preparado' },
    entregado: { bg: 'bg-green-900/30 text-green-400', label: 'Entregado' },
    cancelado: { bg: 'bg-red-900/30 text-red-400', label: 'Cancelado' },
  };
  const c = map[estado];
  return <span className={`badge ${c.bg}`}>{c.label}</span>;
}

function PedidoModal({
  pedido,
  contactos,
  productos,
  onClose,
  onSaved,
}: {
  pedido: Pedido | null;
  contactos: Contacto[];
  productos: Producto[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [contactoId, setContactoId] = useState(pedido?.contacto_id || '');
  const [fecha, setFecha] = useState(pedido?.fecha_entrega || hoyISO());
  const [notas, setNotas] = useState(pedido?.notas || '');
  const [items, setItems] = useState<PedidoItem[]>(pedido?.items || []);
  const [estado, setEstado] = useState<EstadoPedido>(pedido?.estado || 'pendiente');
  const [guardando, setGuardando] = useState(false);

  function agregarProducto(prod: Producto) {
    const existe = items.find((i) => i.producto_id === prod.id);
    if (existe) {
      setItems(
        items.map((i) =>
          i.producto_id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      );
    } else {
      setItems([
        ...items,
        {
          producto_id: prod.id,
          producto_nombre: prod.nombre,
          tipo: prod.tipo,
          cantidad: 1,
          precio_unit: prod.precio,
        },
      ]);
    }
  }

  function actualizar(idx: number, campo: 'cantidad' | 'precio_unit', valor: number) {
    setItems(items.map((i, k) => (k === idx ? { ...i, [campo]: valor } : i)));
  }

  function quitar(idx: number) {
    setItems(items.filter((_, k) => k !== idx));
  }

  const total = items.reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_unit), 0);

  async function guardar() {
    if (!contactoId) return alert('Elegí un cliente');
    if (!fecha) return alert('Elegí una fecha');
    if (items.length === 0) return alert('Agregá al menos un producto');
    setGuardando(true);

    if (pedido) {
      await supabase
        .from('pedidos')
        .update({
          contacto_id: contactoId,
          fecha_entrega: fecha,
          notas: notas || null,
          estado,
          total,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pedido.id);
      await supabase.from('pedido_items').delete().eq('pedido_id', pedido.id);
      await supabase.from('pedido_items').insert(
        items.map((i) => ({
          pedido_id: pedido.id,
          producto_id: i.producto_id,
          producto_nombre: i.producto_nombre,
          tipo: i.tipo,
          cantidad: i.cantidad,
          precio_unit: i.precio_unit,
        }))
      );
    } else {
      const { data: nuevo } = await supabase
        .from('pedidos')
        .insert({
          contacto_id: contactoId,
          fecha_entrega: fecha,
          notas: notas || null,
          estado,
          total,
        })
        .select()
        .single();
      if (nuevo) {
        await supabase.from('pedido_items').insert(
          items.map((i) => ({
            pedido_id: nuevo.id,
            producto_id: i.producto_id,
            producto_nombre: i.producto_nombre,
            tipo: i.tipo,
            cantidad: i.cantidad,
            precio_unit: i.precio_unit,
          }))
        );
      }
    }
    setGuardando(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70">
      <div className="bg-rio-coal border border-rio-ash rounded-t-2xl md:rounded-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-rio-ash">
          <h2 className="font-semibold text-rio-white">
            {pedido ? 'Editar pedido' : 'Nuevo pedido'}
          </h2>
          <button onClick={onClose} className="text-rio-muted hover:text-rio-white p-1">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label>Cliente</label>
              <select value={contactoId} onChange={(e) => setContactoId(e.target.value)}>
                <option value="">— elegir —</option>
                {contactos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Fecha de entrega</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div>
              <label>Estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoPedido)}>
                <option value="pendiente">Pendiente</option>
                <option value="preparado">Preparado</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
          <div>
            <label>Notas</label>
            <input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Dejar en portería, etc."
            />
          </div>

          <div>
            <label>Agregar productos rápido</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-rio-black rounded-lg border border-rio-ash">
              {productos.length === 0 ? (
                <p className="text-xs text-rio-muted col-span-full py-2 text-center">
                  Cargá productos primero. <Link href="/productos" className="text-rio-red underline">Ir a productos</Link>
                </p>
              ) : (
                productos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => agregarProducto(p)}
                    className="text-left p-2 bg-rio-coal hover:border-rio-red border border-rio-ash rounded-lg text-xs"
                  >
                    <p className="font-medium text-rio-white truncate">{p.nombre}</p>
                    <p className="text-rio-muted">
                      {fmtMoney(p.precio)} / {p.tipo}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {items.length > 0 && (
            <div>
              <label>Items del pedido</label>
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <p className="col-span-5 text-sm text-rio-white truncate">
                      {it.producto_nombre}
                      <span className="text-xs text-rio-muted ml-1">({it.tipo})</span>
                    </p>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.cantidad}
                      onChange={(e) =>
                        actualizar(idx, 'cantidad', Number(e.target.value) || 0)
                      }
                      className="col-span-2 text-sm"
                      placeholder="Cant."
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.precio_unit}
                      onChange={(e) =>
                        actualizar(idx, 'precio_unit', Number(e.target.value) || 0)
                      }
                      className="col-span-3 text-sm"
                      placeholder="Precio"
                    />
                    <p className="col-span-1 text-xs text-right text-rio-muted">
                      {fmtMoney(it.cantidad * it.precio_unit)}
                    </p>
                    <button
                      onClick={() => quitar(idx)}
                      className="col-span-1 text-rio-red p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-rio-ash flex items-center justify-between">
          <div>
            <p className="text-xs text-rio-muted">Total</p>
            <p className="text-xl font-semibold text-rio-red">{fmtMoney(total)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn">
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando} className="btn btn-primary">
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
