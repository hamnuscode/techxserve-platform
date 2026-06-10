import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { PageHeader, useFormatMoney } from '@/shared';
import { Card, Button } from '@ds/primitives';
import { StatusBadge } from '@ds/data-display';
import { EmptyState, Modal, toast } from '@ds/feedback';
import { Stagger } from '@ds/motion';
import { useMe, useMyPayslips } from '../hooks';
import { company } from '@/data/fixtures';
import { downloadPayslipPdf } from '@/lib/pdf';
import type { Payslip } from '@/types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June'];

export function EmployeePayslips() {
  const money = useFormatMoney();
  const { data: me } = useMe();
  const { data: payslips = [], isLoading } = useMyPayslips();
  const [open, setOpen] = useState<Payslip | null>(null);

  // Synthesize a few months from the single fixture payslip for the cards.
  const base = payslips[0];
  const cards = base ? MONTHS.map((m, i) => ({ ...base, id: `${base.id}-${i}`, month: m, status: (i < 5 ? 'Disbursed' : 'Pending') as Payslip['status'] })) : [];

  if (isLoading) return <EmptyState icon={FileText} title="Loading payslips…" />;

  return (
    <div>
      <PageHeader title="My Payslips" description="View and download your payslips." />
      {cards.length === 0 ? (
        <EmptyState icon={FileText} title="No payslips" description="Your payslips will appear here once payroll is processed." />
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((p) => (
            <Stagger.Item key={p.id}>
              <Card>
                <div className="flex items-center justify-between">
                  <div><p className="font-semibold text-content">{p.month} 2026</p><p className="nums mt-1 text-lg font-bold text-brand-600">{money(p.netSalary)}</p></div>
                  <StatusBadge status={p.status} size="sm" />
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" fullWidth onClick={() => setOpen(p)}>View</Button>
                  <Button size="sm" variant="ghost" icon={Download} aria-label="Download" onClick={() => { downloadPayslipPdf(p, company); toast.success('Payslip downloaded'); }} />
                </div>
              </Card>
            </Stagger.Item>
          ))}
        </Stagger>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={`Payslip — ${open?.month} 2026`} size="md" footer={<Button icon={Download} onClick={() => { if (open) downloadPayslipPdf(open, company); toast.success('Payslip downloaded'); }}>Download PDF</Button>}>
        {open && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div><p className="font-display font-bold text-content">{company.name}</p><p className="text-xs text-content-muted">Payslip · {open.month} 2026</p></div>
              <div className="text-right"><p className="font-medium text-content">{me?.name}</p><p className="nums text-2xs text-content-subtle">{me?.code}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-2xs font-semibold uppercase text-content-subtle">Earnings</p>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between"><dt className="text-content-muted">Base</dt><dd className="nums">{money(open.base)}</dd></div>
                  <div className="flex justify-between"><dt className="text-content-muted">Bonus</dt><dd className="nums">{money(open.bonus)}</dd></div>
                </dl>
              </div>
              <div>
                <p className="mb-1 text-2xs font-semibold uppercase text-content-subtle">Deductions</p>
                <dl className="space-y-1 text-sm">
                  {open.statutoryDeductions.map((d) => <div key={d.label} className="flex justify-between"><dt className="text-content-muted">{d.label}</dt><dd className="nums text-danger">−{money(d.amount)}</dd></div>)}
                  <div className="flex justify-between"><dt className="text-content-muted">Advances</dt><dd className="nums text-danger">−{money(open.advances)}</dd></div>
                </dl>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-brand-50 px-4 py-3 dark:bg-brand-950/40"><span className="font-semibold text-content">Net Pay</span><span className="nums text-lg font-bold text-brand-600">{money(open.netSalary)}</span></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
