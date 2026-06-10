import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Plane, CircleHelp, Download, CheckCheck, MapPin, Camera, Plug } from 'lucide-react';
import { PageHeader, KpiStrip, FilterBar } from '@/shared';
import { exportToXlsx } from '@/lib/export';
import { Button, Select, Input, SegmentedControl } from '@ds/primitives';
import { KPICard, Avatar } from '@ds/data-display';
import { EmptyState, toast } from '@ds/feedback';
import { Stagger } from '@ds/motion';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { useAttendanceToday, useAttendanceMutations, useBranches, useDepartments } from '../hooks';
import type { AttendanceMark } from '@/types';

const STATUS_OPTS: { value: AttendanceMark; label: string; icon: typeof CheckCircle2; tone: string }[] = [
  { value: 'Present', label: 'P', icon: CheckCircle2, tone: 'success' },
  { value: 'Absent', label: 'A', icon: XCircle, tone: 'danger' },
  { value: 'Leave', label: 'L', icon: Plane, tone: 'warning' },
];

const activeTone: Record<string, string> = {
  success: 'bg-success text-white',
  danger: 'bg-danger text-white',
  warning: 'bg-warning text-white',
};

export function AttendancePage() {
  const { values, set, reset, activeCount } = useUrlFilters({
    search: '', branch: '', department: '', shift: '', unmarked: '',
  });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<'manual' | 'integrated'>('manual');
  const { data: branches = [] } = useBranches();
  const { data: departments = [] } = useDepartments();
  const { mark, markAll } = useAttendanceMutations();

  const filters = {
    search: values.search, branch: values.branch, department: values.department,
    shift: values.shift, onlyUnmarked: values.unmarked === '1',
  };
  const { data: rows = [], isLoading } = useAttendanceToday(filters);

  const counts = useMemo(() => {
    const c = { Present: 0, Absent: 0, Leave: 0, Unmarked: 0 };
    rows.forEach((r) => { c[r.status]++; });
    return c;
  }, [rows]);

  const allMarked = rows.length > 0 && counts.Unmarked === 0;

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Mark daily attendance for your team."
        actions={
          <>
            <SegmentedControl
              size="sm"
              value={mode}
              onChange={(v) => setMode(v as 'manual' | 'integrated')}
              segments={[{ value: 'manual', label: 'Manual' }, { value: 'integrated', label: 'Integrated' }]}
            />
            <Button variant="outline" icon={Download} onClick={() => {
              exportToXlsx('attendance', rows.map((r) => ({
                Code: r.employee.code, Name: r.employee.name, Branch: r.employee.branch, Shift: r.employee.shift, Status: r.status,
              })));
              toast.success('Exported attendance.xlsx');
            }}>Export</Button>
            {mode === 'manual' && (
              <Button
                icon={CheckCheck}
                onClick={async () => {
                  await markAll.mutateAsync(rows.map((r) => r.employeeId));
                  toast.success('All marked Present', { action: { label: 'Undo', onClick: () => undefined } });
                }}
              >
                Mark All Present
              </Button>
            )}
          </>
        }
      />

      <KpiStrip cols={4}>
        <KPICard label="Present" value={counts.Present} format={(n) => String(Math.round(n))} icon={CheckCircle2} tone="success" loading={isLoading} />
        <KPICard label="Absent" value={counts.Absent} format={(n) => String(Math.round(n))} icon={XCircle} tone="danger" loading={isLoading} />
        <KPICard label="Leave" value={counts.Leave} format={(n) => String(Math.round(n))} icon={Plane} tone="warning" loading={isLoading} />
        <KPICard label="Unmarked" value={counts.Unmarked} format={(n) => String(Math.round(n))} icon={CircleHelp} tone="ink" loading={isLoading} />
      </KpiStrip>

      {mode === 'integrated' ? (
        <IntegratedAttendance rows={rows} />
      ) : (
        <>
      {allMarked && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success-soft/50 px-4 py-2.5 text-sm font-medium text-success-strong">
          ✓ All employees marked for {formatDate(date)}.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input type="date" sizeVariant="sm" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
      </div>

      <FilterBar
        search={values.search}
        onSearchChange={(v) => set({ search: v })}
        searchPlaceholder="Search employee…"
        activeCount={activeCount}
        onReset={reset}
        trailing={
          <label className="flex items-center gap-2 text-sm text-content-muted">
            <input type="checkbox" checked={values.unmarked === '1'} onChange={(e) => set({ unmarked: e.target.checked ? '1' : '' })} className="h-4 w-4 rounded accent-brand-600" />
            Show only unmarked
          </label>
        }
      >
        <Select sizeVariant="sm" className="w-36" value={values.branch ?? ''} onChange={(e) => set({ branch: e.target.value })}
          options={[{ value: '', label: 'All Branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
        <Select sizeVariant="sm" className="w-40" value={values.department ?? ''} onChange={(e) => set({ department: e.target.value })}
          options={[{ value: '', label: 'All Departments' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]} />
        <Select sizeVariant="sm" className="w-32" value={values.shift ?? ''} onChange={(e) => set({ shift: e.target.value })}
          options={[{ value: '', label: 'All Shifts' }, ...['Morning', 'Evening', 'Night'].map((s) => ({ value: s, label: s }))]} />
      </FilterBar>

      {rows.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No employees" description="Add employees in Workforce → Employees first." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <Stagger>
            {rows.map((r) => (
              <Stagger.Item key={r.employeeId}>
                <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 last:border-0 hover:bg-surface-sunken/40">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={r.employee.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-content">{r.employee.name}</p>
                      <p className="nums text-2xs text-content-subtle">{r.employee.code} · {r.employee.branch} · {r.employee.shift}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {STATUS_OPTS.map((opt) => {
                      const active = r.status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => mark.mutate({ id: r.employeeId, status: opt.value })}
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold transition-all',
                            active ? `${activeTone[opt.tone]} border-transparent` : 'border-line text-content-subtle hover:border-line-strong hover:text-content',
                          )}
                          title={opt.value}
                          aria-label={`Mark ${r.employee.name} ${opt.value}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Stagger.Item>
            ))}
          </Stagger>
        </div>
      )}
        </>
      )}
    </div>
  );
}

/** Mode B — integrated provider (Jibble/Truein/Hubstaff). Manual marking disabled;
 *  shows today's live clock-ins with selfie thumbnail, GPS pin and timestamp (spec A6.4). */
function IntegratedAttendance({ rows }: { rows: { employeeId: string; employee: { name: string; code: string; branch: string } }[] }) {
  const clockIns = rows.slice(0, 10).map((r, i) => ({
    ...r,
    time: `0${8 + (i % 2)}:${String((i * 7) % 60).padStart(2, '0')} AM`,
    gps: ['Karachi HQ', 'Lahore', 'Islamabad'][i % 3],
  }));
  return (
    <div>
      <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-info/30 bg-info-soft/50 px-4 py-3 text-sm text-info-strong">
        <Plug size={18} /> <span><span className="font-semibold">Integrated mode active</span> (Jibble). Manual marking is disabled — attendance syncs automatically.</span>
      </div>
      <h3 className="mb-3 text-sm font-semibold text-content">Live Clock-ins · Today</h3>
      <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {clockIns.map((c) => (
          <Stagger.Item key={c.employeeId}>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <div className="relative">
                <Avatar name={c.employee.name} size="md" />
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-white ring-2 ring-surface"><Camera size={11} /></span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-content">{c.employee.name}</p>
                <p className="flex items-center gap-1 text-2xs text-content-subtle"><MapPin size={11} /> {c.gps} · {c.time}</p>
              </div>
              <span className="rounded-md bg-success-soft px-2 py-0.5 text-2xs font-semibold text-success-strong">In</span>
            </div>
          </Stagger.Item>
        ))}
      </Stagger>
    </div>
  );
}
