import React from 'react';
import { getOrders } from '@/lib/db';
import { OrdersManagerClient } from './OrdersManagerClient';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const orders = await getOrders();

  return <OrdersManagerClient initialOrders={orders} />;
}
