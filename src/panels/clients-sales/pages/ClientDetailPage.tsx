import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
  Building2,
  FileSignature,
  Receipt,
  FolderArchive,
  Send,
  Download,
  FileText,
} from 'lucide-react';
import { PageHeader, useFormatMoney, InvitePortalButton, EmailComposerModal } from '@/shared';
import { downloadStatementPdf, downloadReportPdf } from '@/lib/pdf';
import { Button, Card, CardHeader, CardTitle, Tabs, type TabItem } from '@ds/primitives';
import { StatusBadge, DataTable, DateBadge, type Column } from '@ds/data-display';
import { EmptyState, ErrorState, Skeleton, toast } from '@ds/feedback';
import { DropdownMenu } from '@ds/overlays';
import { formatDate } from '@/lib/format';
import { useClient, useClientContracts, useClientInvoices } from '../hooks/useClients';
import { ClientFormModal } from '../modals/ClientFormModal';
import { routes } from '@/config/routes';
import { PhaseGate } from '@/config/phases';
import type { Contract, Invoice } from '@/types';

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

export function ClientDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const money = useFormatMoney();
  const [tab, setTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const { data: client, isLoading, isError, refetch } = useClient(id);
  const { data: contracts = [] } = useClientContracts(id);
  const { data: invoices = [] } = useClientInvoices(id);

  const stats = useMemo(() => {
    const invoiced = invoices.reduce((s, i) => s + i.total, 0);
    const received = invoices.reduce((s, i) => s + i.received, 0);
    return { invoiced, received, outstanding: invoiced - received, count: invoices.length };
  }, [invoices]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (isError || !client) return <ErrorState onRetry={() => refetch()} />;

  const contractCols: Column<Contract>[] = [
    { key: 'code', header: 'Code', render: (c) => <span className="nums font-medium text-brand-600">{c.code}</span> },
    { key: 'type', header: 'Type', render: (c) => <StatusBadge status={c.type} dot={false} size="sm" /> },
    { key: 'start', header: 'Start', render: (c) => formatDate(c.startDate) },
    {
      key: 'end',
      header: 'End',
      render: (c) => (
        <span className="flex items-center gap-2">
          {formatDate(c.endDate)}
          {c.status === 'Active' && <DateBadge date={c.endDate} />}
        </span>
      ),
    },
    { key: 'value', header: 'Value', align: 'right', render: (c) => <span className="nums">{money(c.value)}</span> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
  ];

  const invoiceCols: Column<Invoice>[] = [
    { key: 'number', header: 'Invoice #', render: (i) => <span className="nums font-medium text-brand-600">{i.number}</span> },
    { key: 'issue', header: 'Issued', render: (i) => formatDate(i.issueDate) },
    {
      key: 'due',
      header: 'Due',
      render: (i) => (
        <span className="flex items-center gap-2">
          {formatDate(i.dueDate)}
          {i.status === 'Overdue' && <DateBadge date={i.dueDate} />}
        </span>
      ),
    },
    { key: 'total', header: 'Amount', align: 'right', render: (i) => <span className="nums">{money(i.total)}</span> },
    { key: 'received', header: 'Received', align: 'right', render: (i) => <span className="nums text-content-muted">{money(i.received)}</span> },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
  ];

  const tabs: TabItem[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'contracts', label: 'Contracts', count: contracts.length },
    { value: 'invoices', label: 'Invoices', count: invoices.length },
    { value: 'statement', label: 'Statement' },
    { value: 'projects', label: 'Projects' },
    { value: 'documents', label: 'Documents' },
    { value: 'activity', label: 'Activity Log' },
  ];

  // Build a simple running statement from invoices & payments.
  const statementRows = invoices
    .flatMap((i) => [
      { date: i.issueDate, desc: `Invoice ${i.number}`, ref: i.number, debit: i.total, credit: 0 },
      ...i.payments.filter((p) => !p.voided).map((p) => ({ date: p.date, desc: 'Payment received', ref: p.reference, debit: 0, credit: p.amount })),
    ])
    .sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;

  return (
    <div>
      <button onClick={() => navigate(routes.clients)} className="mb-3 flex items-center gap-1.5 text-sm text-content-muted hover:text-content">
        <ArrowLeft size={16} /> Back to Clients
      </button>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {client.name}
            <span className="nums text-base font-normal text-content-subtle">{client.code}</span>
            <StatusBadge status={client.status} />
          </span>
        }
        actions={
          <>
            <InvitePortalButton kind="client" recordId={client.id} defaultEmail={client.email} />
            <Button variant="outline" icon={Pencil} onClick={() => setEditOpen(true)}>Edit</Button>
            <Button icon={Plus} onClick={() => navigate(`${routes.invoiceNew}?client=${client.id}`)}>New Invoice</Button>
            <DropdownMenu
              trigger={<Button variant="outline" icon={MoreHorizontal} aria-label="More" />}
              items={[
                { label: 'Record Payment', icon: Receipt, onClick: () => toast.info('Open an invoice to record payment') },
                { label: 'Send Statement', icon: Send, onClick: () => setEmailOpen(true) },
                { label: 'Export PDF', icon: Download, onClick: () => { downloadReportPdf(`Client ${client.code}`, [
                  { label: 'Name', value: client.name }, { label: 'Email', value: client.email }, { label: 'Phone', value: client.phone },
                  { label: 'Industry', value: client.industry }, { label: 'Outstanding', value: money(client.outstanding) }, { label: 'Status', value: client.status },
                ]); toast.success('Exported client.pdf'); } },
              ]}
            />
          </>
        }
      />

      <Tabs items={tabs} value={tab} onChange={setTab} className="mb-6" />

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field icon={Mail} label="Email" value={client.email} />
              <Field icon={Phone} label="Phone" value={client.phone} />
              <Field icon={Building2} label="Industry" value={client.industry} />
              <Field icon={MapPin} label="Billing Address" value={client.billingAddress} />
              <Field icon={FileText} label="Tax ID / NTN" value={client.taxId} />
              <Field icon={FileText} label="STRN" value={client.strn} />
              <Field icon={FileText} label="Filer Status" value={client.filerStatus} />
              <Field icon={Receipt} label="Payment Terms" value={`${client.paymentTermsDays} days`} />
            </div>
          </Card>
          <Card>
            <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
            <dl className="space-y-4">
              {[
                ['Total Invoiced', money(stats.invoiced)],
                ['Total Received', money(stats.received)],
                ['Outstanding', money(stats.outstanding)],
                ['Invoices', String(stats.count)],
                ['Credit Limit', client.creditLimit ? money(client.creditLimit) : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <dt className="text-sm text-content-muted">{k}</dt>
                  <dd className="nums text-sm font-semibold text-content">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}

      {tab === 'contracts' && (
        <div>
          <div className="mb-3 flex justify-end">
            <Button size="sm" icon={Plus} variant="outline" onClick={() => navigate(routes.contracts)}>Add Contract</Button>
          </div>
          <DataTable data={contracts} columns={contractCols} rowKey={(c) => c.id} empty={<EmptyState icon={FileSignature} title="No contracts" description="This client has no contracts yet." size="sm" />} />
        </div>
      )}

      {tab === 'invoices' && (
        <DataTable
          data={invoices}
          columns={invoiceCols}
          rowKey={(i) => i.id}
          onRowClick={(i) => navigate(routes.invoice(i.id))}
          empty={<EmptyState icon={Receipt} title="No invoices" description="No invoices issued to this client yet." size="sm" action={<Button size="sm" icon={Plus} onClick={() => navigate(`${routes.invoiceNew}?client=${client.id}`)}>New Invoice</Button>} />}
        />
      )}

      {tab === 'statement' && (
        <Card padding="none">
          <div className="flex items-center justify-between border-b border-line p-4">
            <CardTitle>Running Statement</CardTitle>
            <Button size="sm" variant="outline" icon={Download} onClick={() => {
              let bal = 0;
              const rows = statementRows.map((r) => { bal += r.debit - r.credit; return { ...r, balance: bal }; });
              downloadStatementPdf(client.name, rows);
              toast.success('Statement PDF exported');
            }}>Export PDF</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-sunken/60 text-left text-2xs uppercase tracking-wide text-content-subtle">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {statementRows.map((r, i) => {
                  running += r.debit - r.credit;
                  return (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">{formatDate(r.date)}</td>
                      <td className="px-4 py-3 font-medium text-content">{r.desc}</td>
                      <td className="nums px-4 py-3 text-content-muted">{r.ref}</td>
                      <td className="nums px-4 py-3 text-right">{r.debit ? money(r.debit) : '—'}</td>
                      <td className="nums px-4 py-3 text-right text-success-strong">{r.credit ? money(r.credit) : '—'}</td>
                      <td className="nums px-4 py-3 text-right font-semibold">{money(running)}</td>
                    </tr>
                  );
                })}
                {statementRows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-content-muted">No transactions in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'projects' && (
        <PhaseGate phase="P1">
          <div />
        </PhaseGate>
      )}

      {tab === 'documents' && (
        <EmptyState icon={FolderArchive} title="No documents" description="Files associated with this client will appear here." action={<Button size="sm" icon={Plus} variant="outline">Upload</Button>} />
      )}

      {tab === 'activity' && (
        <Card>
          <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
          <ol className="relative space-y-4 border-l border-line pl-5">
            {[
              ['Client created', formatDate(client.createdAt)],
              ['Invoice issued', formatDate(invoices[0]?.issueDate ?? client.createdAt)],
              ['Profile updated', formatDate(client.createdAt)],
            ].map(([label, date], i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[1.45rem] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-surface bg-brand-500" />
                <p className="text-sm font-medium text-content">{label}</p>
                <p className="text-xs text-content-subtle">{date}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <ClientFormModal open={editOpen} onClose={() => setEditOpen(false)} client={client} />
      <EmailComposerModal open={emailOpen} onClose={() => setEmailOpen(false)} defaultTo={client.email} defaultSubject={`Statement of account — ${client.name}`} defaultBody={`Dear ${client.name},\n\nPlease find your statement of account attached.\n\nRegards`} />
    </div>
  );
}
