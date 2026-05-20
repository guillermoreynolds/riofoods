'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const KEY = 'riofoods_session';

export function useAuth(redirectIfMissing = true) {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
    setUser(u);
    setLoading(false);
    if (!u && redirectIfMissing) router.push('/login');
  }, [redirectIfMissing, router]);

  const login = (name: string) => {
    localStorage.setItem(KEY, name);
    setUser(name);
    router.push('/dashboard');
  };
  const logout = () => {
    localStorage.removeItem(KEY);
    setUser(null);
    router.push('/login');
  };

  return { user, loading, login, logout };
}
