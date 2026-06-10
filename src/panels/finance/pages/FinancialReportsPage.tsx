import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { PageHeader, useFormatMoney } from '@/shared';
import { Button, Tabs, Card, CardTitle, Select, type TabItem } from '@ds/primitives';
import { toast } from '@ds/feedback';
import { cn } from '@/lib/cn';
import { downloadReportPdf } from '@/lib/pdf';
import { company } from '@/data/fixtures';
import { useCashflow, useClientProfitability, useChartOfAccounts, usePartners } from '../hooks';

const pkr = (n: number) => 'PKR ' + Math.round(n).toLocaleString('en-US');

interface PLRow {
  label: string;
  value: number;
  /** total/subtotal styling */
  bold?: boolean;
  indent?: boolean;
}

export function FinancialReportsPage() {
  const money = useFormatMoney();
  const [tab, setTab] = useState('pl');
  const { data: cashflow = [] } = useCashflow();
  const { data: profitability = [] } = useClientProfitability();
  const { data: accounts = [] } = useChartOfAccounts();
  const { data: partners = [] } = usePartners();
  const coaGroups = useMemo(() => {
    const order = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
    return order.map((type) => ({ type, items: accounts.filter((a) => a.type === type) })).filter((g) => g.items.length);
  }, [accounts]);

  const pl = useMemo<PLRow[]>(() => {
    const revenue = cashflow.reduce((s, m) => s + m.revenue, 0);
    const payroll = cashflow.reduce((s, m) => s + m.payroll, 0);
    const expenses = cashflow.reduce((s, m) => s + m.expenses, 0);
    const cos = Math.round(revenue * 0.35);
    const grossProfit = revenue - cos;
    const opProfit = grossProfit - payroll - expenses;
    const otherIncome = Math.round(revenue * 0.02);
    const ebt = opProfit + otherIncome;
    const taxes = Math.round(Math.max(ebt, 0) * 0.29);
    const net = ebt - taxes;
    return [
      { label: 'Revenue', value: revenue, bold: true },
      { label: 'Cost of Services', value: -cos, indent: true },
      { label: 'Gross Profit', value: grossProfit, bold: true },
      { label: 'Operating Expenses', value: -expenses, indent: true },
      { label: 'Payroll', value: -payroll, indent: true },
      { label: 'Operating Profit', value: opProfit, bold: true },
      { label: 'Other Income', value: otherIncome, indent: true },
      { label: 'Earnings Before Tax', value: ebt, bold: true },
      { label: 'Taxes', value: -taxes, indent: true },
      { label: 'Net Profit', value: net, bold: true },
    ];
  }, [cashflow]);

  const tabs: TabItem[] = [
    { value: 'pl', label: 'Profit & Loss' },
    { value: 'statements', label: 'Client Statements' },
    { value: 'coa', label: 'Chart of Accounts' },
    { value: 'partnership', label: 'Partnership Report' },
  ];

  const netProfit = pl[pl.length - 1]!.value;

  return (
    <div>
      <PageHeader
        title="Financial Reports"
        description="P&L, client statements, chart of accounts and partnership distribution."
        actions={<Button icon={Download} onClick={() => { downloadReportPdf('Profit & Loss', pl.map((r) => ({ label: r.label, value: (r.value < 0 ? '(' + pkr(Math.abs(r.value)) + ')' : pkr(r.value)) })), company); toast.success('Report PDF generated'); }}>Export PDF</Button>}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs items={tabs} value={tab} onChange={setTab} />
        {tab === 'pl' && (
          <div className="flex gap-2">
            <Select sizeVariant="sm" className="w-32" options={[{ value: '2026-06', label: 'Jun 2026' }, { value: '2026-05', label: 'May 2026' }]} />
            <Select sizeVariant="sm" className="w-32" options={[{ value: '', label: 'All Branches' }]} />
          </div>
        )}
      </div>

      {tab === 'pl' && (
        <Card padding="none">
          <table className="w-full text-sm">
            <tbody>
              {pl.map((r, i) => (
                <tr key={i} className={cn('border-b border-line last:border-0', r.bold && 'bg-surface-sunken/40')}>
                  <td className={cn('px-5 py-3', r.indent && 'pl-10 text-content-muted', r.bold && 'font-semibold text-content')}>{r.label}</td>
                  <td className={cn('nums px-5 py-3 text-right', r.bold ? 'font-bold' : 'text-content-muted', r.value < 0 && !r.bold && 'text-danger')}>
                    {r.value < 0 ? `(${money(Math.abs(r.value))})` : money(r.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-5 py-3 text-xs text-content-subtle">Click any line to drill into source transactions.</p>
        </Card>
      )}

      {tab === 'statements' && (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-content-subtle">
                <th className="px-5 py-2.5">Client</th>
                <th className="px-5 py-2.5 text-right">Total Invoiced</th>
                <th className="px-5 py-2.5 text-right">Other Expenses</th>
                <th className="px-5 py-2.5 text-right">Net Income</th>
              </tr>
            </thead>
            <tbody>
              {profitability.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-content-muted">No client activity yet.</td></tr>
              )}
              {profitability.map((c) => (
                <tr key={c.clientId} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-medium text-content">{c.clientName}</td>
                  <td className="nums px-5 py-3 text-right text-content-muted">{money(c.invoiced)}</td>
                  <td className="nums px-5 py-3 text-right text-content-muted">{money(c.expenses)}</td>
                  <td className={cn('nums px-5 py-3 text-right font-semibold', c.netIncome < 0 ? 'text-danger' : 'text-content')}>
                    {c.netIncome < 0 ? `(${money(Math.abs(c.netIncome))})` : money(c.netIncome)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'coa' && (
        coaGroups.length === 0 ? (
          <Card><p className="py-6 text-center text-sm text-content-muted">No accounts configured yet.</p></Card>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coaGroups.map((g) => (
            <Card key={g.type}>
              <CardTitle className="mb-3">{g.type === 'Asset' ? 'Assets' : g.type === 'Liability' ? 'Liabilities' : g.type === 'Expense' ? 'Expenses' : g.type}</CardTitle>
              <ul className="space-y-2 text-sm">
                {g.items.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-content-muted">
                    <span>{a.name}</span>
                    <span className="nums text-2xs text-content-subtle">{a.code}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        )
      )}

      {tab === 'partnership' && (
        <Card>
          <CardTitle className="mb-4">Profit Distribution by Partner</CardTitle>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-content-subtle"><th className="py-2">Partner</th><th className="py-2 text-right">Share</th><th className="py-2 text-right">Distribution</th></tr></thead>
            <tbody>
              {partners.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-content-muted">No partners configured.</td></tr>}
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="py-3 font-medium">{p.name}</td>
                  <td className="nums py-3 text-right">{p.sharePercent}%</td>
                  <td className="nums py-3 text-right font-semibold">{money(Math.round((netProfit * p.sharePercent) / 100))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
