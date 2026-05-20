'use client';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AlertTriangle } from 'lucide-react';

export default function SupabaseWarning() {
  if (isSupabaseConfigured()) return null;
  return (
    <div className="card border-rio-red mb-4 flex items-start gap-3">
      <AlertTriangle className="text-rio-red shrink-0 mt-0.5" size={18} />
      <div className="text-sm">
        <p className="font-medium text-rio-white mb-1">Falta configurar Supabase</p>
        <p className="text-rio-muted text-xs leading-relaxed">
          Copiá <code className="bg-rio-ash px-1 rounded">.env.example</code> a{' '}
          <code className="bg-rio-ash px-1 rounded">.env.local</code> y completá tus credenciales
          de Supabase. Ejecutá <code className="bg-rio-ash px-1 rounded">supabase/schema.sql</code>{' '}
          en tu proyecto.
        </p>
      </div>
    </div>
  );
}
