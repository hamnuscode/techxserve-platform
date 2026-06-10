import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wallet, HandCoins, CheckCheck, FileText, X } from 'lucide-react';
import { PageHeader, KpiStrip, FilterBar, useFormatMoney } from '@/shared';
import { Button, Select, Input, Card, CardTitle, Toggle } from '@ds/primitives';
import { KPICard, StatusBadge, Avatar } from '@ds/data-display';
import { EmptyState, toast } from '@ds/feedback';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { downloadPayslipPdf } from '@/lib/pdf';
import { company } from '@/data/fixtures';
import { usePayroll, usePayrollMutations, useBranches } from '../hooks';
import type { Payslip } from '@/types';

export function PayrollPage() {
  const money = useFormatMoney();
  const { values, set, reset, activeCount } = useUrlFilters({ search: '', branch: '', shift: '', status: '' });
  const { data: branches = [] } = useBranches();
  const { data: rows = [], isLoading } = usePayroll({ search: values.search, branch: values.branch, shift: values.shift, status: values.status });
  const { update, disburseAll } = usePayrollMutations();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ bonus: number; deductions: number; paymentMode: Payslip['paymentMode'] } | null>(null);
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const kpis = useMemo(() => {
    const disbursed = rows.filter((r) => r.status === 'Disbursed').reduce((s, r) => s + r.netSalary, 0);
    const notDisbursed = rows.filter((r) => r.status === 'Pending').reduce((s, r) => s + r.netSalary, 0);
    const advance = rows.reduce((s, r) => s + r.advances, 0);
    return { disbursed, notDisbursed, advance };
  }, [rows]);

  const openPanel = (p: Payslip) => {
    setSelectedId(p.id);
    setDraft({ bonus: p.bonus, deductions: p.deductions, paymentMode: p.paymentMode ?? 'Bank Transfer' });
  };

  const computedNet = selected && draft
    ? selected.base + draft.bonus - draft.deductions - selected.statutoryDeductions.reduce((s, x) => s + x.amount, 0) - selected.advances
    : 0;

  const save = async (disburse: boolean) => {
    if (!selected || !draft) return;
    await update.mutateAsync({
      id: selected.id,
      data: { bonus: draft.bonus, deductions: draft.deductions, paymentMode: draft.paymentMode, status: disburse ? 'Disbursed' : selected.status },
    });
    toast.success(disburse ? 'Saved & marked disbursed — bank transaction created' : 'Payslip saved');
    if (disburse) setSelectedId(null);
  };

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="June 2026 · Pakistan country pack"
        actions={
          <Button icon={CheckCheck} onClick={async () => { await disburseAll.mutateAsync(); toast.success('All pending payslips disbursed'); }}>
            Mark All Disbursed
          </Button>
        }
      />

      <KpiStrip cols={3}>
        <KPICard label="Total Disbursed" value={kpis.disbursed} format={(n) => money(n, { compact: true })} icon={CheckCheck} tone="success" loading={isLoading} />
        <KPICard label="Total Not Disbursed" value={kpis.notDisbursed} format={(n) => money(n, { compact: true })} icon={Wallet} tone="warning" loading={isLoading} />
        <KPICard label="Total Advance" value={kpis.advance} format={(n) => money(n, { compact: true })} icon={HandCoins} tone="info" loading={isLoading} />
      </KpiStrip>

      <FilterBar search={values.search} onSearchChange={(v) => set({ search: v })} searchPlaceholder="Search employee…" activeCount={activeCount} onReset={reset}>
        <Select sizeVariant="sm" className="w-36" value={values.branch ?? ''} onChange={(e) => set({ branch: e.target.value })}
          options={[{ value: '', label: 'All Branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
        <Select sizeVariant="sm" className="w-36" value={values.status ?? ''} onChange={(e) => set({ status: e.target.value })}
          options={[{ value: '', label: 'All' }, { value: 'Pending', label: 'Not Disbursed' }, { value: 'Disbursed', label: 'Disbursed' }]} />
      </FilterBar>

      <div className={`grid gap-6 ${selected ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>
        <div className={selected ? 'lg:col-span-2' : ''}>
          {rows.length === 0 && !isLoading ? (
            <EmptyState icon={Wallet} title="No payslips" description="Generate payroll for the current month." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-line bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-sunken/60 text-left text-2xs uppercase tracking-wide text-content-subtle">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3 text-center">P / A / L</th>
                    <th className="px-4 py-3 text-right">Base</th>
                    <th className="px-4 py-3 text-right">Net Salary</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Disbursed</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => openPanel(p)}
                      className={`cursor-pointer border-b border-line last:border-0 transition-colors ${selectedId === p.id ? 'bg-brand-50/60 dark:bg-brand-950/20' : 'hover:bg-surface-sunken/50'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={p.employeeName} size="sm" />
                          <div><p className="font-medium text-content">{p.employeeName}</p><p className="nums text-2xs text-content-subtle">{p.employeeCode}</p></div>
                        </div>
                      </td>
                      <td className="nums px-4 py-3 text-center text-content-muted">{p.presentDays}/{p.absentDays}/{p.leaveDays}</td>
                      <td className="nums px-4 py-3 text-right">{money(p.base)}</td>
                      <td className="nums px-4 py-3 text-right font-semibold">{money(p.netSalary)}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <Toggle
                          size="sm"
                          checked={p.status === 'Disbursed'}
                          onChange={async (next) => { await update.mutateAsync({ id: p.id, data: { status: next ? 'Disbursed' : 'Pending' } }); toast.success(next ? 'Marked disbursed' : 'Marked pending'); }}
                        />
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" icon={FileText} onClick={() => { downloadPayslipPdf(p, company); toast.success(`Payslip ${p.employeeCode}.pdf`); }}>Payslip</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Salary calculation panel */}
        <AnimatePresence>
          {selected && draft && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <Card className="sticky top-[88px]">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <CardTitle>Salary Calculation</CardTitle>
                    <p className="text-sm text-content-muted">{selected.employeeName}</p>
                  </div>
                  <button onClick={() => setSelectedId(null)} aria-label="Close" className="rounded-md p-1 text-content-subtle hover:bg-surface-sunken"><X size={16} /></button>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-content-muted">Bonus</span>
                      <Input type="number" sizeVariant="sm" value={draft.bonus} onChange={(e) => setDraft({ ...draft, bonus: Number(e.target.value) })} />
                    </label>
                    <label className="block">
                      <span className="text-xs text-content-muted">Deductions</span>
                      <Input type="number" sizeVariant="sm" value={draft.deductions} onChange={(e) => setDraft({ ...draft, deductions: Number(e.target.value) })} />
                    </label>
                  </div>

                  <dl className="space-y-1.5 rounded-lg bg-surface-sunken/50 p-3">
                    {[
                      ['Allowed Leaves', String(selected.allowedLeaves)],
                      ['Leaves Taken', String(selected.leaveDays)],
                      ['Effective Paid Days', String(selected.effectivePaidDays)],
                      ['Base Salary', money(selected.base)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between"><dt className="text-content-muted">{k}</dt><dd className="nums">{v}</dd></div>
                    ))}
                  </dl>

                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-content-subtle">Statutory Deductions</p>
                    {selected.statutoryDeductions.map((d) => (
                      <div key={d.label} className="flex justify-between"><dt className="text-content-muted">{d.label}</dt><dd className="nums text-danger">−{money(d.amount)}</dd></div>
                    ))}
                    <div className="mt-1 flex justify-between"><dt className="text-content-muted">Advances</dt><dd className="nums text-danger">−{money(selected.advances)}</dd></div>
                  </div>

                  <label className="block">
                    <span className="text-xs text-content-muted">Payment Mode</span>
                    <Select sizeVariant="sm" value={draft.paymentMode} onChange={(e) => setDraft({ ...draft, paymentMode: e.target.value as Payslip['paymentMode'] })}
                      options={['Bank Transfer', 'Cash', 'Cheque'].map((m) => ({ value: m, label: m }))} />
                  </label>

                  <div className="flex items-center justify-between border-t border-line pt-3">
                    <span className="font-semibold">Final Net Salary</span>
                    <span className="nums text-lg font-bold text-brand-600">{money(computedNet)}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <Button variant="outline" fullWidth loading={update.isPending} onClick={() => save(false)}>Save</Button>
                  <Button fullWidth loading={update.isPending} onClick={() => save(true)}>Save & Mark Disbursed</Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
