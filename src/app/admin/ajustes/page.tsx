import React from 'react';
import { getStoreSettings } from '@/lib/db';
import { SettingsManagerClient } from './SettingsManagerClient';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await getStoreSettings();

  return <SettingsManagerClient initialSettings={settings} />;
}
