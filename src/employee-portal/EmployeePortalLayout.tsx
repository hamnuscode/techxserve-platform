import { Navigate } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, Plane, Wallet, ListTodo, Clock, CreditCard, FolderArchive, User } from 'lucide-react';
import { PortalShell, type PortalNavItem } from '@/layouts/PortalShell';
import { routes } from '@/config/routes';
import { useAuthStore } from '@/app/stores/auth';
import { ForcedPasswordReset } from '@/shared';
import { useMe } from './hooks';

const NAV: PortalNavItem[] = [
  { label: 'My Dashboard', to: routes.epDashboard, icon: LayoutDashboard, end: true },
  { label: 'Attendance', to: routes.epAttendance, icon: CalendarCheck },
  { label: 'Leaves', to: routes.epLeaves, icon: Plane },
  { label: 'Payslips', to: routes.epPayslips, icon: Wallet },
  { label: 'Tasks', to: routes.epTasks, icon: ListTodo },
  { label: 'Timesheets', to: routes.epTimesheets, icon: Clock },
  { label: 'Expenses', to: routes.epExpenses, icon: CreditCard },
  { label: 'Documents', to: routes.epDocuments, icon: FolderArchive },
  { label: 'My Profile', to: routes.epProfile, icon: User },
];

export function EmployeePortalLayout() {
  const status = useAuthStore((s) => s.status);
  const portalKind = useAuthStore((s) => s.user?.portalKind);
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword);
  const { data: me } = useMe();

  if (status === 'loading') return null;
  if (status === 'anon') return <Navigate to={routes.epLogin} replace />;
  if (mustChangePassword) return <ForcedPasswordReset />;
  // A signed-in admin or client landing here goes to their own home.
  if (portalKind === 'admin') return <Navigate to={routes.dashboard} replace />;
  if (portalKind === 'client') return <Navigate to={routes.cpDashboard} replace />;

  return (
    <PortalShell
      brand="TechxServe"
      brandSub="Employee Portal"
      greeting={`Hi, ${me?.name?.split(' ')[0] ?? 'there'}`}
      navItems={NAV}
      signOutTo={routes.epLogin}
    />
  );
}
