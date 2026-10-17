import React from 'react';
import type { Metadata } from 'next';
import { CheckoutView } from '@/components/CheckoutView';

export const metadata: Metadata = {
  title: 'Finalizar Compra',
  description:
    'Ingresa los datos de entrega de tu pedido y confirma tu compra con el simulador de pago en 1 clic de NovaWorkstations.',
};

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-slate-950 pb-16 pt-6">
      <CheckoutView />
    </main>
  );
}
