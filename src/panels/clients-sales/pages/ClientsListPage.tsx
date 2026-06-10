import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Download, Users, FileSignature, Wallet, Crown, Eye, Pencil, MoreHorizontal } from 'lucide-react';
import { PageHeader, KpiStrip, FilterBar, useFormatMoney } from '@/shared';
import { Button, Select } from '@ds/primitives';
import { KPICard, DataTable, StatusBadge, Pagination, type Column, type SortState } from '@ds/data-display';
import { EmptyState, toast } from '@ds/feedback';
import { DropdownMenu } from '@ds/overlays';
import { ConfirmDialog } from '@ds/feedback';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { exportToXlsx } from '@/lib/export';
import { useClients, useClientMutations } from '../hooks/useClients';
import { ClientFormModal } from '../modals/ClientFormModal';
import { routes } from '@/config/routes';
import type { Client } from '@/types';

const INDUSTRIES = ['Manufacturing', 'Retail', 'Healthcare', 'Logistics', 'Technology', 'Real Estate', 'FMCG'];
const PAGE_SIZE = 25;

export function ClientsListPage() {
  const navigate = useNavigate();
  const money = useFormatMoney();
  const [params, setParams] = useSearchParams();
  const { values, set, reset, activeCount } = useUrlFilters({
    search: '',
    status: '',
    industry: '',
    page: '1',
  });
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' });
  const [modalOpen, setModalOpen] = useState(params.get('new') === '1');
  const [editing, setEditing] = useState<Client | undefined>();
  const [confirm, setConfirm] = useState<{ client: Client; action: 'deactivate' | 'delete' } | null>(null);
  const { setStatus, remove } = useClientMutations();

  const page = Number(values.page) || 1;
  const filters = {
    search: values.search,
    status: values.status,
    industry: values.industry,
    page,
    pageSize: PAGE_SIZE,
    sortKey: sort.key,
    sortDir: sort.dir,
  };

  const { data, isLoading, isError, refetch } = useClients(filters);
  // Aggregate query (unpaginated) for KPI strip.
  const { data: all } = useClients({ pageSize: 1000 });

  const kpis = useMemo(() => {
    const rows = all?.rows ?? [];
    const totalOutstanding = rows.reduce((s, c) => s + c.outstanding, 0);
    const activeContracts = rows.reduce((s, c) => s + c.activeContracts, 0);
    const top = [...rows].sort((a, b) => b.outstanding - a.outstanding)[0];
    return { total: rows.length, activeContracts, totalOutstanding, top: top?.name ?? '—' };
  }, [all]);

  const closeModal = () => {
    setModalOpen(false);
    setEditing(undefined);
    if (params.get('new')) {
      params.delete('new');
      setParams(params, { replace: true });
    }
  };

  const columns: Column<Client>[] = [
    { key: 'code', header: 'Code', sortAccessor: (c) => c.code, render: (c) => <span className="nums font-medium text-brand-600">{c.code}</span> },
    { key: 'name', header: 'Client Name', sortAccessor: (c) => c.name, render: (c) => <span className="font-semibold text-content">{c.name}</span> },
    { key: 'type', header: 'Type', render: (c) => <StatusBadge status={c.type} dot={false} size="sm" /> },
    { key: 'industry', header: 'Industry', sortAccessor: (c) => c.industry, render: (c) => <span className="text-content-muted">{c.industry}</span> },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      sortAccessor: (c) => c.outstanding,
      render: (c) => (
        <span className={c.outstanding > 0 ? 'nums font-semibold text-danger' : 'nums text-content-muted'}>
          {money(c.outstanding)}
        </span>
      ),
    },
    { key: 'contracts', header: 'Contracts', align: 'center', render: (c) => <span className="nums">{c.activeContracts}</span> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" icon={Eye} onClick={() => navigate(routes.client(c.id))}>
            View
          </Button>
          <DropdownMenu
            trigger={<Button size="sm" variant="ghost" icon={MoreHorizontal} aria-label="More" />}
            items={[
              { label: 'Edit', icon: Pencil, onClick: () => { setEditing(c); setModalOpen(true); } },
              { label: 'Deactivate', onClick: () => setConfirm({ client: c, action: 'deactivate' }), disabled: c.status === 'Inactive' },
              'divider',
              { label: 'Delete', danger: true, onClick: () => setConfirm({ client: c, action: 'delete' }) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Master list of every client you sell to."
        actions={
          <>
            <Button variant="outline" icon={Download} onClick={() => {
              exportToXlsx('clients', (all?.rows ?? []).map((c) => ({
                Code: c.code, Name: c.name, Type: c.type, Industry: c.industry, Country: c.country,
                Email: c.email, Phone: c.phone, Outstanding: c.outstanding, 'Active Contracts': c.activeContracts, Status: c.status,
              })));
              toast.success('Exported clients.xlsx');
            }}>
              Export
            </Button>
            <Button icon={Plus} onClick={() => { setEditing(undefined); setModalOpen(true); }}>
              Add Client
            </Button>
          </>
        }
      />

      <KpiStrip cols={4}>
        <KPICard label="Total Clients" value={kpis.total} format={(n) => String(Math.round(n))} icon={Users} tone="brand" />
        <KPICard label="Active Contracts" value={kpis.activeContracts} format={(n) => String(Math.round(n))} icon={FileSignature} tone="info" />
        <KPICard label="Total Outstanding" value={kpis.totalOutstanding} format={(n) => money(n, { compact: true })} icon={Wallet} tone="warning" />
        <KPICard label="Top Client" value={kpis.top} icon={Crown} tone="success" />
      </KpiStrip>

      <FilterBar
        search={values.search}
        onSearchChange={(v) => set({ search: v })}
        searchPlaceholder="Search name, email, code…"
        activeCount={activeCount}
        onReset={reset}
      >
        <Select
          sizeVariant="sm"
          className="w-36"
          value={values.status ?? ''}
          onChange={(e) => set({ status: e.target.value })}
          placeholder="All Statuses"
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
        />
        <Select
          sizeVariant="sm"
          className="w-40"
          value={values.industry ?? ''}
          onChange={(e) => set({ industry: e.target.value })}
          placeholder="All Industries"
          options={[{ value: '', label: 'All Industries' }, ...INDUSTRIES.map((i) => ({ value: i, label: i }))]}
        />
      </FilterBar>

      <DataTable
        data={data?.rows ?? []}
        columns={columns}
        rowKey={(c) => c.id}
        loading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        sort={sort}
        onSortChange={setSort}
        onRowClick={(c) => navigate(routes.client(c.id))}
        empty={
          activeCount > 0 ? (
            <EmptyState icon={Users} title="No clients match your filters" description="Clear filters to see all clients." action={<Button variant="outline" onClick={reset}>Clear filters</Button>} />
          ) : (
            <EmptyState icon={Users} title="No clients yet" description="Add your first client to start tracking revenue." action={<Button icon={Plus} onClick={() => setModalOpen(true)}>Add Client</Button>} />
          )
        }
      />

      {data && data.total > 0 && (
        <div className="mt-4">
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data.total}
            onPageChange={(p) => set({ page: String(p) })}
          />
        </div>
      )}

      <ClientFormModal
        open={modalOpen}
        onClose={closeModal}
        client={editing}
        onCreated={(c) => navigate(routes.client(c.id))}
      />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.action === 'delete' ? 'Delete this client?' : 'Deactivate this client?'}
        message={
          confirm?.action === 'delete'
            ? `${confirm?.client.name} will be soft-deleted. This can be restored later.`
            : `${confirm?.client.name} will be marked Inactive.`
        }
        confirmLabel={confirm?.action === 'delete' ? 'Delete' : 'Deactivate'}
        onConfirm={async () => {
          if (!confirm) return;
          if (confirm.action === 'delete') {
            await remove.mutateAsync(confirm.client.id);
            toast.success('Client deleted');
          } else {
            await setStatus.mutateAsync({ id: confirm.client.id, status: 'Inactive' });
            toast.success('Client deactivated');
          }
        }}
      />
    </div>
  );
}
