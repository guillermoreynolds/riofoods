'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import SupabaseWarning from '@/components/SupabaseWarning';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Contacto, TipoContacto } from '@/lib/types';
import { Plus, Pencil, Trash2, X, Search, MessageCircle, Phone } from 'lucide-react';

type Filtro = 'todos' | 'cliente' | 'lead_calificado';

export default function ContactosPage() {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [editando, setEditando] = useState<Contacto | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (isSupabaseConfigured()) cargar();
  }, []);

  async function cargar() {
    const { data } = await supabase
      .from('contactos')
      .select('*')
      .order('nombre', { ascending: true });
    setContactos(data || []);
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este contacto?')) return;
    await supabase.from('contactos').delete().eq('id', id);
    cargar();
  }

  const visibles = contactos
    .filter((c) => {
      if (filtro === 'cliente') return c.tipo === 'cliente';
      if (filtro === 'lead_calificado') return c.tipo === 'lead_calificado';
      return true;
    })
    .filter(
      (c) =>
        !busqueda ||
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.telefono || '').includes(busqueda)
    );

  const counts = {
    todos: contactos.length,
    cliente: contactos.filter((c) => c.tipo === 'cliente').length,
    lead_calificado: contactos.filter((c) => c.tipo === 'lead_calificado').length,
  };

  return (
    <AppShell>
      <SupabaseWarning />
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-rio-white">Contactos</h1>
          <p className="text-sm text-rio-muted">Clientes y leads</p>
        </div>
        <button
          onClick={() => {
            setEditando(null);
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} /> Nuevo
        </button>
      </div>

      <div className="card mb-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {(
            [
              { k: 'todos' as Filtro, label: 'Todos', count: counts.todos },
              { k: 'cliente' as Filtro, label: 'Clientes', count: counts.cliente },
              {
                k: 'lead_calificado' as Filtro,
                label: 'Leads calificados',
                count: counts.lead_calificado,
              },
            ]
          ).map((f) => (
            <button
              key={f.k}
              onClick={() => setFiltro(f.k)}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                filtro === f.k
                  ? 'bg-rio-red border-rio-red text-white'
                  : 'border-rio-ash text-rio-muted hover:text-rio-white'
              }`}
            >
              {f.label} <span className="opacity-70 ml-1">({f.count})</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-rio-muted pointer-events-none"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
            className="pl-9"
          />
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="card text-center py-12 text-rio-muted text-sm">
          No hay contactos con ese filtro
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibles.map((c) => (
            <div key={c.id} className="card flex items-start gap-3 hover:border-rio-red transition-colors">
              <div className="w-10 h-10 rounded-full bg-rio-ash flex items-center justify-center text-sm font-medium text-rio-white shrink-0">
                {c.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-rio-white truncate">{c.nombre}</p>
                  <BadgeTipo tipo={c.tipo} />
                </div>
                {c.telefono && (
                  <p className="text-xs text-rio-muted mt-1 flex items-center gap-1">
                    <Phone size={11} /> {c.telefono}
                  </p>
                )}
                {c.direccion && <p className="text-xs text-rio-muted mt-0.5">{c.direccion}</p>}
              </div>
              <div className="flex flex-col gap-1">
                {c.telefono && (
                  <a
                    href={`https://wa.me/${c.telefono.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost p-2 text-green-400"
                    title="WhatsApp"
                  >
                    <MessageCircle size={14} />
                  </a>
                )}
                <button
                  onClick={() => {
                    setEditando(c);
                    setShowModal(true);
                  }}
                  className="btn btn-ghost p-2"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => eliminar(c.id)}
                  className="btn btn-ghost p-2 text-rio-red"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ContactoModal
          contacto={editando}
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

function BadgeTipo({ tipo }: { tipo: TipoContacto }) {
  if (tipo === 'cliente') return <span className="badge badge-cliente">Cliente</span>;
  if (tipo === 'lead_calificado') return <span className="badge badge-lead-cal">Lead calif.</span>;
  return <span className="badge badge-lead">Lead</span>;
}

function ContactoModal({
  contacto,
  onClose,
  onSaved,
}: {
  contacto: Contacto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(contacto?.nombre || '');
  const [telefono, setTelefono] = useState(contacto?.telefono || '');
  const [direccion, setDireccion] = useState(contacto?.direccion || '');
  const [notas, setNotas] = useState(contacto?.notas || '');
  const [tipo, setTipo] = useState<TipoContacto>(contacto?.tipo || 'lead');

  async function guardar() {
    if (!nombre.trim()) return alert('Falta el nombre');
    const payload = {
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      direccion: direccion.trim() || null,
      notas: notas.trim() || null,
      tipo,
    };
    if (contacto) {
      await supabase.from('contactos').update(payload).eq('id', contacto.id);
    } else {
      await supabase.from('contactos').insert(payload);
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70">
      <div className="bg-rio-coal border border-rio-ash rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-rio-coal flex items-center justify-between p-4 border-b border-rio-ash">
          <h2 className="font-semibold text-rio-white">
            {contacto ? 'Editar contacto' : 'Nuevo contacto'}
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
            <label>Teléfono (con código país)</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+5493515551234"
            />
          </div>
          <div>
            <label>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoContacto)}>
              <option value="lead">Lead</option>
              <option value="lead_calificado">Lead calificado</option>
              <option value="cliente">Cliente</option>
            </select>
          </div>
          <div>
            <label>Dirección</label>
            <input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </div>
          <div>
            <label>Notas</label>
            <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>
        <div className="sticky bottom-0 bg-rio-coal p-4 border-t border-rio-ash flex gap-2">
          <button onClick={onClose} className="btn flex-1">
            Cancelar
          </button>
          <button onClick={guardar} className="btn btn-primary flex-1">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
