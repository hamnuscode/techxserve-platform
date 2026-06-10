import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Banknote, Pencil, FileDown, Send, MoreHorizontal, Copy, Ban, XCircle } from 'lucide-react';
import { PageHeader, useFormatMoney } from '@/shared';
import { Button, Card, CardTitle } from '@ds/primitives';
import { StatusBadge, type Column, DataTable } from '@ds/data-display';
import { ErrorState, Skeleton, toast } from '@ds/feedback';
import { DropdownMenu } from '@ds/overlays';
import { formatDate } from '@/lib/format';
import { downloadInvoicePdf } from '@/lib/pdf';
import { useInvoice } from '../hooks/useInvoices';
import { RecordPaymentModal } from '../modals/RecordPaymentModal';
import { EmailComposerModal } from '@/shared';
import { company } from '@/data/fixtures';
import { routes } from '@/config/routes';
import type { Payment } from '@/types';

export function InvoiceDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const money = useFormatMoney();
  const [payOpen, setPayOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const { data: inv, isLoading, isError, refetch } = useInvoice(id);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (isError || !inv) return <ErrorState onRetry={() => refetch()} />;

  const paymentCols: Column<Payment>[] = [
    { key: 'date', header: 'Date', render: (p) => formatDate(p.date) },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => <span className={p.voided ? 'nums text-content-subtle line-through' : 'nums font-medium'}>{money(p.amount)}</span> },
    { key: 'method', header: 'Method', render: (p) => p.method },
    { key: 'reference', header: 'Reference', render: (p) => <span className="nums text-content-muted">{p.reference || '—'}</span> },
    { key: 'bank', header: 'Bank', render: (p) => p.bank || '—' },
    { key: 'by', header: 'Recorded By', render: (p) => p.recordedBy },
    { key: 'status', header: '', align: 'right', render: (p) => (p.voided ? <StatusBadge status="Cancelled" size="sm" /> : <Button size="sm" variant="ghost" onClick={() => toast.success('Payment voided')}>Void</Button>) },
  ];

  return (
    <div>
      <button onClick={() => navigate(routes.invoices)} className="mb-3 flex items-center gap-1.5 text-sm text-content-muted hover:text-content">
        <ArrowLeft size={16} /> Back to Invoices
      </button>

      <PageHeader
        title={<span className="flex items-center gap-3">{inv.number}<StatusBadge status={inv.status} /></span>}
        description={`${inv.clientName} · ${inv.clientCode}`}
        actions={
          <>
            {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
              <Button icon={Banknote} onClick={() => setPayOpen(true)}>Record Payment</Button>
            )}
            <Button variant="outline" icon={Pencil} onClick={() => navigate(routes.invoiceEdit(inv.id))}>Edit</Button>
            <Button variant="outline" icon={FileDown} onClick={() => { downloadInvoicePdf(inv, company); toast.success(`${inv.number}.pdf downloaded`); }}>PDF</Button>
            <Button variant="outline" icon={Send} onClick={() => setEmailOpen(true)}>Email</Button>
            <DropdownMenu
              trigger={<Button variant="outline" icon={MoreHorizontal} aria-label="More" />}
              items={[
                { label: 'Duplicate', icon: Copy, onClick: () => toast.success('Invoice duplicated') },
                { label: 'Void', icon: Ban, onClick: () => toast.success('Invoice voided') },
                { label: 'Mark Uncollectible', icon: XCircle, danger: true, onClick: () => toast.warning('Marked uncollectible') },
              ]}
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* PDF-like preview */}
        <Card className="lg:col-span-2" padding="lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 font-display text-lg font-bold text-white">T</div>
              <p className="font-display text-lg font-bold text-content">{company.name}</p>
              <p className="max-w-xs text-xs text-content-muted">{company.legalAddress}</p>
              <p className="text-xs text-content-muted">NTN: {company.taxId}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold text-content">INVOICE</p>
              <p className="nums text-sm text-content-muted">{inv.number}</p>
              <p className="mt-2 text-xs text-content-muted">Issued: {formatDate(inv.issueDate)}</p>
              <p className="text-xs text-content-muted">Due: {formatDate(inv.dueDate)}</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-surface-sunken/60 p-4">
            <p className="text-2xs uppercase tracking-wide text-content-subtle">Bill To</p>
            <p className="font-semibold text-content">{inv.clientName}</p>
            <p className="nums text-xs text-content-muted">{inv.clientCode}</p>
          </div>

          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-content-subtle">
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Tax</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.lineItems.map((li) => (
                <tr key={li.id} className="border-b border-line">
                  <td className="py-2.5 text-content">{li.description}</td>
                  <td className="nums py-2.5 text-right">{li.quantity}</td>
                  <td className="nums py-2.5 text-right">{money(li.rate)}</td>
                  <td className="nums py-2.5 text-right">{li.taxRate}%</td>
                  <td className="nums py-2.5 text-right font-medium">{money(li.quantity * li.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <dl className="w-64 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-content-muted">Subtotal</dt><dd className="nums">{money(inv.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-content-muted">Tax</dt><dd className="nums">{money(inv.tax)}</dd></div>
              <div className="flex justify-between"><dt className="text-content-muted">Withholding Tax</dt><dd className="nums">−{money(inv.withholdingTax)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd className="nums text-brand-600">{money(inv.total)}</dd></div>
              <div className="flex justify-between text-success-strong"><dt>Received</dt><dd className="nums">{money(inv.received)}</dd></div>
            </dl>
          </div>

          {inv.notes && <p className="mt-6 border-t border-line pt-4 text-xs text-content-muted"><span className="font-semibold">Notes: </span>{inv.notes}</p>}
        </Card>

        <div className="space-y-6">
          <Card padding="none">
            <CardTitle className="p-5 pb-3">Payment History</CardTitle>
            {inv.payments.length === 0 ? (
              <p className="px-5 pb-6 text-sm text-content-muted">No payments recorded yet.</p>
            ) : (
              <DataTable data={inv.payments} columns={paymentCols} rowKey={(p) => p.id} />
            )}
          </Card>

          <Card>
            <CardTitle className="mb-4">Audit Log</CardTitle>
            <ol className="relative space-y-3 border-l border-line pl-5 text-sm">
              {['Created', 'Sent', inv.received > 0 ? 'Payment recorded' : null, 'Viewed'].filter(Boolean).map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-brand-500" />
                  <p className="text-content">{e}</p>
                  <p className="text-2xs text-content-subtle">{formatDate(inv.issueDate)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <RecordPaymentModal open={payOpen} onClose={() => setPayOpen(false)} invoice={inv} />
      <EmailComposerModal open={emailOpen} onClose={() => setEmailOpen(false)} defaultSubject={`Invoice ${inv.number} from ${company.name}`} defaultBody={`Dear ${inv.clientName},\n\nPlease find your invoice ${inv.number} attached.\n\nRegards,\n${company.name}`} />
    </div>
  );
}
