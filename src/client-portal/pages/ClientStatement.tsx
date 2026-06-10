import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { PageHeader, useFormatMoney } from '@/shared';
import { Button, Card, Input } from '@ds/primitives';
import { Skeleton, toast } from '@ds/feedback';
import { formatDate } from '@/lib/format';
import { downloadStatementPdf } from '@/lib/pdf';
import { company } from '@/data/fixtures';
import { useMyClient, useMyInvoices } from '../hooks';

export function ClientStatement() {
  const money = useFormatMoney();
  const { data: client } = useMyClient();
  const { data: invoices = [], isLoading } = useMyInvoices();
  const [from, setFrom] = useState('2026-01-01');
  const [to, setTo] = useState('2026-12-31');

  const rows = useMemo(() => invoices
    .flatMap((i) => [
      { date: i.issueDate, desc: `Invoice ${i.number}`, ref: i.number, debit: i.total, credit: 0 },
      ...i.payments.filter((p) => !p.voided).map((p) => ({ date: p.date, desc: 'Payment received', ref: p.reference, debit: 0, credit: p.amount })),
    ])
    .filter((r) => r.date >= from && r.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date)), [invoices, from, to]);

  const totals = useMemo(() => {
    const debits = rows.reduce((s, r) => s + r.debit, 0);
    const credits = rows.reduce((s, r) => s + r.credit, 0);
    return { debits, credits, closing: debits - credits };
  }, [rows]);

  let running = 0;

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <div>
      <PageHeader title="Statement of Account" actions={<Button icon={Download} onClick={() => {
        let bal = 0;
        const pdfRows = rows.map((r) => { bal += r.debit - r.credit; return { ...r, balance: bal }; });
        downloadStatementPdf(client?.name ?? 'Statement', pdfRows, company);
        toast.success('Statement PDF downloaded');
      }}>Download PDF</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input type="date" sizeVariant="sm" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        <span className="text-content-subtle">→</span>
        <Input type="date" sizeVariant="sm" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-line bg-surface-sunken/60 text-left text-2xs uppercase tracking-wide text-content-subtle"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-right">Balance</th></tr></thead>
            <tbody>
              {rows.map((r, i) => { running += r.debit - r.credit; return (
                <tr key={i} className="border-b border-line last:border-0"><td className="px-4 py-3">{formatDate(r.date)}</td><td className="px-4 py-3 font-medium text-content">{r.desc}</td><td className="nums px-4 py-3 text-content-muted">{r.ref}</td><td className="nums px-4 py-3 text-right">{r.debit ? money(r.debit) : '—'}</td><td className="nums px-4 py-3 text-right text-success-strong">{r.credit ? money(r.credit) : '—'}</td><td className="nums px-4 py-3 text-right font-semibold">{money(running)}</td></tr>
              ); })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-surface-sunken/40 font-semibold"><td className="px-4 py-3" colSpan={3}>Totals</td><td className="nums px-4 py-3 text-right">{money(totals.debits)}</td><td className="nums px-4 py-3 text-right">{money(totals.credits)}</td><td className="nums px-4 py-3 text-right text-brand-600">{money(totals.closing)}</td></tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {[['Opening Balance', money(0)], ['Total Debits', money(totals.debits)], ['Total Credits', money(totals.credits)], ['Closing Balance', money(totals.closing)]].map(([k, v]) => (
          <Card key={k} padding="sm"><p className="text-xs text-content-muted">{k}</p><p className="nums mt-1 text-lg font-bold text-content">{v}</p></Card>
        ))}
      </div>
    </div>
  );
}
