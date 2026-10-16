import React from 'react';
import { getProducts } from '@/lib/db';
import { ProductTableClient } from './ProductTableClient';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const products = await getProducts();

  return <ProductTableClient initialProducts={products} />;
}
