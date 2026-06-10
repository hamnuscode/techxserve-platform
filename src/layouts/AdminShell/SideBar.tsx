import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/cn';
import { navGroups, type NavGroup, type NavItem } from '@/config/nav';
import { isPhaseActive, PhaseBadge } from '@/config/phases';
import { Flyout } from '@ds/overlays';
import { useUIStore } from '@/app/stores/ui';
import { settingsApi } from '@/data/mock-api';

function ItemLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const disabled = !isPhaseActive(item.phase);
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40'
            : 'text-content-muted hover:bg-surface-sunken hover:text-content',
          disabled && 'opacity-55',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* red active left-border (spec A1.3) */}
          {isActive && (
            <motion.span
              layoutId="nav-active"
              className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand-600"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <item.icon size={18} strokeWidth={2} className="shrink-0" />
          {!collapsed && (
            <>
              <span className="truncate">{item.label}</span>
              <PhaseBadge phase={item.phase} />
            </>
          )}
        </>
      )}
    </NavLink>
  );
}

function Group({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  const location = useLocation();
  const groupActive = group.items.some(
    (i) => location.pathname === i.to || (i.to !== '/' && location.pathname.startsWith(i.to)),
  );
  // Default expanded: groups containing the active route, plus Overview on first load.
  const [open, setOpen] = useState(groupActive || group.heading === 'Overview');

  if (collapsed) {
    return (
      <Flyout
        className="px-2"
        content={
          <div className="min-w-[180px]">
            <p className="px-2 py-1 text-2xs font-semibold uppercase tracking-wide text-content-subtle">
              {group.heading}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((i) => (
                <ItemLink key={i.to} item={i} collapsed={false} />
              ))}
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-1 py-1">
          {group.items.map((i) => (
            <ItemLink key={i.to} item={i} collapsed />
          ))}
        </div>
      </Flyout>
    );
  }

  return (
    <div className="px-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-2xs font-semibold uppercase tracking-wider text-content-subtle transition-colors hover:text-content-muted"
      >
        {group.heading}
        <ChevronDown size={13} className={cn('transition-transform', !open && '-rotate-90')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-0.5 py-0.5">
              {group.items.map((i) => (
                <ItemLink key={i.to} item={i} collapsed={false} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SideBar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const { data: branding } = useQuery({ queryKey: ['branding'], queryFn: settingsApi.branding });

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-line bg-surface transition-[width] duration-300',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
      )}
    >
      {/* Brand */}
      <div className={cn('flex h-topbar items-center gap-2.5 border-b border-line px-4', collapsed && 'justify-center px-0')}>
        {branding?.logoUrl ? (
          <img src={branding.logoUrl} alt="Logo" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 font-display text-lg font-bold text-white shadow-sm">
            {(branding?.name ?? 'T').charAt(0).toUpperCase()}
          </div>
        )}
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold leading-tight text-content">{branding?.name ?? 'TechxServe'}</p>
            <p className="truncate text-2xs text-content-subtle">Business Platform</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-3 overflow-y-auto py-4">
        {navGroups.map((g) => (
          <Group key={g.heading} group={g} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-line p-3">
        <button
          onClick={toggle}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-content-muted transition-colors hover:bg-surface-sunken hover:text-content',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  );
}
