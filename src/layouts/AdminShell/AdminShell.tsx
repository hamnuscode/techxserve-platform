import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Receipt, CreditCard, ListTodo, UserPlus, Users2, Briefcase, FileText, FolderKanban, Wallet } from 'lucide-react';
import { searchApi } from '@/data/mock-api';
import { SideBar } from './SideBar';
import { TopBar } from './TopBar';
import { NotificationsPanel } from './NotificationsPanel';
import { AIAssistant } from '@/floating';
import { CommandMenu, type CommandGroup } from '@ds/overlays';
import { routeTransition } from '@ds/motion';
import { useUIStore } from '@/app/stores/ui';
import { useAuthStore } from '@/app/stores/auth';
import { ForcedPasswordReset } from '@/shared';
import { navGroups } from '@/config/nav';
import { isPhaseActive } from '@/config/phases';
import { routes } from '@/config/routes';

export function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const commandOpen = useUIStore((s) => s.commandOpen);
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults = [] } = useQuery({
    queryKey: ['global-search', searchQuery],
    queryFn: () => searchApi.global(searchQuery),
    enabled: searchQuery.trim().length >= 2,
  });
  const RESULT_ICON = { Client: Users2, Employee: Briefcase, Invoice: FileText, Project: FolderKanban, Expense: Wallet };
  const status = useAuthStore((s) => s.status);
  const portalKind = useAuthStore((s) => s.user?.portalKind);
  const role = useAuthStore((s) => s.user?.role);
  const viewAsCompany = useAuthStore((s) => s.user?.viewAsCompany);
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword);

  // ⌘K / Ctrl+K toggles the command palette anywhere in the shell.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(!useUIStore.getState().commandOpen);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setCommandOpen]);

  const commandGroups: CommandGroup[] = useMemo(
    () => [
      {
        heading: 'Quick create',
        items: [
          { id: 'qc-invoice', label: 'New Invoice', icon: Receipt, onSelect: () => navigate(routes.invoiceNew) },
          { id: 'qc-expense', label: 'New Expense', icon: CreditCard, onSelect: () => navigate(`${routes.expenses}?new=1`) },
          { id: 'qc-task', label: 'New Task', icon: ListTodo, onSelect: () => navigate(`${routes.tasks}?new=1`) },
          { id: 'qc-client', label: 'New Client', icon: UserPlus, onSelect: () => navigate(`${routes.clients}?new=1`) },
        ],
      },
      ...navGroups.map((g) => ({
        heading: g.heading,
        items: g.items
          .filter((i) => isPhaseActive(i.phase))
          .map((i) => ({
            id: i.to,
            label: i.label,
            icon: i.icon,
            keywords: g.heading,
            onSelect: () => navigate(i.to),
          })),
      })),
    ],
    [navigate],
  );

  // Wait for the initial session check so we don't flash the login screen.
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-600" />
      </div>
    );
  }
  if (status === 'anon') return <Navigate to={routes.login} replace />;
  if (mustChangePassword) return <ForcedPasswordReset />;
  // The Super Super Admin must pick a company before the admin shell renders.
  if (role === 'Super Super Admin' && !viewAsCompany) return <Navigate to={routes.companies} replace />;
  // Portal users never see the admin shell — send them to their portal.
  if (portalKind === 'client') return <Navigate to={routes.cpDashboard} replace />;
  if (portalKind === 'employee') return <Navigate to={routes.epDashboard} replace />;

  return (
    <div className="min-h-screen bg-app">
      <SideBar />
      <TopBar />
      <main
        className={`pt-topbar transition-[padding] duration-300 ${collapsed ? 'pl-sidebar-collapsed' : 'pl-sidebar'}`}
      >
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          {/* Entrance-only, keyed by path — avoids AnimatePresence deadlocking on
              lazy/Suspense route children (which left the page blank). */}
          <motion.div key={location.pathname} variants={routeTransition} initial="hidden" animate="show">
            {outlet}
          </motion.div>
        </div>
      </main>

      <CommandMenu
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onQueryChange={setSearchQuery}
        groups={
          searchResults.length > 0
            ? [
                {
                  heading: 'Search results',
                  items: searchResults.map((r) => ({
                    id: r.id + r.type,
                    label: r.label,
                    keywords: `${r.type} ${r.sub} ${r.label}`,
                    icon: RESULT_ICON[r.type],
                    onSelect: () => navigate(r.href),
                  })),
                },
                ...commandGroups,
              ]
            : commandGroups
        }
      />
      <NotificationsPanel />
      <AIAssistant />
    </div>
  );
}
