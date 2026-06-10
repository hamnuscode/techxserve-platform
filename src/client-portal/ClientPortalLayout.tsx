import { Navigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, FileText, FolderKanban, FileSignature, LifeBuoy, User } from 'lucide-react';
import { PortalShell, type PortalNavItem } from '@/layouts/PortalShell';
import { routes } from '@/config/routes';
import { useAuthStore } from '@/app/stores/auth';
import { ForcedPasswordReset } from '@/shared';
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
  const status = useAuthStore((s) => s.status);
  const portalKind = useAuthStore((s) => s.user?.portalKind);
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword);
  const { data: client } = useMyClient();

  if (status === 'loading') return null;
  if (status === 'anon') return <Navigate to={routes.cpLogin} replace />;
  if (mustChangePassword) return <ForcedPasswordReset />;
  if (portalKind === 'admin') return <Navigate to={routes.dashboard} replace />;
  if (portalKind === 'employee') return <Navigate to={routes.epDashboard} replace />;

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
