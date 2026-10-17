import React from 'react';
import type { Metadata } from 'next';
import { CartView } from '@/components/CartView';

export const metadata: Metadata = {
  title: 'Carrito de Compras',
  description:
    'Revisa los artículos seleccionados en tu carrito de compras, aplica cupones de descuento y continúa al checkout seguro.',
};

export default function CarritoPage() {
  return (
    <main className="min-h-screen bg-slate-950 pb-16 pt-6">
      <CartView />
    </main>
  );
}
