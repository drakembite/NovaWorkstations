import type { Metadata } from 'next';
import './globals.css';
import { getStoreSettings } from '@/lib/db';
import { CustomHeadScript } from '@/components/CustomHeadScript';
import { AttributionTracker } from '@/components/AttributionTracker';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'NovaWorkstations | Hardware Profesional para Creadores e Ingenieros',
  description:
    'Estaciones de trabajo de alto rendimiento, componentes y monitores de grado profesional con despacho en 24h en Lima y envíos a todo el Perú.',
  keywords: [
    'NovaWorkstations',
    'workstations',
    'hardware profesional',
    'laptops arquitectura',
    'monitores 4K',
    'render 3D',
    'estaciones de trabajo',
    'Lima Perú',
  ],
  authors: [{ name: 'NovaWorkstations' }],
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let customHeadScript: string | null = null;
  try {
    const settings = await getStoreSettings();
    customHeadScript = settings?.custom_head_script || null;
  } catch (err) {
    console.warn('[Layout] Could not retrieve store settings:', err);
  }

  return (
    <html lang="es" className="dark scroll-smooth">
      <head>
        <CustomHeadScript script={customHeadScript} />
      </head>
      <body className="flex min-h-screen flex-col bg-slate-950 font-sans text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-950">
        <AttributionTracker />
        <Navbar />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
