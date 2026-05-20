'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import SupabaseWarning from '@/components/SupabaseWarning';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Conversacion, Mensaje } from '@/lib/types';
import { tiempoRelativo } from '@/lib/format';
import { Bot, BotOff, Send, Search, MessageCircle, ArrowLeft } from 'lucide-react';

export default function ConversacionesPage() {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [seleccionada, setSeleccionada] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevo, setNuevo] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (isSupabaseConfigured()) cargarConvs();
  }, []);

  useEffect(() => {
    if (seleccionada) cargarMensajes(seleccionada.id);
  }, [seleccionada]);

  async function cargarConvs() {
    const { data } = await supabase
      .from('conversaciones')
      .select('*, contacto:contactos(*)')
      .order('ultimo_mensaje_at', { ascending: false });
    setConversaciones(data || []);
  }

  async function cargarMensajes(convId: string) {
    const { data } = await supabase
      .from('mensajes')
      .select('*')
      .eq('conversacion_id', convId)
      .order('created_at', { ascending: true });
    setMensajes(data || []);
  }

  async function toggleBot(conv: Conversacion) {
    const nuevoEstado = !conv.bot_activo;
    await supabase
      .from('conversaciones')
      .update({ bot_activo: nuevoEstado })
      .eq('id', conv.id);
    await supabase
      .from('contactos')
      .update({ bot_activo: nuevoEstado })
      .eq('id', conv.contacto_id);

    // Notificar al webhook del bot si está configurado
    const url = process.env.NEXT_PUBLIC_BOT_WEBHOOK_URL;
    if (url) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'bot_toggle',
            contacto_id: conv.contacto_id,
            telefono: conv.contacto?.telefono,
            bot_activo: nuevoEstado,
          }),
        });
      } catch (e) {
        console.warn('No se pudo notificar al bot:', e);
      }
    }
    cargarConvs();
    if (seleccionada?.id === conv.id) {
      setSeleccionada({ ...seleccionada, bot_activo: nuevoEstado });
    }
  }

  async function enviar() {
    if (!nuevo.trim() || !seleccionada) return;
    await supabase.from('mensajes').insert({
      conversacion_id: seleccionada.id,
      contenido: nuevo.trim(),
      direccion: 'saliente',
      enviado_por: 'humano',
    });
    await supabase
      .from('conversaciones')
      .update({
        ultimo_mensaje: nuevo.trim(),
        ultimo_mensaje_at: new Date().toISOString(),
      })
      .eq('id', seleccionada.id);
    setNuevo('');
    cargarMensajes(seleccionada.id);
    cargarConvs();
  }

  const filtradas = conversaciones.filter(
    (c) =>
      !busqueda ||
      c.contacto?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.contacto?.telefono || '').includes(busqueda)
  );

  return (
    <AppShell>
      <SupabaseWarning />
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-rio-white">Conversaciones</h1>
        <p className="text-sm text-rio-muted">
          Chats con clientes — activá o desactivá el bot por chat
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 h-[calc(100vh-200px)] min-h-[500px]">
        {/* Lista */}
        <div
          className={`card p-0 overflow-hidden flex flex-col md:col-span-1 ${
            seleccionada ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-3 border-b border-rio-ash">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-rio-muted pointer-events-none"
              />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar…"
                className="pl-9 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtradas.length === 0 ? (
              <div className="p-6 text-center text-rio-muted text-sm">
                <MessageCircle size={28} className="mx-auto mb-2 opacity-50" />
                Sin conversaciones todavía
              </div>
            ) : (
              filtradas.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSeleccionada(c)}
                  className={`w-full text-left p-3 border-b border-rio-ash hover:bg-rio-ash transition-colors ${
                    seleccionada?.id === c.id ? 'bg-rio-ash' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-9 h-9 rounded-full bg-rio-red flex items-center justify-center text-sm font-medium text-white shrink-0">
                      {c.contacto?.nombre?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-rio-white truncate">
                          {c.contacto?.nombre || 'Sin nombre'}
                        </p>
                        <span className="text-[10px] text-rio-muted shrink-0">
                          {tiempoRelativo(c.ultimo_mensaje_at)}
                        </span>
                      </div>
                      <p className="text-xs text-rio-muted truncate mt-0.5">
                        {c.ultimo_mensaje || '—'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`badge ${c.bot_activo ? 'badge-on' : 'badge-off'}`}>
                          {c.bot_activo ? '● bot on' : '○ bot off'}
                        </span>
                        {c.no_leidos > 0 && (
                          <span className="badge badge-cliente">{c.no_leidos}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat */}
        <div
          className={`card p-0 overflow-hidden flex flex-col md:col-span-2 ${
            seleccionada ? 'flex' : 'hidden md:flex'
          }`}
        >
          {seleccionada ? (
            <>
              <div className="p-3 border-b border-rio-ash flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setSeleccionada(null)}
                    className="md:hidden p-1 text-rio-muted"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-rio-red flex items-center justify-center text-sm font-medium text-white">
                    {seleccionada.contacto?.nombre?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-rio-white truncate">
                      {seleccionada.contacto?.nombre}
                    </p>
                    <p className="text-xs text-rio-muted truncate">
                      {seleccionada.contacto?.telefono}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleBot(seleccionada)}
                  className={`btn ${
                    seleccionada.bot_activo
                      ? 'bg-green-900/30 border-green-700 text-green-400'
                      : 'bg-rio-ash border-rio-ash text-rio-muted'
                  }`}
                  title={seleccionada.bot_activo ? 'Desactivar bot' : 'Activar bot'}
                >
                  {seleccionada.bot_activo ? (
                    <>
                      <Bot size={14} /> Bot ON
                    </>
                  ) : (
                    <>
                      <BotOff size={14} /> Bot OFF
                    </>
                  )}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-rio-black">
                {mensajes.length === 0 ? (
                  <p className="text-center text-rio-muted text-sm py-8">
                    Sin mensajes en esta conversación
                  </p>
                ) : (
                  mensajes.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${
                        m.direccion === 'saliente' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                          m.direccion === 'saliente'
                            ? m.enviado_por === 'bot'
                              ? 'bg-rio-red/80 text-white'
                              : 'bg-rio-red text-white'
                            : 'bg-rio-ash text-rio-white'
                        }`}
                      >
                        <p>{m.contenido}</p>
                        <p className="text-[10px] opacity-70 mt-1">
                          {m.enviado_por === 'bot' && '🤖 '}
                          {tiempoRelativo(m.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-rio-ash flex gap-2">
                <input
                  value={nuevo}
                  onChange={(e) => setNuevo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && enviar()}
                  placeholder="Escribí un mensaje…"
                />
                <button onClick={enviar} className="btn btn-primary">
                  <Send size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-rio-muted text-sm">
              <div className="text-center">
                <MessageCircle size={36} className="mx-auto mb-3 opacity-40" />
                <p>Seleccioná una conversación</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
