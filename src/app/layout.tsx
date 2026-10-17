import type { Metadata } from 'next';
import './globals.css';
import { getStoreSettings } from '@/lib/db';
import { CustomHeadScript } from '@/components/CustomHeadScript';
import { AttributionTracker } from '@/components/AttributionTracker';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { getSiteUrl } from '@/lib/catalog';
import { POLICY_META_SHIPPING } from '@/lib/store-policy';

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'NovaWorkstations | Hardware Profesional para Creadores e Ingenieros',
    template: '%s | NovaWorkstations',
  },
  description: `Estaciones de trabajo de alto rendimiento, componentes, laptops para arquitectura y monitores 4K de grado profesional. ${POLICY_META_SHIPPING} Tienda de demostración: no vende ni cobra.`,
  keywords: [
    'NovaWorkstations',
    'workstations',
    'hardware profesional',
    'laptops arquitectura',
    'monitores 4K',
    'render 3D',
    'estaciones de trabajo',
    'diseño y arquitectura',
    'tienda hardware Lima Perú',
  ],
  authors: [{ name: 'NovaWorkstations' }],
  creator: 'NovaWorkstations',
  publisher: 'NovaWorkstations',
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: siteUrl,
    siteName: 'NovaWorkstations',
    title: 'NovaWorkstations | Hardware Profesional para Creadores e Ingenieros',
    description: `Estaciones de trabajo de alto rendimiento, laptops para arquitectura y monitores 4K de grado profesional. ${POLICY_META_SHIPPING}`,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1200&h=630&q=80',
        width: 1200,
        height: 630,
        alt: 'NovaWorkstations Catálogo de Hardware Profesional',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NovaWorkstations | Hardware Profesional',
    description:
      'Estaciones de trabajo portátiles, monitores 4K y equipamiento para creación y diseño.',
    images: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1200&h=630&q=80'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ComputerStore',
              name: 'NovaWorkstations',
              url: siteUrl,
              description:
                'Tienda de comercio electrónico especializada en estaciones de trabajo portátiles, monitores profesionales y equipamiento de hardware para arquitectura, ingeniería y creación audiovisual.',
              currenciesAccepted: 'USD',
              paymentAccepted: 'Credit Card, Debit Card, Wire Transfer',
              priceRange: '$$$',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Lima',
                addressCountry: 'PE',
              },
            }),
          }}
        />
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
