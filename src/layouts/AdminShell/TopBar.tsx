import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Bell,
  ChevronDown,
  Receipt,
  CreditCard,
  ListTodo,
  UserPlus,
  User,
  KeyRound,
  Building2,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button, IconButton } from '@ds/primitives';
import { DropdownMenu, Popover } from '@ds/overlays';
import { Avatar } from '@ds/data-display';
import { useUIStore } from '@/app/stores/ui';
import { useAuthStore } from '@/app/stores/auth';
import { ChangePasswordModal } from '@/shared';
import { routes } from '@/config/routes';
import { notificationsApi } from '@/data/mock-api';
import { qk } from '@/data/query-keys';
import type { CurrencyCode } from '@/lib/format';

const CURRENCIES: CurrencyCode[] = ['PKR', 'USD', 'EUR', 'GBP', 'AED'];

export function TopBar() {
  const navigate = useNavigate();
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);
  const setNotificationsOpen = useUIStore((s) => s.setNotificationsOpen);
  const currency = useUIStore((s) => s.currency);
  const setCurrency = useUIStore((s) => s.setCurrency);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setViewAsCompany = useAuthStore((s) => s.setViewAsCompany);
  const qc = useQueryClient();
  const [pwOpen, setPwOpen] = useState(false);
  const isSsa = user?.role === 'Super Super Admin';

  const { data: notifications = [] } = useQuery({
    queryKey: qk.notifications,
    queryFn: notificationsApi.list,
  });
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-20 flex h-topbar items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-md transition-[left] duration-300 sm:px-6',
        collapsed ? 'left-sidebar-collapsed' : 'left-sidebar',
      )}
    >
      {/* Global search → command palette */}
      <button
        onClick={() => setCommandOpen(true)}
        className="group flex h-9 max-w-md flex-1 items-center gap-2.5 rounded-lg border border-line bg-surface-sunken/60 px-3 text-sm text-content-subtle transition-colors hover:border-line-strong hover:bg-surface-sunken"
      >
        <Search size={16} />
        <span className="flex-1 text-left">Search clients, invoices, employees…</span>
        <kbd className="hidden rounded border border-line bg-surface px-1.5 py-0.5 text-2xs font-medium sm:block">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-1.5">
        {/* Quick create */}
        <DropdownMenu
          align="end"
          header="Quick create"
          trigger={
            <Button size="sm" icon={Plus} iconRight={ChevronDown} className="hidden sm:inline-flex">
              Create
            </Button>
          }
          items={[
            { label: 'New Invoice', icon: Receipt, onClick: () => navigate(routes.invoiceNew) },
            { label: 'New Expense', icon: CreditCard, onClick: () => navigate(`${routes.expenses}?new=1`) },
            { label: 'New Task', icon: ListTodo, onClick: () => navigate(`${routes.tasks}?new=1`) },
            { label: 'New Client', icon: UserPlus, onClick: () => navigate(`${routes.clients}?new=1`) },
          ]}
        />

        {/* Currency switcher */}
        <Popover
          align="end"
          trigger={
            <button className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-content-muted transition-colors hover:bg-surface-sunken hover:text-content">
              <span className="nums">{currency}</span>
              <ChevronDown size={14} />
            </button>
          }
        >
          {(close) => (
            <div className="w-44 p-1.5">
              <p className="px-2 py-1 text-2xs font-semibold uppercase tracking-wide text-content-subtle">
                Presentation currency
              </p>
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCurrency(c);
                    close();
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-surface-sunken',
                    c === currency ? 'font-semibold text-brand-600' : 'text-content',
                  )}
                >
                  <span className="nums">{c}</span>
                  {c === currency && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
                </button>
              ))}
            </div>
          )}
        </Popover>

        <IconButton
          icon={theme === 'light' ? Moon : Sun}
          label="Toggle theme"
          onClick={toggleTheme}
        />

        {/* Notifications */}
        <div className="relative">
          <IconButton icon={Bell} label="Notifications" onClick={() => setNotificationsOpen(true)} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-2xs font-bold text-white">
              {unread}
            </span>
          )}
        </div>

        {/* User menu */}
        <DropdownMenu
          align="end"
          header={user?.email}
          trigger={
            <button className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-surface-sunken">
              <Avatar name={user?.name ?? 'User'} size="sm" />
              <ChevronDown size={14} className="hidden text-content-subtle sm:block" />
            </button>
          }
          items={[
            { label: 'My Profile', icon: User },
            { label: 'Change Password', icon: KeyRound, onClick: () => setPwOpen(true) },
            ...(isSsa ? [{ label: 'Exit to Companies', icon: Building2, onClick: async () => { await setViewAsCompany(null); qc.clear(); navigate(routes.companies); } }] : []),
            'divider' as const,
            { label: 'Sign Out', icon: LogOut, danger: true, onClick: () => { logout(); navigate(routes.login); } },
          ]}
        />
        <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      </div>
    </header>
  );
}
