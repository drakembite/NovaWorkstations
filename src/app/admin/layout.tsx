import type { Metadata } from 'next';
import { AdminLayoutClient } from './AdminLayoutClient';

export const metadata: Metadata = {
  title: 'NovaWorkstations Admin | Panel de Control',
  description: 'Panel de administración y gestión operativa de NovaWorkstations.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
