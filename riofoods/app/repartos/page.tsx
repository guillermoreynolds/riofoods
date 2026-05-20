'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import SupabaseWarning from '@/components/SupabaseWarning';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Pedido, EstadoPedido } from '@/lib/types';
import { fmtMoney, fmtFechaLarga, hoyISO } from '@/lib/format';
import { FileDown, Check, Phone, MapPin } from 'lucide-react';

export default function RepartosPage() {
  const [fecha, setFecha] = useState(hoyISO());
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  useEffect(() => {
    if (isSupabaseConfigured()) cargar();
  }, [fecha]);

  async function cargar() {
    const { data } = await supabase
      .from('pedidos')
      .select('*, contacto:contactos(*), items:pedido_items(*)')
      .eq('fecha_entrega', fecha)
      .neq('estado', 'cancelado')
      .order('created_at');
    setPedidos(data || []);
  }

  async function marcarEntregado(id: string) {
    await supabase.from('pedidos').update({ estado: 'entregado' }).eq('id', id);
    cargar();
  }

  // Agregado de productos para preparar
  const agregado = pedidos.reduce<Record<string, { nombre: string; tipo: string; cant: number }>>(
    (acc, p) => {
      (p.items || []).forEach((i) => {
        const key = i.producto_nombre + '|' + i.tipo;
        if (!acc[key]) acc[key] = { nombre: i.producto_nombre, tipo: i.tipo, cant: 0 };
        acc[key].cant += Number(i.cantidad);
      });
      return acc;
    },
    {}
  );
  const paraPreparar = Object.values(agregado).sort((a, b) => b.cant - a.cant);
  const totalDia = pedidos.reduce((s, p) => s + Number(p.total), 0);

  async function exportarPDF() {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc: any = new jsPDF();

    doc.setFontSize(16);
    doc.text('Rio Foods — Hoja de reparto', 14, 18);
    doc.setFontSize(10);
    doc.text(fmtFechaLarga(fecha), 14, 25);

    doc.setFontSize(12);
    doc.text('Para preparar', 14, 36);
    doc.autoTable({
      startY: 40,
      head: [['Producto', 'Cantidad', 'Tipo']],
      body: paraPreparar.map((p) => [p.nombre, p.cant.toString(), p.tipo]),
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 9 },
    });

    let y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('Pedidos por cliente', 14, y);
    y += 4;

    pedidos.forEach((p) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      y += 6;
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`${p.contacto?.nombre || '—'}  ·  ${fmtMoney(Number(p.total))}`, 14, y);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      if (p.contacto?.telefono) {
        y += 5;
        doc.text(`Tel: ${p.contacto.telefono}`, 14, y);
      }
      if (p.contacto?.direccion) {
        y += 5;
        doc.text(`Dir: ${p.contacto.direccion}`, 14, y);
      }
      if (p.notas) {
        y += 5;
        doc.text(`Nota: ${p.notas}`, 14, y);
      }
      (p.items || []).forEach((i) => {
        y += 5;
        doc.text(
          `  • ${i.producto_nombre} — ${i.cantidad} ${i.tipo} × ${fmtMoney(
            Number(i.precio_unit)
          )} = ${fmtMoney(Number(i.cantidad) * Number(i.precio_unit))}`,
          14,
          y
        );
      });
      y += 3;
    });

    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    y += 6;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Total del día: ${fmtMoney(totalDia)} · ${pedidos.length} pedidos`, 14, y);

    doc.save(`reparto-${fecha}.pdf`);
  }

  return (
    <AppShell>
      <SupabaseWarning />
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-rio-white">Repartos del día</h1>
          <p className="text-sm text-rio-muted capitalize">{fmtFechaLarga(fecha)}</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            style={{ width: 160 }}
          />
          <button onClick={() => setFecha(hoyISO())} className="btn">
            Hoy
          </button>
          <button onClick={exportarPDF} className="btn">
            <FileDown size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card">
          <p className="text-xs text-rio-muted">Pedidos</p>
          <p className="text-xl font-semibold text-rio-white mt-1">{pedidos.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-rio-muted">A cobrar</p>
          <p className="text-xl font-semibold text-rio-red mt-1">{fmtMoney(totalDia)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-rio-muted">Entregados</p>
          <p className="text-xl font-semibold text-rio-white mt-1">
            {pedidos.filter((p) => p.estado === 'entregado').length}/{pedidos.length}
          </p>
        </div>
      </div>

      {paraPreparar.length > 0 && (
        <div className="card mb-4 border-rio-red">
          <h2 className="font-semibold text-rio-white mb-3">📋 Para preparar hoy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {paraPreparar.map((p) => (
              <div
                key={p.nombre + p.tipo}
                className="flex justify-between items-center p-2 bg-rio-black rounded-lg"
              >
                <span className="text-sm text-rio-white">{p.nombre}</span>
                <span className="text-sm font-semibold text-rio-red">
                  {p.cant} {p.tipo}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pedidos.length === 0 ? (
        <div className="card text-center py-12 text-rio-muted text-sm">
          No hay pedidos para esta fecha
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => (
            <div
              key={p.id}
              className={`card ${p.estado === 'entregado' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-rio-white">{p.contacto?.nombre || '—'}</p>
                  {p.contacto?.telefono && (
                    <a
                      href={`tel:${p.contacto.telefono}`}
                      className="text-xs text-rio-muted flex items-center gap-1 mt-1 hover:text-rio-white"
                    >
                      <Phone size={11} /> {p.contacto.telefono}
                    </a>
                  )}
                  {p.contacto?.direccion && (
                    <p className="text-xs text-rio-muted flex items-center gap-1 mt-0.5">
                      <MapPin size={11} /> {p.contacto.direccion}
                    </p>
                  )}
                  {p.notas && (
                    <p className="text-xs text-yellow-400 mt-2 italic">📝 {p.notas}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-rio-red">{fmtMoney(Number(p.total))}</p>
                  <p className="text-xs text-rio-muted mt-0.5">{p.estado}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-rio-ash text-sm space-y-1">
                {(p.items || []).map((i, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-rio-white">
                      {i.cantidad} {i.tipo} · {i.producto_nombre}
                    </span>
                    <span className="text-rio-muted">
                      {fmtMoney(Number(i.cantidad) * Number(i.precio_unit))}
                    </span>
                  </div>
                ))}
              </div>
              {p.estado !== 'entregado' && (
                <button
                  onClick={() => marcarEntregado(p.id)}
                  className="btn btn-primary w-full mt-3"
                >
                  <Check size={16} /> Marcar entregado
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
