import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Download, CreditCard } from 'lucide-react';
import { useFormatMoney } from '@/shared';
import { Button, Card, CardTitle } from '@ds/primitives';
import { StatusBadge } from '@ds/data-display';
import { ErrorState, Skeleton, toast } from '@ds/feedback';
import { formatDate } from '@/lib/format';
import { downloadInvoicePdf } from '@/lib/pdf';
import { invoicesApi } from '@/data/mock-api';
import { qk } from '@/data/query-keys';
import { company } from '@/data/fixtures';
import { routes } from '@/config/routes';
import { PaymentModal } from '../PaymentModal';

export function ClientInvoiceDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const money = useFormatMoney();
  const [payOpen, setPayOpen] = useState(false);
  const { data: inv, isLoading, isError, refetch } = useQuery({ queryKey: qk.invoice(id), queryFn: () => invoicesApi.get(id), enabled: !!id });

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (isError || !inv) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div>
      <button onClick={() => navigate(routes.cpInvoices)} className="mb-3 flex items-center gap-1.5 text-sm text-content-muted hover:text-content"><ArrowLeft size={16} /> Back to Invoices</button>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 font-display text-2xl font-bold text-content">{inv.number}<StatusBadge status={inv.status} /></h1>
        <div className="flex gap-2">
          <Button variant="outline" icon={Download} onClick={() => { downloadInvoicePdf(inv, company); toast.success(`${inv.number}.pdf downloaded`); }}>Download PDF</Button>
          {inv.status !== 'Paid' && <Button icon={CreditCard} onClick={() => setPayOpen(true)}>Pay Now</Button>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" padding="lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 font-display text-lg font-bold text-white">T</div>
              <p className="font-display text-lg font-bold text-content">{company.name}</p>
              <p className="max-w-xs text-xs text-content-muted">{company.legalAddress}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold text-content">INVOICE</p>
              <p className="nums text-sm text-content-muted">{inv.number}</p>
              <p className="mt-2 text-xs text-content-muted">Issued: {formatDate(inv.issueDate)}</p>
              <p className="text-xs text-content-muted">Due: {formatDate(inv.dueDate)}</p>
            </div>
          </div>
          <div className="mt-6 rounded-lg bg-surface-sunken/60 p-4"><p className="text-2xs uppercase tracking-wide text-content-subtle">Bill To</p><p className="font-semibold text-content">{inv.clientName}</p></div>
          <table className="mt-6 w-full text-sm">
            <thead><tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-content-subtle"><th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Rate</th><th className="py-2 text-right">Amount</th></tr></thead>
            <tbody>{inv.lineItems.map((li) => (<tr key={li.id} className="border-b border-line"><td className="py-2.5">{li.description}</td><td className="nums py-2.5 text-right">{li.quantity}</td><td className="nums py-2.5 text-right">{money(li.rate)}</td><td className="nums py-2.5 text-right font-medium">{money(li.quantity * li.rate)}</td></tr>))}</tbody>
          </table>
          <div className="mt-4 flex justify-end"><dl className="w-56 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-content-muted">Subtotal</dt><dd className="nums">{money(inv.subtotal)}</dd></div><div className="flex justify-between"><dt className="text-content-muted">Tax</dt><dd className="nums">{money(inv.tax)}</dd></div><div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd className="nums text-brand-600">{money(inv.total)}</dd></div></dl></div>
          {inv.notes && <p className="mt-6 border-t border-line pt-4 text-xs text-content-muted">{inv.notes}</p>}
        </Card>

        <Card>
          <CardTitle className="mb-4">Payment History</CardTitle>
          {inv.payments.length === 0 ? <p className="text-sm text-content-muted">No payments recorded yet.</p> : (
            <ul className="space-y-3">{inv.payments.map((p) => (<li key={p.id} className="flex items-center justify-between text-sm"><span><p className="font-medium text-content">{money(p.amount)}</p><p className="text-2xs text-content-subtle">{p.method} · {formatDate(p.date)}</p></span><StatusBadge status="Paid" size="sm" /></li>))}</ul>
          )}
        </Card>
      </div>

      <PaymentModal invoice={payOpen ? inv : null} onClose={() => setPayOpen(false)} />
    </div>
  );
}
