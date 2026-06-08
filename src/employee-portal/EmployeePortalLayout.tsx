import { LayoutDashboard, CalendarCheck, Plane, Wallet, ListTodo, Clock, CreditCard, FolderArchive, User } from 'lucide-react';
import { PortalShell, type PortalNavItem } from '@/layouts/PortalShell';
import { routes } from '@/config/routes';
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
  const { data: me } = useMe();
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
