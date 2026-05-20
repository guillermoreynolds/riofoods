'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const u = localStorage.getItem('riofoods_session');
    router.replace(u ? '/dashboard' : '/login');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-rio-black text-rio-muted">
      Cargando…
    </div>
  );
}
