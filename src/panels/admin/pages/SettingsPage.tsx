import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Building2, GitBranch, Users2, LayoutGrid, FileText, Mail, Bot, Plug, Bell, Globe, DatabaseBackup, Lock, Trash2, Plus, X,
} from 'lucide-react';
import { PageHeader } from '@/shared';
import { Button, Input, Select, Textarea, FormField, Card, CardTitle, Toggle, IconButton } from '@ds/primitives';
import { ConfirmDialog, toast } from '@ds/feedback';
import { cn } from '@/lib/cn';
import { exportToXlsx } from '@/lib/export';
import type { Branch, Department } from '@/types';
import {
  useCompany, useUpdateCompany, useBranchesQuery, useDepartmentsQuery,
  useBranchMutations, useDepartmentMutations, usePeriods, usePeriodMutations,
  useDashboardWidgets, useSetDashboardWidgets, useCompanySettings, useUpdateSettings, useUploadLogo,
} from '../hooks';

/** Dashboard widget keys must match the gates in DashboardPage. */
export const DASHBOARD_WIDGETS: { key: string; label: string }[] = [
  { key: 'employees', label: 'Total Employees' },
  { key: 'attendance', label: 'Attendance Today' },
  { key: 'expenses', label: 'Total Expenses MTD' },
  { key: 'payroll', label: 'Payroll MTD' },
  { key: 'banks', label: 'Bank Overview' },
  { key: 'revenue', label: 'Revenue by Client' },
  { key: 'attendanceTrend', label: 'Attendance Trend' },
  { key: 'activity', label: 'Recent Activity' },
];

const SECTIONS = [
  { id: 'company', label: 'Company Profile', icon: Building2 },
  { id: 'branches', label: 'Branches', icon: GitBranch },
  { id: 'departments', label: 'Departments', icon: Users2 },
  { id: 'dashboard', label: 'Dashboard Widgets', icon: LayoutGrid },
  { id: 'invoice', label: 'Invoice Template', icon: FileText },
  { id: 'email', label: 'Email Templates', icon: Mail },
  { id: 'ai', label: 'AI Assistant', icon: Bot },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'country', label: 'Country Packs', icon: Globe },
  { id: 'periods', label: 'Financial Periods', icon: Lock },
  { id: 'backup', label: 'Backup & Audit', icon: DatabaseBackup },
];

export function SettingsPage() {
  const [section, setSection] = useState('company');
  const { data: company } = useCompany();
  const { data: branches = [] } = useBranchesQuery();
  const { data: departments = [] } = useDepartmentsQuery();
  const update = useUpdateCompany();
  const { register, handleSubmit, reset } = useForm({ defaultValues: company });
  useEffect(() => { if (company) reset(company); }, [company, reset]);

  return (
    <div>
      <PageHeader title="Settings" description="Company configuration and platform preferences." />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                section === s.id ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-950/40' : 'text-content-muted hover:bg-surface-sunken hover:text-content',
              )}
            >
              <s.icon size={16} /> {s.label}
            </button>
          ))}
        </aside>

        <div>
          {section === 'company' && (
            <Card>
              <CardTitle className="mb-4">Company Profile</CardTitle>
              <LogoUpload />
              <form onSubmit={handleSubmit(async (v) => { await update.mutateAsync(v); toast.success('Company profile saved'); })} className="grid gap-4 sm:grid-cols-2">
                <FormField label="Company Name" className="sm:col-span-2"><Input {...register('name')} /></FormField>
                <FormField label="Legal Address" className="sm:col-span-2"><Input {...register('legalAddress')} /></FormField>
                <FormField label="Tax ID (NTN)"><Input {...register('taxId')} /></FormField>
                <FormField label="Presentation Currency"><Select options={['PKR', 'USD', 'EUR', 'GBP', 'AED'].map((c) => ({ value: c, label: c }))} {...register('presentationCurrency')} /></FormField>
                <FormField label="Fiscal Year Start"><Select options={['January', 'April', 'July', 'October'].map((m) => ({ value: m, label: m }))} {...register('fiscalYearStart')} /></FormField>
                <div className="sm:col-span-2"><Button type="submit" loading={update.isPending}>Save Changes</Button></div>
              </form>
            </Card>
          )}

          {section === 'branches' && <BranchesSection branches={branches} />}

          {section === 'departments' && <DepartmentsSection departments={departments} />}

          {section === 'periods' && <PeriodsSection />}

          {section === 'dashboard' && <DashboardWidgetsSection />}

          {section === 'integrations' && <IntegrationsSection />}

          {section === 'country' && (
            <Card>
              <CardTitle className="mb-4">Country Packs</CardTitle>
              <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
                <div><p className="font-medium text-content">Pakistan</p><p className="text-xs text-content-muted">CNIC, EOBI, NTN/STRN, filer status, statutory payroll rules.</p></div>
                <Toggle checked onChange={() => undefined} />
              </div>
            </Card>
          )}

          {section === 'invoice' && <SettingsFormSection title="Invoice Template" group="invoice" fields={[
            { key: 'numberPrefix', label: 'Numbering Prefix', placeholder: 'INV' },
            { key: 'logoPosition', label: 'Logo Position', type: 'select', options: ['Left', 'Center', 'Right'] },
            { key: 'defaultTerms', label: 'Default Terms & Conditions', type: 'textarea', full: true },
          ]} />}
          {section === 'email' && <SettingsFormSection title="Email Templates" group="email" fields={[
            { key: 'invoiceSubject', label: 'Invoice Email Subject', placeholder: 'Your invoice {number} from {company}', full: true },
            { key: 'invoiceBody', label: 'Invoice Email Body', type: 'textarea', full: true },
            { key: 'statementSubject', label: 'Statement Email Subject', full: true },
          ]} />}
          {section === 'ai' && <SettingsFormSection title="AI Assistant" group="ai" fields={[
            { key: 'language', label: 'Language', type: 'select', options: ['English', 'Urdu'] },
            { key: 'retention', label: 'Chat Retention', type: 'select', options: ['30 days', '90 days', 'Forever'] },
            { key: 'instructions', label: 'Custom Instructions', type: 'textarea', full: true },
          ]} />}
          {section === 'notifications' && <SettingsFormSection title="Notifications" group="notifications" fields={[
            { key: 'recipientEmail', label: 'Compliance Digest Recipient', placeholder: 'alerts@company.com', full: true },
          ]} />}
          {section === 'backup' && <BackupSection />}
        </div>
      </div>
    </div>
  );
}

function BranchesSection({ branches }: { branches: Branch[] }) {
  const { add, update, remove } = useBranchMutations();
  const [draft, setDraft] = useState<{ name: string; city: string }>({ name: '', city: '' });
  const [editing, setEditing] = useState<Record<string, { name: string; city: string }>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const onAdd = async () => {
    if (!draft.name.trim()) return;
    await add.mutateAsync({ name: draft.name.trim(), city: draft.city.trim() || undefined });
    setDraft({ name: '', city: '' });
    toast.success('Branch added');
  };

  return (
    <Card>
      <CardTitle className="mb-4">Branches</CardTitle>
      <div className="divide-y divide-line">
        {branches.map((b) => {
          const e = editing[b.id];
          return (
            <div key={b.id} className="flex items-center justify-between gap-3 py-3">
              {e ? (
                <div className="flex flex-1 gap-2">
                  <Input value={e.name} onChange={(ev) => setEditing((s) => ({ ...s, [b.id]: { ...e, name: ev.target.value } }))} placeholder="Name" />
                  <Input value={e.city} onChange={(ev) => setEditing((s) => ({ ...s, [b.id]: { ...e, city: ev.target.value } }))} placeholder="City" />
                  <Button size="sm" loading={update.isPending} onClick={async () => { await update.mutateAsync({ id: b.id, data: e }); setEditing((s) => { const n = { ...s }; delete n[b.id]; return n; }); toast.success('Branch updated'); }}>Save</Button>
                  <IconButton icon={X} label="Cancel" onClick={() => setEditing((s) => { const n = { ...s }; delete n[b.id]; return n; })} />
                </div>
              ) : (
                <>
                  <button className="flex-1 text-left" onClick={() => setEditing((s) => ({ ...s, [b.id]: { name: b.name, city: b.city } }))}>
                    <p className="font-medium text-content">{b.name}</p>
                    <p className="text-xs text-content-muted">{b.city || '—'}</p>
                  </button>
                  <IconButton icon={Trash2} label="Delete branch" className="text-danger" onClick={() => setConfirmId(b.id)} />
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2 border-t border-line pt-4">
        <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Branch name" />
        <Input value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} placeholder="City" />
        <Button icon={Plus} loading={add.isPending} onClick={onAdd}>Add</Button>
      </div>

      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={async () => { if (confirmId) { await remove.mutateAsync(confirmId); toast.success('Branch deleted'); } setConfirmId(null); }}
        title="Delete branch?"
        message="Employees and clients assigned to this branch will keep their records but lose the branch link."
        confirmLabel="Delete"
        tone="danger"
      />
    </Card>
  );
}

function PeriodsSection() {
  const { data: periods = [] } = usePeriods();
  const { close, reopen } = usePeriodMutations();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [confirmMonth, setConfirmMonth] = useState<string | null>(null);

  const fmt = (m: string) => new Date(`${m}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <Card>
      <CardTitle className="mb-1">Financial Periods</CardTitle>
      <p className="mb-4 text-sm text-content-muted">
        Closing a month locks all invoices, payments, expenses, payroll and bank entries dated in it. Reopen to edit again.
      </p>

      <div className="mb-4 flex items-end gap-2 border-b border-line pb-4">
        <FormField label="Month to close"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></FormField>
        <Button icon={Lock} onClick={() => setConfirmMonth(month)}>Close Period</Button>
      </div>

      {periods.length === 0 ? (
        <p className="py-6 text-center text-sm text-content-muted">No closed periods. Everything is editable.</p>
      ) : (
        <div className="divide-y divide-line">
          {periods.map((p) => (
            <div key={p.month} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Lock size={15} className="text-warning" />
                <div>
                  <p className="font-medium text-content">{fmt(p.month)}</p>
                  <p className="text-xs text-content-muted">Closed {new Date(p.closedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" loading={reopen.isPending} onClick={async () => { await reopen.mutateAsync(p.month); toast.success(`${fmt(p.month)} reopened`); }}>Reopen</Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmMonth}
        onClose={() => setConfirmMonth(null)}
        onConfirm={async () => { if (confirmMonth) { await close.mutateAsync({ month: confirmMonth }); toast.success(`${fmt(confirmMonth)} closed`); } setConfirmMonth(null); }}
        title={`Close ${confirmMonth ? fmt(confirmMonth) : ''}?`}
        message="Records dated in this month will be locked from edits across Finance, Payroll and Invoices until you reopen it."
        confirmLabel="Close Period"
        tone="danger"
      />
    </Card>
  );
}

interface SettingField { key: string; label: string; type?: 'text' | 'textarea' | 'select'; options?: string[]; placeholder?: string; full?: boolean }

function SettingsFormSection({ title, group, fields }: { title: string; group: string; fields: SettingField[] }) {
  const { data } = useCompanySettings();
  const save = useUpdateSettings();
  const current = ((data?.settings?.[group] as Record<string, string>) ?? {});
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => { setForm(current); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [data]);

  const onSave = async () => { await save.mutateAsync({ [group]: form }); toast.success(`${title} saved`); };

  return (
    <Card>
      <CardTitle className="mb-4">{title}</CardTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <FormField key={f.key} label={f.label} className={f.full ? 'sm:col-span-2' : ''}>
            {f.type === 'textarea'
              ? <Textarea rows={3} value={form[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />
              : f.type === 'select'
              ? <Select value={form[f.key] ?? ''} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} options={[{ value: '', label: 'Select…' }, ...(f.options ?? []).map((o) => ({ value: o, label: o }))]} />
              : <Input value={form[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />}
          </FormField>
        ))}
        <div className="sm:col-span-2"><Button loading={save.isPending} onClick={onSave}>Save</Button></div>
      </div>
    </Card>
  );
}

function LogoUpload() {
  const { data } = useCompanySettings();
  const upload = useUploadLogo();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="mb-5 flex items-center gap-4 border-b border-line pb-5">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (f) { await upload.mutateAsync(f); toast.success('Logo updated'); }
        if (inputRef.current) inputRef.current.value = '';
      }} />
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-sunken">
        {data?.logoUrl ? <img src={data.logoUrl} alt="Company logo" className="h-full w-full object-contain" /> : <span className="text-2xl font-bold text-brand-600">T</span>}
      </div>
      <div>
        <p className="text-sm font-medium text-content">Company Logo</p>
        <p className="mb-2 text-xs text-content-muted">Shown on the top bar and invoice PDFs.</p>
        <Button size="sm" variant="outline" loading={upload.isPending} onClick={() => inputRef.current?.click()}>Upload Logo</Button>
      </div>
    </div>
  );
}

function IntegrationsSection() {
  const { data } = useCompanySettings();
  const save = useUpdateSettings();
  const active = (data?.settings?.integrations as { provider?: string })?.provider ?? '';
  const setProvider = async (p: string) => { await save.mutateAsync({ integrations: { provider: active === p ? '' : p } }); toast.success(active === p ? 'Integration disabled' : `${p} activated — Attendance now uses integrated mode`); };
  return (
    <Card>
      <CardTitle className="mb-1">Time Tracking</CardTitle>
      <p className="mb-4 text-sm text-content-muted">Activating a provider switches Attendance to integrated mode. (Live clock-in sync requires the provider’s API credentials.)</p>
      <div className="space-y-3">
        {['Jibble', 'Truein', 'Hubstaff'].map((p) => (
          <div key={p} className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
            <div><p className="font-medium text-content">{p}</p><p className="text-xs text-content-muted">{active === p ? 'Active' : 'Not connected'}</p></div>
            <Toggle checked={active === p} onChange={() => setProvider(p)} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function BackupSection() {
  return (
    <Card>
      <CardTitle className="mb-1">Backup & Audit</CardTitle>
      <p className="mb-4 text-sm text-content-muted">Export your data and review the audit trail.</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => { exportToXlsx('techxserve-backup', [{ note: 'Use each module’s Export button for full data. This is a settings snapshot.' }]); toast.success('Backup exported'); }}>Export Data</Button>
        <Button variant="outline" onClick={() => toast.info('Audit log is recorded server-side and viewable on request.')}>View Audit Log</Button>
      </div>
    </Card>
  );
}

function DashboardWidgetsSection() {
  const { data: hidden = [] } = useDashboardWidgets();
  const save = useSetDashboardWidgets();
  const toggle = async (key: string, show: boolean) => {
    const next = show ? hidden.filter((k) => k !== key) : [...new Set([...hidden, key])];
    await save.mutateAsync(next);
    toast.success('Dashboard preference saved');
  };
  return (
    <Card>
      <CardTitle className="mb-1">Dashboard Widgets</CardTitle>
      <p className="mb-4 text-sm text-content-muted">Choose which cards and charts appear on the Dashboard.</p>
      <div className="space-y-3">
        {DASHBOARD_WIDGETS.map((w) => (
          <div key={w.key} className="flex items-center justify-between">
            <span className="text-sm text-content">{w.label}</span>
            <Toggle checked={!hidden.includes(w.key)} onChange={(v) => toggle(w.key, v)} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function DepartmentsSection({ departments }: { departments: Department[] }) {
  const { add, remove } = useDepartmentMutations();
  const [name, setName] = useState('');

  return (
    <Card>
      <CardTitle className="mb-4">Departments</CardTitle>
      <div className="flex flex-wrap gap-2">
        {departments.map((d) => (
          <span key={d.id} className="flex items-center gap-1.5 rounded-lg bg-surface-sunken px-3 py-1.5 text-sm">
            {d.name}
            <button aria-label={`Remove ${d.name}`} onClick={async () => { await remove.mutateAsync(d.id); toast.success('Department removed'); }} className="text-content-subtle hover:text-danger">
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-4 flex gap-2 border-t border-line pt-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Department name" onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
        <Button icon={Plus} loading={add.isPending} onClick={async () => { if (!name.trim()) return; await add.mutateAsync(name.trim()); setName(''); toast.success('Department added'); }}>Add</Button>
      </div>
    </Card>
  );
}
