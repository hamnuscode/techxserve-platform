import { LayoutDashboard, Receipt, FileText, FolderKanban, FileSignature, LifeBuoy, User } from 'lucide-react';
import { PortalShell, type PortalNavItem } from '@/layouts/PortalShell';
import { routes } from '@/config/routes';
import { useMyClient } from './hooks';

const NAV: PortalNavItem[] = [
  { label: 'Dashboard', to: routes.cpDashboard, icon: LayoutDashboard, end: true },
  { label: 'Invoices', to: routes.cpInvoices, icon: Receipt },
  { label: 'Statement', to: routes.cpStatement, icon: FileText },
  { label: 'Projects', to: routes.cpProjects, icon: FolderKanban },
  { label: 'Contracts', to: routes.cpContracts, icon: FileSignature },
  { label: 'Support', to: routes.cpSupport, icon: LifeBuoy },
  { label: 'My Profile', to: routes.cpProfile, icon: User },
];

export function ClientPortalLayout() {
  const { data: client } = useMyClient();
  return (
    <PortalShell
      brand="TECHXSERVE"
      brandSub="Client Portal"
      greeting={`Welcome, ${client?.name ?? 'Client'}`}
      navItems={NAV}
      signOutTo={routes.cpLogin}
    />
  );
}
