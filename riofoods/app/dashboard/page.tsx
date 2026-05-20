'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import SupabaseWarning from '@/components/SupabaseWarning';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { fmtMoney, hoyISO } from '@/lib/format';
import Link from 'next/link';
import {
  ShoppingCart,
  Truck,
  Users,
  DollarSign,
  Package,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    pedidosHoy: 0,
    facturadoHoy: 0,
    pendientes: 0,
    facturadoSemana: 0,
    contactos: 0,
    productos: 0,
    botActivos: 0,
  });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    cargar();
  }, []);

  async function cargar() {
    const hoy = hoyISO();
    const semana = new Date();
    semana.setDate(semana.getDate() - 7);
    const desde = semana.toISOString().slice(0, 10);

    const [hoyR, pendR, semR, ctR, prR, botR] = await Promise.all([
      supabase.from('pedidos').select('total', { count: 'exact' }).eq('fecha_entrega', hoy),
      supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
      supabase.from('pedidos').select('total').gte('fecha_entrega', desde),
      supabase.from('contactos').select('id', { count: 'exact', head: true }),
      supabase.from('productos').select('id', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('contactos').select('id', { count: 'exact', head: true }).eq('bot_activo', true),
    ]);

    setStats({
      pedidosHoy: hoyR.count || 0,
      facturadoHoy: (hoyR.data || []).reduce((s: number, p: any) => s + Number(p.total || 0), 0),
      pendientes: pendR.count || 0,
      facturadoSemana: (semR.data || []).reduce((s: number, p: any) => s + Number(p.total || 0), 0),
      contactos: ctR.count || 0,
      productos: prR.count || 0,
      botActivos: botR.count || 0,
    });
  }

  return (
    <AppShell>
      <SupabaseWarning />
      <h1 className="text-2xl font-semibold text-rio-white mb-1">Dashboard</h1>
      <p className="text-sm text-rio-muted mb-6">Resumen de operaciones</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Pedidos hoy" value={stats.pedidosHoy} icon={ShoppingCart} />
        <Stat label="Facturado hoy" value={fmtMoney(stats.facturadoHoy)} icon={DollarSign} />
        <Stat label="Pendientes" value={stats.pendientes} icon={Truck} accent />
        <Stat label="Última semana" value={fmtMoney(stats.facturadoSemana)} icon={DollarSign} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Stat label="Contactos" value={stats.contactos} icon={Users} />
        <Stat label="Productos activos" value={stats.productos} icon={Package} />
        <Stat label="Bots activos" value={stats.botActivos} icon={MessageSquare} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Quick href="/pedidos" title="Cargar nuevo pedido" desc="Registrar un pedido entrante" />
        <Quick href="/repartos" title="Ver repartos del día" desc="Qué hay que entregar hoy" />
        <Quick href="/conversaciones" title="Conversaciones" desc="Chats activos con clientes" />
        <Quick href="/productos" title="Editar productos" desc="Precios y catálogo" />
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: any;
  icon: any;
  accent?: boolean;
}) {
  return (
    <div className={`card ${accent ? 'border-rio-red' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-rio-muted">{label}</p>
          <p className="text-xl md:text-2xl font-semibold text-rio-white mt-1 truncate">{value}</p>
        </div>
        <Icon size={18} className={accent ? 'text-rio-red' : 'text-rio-muted'} />
      </div>
    </div>
  );
}

function Quick({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="card hover:border-rio-red transition-colors flex items-center justify-between group"
    >
      <div>
        <p className="text-rio-white font-medium">{title}</p>
        <p className="text-xs text-rio-muted mt-1">{desc}</p>
      </div>
      <ArrowRight size={18} className="text-rio-muted group-hover:text-rio-red transition-colors" />
    </Link>
  );
}
