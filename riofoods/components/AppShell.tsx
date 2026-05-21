'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  MessageSquare,
  Users,
  Package,
  TrendingUp,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { href: '/repartos', label: 'Repartos del día', icon: Truck },
  { href: '/finanzas', label: 'Finanzas', icon: TrendingUp },
  { href: '/conversaciones', label: 'Conversaciones', icon: MessageSquare },
  { href: '/contactos', label: 'Contactos', icon: Users },
  { href: '/productos', label: 'Productos', icon: Package },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth(true);
  const pathname = usePathname();
  const [openMobile, setOpenMobile] = useState(false);

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-rio-muted">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-rio-black">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-rio-ash bg-rio-coal sticky top-0 h-screen">
        <div className="p-5 flex items-center gap-3 border-b border-rio-ash">
          <div className="w-10 h-10 relative shrink-0">
            <Image src="/logo.png" alt="Rio Foods" fill style={{ objectFit: 'contain' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rio-white leading-tight">RIO-FOODS</p>
            <p className="text-[10px] text-rio-muted uppercase tracking-wider">Logística</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((it) => {
            const active = pathname.startsWith(it.href);
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-rio-red text-white'
                    : 'text-rio-muted hover:bg-rio-ash hover:text-rio-white'
                }`}
              >
                <Icon size={18} />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-rio-ash">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-rio-red flex items-center justify-center text-sm font-semibold">
              F
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-rio-white truncate">{user}</p>
            </div>
            <button onClick={logout} className="text-rio-muted hover:text-rio-white" title="Salir">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Topbar mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-rio-coal border-b border-rio-ash flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 relative">
            <Image src="/logo.png" alt="Rio Foods" fill style={{ objectFit: 'contain' }} />
          </div>
          <span className="text-sm font-semibold text-rio-white">RIO-FOODS</span>
        </div>
        <button
          onClick={() => setOpenMobile(true)}
          className="p-2 text-rio-white"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Drawer mobile */}
      {openMobile && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpenMobile(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-rio-coal border-r border-rio-ash flex flex-col">
            <div className="p-5 flex items-center justify-between border-b border-rio-ash">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 relative">
                  <Image src="/logo.png" alt="Rio Foods" fill style={{ objectFit: 'contain' }} />
                </div>
                <span className="text-sm font-semibold text-rio-white">RIO-FOODS</span>
              </div>
              <button onClick={() => setOpenMobile(false)} className="text-rio-white p-1">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {nav.map((it) => {
                const active = pathname.startsWith(it.href);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${
                      active
                        ? 'bg-rio-red text-white'
                        : 'text-rio-muted hover:bg-rio-ash hover:text-rio-white'
                    }`}
                  >
                    <Icon size={18} />
                    {it.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-rio-ash">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rio-muted hover:bg-rio-ash"
              >
                <LogOut size={16} /> Salir
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
