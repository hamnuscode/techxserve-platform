import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Clock, CheckCircle2, Hourglass, Check, X } from 'lucide-react';
import { PageHeader, KpiStrip } from '@/shared';
import { Select, Button } from '@ds/primitives';
import { KPICard, DataTable, StatusBadge, Avatar, type Column } from '@ds/data-display';
import { EmptyState, toast } from '@ds/feedback';
import { formatDate } from '@/lib/format';
import { timesheetsApi, type TimesheetSummary, type TimesheetStatus } from '@/data/mock-api';
import { useUrlFilters } from '@/lib/useUrlFilters';

export function TimesheetsPage() {
  const qc = useQueryClient();
  const { values, set, reset, activeCount } = useUrlFilters({ status: '' });
  const { data: sheets = [] } = useQuery({
    queryKey: ['timesheets', values.status],
    queryFn: () => timesheetsApi.adminList(values.status || undefined),
  });

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TimesheetStatus }) => timesheetsApi.setStatus(id, status),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['timesheets'] }); toast.success(`Timesheet ${v.status.toLowerCase()}`); },
  });

  // KPIs are computed from the unfiltered set for a stable header.
  const { data: all = [] } = useQuery({ queryKey: ['timesheets', ''], queryFn: () => timesheetsApi.adminList() });
  const kpis = {
    submitted: all.filter((s) => s.status === 'Submitted').length,
    approved: all.filter((s) => s.status === 'Approved').length,
    hours: all.reduce((s, x) => s + x.totalHours, 0),
  };

  const columns: Column<TimesheetSummary>[] = [
    { key: 'employee', header: 'Employee', render: (s) => <div className="flex items-center gap-2.5"><Avatar name={s.employeeName} size="sm" /><span className="font-medium text-content">{s.employeeName}</span></div> },
    { key: 'week', header: 'Week of', render: (s) => formatDate(s.weekStart) },
    { key: 'hours', header: 'Hours', align: 'right', render: (s) => <span className="nums font-medium">{s.totalHours}h</span> },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} tone={s.status === 'Approved' ? 'success' : s.status === 'Submitted' ? 'info' : s.status === 'Rejected' ? 'danger' : 'neutral'} /> },
    {
      key: 'actions', header: '', align: 'right',
      render: (s) => (s.status === 'Submitted' ? (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" icon={Check} loading={decide.isPending} onClick={() => decide.mutate({ id: s.id, status: 'Approved' })}>Approve</Button>
          <Button size="sm" variant="ghost" icon={X} onClick={() => decide.mutate({ id: s.id, status: 'Rejected' })}>Reject</Button>
        </div>
      ) : null),
    },
  ];

  return (
    <div>
      <PageHeader title="Timesheets" description="Review and approve weekly timesheets across the team." />
      <KpiStrip cols={3}>
        <KPICard label="Awaiting Approval" value={kpis.submitted} format={(n) => String(Math.round(n))} icon={Hourglass} tone="warning" />
        <KPICard label="Approved" value={kpis.approved} format={(n) => String(Math.round(n))} icon={CheckCircle2} tone="success" />
        <KPICard label="Total Hours Logged" value={kpis.hours} format={(n) => `${Math.round(n)}h`} icon={Clock} tone="brand" />
      </KpiStrip>
      <div className="mb-4 flex items-center gap-2">
        <Select sizeVariant="sm" className="w-40" value={values.status ?? ''} onChange={(e) => set({ status: e.target.value })} options={[{ value: '', label: 'All Statuses' }, ...['Draft', 'Submitted', 'Approved', 'Rejected'].map((s) => ({ value: s, label: s }))]} />
        {activeCount > 0 && <button onClick={reset} className="text-sm font-medium text-brand-600">Reset</button>}
      </div>
      <DataTable data={sheets} columns={columns} rowKey={(s) => s.id} empty={<EmptyState icon={Clock} title="No timesheets" description="Submitted timesheets will appear here." />} />
    </div>
  );
}
