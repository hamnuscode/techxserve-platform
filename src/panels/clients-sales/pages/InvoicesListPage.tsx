import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  Receipt,
  Banknote,
  Wallet,
  AlertCircle,
  Paperclip,
  MoreHorizontal,
  Send,
  CheckCircle2,
  FileDown,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { PageHeader, KpiStrip, FilterBar, useFormatMoney } from '@/shared';
import { Button, Select } from '@ds/primitives';
import {
  KPICard,
  DataTable,
  StatusBadge,
  DateBadge,
  Pagination,
  BulkActionBar,
  type Column,
  type SortState,
} from '@ds/data-display';
import { EmptyState, ConfirmDialog, toast } from '@ds/feedback';
import { DropdownMenu } from '@ds/overlays';
import { formatDate } from '@/lib/format';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { exportToXlsx } from '@/lib/export';
import { downloadInvoicePdf } from '@/lib/pdf';
import { invoicesApi } from '@/data/mock-api';
import { company } from '@/data/fixtures';
import { useInvoices, useInvoiceMutations } from '../hooks/useInvoices';
import { RecordPaymentModal } from '../modals/RecordPaymentModal';
import { routes } from '@/config/routes';
import type { Invoice } from '@/types';

const PAGE_SIZE = 25;
const STATUSES = ['Draft', 'Sent', 'Paid', 'Partial', 'Overdue', 'Cancelled'];

export function InvoicesListPage() {
  const navigate = useNavigate();
  const money = useFormatMoney();
  const { values, set, reset, activeCount } = useUrlFilters({ search: '', status: '', page: '1' });
  const [sort, setSort] = useState<SortState>({ key: 'issueDate', dir: 'desc' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payFor, setPayFor] = useState<Invoice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const { setStatus, remove } = useInvoiceMutations();

  const page = Number(values.page) || 1;
  const { data, isLoading, isError, refetch } = useInvoices({
    search: values.search,
    status: values.status,
    page,
    pageSize: PAGE_SIZE,
    sortKey: sort.key,
    sortDir: sort.dir,
  });
  const { data: all } = useInvoices({ pageSize: 1000 });

  const kpis = useMemo(() => {
    const rows = all?.rows ?? [];
    const invoiced = rows.filter((i) => i.status !== 'Draft' && i.status !== 'Cancelled').reduce((s, i) => s + i.total, 0);
    const received = rows.reduce((s, i) => s + i.received, 0);
    const overdue = rows.filter((i) => i.status === 'Overdue').reduce((s, i) => s + (i.total - i.received), 0);
    return { invoiced, received, outstanding: invoiced - received, overdue };
  }, [all]);

  const columns: Column<Invoice>[] = [
    { key: 'number', header: 'Invoice #', sortAccessor: (i) => i.number, render: (i) => <span className="nums font-medium text-brand-600">{i.number}</span> },
    { key: 'client', header: 'Client', sortAccessor: (i) => i.clientName, render: (i) => <div><p className="font-medium text-content">{i.clientName}</p><p className="nums text-2xs text-content-subtle">{i.clientCode}</p></div> },
    { key: 'issueDate', header: 'Issued', sortAccessor: (i) => i.issueDate, render: (i) => formatDate(i.issueDate) },
    {
      key: 'dueDate',
      header: 'Due',
      sortAccessor: (i) => i.dueDate,
      render: (i) => (
        <span className="flex items-center gap-2">
          {formatDate(i.dueDate)}
          {i.status === 'Overdue' && <DateBadge date={i.dueDate} />}
        </span>
      ),
    },
    { key: 'total', header: 'Amount', align: 'right', sortAccessor: (i) => i.total, render: (i) => <span className="nums font-medium">{money(i.total)}</span> },
    { key: 'received', header: 'Received', align: 'right', sortAccessor: (i) => i.received, render: (i) => <span className="nums text-content-muted">{money(i.received)}</span> },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
    { key: 'attach', header: '', align: 'center', render: (i) => (i.hasAttachment ? <Paperclip size={14} className="text-content-subtle" /> : null) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (i) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu
            trigger={<Button size="sm" variant="ghost" icon={MoreHorizontal} aria-label="Actions" />}
            items={[
              { label: 'Record Payment', icon: Banknote, onClick: () => setPayFor(i), disabled: i.status === 'Paid' || i.status === 'Cancelled' },
              { label: 'Edit', onClick: () => navigate(routes.invoiceEdit(i.id)) },
              { label: 'Download PDF', icon: FileDown, onClick: async () => { const full = await invoicesApi.get(i.id); if (full) downloadInvoicePdf(full, company); } },
              'divider',
              { label: 'Delete', danger: true, onClick: () => setConfirmDelete([i.id]) },
            ]}
          />
        </div>
      ),
    },
  ];

  const ids = [...selected];

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Issue, track, and record payment on every invoice."
        actions={
          <>
            <Button variant="outline" icon={Download} onClick={() => {
              exportToXlsx('invoices', (all?.rows ?? []).map((i) => ({
                'Invoice #': i.number, Client: i.clientName, 'Issue Date': i.issueDate, 'Due Date': i.dueDate,
                Amount: i.total, Received: i.received, Outstanding: i.total - i.received, Status: i.status,
              })));
              toast.success('Exported invoices.xlsx');
            }}>Export</Button>
            <Button variant="outline" icon={RefreshCw} onClick={async () => {
              const n = await invoicesApi.generateRecurring();
              await refetch();
              toast.success(n > 0 ? `Generated ${n} recurring invoice${n > 1 ? 's' : ''}` : 'No auto-invoice contracts due');
            }}>Generate Recurring</Button>
            <Button icon={Plus} onClick={() => navigate(routes.invoiceNew)}>New Invoice</Button>
          </>
        }
      />

      <KpiStrip cols={4}>
        <KPICard label="Total Invoiced" value={kpis.invoiced} format={(n) => money(n, { compact: true })} icon={Receipt} tone="brand" />
        <KPICard label="Total Received" value={kpis.received} format={(n) => money(n, { compact: true })} icon={Banknote} tone="success" />
        <KPICard label="Outstanding" value={kpis.outstanding} format={(n) => money(n, { compact: true })} icon={Wallet} tone="warning" />
        <KPICard label="Overdue" value={kpis.overdue} format={(n) => money(n, { compact: true })} icon={AlertCircle} tone="danger" />
      </KpiStrip>

      <FilterBar
        search={values.search}
        onSearchChange={(v) => set({ search: v })}
        searchPlaceholder="Search invoice #, client…"
        activeCount={activeCount}
        onReset={reset}
      >
        <Select
          sizeVariant="sm"
          className="w-40"
          value={values.status ?? ''}
          onChange={(e) => set({ status: e.target.value })}
          options={[{ value: '', label: 'All Statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
        />
      </FilterBar>

      <DataTable
        data={data?.rows ?? []}
        columns={columns}
        rowKey={(i) => i.id}
        loading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        sort={sort}
        onSortChange={setSort}
        onRowClick={(i) => navigate(routes.invoice(i.id))}
        empty={<EmptyState icon={Receipt} title="No invoices yet" description="Create your first invoice to start billing clients." action={<Button icon={Plus} onClick={() => navigate(routes.invoiceNew)}>New Invoice</Button>} />}
      />

      {data && data.total > 0 && (
        <div className="mt-4">
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={(p) => set({ page: String(p) })} />
        </div>
      )}

      <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())}>
        <Button size="sm" variant="ghost" icon={Send} className="text-white hover:bg-white/10 dark:text-content" onClick={async () => { await setStatus.mutateAsync({ ids, status: 'Sent' }); toast.success(`${ids.length} marked as Sent`); setSelected(new Set()); }}>Mark Sent</Button>
        <Button size="sm" variant="ghost" icon={CheckCircle2} className="text-white hover:bg-white/10 dark:text-content" onClick={async () => { await setStatus.mutateAsync({ ids, status: 'Paid' }); toast.success(`${ids.length} marked as Paid`); setSelected(new Set()); }}>Mark Paid</Button>
        <Button size="sm" variant="ghost" icon={FileDown} className="text-white hover:bg-white/10 dark:text-content" onClick={() => toast.success('Downloading ZIP of PDFs')}>PDFs</Button>
        <Button size="sm" variant="ghost" icon={Trash2} className="text-white hover:bg-white/10 dark:text-content" onClick={() => setConfirmDelete(ids)}>Delete</Button>
      </BulkActionBar>

      {payFor && <RecordPaymentModal open={!!payFor} onClose={() => setPayFor(null)} invoice={payFor} />}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.length} invoice${confirmDelete && confirmDelete.length > 1 ? 's' : ''}?`}
        message="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!confirmDelete) return;
          await remove.mutateAsync(confirmDelete);
          toast.success('Deleted');
          setSelected(new Set());
        }}
      />
    </div>
  );
}
