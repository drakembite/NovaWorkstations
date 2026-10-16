import React from 'react';
import { getPromotions } from '@/lib/db';
import { PromotionsManagerClient } from './PromotionsManagerClient';

export const dynamic = 'force-dynamic';

export default async function AdminPromotionsPage() {
  const promotions = await getPromotions();

  return <PromotionsManagerClient initialPromotions={promotions} />;
}
