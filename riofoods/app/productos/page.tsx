'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import SupabaseWarning from '@/components/SupabaseWarning';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Producto, ProductoCosto, TipoProducto, margenPct } from '@/lib/types';
import { fmtMoney, fmtFecha } from '@/lib/format';
import { Plus, Pencil, Trash2, ImagePlus, X, Search, History, TrendingUp } from 'lucide-react';
import Image from 'next/image';

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [historialDe, setHistorialDe] = useState<Producto | null>(null);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured()) cargar();
    else setLoading(false);
  }, []);

  async function cargar() {
    setLoading(true);
    const { data } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });
    setProductos(data || []);
    setLoading(false);
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este producto?')) return;
    await supabase.from('productos').update({ activo: false }).eq('id', id);
    cargar();
  }

  const filtrados = productos.filter(
    (p) => p.activo && p.nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <AppShell>
      <SupabaseWarning />
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-rio-white">Productos</h1>
          <p className="text-sm text-rio-muted">Catálogo, precios y costos</p>
        </div>
        <button
          onClick={() => {
            setEditando(null);
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      <div className="card mb-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-rio-muted pointer-events-none"
          />
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar producto…"
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-rio-muted text-sm">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <div className="card text-center py-12 text-rio-muted text-sm">
          {productos.length === 0 ? 'Cargá tu primer producto' : 'No hay productos que coincidan'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtrados.map((p) => {
            const margen = margenPct(Number(p.precio), Number(p.costo));
            const ganancia = Number(p.precio) - Number(p.costo || 0);
            return (
              <div key={p.id} className="card flex gap-3 hover:border-rio-red transition-colors">
                <div className="w-20 h-20 rounded-lg bg-rio-ash flex items-center justify-center overflow-hidden shrink-0 relative">
                  {p.imagen_url ? (
                    <Image src={p.imagen_url} alt={p.nombre} fill style={{ objectFit: 'cover' }} />
                  ) : (
                    <ImagePlus size={20} className="text-rio-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-rio-white truncate">{p.nombre}</p>
                  <p className="text-xs text-rio-muted line-clamp-1 mt-0.5">
                    {p.descripcion || '—'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-rio-red font-semibold text-sm">
                      {fmtMoney(p.precio)}
                    </span>
                    <span className="text-xs text-rio-muted">/ {p.tipo}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-rio-muted">
                      Costo: <span className="text-rio-white">{fmtMoney(p.costo || 0)}</span>
                    </span>
                    {p.costo > 0 && (
                      <span
                        className={`flex items-center gap-1 ${
                          margen > 30
                            ? 'text-green-400'
                            : margen > 0
                            ? 'text-yellow-400'
                            : 'text-rio-red'
                        }`}
                      >
                        <TrendingUp size={11} /> {margen.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setHistorialDe(p)}
                    className="btn btn-ghost p-2"
                    title="Historial de costos"
                  >
                    <History size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setEditando(p);
                      setShowModal(true);
                    }}
                    className="btn btn-ghost p-2"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => eliminar(p.id)}
                    className="btn btn-ghost p-2 text-rio-red"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ProductoModal
          producto={editando}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            cargar();
          }}
        />
      )}

      {historialDe && (
        <HistorialModal producto={historialDe} onClose={() => setHistorialDe(null)} />
      )}
    </AppShell>
  );
}

function ProductoModal({
  producto,
  onClose,
  onSaved,
}: {
  producto: Producto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(producto?.nombre || '');
  const [descripcion, setDescripcion] = useState(producto?.descripcion || '');
  const [tipo, setTipo] = useState<TipoProducto>(producto?.tipo || 'unidad');
  const [precio, setPrecio] = useState(producto?.precio || 0);
  const [costo, setCosto] = useState(producto?.costo || 0);
  const [notasCosto, setNotasCosto] = useState('');
  const [imagenUrl, setImagenUrl] = useState(producto?.imagen_url || '');
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const margen = margenPct(Number(precio), Number(costo));
  const ganancia = Number(precio) - Number(costo);
  const costoOriginal = Number(producto?.costo || 0);
  const costoCambio = Number(costo) !== costoOriginal;

  async function subirImagen(file: File) {
    setSubiendo(true);
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from('productos').upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from('productos').getPublicUrl(path);
      setImagenUrl(data.publicUrl);
    } else {
      alert('Error subiendo imagen: ' + error.message);
    }
    setSubiendo(false);
  }

  async function guardar() {
    if (!nombre.trim()) return alert('Falta el nombre');
    setGuardando(true);
    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      tipo,
      precio: Number(precio) || 0,
      costo: Number(costo) || 0,
      imagen_url: imagenUrl || null,
      updated_at: new Date().toISOString(),
    };

    let prodId = producto?.id;
    if (producto) {
      await supabase.from('productos').update(payload).eq('id', producto.id);
    } else {
      const { data: nuevo } = await supabase
        .from('productos')
        .insert(payload)
        .select()
        .single();
      prodId = nuevo?.id;
    }

    // Si cambió el costo, registrar en historial
    if (prodId && costoCambio && Number(costo) > 0) {
      await supabase.from('producto_costos').insert({
        producto_id: prodId,
        costo: Number(costo),
        notas: notasCosto.trim() || null,
      });
    }

    setGuardando(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70">
      <div className="bg-rio-coal border border-rio-ash rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-rio-coal flex items-center justify-between p-4 border-b border-rio-ash">
          <h2 className="font-semibold text-rio-white">
            {producto ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onClose} className="text-rio-muted hover:text-rio-white p-1">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
          </div>
          <div>
            <label>Descripción</label>
            <textarea rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoProducto)}>
                <option value="unidad">Unidad</option>
                <option value="kg">Por kilo</option>
              </select>
            </div>
            <div>
              <label>Precio de venta</label>
              <input
                type="number"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <label>Costo unitario</label>
            <input
              type="number"
              step="0.01"
              value={costo}
              onChange={(e) => setCosto(Number(e.target.value))}
              placeholder="Lo que te sale producir/comprar 1"
            />
          </div>
          {costoCambio && producto && (
            <div>
              <label>Nota del cambio de costo (opcional)</label>
              <input
                value={notasCosto}
                onChange={(e) => setNotasCosto(e.target.value)}
                placeholder='Ej: "Subió proveedor", "Compra mayor"'
              />
              <p className="text-[10px] text-rio-muted mt-1">
                Costo anterior: {fmtMoney(costoOriginal)} → nuevo: {fmtMoney(Number(costo))}
              </p>
            </div>
          )}
          {Number(precio) > 0 && Number(costo) > 0 && (
            <div className="bg-rio-black border border-rio-ash rounded-lg p-3 flex justify-between text-sm">
              <div>
                <p className="text-xs text-rio-muted">Ganancia / unidad</p>
                <p
                  className={`font-semibold ${
                    ganancia > 0 ? 'text-green-400' : 'text-rio-red'
                  }`}
                >
                  {fmtMoney(ganancia)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-rio-muted">Margen</p>
                <p
                  className={`font-semibold ${
                    margen > 30 ? 'text-green-400' : margen > 0 ? 'text-yellow-400' : 'text-rio-red'
                  }`}
                >
                  {margen.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
          <div>
            <label>Imagen (opcional)</label>
            {imagenUrl && (
              <div className="mb-2 relative w-full h-32 rounded-lg overflow-hidden bg-rio-ash">
                <Image src={imagenUrl} alt="" fill style={{ objectFit: 'cover' }} />
                <button
                  onClick={() => setImagenUrl('')}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 text-white"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && subirImagen(e.target.files[0])}
              disabled={subiendo}
            />
            {subiendo && <p className="text-xs text-rio-muted mt-1">Subiendo…</p>}
          </div>
        </div>
        <div className="sticky bottom-0 bg-rio-coal p-4 border-t border-rio-ash flex gap-2">
          <button onClick={onClose} className="btn flex-1">
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando} className="btn btn-primary flex-1">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistorialModal({
  producto,
  onClose,
}: {
  producto: Producto;
  onClose: () => void;
}) {
  const [historial, setHistorial] = useState<ProductoCosto[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('producto_costos')
        .select('*')
        .eq('producto_id', producto.id)
        .order('created_at', { ascending: false });
      setHistorial(data || []);
    })();
  }, [producto.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70">
      <div className="bg-rio-coal border border-rio-ash rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-rio-coal flex items-center justify-between p-4 border-b border-rio-ash">
          <div>
            <h2 className="font-semibold text-rio-white">Historial de costos</h2>
            <p className="text-xs text-rio-muted">{producto.nombre}</p>
          </div>
          <button onClick={onClose} className="text-rio-muted hover:text-rio-white p-1">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <div className="card mb-3 bg-rio-black">
            <p className="text-xs text-rio-muted">Costo actual</p>
            <p className="text-xl font-semibold text-rio-white mt-1">{fmtMoney(producto.costo || 0)}</p>
          </div>

          {historial.length === 0 ? (
            <p className="text-center text-rio-muted text-sm py-8">
              Aún no hay cambios registrados.
              <br />
              Cuando edites el costo, se guardará acá.
            </p>
          ) : (
            <div className="space-y-2">
              {historial.map((h, idx) => {
                const anterior = historial[idx + 1];
                const diff = anterior ? Number(h.costo) - Number(anterior.costo) : 0;
                return (
                  <div key={h.id} className="card bg-rio-black">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-rio-white font-medium">{fmtMoney(h.costo)}</p>
                        <p className="text-xs text-rio-muted mt-0.5">
                          {fmtFecha(h.created_at)} ·{' '}
                          {new Date(h.created_at).toLocaleTimeString('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {h.notas && (
                          <p className="text-xs text-rio-muted mt-1 italic">{h.notas}</p>
                        )}
                      </div>
                      {anterior && (
                        <span
                          className={`text-xs font-semibold ${
                            diff > 0 ? 'text-rio-red' : diff < 0 ? 'text-green-400' : 'text-rio-muted'
                          }`}
                        >
                          {diff > 0 ? '↑' : diff < 0 ? '↓' : ''} {fmtMoney(Math.abs(diff))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
