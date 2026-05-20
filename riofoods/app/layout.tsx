import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rio Foods CRM',
  description: 'CRM de logística y distribución',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
