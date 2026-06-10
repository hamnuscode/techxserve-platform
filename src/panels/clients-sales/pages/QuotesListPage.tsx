import { useMemo, useState } from 'react';
import { FileText, CheckCircle2, Clock, Percent, MoreHorizontal, Check, X, ArrowRight } from 'lucide-react';
import { PageHeader, KpiStrip, FilterBar, useFormatMoney } from '@/shared';
import { Button, Select } from '@ds/primitives';
import { KPICard, DataTable, StatusBadge, DateBadge, Pagination, type Column, type SortState } from '@ds/data-display';
import { EmptyState, Modal, toast } from '@ds/feedback';
import { DropdownMenu } from '@ds/overlays';
import { Input, FormField } from '@ds/primitives';
import { formatDate, daysUntil } from '@/lib/format';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { useQuotes, useQuoteMutations } from '../hooks/useQuotes';
import { useClients } from '../hooks/useClients';
import type { Quote } from '@/types';

const PAGE_SIZE = 25;
const STATUSES = ['Draft', 'Sent', 'Accepted', 'Declined', 'Expired'];

function CreateQuoteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { create } = useQuoteMutations();
  const { data: clients } = useClients({ pageSize: 1000 });
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [clientId, setClientId] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [expiryDate, setExpiryDate] = useState(in30);
  const [total, setTotal] = useState('');

  const submit = async () => {
    if (!clientId || !total) return toast.error('Pick a client and enter an amount.');
    await create.mutateAsync({ clientId, issueDate, expiryDate, total: Number(total), status: 'Draft' });
    toast.success('Quote created');
    setClientId(''); setTotal('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Quote" size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={submit}>Create Quote</Button></>}>
      <div className="space-y-4">
        <FormField label="Client" required>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)}
            options={[{ value: '', label: 'Select a client…' }, ...(clients?.rows ?? []).map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))]} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Issue Date"><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></FormField>
          <FormField label="Expiry Date"><Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></FormField>
        </div>
        <FormField label="Amount (PKR)" required><Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0" /></FormField>
      </div>
    </Modal>
  );
}

export function QuotesListPage() {
  const money = useFormatMoney();
  const { values, set, reset, activeCount } = useUrlFilters({ search: '', status: '', page: '1' });
  const [sort, setSort] = useState<SortState>({ key: 'issueDate', dir: 'desc' });
  const [createOpen, setCreateOpen] = useState(false);
  const { setStatus, convert } = useQuoteMutations();

  const page = Number(values.page) || 1;
  const { data, isLoading, isError, refetch } = useQuotes({ search: values.search, status: values.status, page, pageSize: PAGE_SIZE, sortKey: sort.key, sortDir: sort.dir });
  const { data: all } = useQuotes({ pageSize: 1000 });

  const kpis = useMemo(() => {
    const rows = all?.rows ?? [];
    const quoted = rows.reduce((s, q) => s + q.total, 0);
    const accepted = rows.filter((q) => q.status === 'Accepted');
    const pending = rows.filter((q) => q.status === 'Sent').length;
    const decided = rows.filter((q) => q.status === 'Accepted' || q.status === 'Declined').length;
    const winRate = decided ? Math.round((accepted.length / decided) * 100) : 0;
    return { quoted, accepted: accepted.reduce((s, q) => s + q.total, 0), pending, winRate };
  }, [all]);

  const columns: Column<Quote>[] = [
    { key: 'number', header: 'Quote #', sortAccessor: (q) => q.number, render: (q) => <span className="nums font-medium text-brand-600">{q.number}</span> },
    { key: 'client', header: 'Client', sortAccessor: (q) => q.clientName, render: (q) => <div><p className="font-medium text-content">{q.clientName}</p><p className="nums text-2xs text-content-subtle">{q.clientCode}</p></div> },
    { key: 'issue', header: 'Issued', sortAccessor: (q) => q.issueDate, render: (q) => formatDate(q.issueDate) },
    { key: 'expiry', header: 'Expires', render: (q) => <span className="flex items-center gap-2">{formatDate(q.expiryDate)}{q.status === 'Sent' && daysUntil(q.expiryDate) <= 14 && <DateBadge date={q.expiryDate} />}</span> },
    { key: 'total', header: 'Amount', align: 'right', sortAccessor: (q) => q.total, render: (q) => <span className="nums font-medium">{money(q.total)}</span> },
    { key: 'status', header: 'Status', render: (q) => <StatusBadge status={q.status} tone={q.status === 'Accepted' ? 'success' : q.status === 'Declined' || q.status === 'Expired' ? 'danger' : q.status === 'Sent' ? 'info' : 'neutral'} /> },
    {
      key: 'actions', header: '', align: 'right',
      render: (q) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu
            trigger={<Button size="sm" variant="ghost" icon={MoreHorizontal} aria-label="Actions" />}
            items={[
              { label: 'Mark Accepted', icon: Check, onClick: async () => { await setStatus.mutateAsync({ id: q.id, status: 'Accepted' }); toast.success('Quote accepted'); }, disabled: q.status === 'Accepted' },
              { label: 'Mark Declined', icon: X, onClick: async () => { await setStatus.mutateAsync({ id: q.id, status: 'Declined' }); toast.info('Quote declined'); }, disabled: q.status === 'Declined' },
              'divider',
              { label: 'Convert to Invoice', icon: ArrowRight, onClick: async () => { await convert.mutateAsync(q.id); toast.success('Converted to a draft invoice'); }, disabled: !!q.convertedInvoiceId },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Quotes / Proposals" description="Issue quotes and convert accepted ones into invoices." actions={<Button icon={FileText} onClick={() => setCreateOpen(true)}>New Quote</Button>} />

      <KpiStrip cols={4}>
        <KPICard label="Total Quoted" value={kpis.quoted} format={(n) => money(n, { compact: true })} icon={FileText} tone="brand" />
        <KPICard label="Accepted Value" value={kpis.accepted} format={(n) => money(n, { compact: true })} icon={CheckCircle2} tone="success" />
        <KPICard label="Pending" value={kpis.pending} format={(n) => String(Math.round(n))} icon={Clock} tone="warning" />
        <KPICard label="Win Rate" value={kpis.winRate} format={(n) => `${Math.round(n)}%`} icon={Percent} tone="info" />
      </KpiStrip>

      <FilterBar search={values.search} onSearchChange={(v) => set({ search: v })} searchPlaceholder="Search quote #, client…" activeCount={activeCount} onReset={reset}>
        <Select sizeVariant="sm" className="w-36" value={values.status ?? ''} onChange={(e) => set({ status: e.target.value })} options={[{ value: '', label: 'All Statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
      </FilterBar>

      <DataTable data={data?.rows ?? []} columns={columns} rowKey={(q) => q.id} loading={isLoading} error={isError} onRetry={() => refetch()} sort={sort} onSortChange={setSort}
        empty={<EmptyState icon={FileText} title="No quotes yet" description="Create a quote to start winning new business." action={<Button icon={FileText} onClick={() => setCreateOpen(true)}>New Quote</Button>} />} />

      {data && data.total > 0 && <div className="mt-4"><Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={(p) => set({ page: String(p) })} /></div>}

      <CreateQuoteModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
