import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Plus, Download, Users, CreditCard, HandCoins } from 'lucide-react';
import { PageHeader, KpiStrip, FilterBar, useFormatMoney } from '@/shared';
import { exportToXlsx } from '@/lib/export';
import { Button, Tabs, Card, CardTitle, Select, Input, Textarea, FormField, type TabItem } from '@ds/primitives';
import { KPICard, DataTable, StatusBadge, Pagination, type Column } from '@ds/data-display';
import { DonutChart } from '@ds/charts';
import { EmptyState, Modal, toast } from '@ds/feedback';
import { ProgressBar } from '@ds/data-display';
import { formatDate } from '@/lib/format';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { useExpenses, useExpenseBreakdown, useAddExpense, useVendors, useAddVendor } from '../hooks';
import type { Expense } from '@/types';

function VendorsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: vendors = [] } = useVendors();
  const addVendor = useAddVendor();
  const [name, setName] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Vendors" size="sm">
      <div className="divide-y divide-line">
        {vendors.length === 0 ? <p className="py-4 text-center text-sm text-content-subtle">No vendors yet.</p>
          : vendors.map((v) => <div key={v.id} className="py-2.5 text-sm font-medium text-content">{v.name}</div>)}
      </div>
      <div className="mt-4 flex gap-2 border-t border-line pt-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vendor name" />
        <Button loading={addVendor.isPending} onClick={async () => { if (!name.trim()) return; await addVendor.mutateAsync(name.trim()); setName(''); toast.success('Vendor added'); }}>Add</Button>
      </div>
    </Modal>
  );
}

const CATEGORIES = ['Office Rent', 'Utilities', 'Salaries Sub', 'Marketing', 'Travel', 'Software', 'Equipment', 'Maintenance'];
const PAGE_SIZE = 25;

function AddExpenseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useAddExpense();
  const { register, handleSubmit, reset } = useForm<{ date: string; category: string; description: string; amount: number; mode: Expense['mode'] }>({
    defaultValues: { date: new Date().toISOString().slice(0, 10), category: 'Office Rent', mode: 'Bank' },
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Expense"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={add.isPending} onClick={handleSubmit(async (v) => { await add.mutateAsync({ ...v, amount: Number(v.amount), currency: 'PKR' }); toast.success('Expense added'); reset(); onClose(); })}>Add Expense</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Date"><Input type="date" {...register('date')} /></FormField>
        <FormField label="Category"><Select options={CATEGORIES.map((c) => ({ value: c, label: c }))} {...register('category')} /></FormField>
        <FormField label="Amount" required><Input type="number" {...register('amount')} /></FormField>
        <FormField label="Mode"><Select options={['Cash', 'Bank', 'Card', 'Cheque'].map((m) => ({ value: m, label: m }))} {...register('mode')} /></FormField>
        <FormField label="Description" className="sm:col-span-2"><Textarea rows={2} {...register('description')} /></FormField>
      </div>
    </Modal>
  );
}

export function ExpensesPage() {
  const money = useFormatMoney();
  const [params, setParams] = useSearchParams();
  const [subtab, setSubtab] = useState('expenses');
  const [addOpen, setAddOpen] = useState(params.get('new') === '1');
  const [vendorsOpen, setVendorsOpen] = useState(false);
  const { values, set, reset, activeCount } = useUrlFilters({ search: '', category: '', mode: '', page: '1' });

  const page = Number(values.page) || 1;
  const { data, isLoading, isError, refetch } = useExpenses({ search: values.search, category: values.category, mode: values.mode, page, pageSize: PAGE_SIZE, sortKey: 'date', sortDir: 'desc' });
  const { data: breakdown = [] } = useExpenseBreakdown();
  const { data: all } = useExpenses({ pageSize: 1000 });

  const total = useMemo(() => (all?.rows ?? []).reduce((s, e) => s + e.amount, 0), [all]);
  const maxCat = Math.max(...breakdown.map((b) => b.amount), 1);

  const closeAdd = () => {
    setAddOpen(false);
    if (params.get('new')) { params.delete('new'); setParams(params, { replace: true }); }
  };

  const columns: Column<Expense>[] = [
    { key: 'date', header: 'Date', render: (e) => formatDate(e.date) },
    { key: 'category', header: 'Category', render: (e) => <span className="font-medium text-content">{e.category}</span> },
    { key: 'client', header: 'Client / Project', render: (e) => <span className="text-content-muted">{e.clientName ?? '—'}</span> },
    { key: 'description', header: 'Description', render: (e) => e.description },
    { key: 'amount', header: 'Amount', align: 'right', render: (e) => <span className="nums font-medium">{money(e.amount)}</span> },
    { key: 'mode', header: 'Mode', render: (e) => <StatusBadge status={e.mode} dot={false} size="sm" tone="neutral" /> },
    { key: 'vendor', header: 'Vendor', render: (e) => <span className="text-content-muted">{e.vendor ?? '—'}</span> },
  ];

  const tabs: TabItem[] = [
    { value: 'expenses', label: 'Expenses' },
    { value: 'advances', label: 'Advances' },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="All expenses and vendor advances."
        actions={
          <>
            <Button variant="outline" icon={Users} onClick={() => setVendorsOpen(true)}>Manage Vendors</Button>
            <Button variant="outline" icon={Download} onClick={() => {
              exportToXlsx('expenses', (data?.rows ?? []).map((e) => ({
                Date: e.date, Category: e.category, Client: e.clientName ?? '', Description: e.description,
                Amount: e.amount, Currency: e.currency, Mode: e.mode, Vendor: e.vendor ?? '',
              })));
              toast.success('Exported expenses.xlsx');
            }}>Export</Button>
            <Button icon={Plus} onClick={() => setAddOpen(true)}>Add Expense</Button>
          </>
        }
      />

      <Tabs items={tabs} value={subtab} onChange={setSubtab} className="mb-5" />

      {subtab === 'advances' ? (
        <EmptyState icon={HandCoins} title="Vendor advances" description="Advances paid to vendors will appear here. Manage vendors to record an advance." action={<Button variant="outline" icon={Users} onClick={() => setVendorsOpen(true)}>Manage Vendors</Button>} />
      ) : (
        <>
          <KpiStrip cols={3}>
            <KPICard label="Total Expenses" value={total} format={(n) => money(n)} icon={CreditCard} tone="brand" />
          </KpiStrip>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardTitle className="mb-4">Category Breakdown</CardTitle>
              <div className="space-y-3">
                {breakdown.slice(0, 6).map((b) => (
                  <div key={b.category}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-content-muted">{b.category}</span>
                      <span className="nums font-medium">{money(b.amount)} <span className="text-content-subtle">({Math.round((b.amount / total) * 100)}%)</span></span>
                    </div>
                    <ProgressBar value={(b.amount / maxCat) * 100} size="sm" tone="brand" />
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <CardTitle className="mb-4">Distribution</CardTitle>
              <DonutChart
                data={breakdown.map((b) => ({ name: b.category, value: b.amount }))}
                centerLabel={money(total, { compact: true })}
                centerSubLabel="Total"
                valueFormatter={(v) => money(v)}
              />
            </Card>
          </div>

          <FilterBar search={values.search} onSearchChange={(v) => set({ search: v })} searchPlaceholder="Search description, vendor…" activeCount={activeCount} onReset={reset}>
            <Select sizeVariant="sm" className="w-40" value={values.category ?? ''} onChange={(e) => set({ category: e.target.value })}
              options={[{ value: '', label: 'All Categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]} />
            <Select sizeVariant="sm" className="w-32" value={values.mode ?? ''} onChange={(e) => set({ mode: e.target.value })}
              options={[{ value: '', label: 'All Modes' }, ...['Cash', 'Bank', 'Card', 'Cheque'].map((m) => ({ value: m, label: m }))]} />
          </FilterBar>

          <DataTable data={data?.rows ?? []} columns={columns} rowKey={(e) => e.id} loading={isLoading} error={isError} onRetry={() => refetch()}
            empty={<EmptyState icon={CreditCard} title="No expenses" description="Record your first expense." action={<Button icon={Plus} onClick={() => setAddOpen(true)}>Add Expense</Button>} />} />

          {data && data.total > 0 && (
            <div className="mt-4"><Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={(p) => set({ page: String(p) })} /></div>
          )}
        </>
      )}

      <AddExpenseModal open={addOpen} onClose={closeAdd} />
      <VendorsModal open={vendorsOpen} onClose={() => setVendorsOpen(false)} />
    </div>
  );
}
