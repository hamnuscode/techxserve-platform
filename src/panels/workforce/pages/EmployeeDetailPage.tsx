import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, UserX, MoreHorizontal, Mail, Phone, Building2, Calendar, Wallet, CreditCard, FileText } from 'lucide-react';
import { useFormatMoney, InvitePortalButton } from '@/shared';
import { Button, Card, CardHeader, CardTitle, Tabs, type TabItem } from '@ds/primitives';
import { StatusBadge, Avatar } from '@ds/data-display';
import { ErrorState, EmptyState, Skeleton, toast } from '@ds/feedback';
import { DropdownMenu } from '@ds/overlays';
import { formatDate } from '@/lib/format';
import { useEmployee } from '../hooks';
import { EmployeeFormModal } from '../modals/EmployeeFormModal';
import { routes } from '@/config/routes';

function Field({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-content-subtle" />
      <div>
        <p className="text-2xs uppercase tracking-wide text-content-subtle">{label}</p>
        <p className="text-sm text-content">{value || '—'}</p>
      </div>
    </div>
  );
}

export function EmployeeDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const money = useFormatMoney();
  const [tab, setTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const { data: e, isLoading, isError, refetch } = useEmployee(id);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (isError || !e) return <ErrorState onRetry={() => refetch()} />;

  const tabs: TabItem[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'attendance', label: 'Attendance' },
    { value: 'payroll', label: 'Payroll' },
    { value: 'leaves', label: 'Leaves & Advances' },
    { value: 'documents', label: 'Documents' },
    { value: 'tasks', label: 'Tasks' },
  ];

  return (
    <div>
      <button onClick={() => navigate(routes.employees)} className="mb-3 flex items-center gap-1.5 text-sm text-content-muted hover:text-content">
        <ArrowLeft size={16} /> Back to Employees
      </button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={e.name} size="xl" />
          <div>
            <h1 className="font-display text-2xl font-bold text-content">{e.name}</h1>
            <p className="mt-0.5 flex items-center gap-2 text-sm text-content-muted">
              <span className="nums">{e.code}</span> · {e.department} · {e.branch}
              <StatusBadge status={e.status} />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InvitePortalButton kind="employee" recordId={e.id} defaultEmail={e.email} />
          <Button variant="outline" icon={Pencil} onClick={() => setEditOpen(true)}>Edit</Button>
          <Button variant="outline" icon={UserX} onClick={() => toast.success('Marked inactive')}>Mark Inactive</Button>
          <DropdownMenu trigger={<Button variant="outline" icon={MoreHorizontal} aria-label="More" />} items={[{ label: 'View Payslip', onClick: () => navigate(routes.payroll) }, { label: 'Export Profile' }]} />
        </div>
      </div>

      <Tabs items={tabs} value={tab} onChange={setTab} className="mb-6" />

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Profile & Employment</CardTitle></CardHeader>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field icon={Mail} label="Email" value={e.email} />
              <Field icon={Phone} label="Phone" value={e.phone} />
              <Field icon={Building2} label="Department" value={e.department} />
              <Field icon={Building2} label="Branch" value={e.branch} />
              <Field icon={Calendar} label="Join Date" value={formatDate(e.joinDate)} />
              <Field icon={FileText} label="Type" value={e.type} />
              <Field icon={FileText} label="CNIC" value={e.cnic} />
              <Field icon={FileText} label="EOBI No." value={e.eobiNo} />
            </div>
          </Card>
          <Card>
            <CardHeader><CardTitle>Compensation</CardTitle></CardHeader>
            <dl className="space-y-4">
              {[
                ['Base Salary', money(e.baseSalary)],
                ['Per-day', money(Math.round(e.baseSalary / 26))],
                ['Bank', e.bankName ?? '—'],
                ['IBAN', e.iban ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3"><dt className="text-sm text-content-muted">{k}</dt><dd className="nums truncate text-sm font-semibold text-content">{v}</dd></div>
              ))}
            </dl>
          </Card>
        </div>
      )}

      {tab === 'attendance' && <EmptyState icon={Calendar} title="Attendance calendar" description="Monthly attendance view for this employee (P0 manual mode aggregates here)." />}
      {tab === 'payroll' && <EmptyState icon={Wallet} title="Payslips" description="Past payslips and the current month draft." action={<Button size="sm" variant="outline" onClick={() => navigate(routes.payroll)}>Go to Payroll</Button>} />}
      {tab === 'leaves' && <EmptyState icon={CreditCard} title="Leaves & advances" description="Leave balance, applied leaves and advances." action={<Button size="sm" variant="outline" onClick={() => navigate(routes.leaves)}>Go to Leaves</Button>} />}
      {tab === 'documents' && <EmptyState icon={FileText} title="Documents" description={`${e.docsCount}/${e.docsRequired} documents on file.`} />}
      {tab === 'tasks' && <EmptyState icon={FileText} title="Assigned tasks" description="Tasks assigned to this employee." action={<Button size="sm" variant="outline" onClick={() => navigate(routes.tasks)}>Go to Tasks</Button>} />}

      <EmployeeFormModal open={editOpen} onClose={() => setEditOpen(false)} employee={e} />
    </div>
  );
}
