'use client';
import { useAuth } from '@/lib/auth';
import Image from 'next/image';

export default function LoginPage() {
  const { login } = useAuth(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-rio-black">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="mb-8 w-56 h-56 relative">
          <Image
            src="/logo.png"
            alt="Rio Foods"
            fill
            priority
            style={{ objectFit: 'contain' }}
          />
        </div>

        <h1 className="text-2xl font-semibold text-rio-white mb-2">Rio Foods CRM</h1>
        <p className="text-sm text-rio-muted mb-10">Logística y distribución</p>

        <button
          onClick={() => login('Federico')}
          className="w-full bg-rio-red hover:bg-rio-red-dark transition-colors text-white font-medium py-4 rounded-xl flex items-center justify-center gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold">
            F
          </div>
          <span>Ingresar como Federico</span>
        </button>

        <p className="text-xs text-rio-muted mt-8">v1.0 · uso interno</p>
      </div>
    </div>
  );
}
