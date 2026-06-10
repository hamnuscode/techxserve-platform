import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Users, UserCheck, Plane, FileWarning, Eye, Pencil, MoreHorizontal } from 'lucide-react';
import { PageHeader, KpiStrip, FilterBar } from '@/shared';
import { exportToXlsx } from '@/lib/export';
import { Button, Select } from '@ds/primitives';
import { KPICard, DataTable, StatusBadge, Avatar, Pagination, type Column, type SortState } from '@ds/data-display';
import { EmptyState, toast } from '@ds/feedback';
import { DropdownMenu } from '@ds/overlays';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { useEmployees, useBranches, useDepartments } from '../hooks';
import { EmployeeFormModal } from '../modals/EmployeeFormModal';
import { routes } from '@/config/routes';
import type { Employee } from '@/types';

const PAGE_SIZE = 25;

export function EmployeesListPage() {
  const navigate = useNavigate();
  const { values, set, reset, activeCount } = useUrlFilters({
    search: '', branch: '', department: '', type: '', status: '', shift: '', page: '1',
  });
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | undefined>();

  const { data: branches = [] } = useBranches();
  const { data: departments = [] } = useDepartments();
  const page = Number(values.page) || 1;
  const { data, isLoading, isError, refetch } = useEmployees({
    search: values.search, branch: values.branch, department: values.department,
    type: values.type, status: values.status, shift: values.shift,
    page, pageSize: PAGE_SIZE, sortKey: sort.key, sortDir: sort.dir,
  });
  const { data: all } = useEmployees({ pageSize: 1000 });

  const kpis = useMemo(() => {
    const rows = all?.rows ?? [];
    return {
      total: rows.length,
      active: rows.filter((e) => e.status === 'Active').length,
      onLeave: rows.filter((e) => e.status === 'On Leave').length,
      missingDocs: rows.filter((e) => !e.docsComplete).length,
    };
  }, [all]);

  const columns: Column<Employee>[] = [
    { key: 'code', header: 'ID', sortAccessor: (e) => e.code, render: (e) => <span className="nums font-medium text-brand-600">{e.code}</span> },
    {
      key: 'name', header: 'Name', sortAccessor: (e) => e.name,
      render: (e) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={e.name} size="sm" />
          <span className="font-semibold text-content">{e.name}</span>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (e) => <span className="text-content-muted">{e.phone}</span> },
    { key: 'department', header: 'Department', sortAccessor: (e) => e.department, render: (e) => e.department },
    { key: 'branch', header: 'Branch', render: (e) => e.branch },
    { key: 'type', header: 'Type', render: (e) => <StatusBadge status={e.type} dot={false} size="sm" tone="neutral" /> },
    { key: 'status', header: 'Status', render: (e) => <StatusBadge status={e.status} /> },
    {
      key: 'documents', header: 'Documents',
      render: (e) =>
        e.docsComplete ? (
          <span className="text-xs font-medium text-success-strong">Complete</span>
        ) : (
          <span className="text-xs font-medium text-danger">Missing ({e.docsRequired - e.docsCount})</span>
        ),
    },
    {
      key: 'actions', header: '', align: 'right',
      render: (e) => (
        <div className="flex items-center justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
          <Button size="sm" variant="ghost" icon={Eye} onClick={() => navigate(routes.employee(e.id))}>View</Button>
          <DropdownMenu
            trigger={<Button size="sm" variant="ghost" icon={MoreHorizontal} aria-label="More" />}
            items={[
              { label: 'Edit', icon: Pencil, onClick: () => { setEditing(e); setModalOpen(true); } },
              { label: 'View Payroll', onClick: () => navigate(routes.payroll) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Master list of every employee."
        actions={
          <>
            <Button variant="outline" icon={Download} onClick={() => {
              exportToXlsx('employees', (data?.rows ?? []).map((e) => ({
                Code: e.code, Name: e.name, Email: e.email, Phone: e.phone, Department: e.department,
                Branch: e.branch, Type: e.type, Shift: e.shift, Status: e.status,
              })));
              toast.success('Exported employees.xlsx');
            }}>Export</Button>
            <Button icon={Plus} onClick={() => { setEditing(undefined); setModalOpen(true); }}>Add Employee</Button>
          </>
        }
      />

      <KpiStrip cols={4}>
        <KPICard label="Total Employees" value={kpis.total} format={(n) => String(Math.round(n))} icon={Users} tone="brand" />
        <KPICard label="Active" value={kpis.active} format={(n) => String(Math.round(n))} icon={UserCheck} tone="success" />
        <KPICard label="On Leave Today" value={kpis.onLeave} format={(n) => String(Math.round(n))} icon={Plane} tone="warning" />
        <KPICard label="Missing Docs" value={kpis.missingDocs} format={(n) => String(Math.round(n))} icon={FileWarning} tone="danger" />
      </KpiStrip>

      <FilterBar
        search={values.search}
        onSearchChange={(v) => set({ search: v })}
        searchPlaceholder="Search name, ID, phone…"
        activeCount={activeCount}
        onReset={reset}
      >
        <Select sizeVariant="sm" className="w-36" value={values.branch ?? ''} onChange={(e) => set({ branch: e.target.value })}
          options={[{ value: '', label: 'All Branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
        <Select sizeVariant="sm" className="w-40" value={values.department ?? ''} onChange={(e) => set({ department: e.target.value })}
          options={[{ value: '', label: 'All Departments' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]} />
        <Select sizeVariant="sm" className="w-32" value={values.status ?? ''} onChange={(e) => set({ status: e.target.value })}
          options={[{ value: '', label: 'All Status' }, ...['Active', 'Inactive', 'On Leave'].map((s) => ({ value: s, label: s }))]} />
      </FilterBar>

      <DataTable
        data={data?.rows ?? []}
        columns={columns}
        rowKey={(e) => e.id}
        loading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        sort={sort}
        onSortChange={setSort}
        onRowClick={(e) => navigate(routes.employee(e.id))}
        empty={<EmptyState icon={Users} title="No employees yet" description="Add your first employee to get started." action={<Button icon={Plus} onClick={() => setModalOpen(true)}>Add Employee</Button>} />}
      />

      {data && data.total > 0 && (
        <div className="mt-4">
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={(p) => set({ page: String(p) })} />
        </div>
      )}

      <EmployeeFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(undefined); }} employee={editing} />
    </div>
  );
}
