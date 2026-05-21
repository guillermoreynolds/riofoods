'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import SupabaseWarning from '@/components/SupabaseWarning';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Pedido, gananciaPedido, costoPedido } from '@/lib/types';
import { fmtMoney, fmtFecha } from '@/lib/format';
import { TrendingUp, FileDown, Calendar } from 'lucide-react';

type Rango = 'semana' | 'mes' | 'anio' | 'todo';

export default function FinanzasPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [rango, setRango] = useState<Rango>('semana');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured()) cargar();
    else setLoading(false);
  }, []);

  async function cargar() {
    setLoading(true);
    const { data } = await supabase
      .from('pedidos')
      .select('*, contacto:contactos(*), items:pedido_items(*)')
      .neq('estado', 'cancelado')
      .order('fecha_entrega', { ascending: false });
    setPedidos(data || []);
    setLoading(false);
  }

  function rangoFechas(r: Rango): { desde: string; hasta: string } {
    const hoy = new Date();
    const hasta = hoy.toISOString().slice(0, 10);
    if (r === 'todo') return { desde: '0000-01-01', hasta };
    if (r === 'anio') {
      const d = new Date(hoy.getFullYear(), 0, 1);
      return { desde: d.toISOString().slice(0, 10), hasta };
    }
    if (r === 'mes') {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      return { desde: d.toISOString().slice(0, 10), hasta };
    }
    // semana lunes-domingo
    const dow = hoy.getDay() || 7;
    const lun = new Date(hoy);
    lun.setDate(hoy.getDate() - (dow - 1));
    return { desde: lun.toISOString().slice(0, 10), hasta };
  }

  const { desde, hasta } = rangoFechas(rango);
  const filtrados = pedidos.filter((p) => p.fecha_entrega >= desde && p.fecha_entrega <= hasta);

  const facturado = filtrados.reduce((s, p) => s + Number(p.total), 0);
  const costos = filtrados.reduce((s, p) => s + costoPedido(p), 0);
  const ganancia = filtrados.reduce((s, p) => s + gananciaPedido(p), 0);
  const margenPct = facturado > 0 ? (ganancia / facturado) * 100 : 0;
  const clientesActivos = new Set(filtrados.map((p) => p.contacto_id)).size;

  // Ganancia por día
  const porDia: Record<string, { facturado: number; ganancia: number; pedidos: number }> = {};
  filtrados.forEach((p) => {
    const k = p.fecha_entrega;
    if (!porDia[k]) porDia[k] = { facturado: 0, ganancia: 0, pedidos: 0 };
    porDia[k].facturado += Number(p.total);
    porDia[k].ganancia += gananciaPedido(p);
    porDia[k].pedidos += 1;
  });
  const diasOrdenados = Object.entries(porDia).sort((a, b) => b[0].localeCompare(a[0]));
  const maxFacturado = Math.max(...Object.values(porDia).map((d) => d.facturado), 1);

  // Top productos por ganancia
  const porProducto: Record<
    string,
    { nombre: string; cant: number; facturado: number; ganancia: number }
  > = {};
  filtrados.forEach((p) =>
    (p.items || []).forEach((i) => {
      const k = i.producto_nombre;
      if (!porProducto[k])
        porProducto[k] = { nombre: i.producto_nombre, cant: 0, facturado: 0, ganancia: 0 };
      porProducto[k].cant += Number(i.cantidad);
      porProducto[k].facturado += Number(i.cantidad) * Number(i.precio_unit);
      porProducto[k].ganancia +=
        Number(i.cantidad) * (Number(i.precio_unit) - Number(i.costo_unit || 0));
    })
  );
  const topProductos = Object.values(porProducto)
    .sort((a, b) => b.ganancia - a.ganancia)
    .slice(0, 10);

  // Top clientes por ganancia
  const porCliente: Record<string, { nombre: string; pedidos: number; facturado: number; ganancia: number }> = {};
  filtrados.forEach((p) => {
    const nombre = p.contacto?.nombre || '(sin nombre)';
    const k = p.contacto_id || nombre;
    if (!porCliente[k]) porCliente[k] = { nombre, pedidos: 0, facturado: 0, ganancia: 0 };
    porCliente[k].pedidos += 1;
    porCliente[k].facturado += Number(p.total);
    porCliente[k].ganancia += gananciaPedido(p);
  });
  const topClientes = Object.values(porCliente)
    .sort((a, b) => b.ganancia - a.ganancia)
    .slice(0, 10);

  async function exportarPDF() {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc: any = new jsPDF();

    const titulos: Record<Rango, string> = {
      semana: 'Resumen semanal',
      mes: 'Resumen mensual',
      anio: 'Resumen anual',
      todo: 'Resumen total',
    };
    doc.setFontSize(16);
    doc.text(`Rio Foods — ${titulos[rango]}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`${fmtFecha(desde)} a ${fmtFecha(hasta)}`, 14, 25);

    let y = 36;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Resumen', 14, y);
    doc.setFont(undefined, 'normal');
    y += 6;
    doc.text(`Pedidos: ${filtrados.length}`, 14, y);
    y += 5;
    doc.text(`Facturado: ${fmtMoney(facturado)}`, 14, y);
    y += 5;
    doc.text(`Costos: ${fmtMoney(costos)}`, 14, y);
    y += 5;
    doc.text(`Ganancia bruta: ${fmtMoney(ganancia)}  (${margenPct.toFixed(1)}%)`, 14, y);
    y += 5;
    doc.text(`Clientes activos: ${clientesActivos}`, 14, y);
    y += 10;

    if (topProductos.length) {
      doc.setFont(undefined, 'bold');
      doc.text('Productos más rentables', 14, y);
      y += 2;
      doc.autoTable({
        startY: y + 2,
        head: [['Producto', 'Cantidad', 'Facturado', 'Ganancia']],
        body: topProductos.map((t) => [
          t.nombre,
          t.cant.toString(),
          fmtMoney(t.facturado),
          fmtMoney(t.ganancia),
        ]),
        headStyles: { fillColor: [220, 38, 38] },
        styles: { fontSize: 9 },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    if (topClientes.length) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFont(undefined, 'bold');
      doc.text('Mejores clientes (por ganancia)', 14, y);
      doc.autoTable({
        startY: y + 2,
        head: [['Cliente', 'Pedidos', 'Facturado', 'Ganancia']],
        body: topClientes.map((t) => [
          t.nombre,
          t.pedidos.toString(),
          fmtMoney(t.facturado),
          fmtMoney(t.ganancia),
        ]),
        headStyles: { fillColor: [220, 38, 38] },
        styles: { fontSize: 9 },
      });
    }

    doc.save(`finanzas-${rango}-${hasta}.pdf`);
  }

  return (
    <AppShell>
      <SupabaseWarning />
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-rio-white">Finanzas</h1>
          <p className="text-sm text-rio-muted">Facturación, costos y ganancia</p>
        </div>
        <button onClick={exportarPDF} className="btn">
          <FileDown size={16} /> Exportar PDF
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['semana', 'mes', 'anio', 'todo'] as Rango[]).map((r) => (
          <button
            key={r}
            onClick={() => setRango(r)}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
              rango === r
                ? 'bg-rio-red border-rio-red text-white'
                : 'border-rio-ash text-rio-muted hover:text-rio-white'
            }`}
          >
            {r === 'semana' && 'Esta semana'}
            {r === 'mes' && 'Este mes'}
            {r === 'anio' && 'Este año'}
            {r === 'todo' && 'Todo'}
          </button>
        ))}
      </div>

      <p className="text-xs text-rio-muted mb-4">
        <Calendar size={11} className="inline mr-1" />
        {fmtFecha(desde)} a {fmtFecha(hasta)}
      </p>

      {loading ? (
        <p className="text-rio-muted text-sm">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="card">
              <p className="text-xs text-rio-muted">Pedidos</p>
              <p className="text-xl font-semibold text-rio-white mt-1">{filtrados.length}</p>
            </div>
            <div className="card">
              <p className="text-xs text-rio-muted">Facturado</p>
              <p className="text-xl font-semibold text-rio-white mt-1">{fmtMoney(facturado)}</p>
            </div>
            <div className="card">
              <p className="text-xs text-rio-muted">Costos</p>
              <p className="text-xl font-semibold text-rio-muted mt-1">{fmtMoney(costos)}</p>
            </div>
            <div className="card border-green-700">
              <p className="text-xs text-rio-muted flex items-center gap-1">
                <TrendingUp size={11} /> Ganancia ({margenPct.toFixed(1)}%)
              </p>
              <p className="text-xl font-semibold text-green-400 mt-1">{fmtMoney(ganancia)}</p>
            </div>
          </div>

          {diasOrdenados.length > 0 && (
            <div className="card mb-4">
              <h2 className="font-semibold text-rio-white mb-3">Ganancia por día</h2>
              <div className="space-y-2">
                {diasOrdenados.slice(0, 14).map(([d, info]) => {
                  const pctBarra = (info.facturado / maxFacturado) * 100;
                  return (
                    <div key={d}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-rio-white">{fmtFecha(d)}</span>
                        <span className="text-rio-muted">
                          {info.pedidos} pedidos · {fmtMoney(info.facturado)} ·{' '}
                          <span className="text-green-400">+{fmtMoney(info.ganancia)}</span>
                        </span>
                      </div>
                      <div className="h-2 bg-rio-ash rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rio-red transition-all"
                          style={{ width: `${pctBarra}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="font-semibold text-rio-white mb-3">Productos más rentables</h2>
              {topProductos.length === 0 ? (
                <p className="text-sm text-rio-muted">Sin datos</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style={{ textAlign: 'right' }}>Cant.</th>
                      <th style={{ textAlign: 'right' }}>Ganancia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProductos.map((p) => (
                      <tr key={p.nombre}>
                        <td className="text-rio-white">{p.nombre}</td>
                        <td style={{ textAlign: 'right' }}>{p.cant}</td>
                        <td style={{ textAlign: 'right' }} className="text-green-400">
                          {fmtMoney(p.ganancia)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card">
              <h2 className="font-semibold text-rio-white mb-3">Mejores clientes</h2>
              {topClientes.length === 0 ? (
                <p className="text-sm text-rio-muted">Sin datos</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th style={{ textAlign: 'right' }}>Pedidos</th>
                      <th style={{ textAlign: 'right' }}>Ganancia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClientes.map((c) => (
                      <tr key={c.nombre}>
                        <td className="text-rio-white">{c.nombre}</td>
                        <td style={{ textAlign: 'right' }}>{c.pedidos}</td>
                        <td style={{ textAlign: 'right' }} className="text-green-400">
                          {fmtMoney(c.ganancia)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
