import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, CornerDownLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface CommandItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  hint?: string;
  keywords?: string;
  onSelect: () => void;
}

export interface CommandGroup {
  heading: string;
  items: CommandItem[];
}

interface CommandMenuProps {
  open: boolean;
  onClose: () => void;
  groups: CommandGroup[];
  placeholder?: string;
  /** Notified as the user types, so the shell can fetch live record results. */
  onQueryChange?: (q: string) => void;
}

/** Command / quick-create palette (brief). Cmd+K wired by the shell. */
export function CommandMenu({ open, onClose, groups, placeholder = 'Search or jump to…', onQueryChange }: CommandMenuProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) =>
            !q ||
            it.label.toLowerCase().includes(q) ||
            it.keywords?.toLowerCase().includes(q) ||
            g.heading.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  const flat = useMemo(() => filtered.flatMap((g) => g.items), [filtered]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, flat.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        flat[active]?.onSelect();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, flat, active, onClose]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let runningIndex = -1;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ type: 'spring', stiffness: 480, damping: 32 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface-overlay shadow-xl"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={18} className="text-content-subtle" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); onQueryChange?.(e.target.value); }}
                placeholder={placeholder}
                className="h-14 w-full bg-transparent text-sm text-content placeholder:text-content-subtle focus:outline-none"
              />
              <kbd className="hidden rounded border border-line bg-surface px-1.5 py-0.5 text-2xs text-content-subtle sm:block">
                ESC
              </kbd>
            </div>
            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
              {flat.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-content-muted">
                  No results for “{query}”.
                </p>
              ) : (
                filtered.map((group) => (
                  <div key={group.heading} className="mb-1">
                    <p className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wide text-content-subtle">
                      {group.heading}
                    </p>
                    {group.items.map((item) => {
                      runningIndex++;
                      const isActive = runningIndex === active;
                      const idx = runningIndex;
                      return (
                        <button
                          key={item.id}
                          data-active={isActive}
                          onMouseMove={() => setActive(idx)}
                          onClick={() => {
                            item.onSelect();
                            onClose();
                          }}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                            isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40' : 'text-content',
                          )}
                        >
                          {item.icon && <item.icon size={16} strokeWidth={2} />}
                          <span className="flex-1">{item.label}</span>
                          {item.hint && <span className="text-2xs text-content-subtle">{item.hint}</span>}
                          {isActive && <CornerDownLeft size={14} className="text-brand-500" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
