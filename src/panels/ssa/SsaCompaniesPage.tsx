import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, LogOut, Users2, ShieldCheck, ArrowRight, Copy, Check, CreditCard } from 'lucide-react';
import { Button, Input, FormField, Card } from '@ds/primitives';
import { Modal, EmptyState, toast } from '@ds/feedback';
import { StatusBadge } from '@ds/data-display';
import { useAuthStore } from '@/app/stores/auth';
import { ssaApi, type CompanyRow } from '@/data/mock-api';
import { formatDate, daysUntil } from '@/lib/format';
import { routes } from '@/config/routes';

function subStatus(c: CompanyRow): { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' } {
  if (!c.subscriptionExpiresAt) return { label: 'No subscription', tone: 'neutral' };
  const d = daysUntil(c.subscriptionExpiresAt);
  if (d < 0) return { label: 'Expired', tone: 'danger' };
  if (d <= 14) return { label: `Expires in ${d}d`, tone: 'warning' };
  return { label: `Active to ${formatDate(c.subscriptionExpiresAt)}`, tone: 'success' };
}

export function SsaCompaniesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setViewAsCompany = useAuthStore((s) => s.setViewAsCompany);
  const logout = useAuthStore((s) => s.logout);
  const status = useAuthStore((s) => s.status);
  const [createOpen, setCreateOpen] = useState(false);
  const [adminsFor, setAdminsFor] = useState<CompanyRow | null>(null);
  const [billingFor, setBillingFor] = useState<CompanyRow | null>(null);
  const { data: companies = [], isLoading } = useQuery({ queryKey: ['ssa-companies'], queryFn: ssaApi.companies, enabled: user?.role === 'Super Super Admin' });

  if (status === 'loading') return null;
  if (status === 'anon') return <Navigate to={routes.login} replace />;
  if (user?.role !== 'Super Super Admin') return <Navigate to={routes.dashboard} replace />;

  const enterCompany = async (c: CompanyRow) => {
    await setViewAsCompany(c.id);
    qc.clear(); // drop any cached data so the company's data loads fresh
    navigate(routes.dashboard, { replace: true });
  };

  return (
    <div className="min-h-screen bg-app">
      {/* SSA top bar */}
      <header className="flex h-topbar items-center justify-between border-b border-line bg-surface px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-display text-lg font-bold text-white">T</span>
          <div>
            <p className="text-sm font-semibold text-content">TechXServe — Platform Owner</p>
            <p className="text-2xs text-content-muted">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" icon={LogOut} onClick={() => { logout(); navigate(routes.login); }}>Sign Out</Button>
      </header>

      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-content">Companies</h1>
            <p className="mt-1 text-sm text-content-muted">Every tenant on the platform. Open one to manage it, or create a new company and its administrator.</p>
          </div>
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>Create Company</Button>
        </div>

        {isLoading ? null : companies.length === 0 ? (
          <EmptyState icon={Building2} title="No companies yet" description="Create your first company to get started." action={<Button icon={Plus} onClick={() => setCreateOpen(true)}>Create Company</Button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => (
              <Card key={c.id} className="flex flex-col">
                <div className="mb-3 flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40"><Building2 size={20} /></span>
                  <StatusBadge status={c.active ? 'Active' : 'Inactive'} size="sm" />
                </div>
                <p className="font-semibold text-content">{c.name}</p>
                <p className="mt-0.5 text-xs text-content-muted">{c.presentationCurrency} · {c.employeeCount} employees · {c.adminCount} users</p>
                <div className="mt-2"><StatusBadge status={subStatus(c).label} tone={subStatus(c).tone} size="sm" dot /></div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" fullWidth iconRight={ArrowRight} onClick={() => enterCompany(c)} disabled={!c.active}>Open</Button>
                  <Button size="sm" variant="outline" icon={CreditCard} onClick={() => setBillingFor(c)} aria-label="Subscription" />
                  <Button size="sm" variant="outline" icon={ShieldCheck} onClick={() => setAdminsFor(c)} aria-label="Manage admins" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateCompanyModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => qc.invalidateQueries({ queryKey: ['ssa-companies'] })} />
      {adminsFor && <ManageAdminsModal company={adminsFor} onClose={() => setAdminsFor(null)} />}
      {billingFor && <SubscriptionModal company={billingFor} onClose={() => setBillingFor(null)} />}
    </div>
  );
}

function SubscriptionModal({ company, onClose }: { company: CompanyRow; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: payments = [] } = useQuery({ queryKey: ['ssa-subs', company.id], queryFn: () => ssaApi.subscriptionPayments(company.id) });
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const st = subStatus(company);

  const submit = async () => {
    const amt = Number(amount); const d = Number(days);
    if (!Number.isFinite(amt) || amt < 0) return toast.error('Enter a valid amount.');
    if (!Number.isInteger(d) || d <= 0) return toast.error('Days must be a positive whole number.');
    setBusy(true);
    try {
      await ssaApi.addSubscriptionPayment(company.id, amt, d, undefined, notes.trim() || undefined);
      qc.invalidateQueries({ queryKey: ['ssa-subs', company.id] });
      qc.invalidateQueries({ queryKey: ['ssa-companies'] });
      toast.success('Payment recorded — subscription extended');
      setAmount(''); setNotes('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not record payment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`${company.name} — Subscription`} size="sm">
      <div className="space-y-4">
        <div className="rounded-lg border border-line bg-surface-sunken px-3 py-2 text-sm">
          Status: <StatusBadge status={st.label} tone={st.tone} size="sm" dot /> {company.active ? '' : ' (company deactivated)'}
        </div>

        <div className="space-y-3 border-t border-line pt-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-content-muted"><CreditCard size={14} /> Record a payment</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount (PKR)" required><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></FormField>
            <FormField label="Days to add" required><Input type="number" value={days} onChange={(e) => setDays(e.target.value)} /></FormField>
          </div>
          <FormField label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional reference" /></FormField>
          <Button fullWidth loading={busy} onClick={submit}>Record Payment</Button>
        </div>

        {payments.length > 0 && (
          <div className="border-t border-line pt-4">
            <p className="mb-2 text-xs font-medium text-content-muted">Payment history</p>
            <div className="max-h-44 space-y-1.5 overflow-y-auto">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-surface-sunken px-3 py-2 text-sm">
                  <span>{formatDate(p.paymentDate)} · {p.daysAdded}d{p.notes ? ` · ${p.notes}` : ''}</span>
                  <span className="nums font-medium">PKR {Math.round(p.amount).toLocaleString('en-US')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CreateCompanyModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error('Company name is required.');
    setBusy(true);
    try {
      await ssaApi.createCompany({ name: name.trim(), legalAddress: address, taxId, presentationCurrency: currency });
      toast.success('Company created');
      setName(''); setAddress(''); setTaxId('');
      onCreated(); onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create company.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Company" size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Create</Button></>}>
      <div className="space-y-4">
        <FormField label="Company Name" required><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme (Pvt) Ltd" autoFocus /></FormField>
        <FormField label="Legal Address"><Input value={address} onChange={(e) => setAddress(e.target.value)} /></FormField>
        <FormField label="Tax ID (NTN)"><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} /></FormField>
        <FormField label="Presentation Currency"><Input value={currency} onChange={(e) => setCurrency(e.target.value)} /></FormField>
        <p className="text-xs text-content-subtle">After creating, add a Super Admin so they can manage the company.</p>
      </div>
    </Modal>
  );
}

function ManageAdminsModal({ company, onClose }: { company: CompanyRow; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: admins = [] } = useQuery({ queryKey: ['ssa-admins', company.id], queryFn: () => ssaApi.admins(company.id) });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ email: string; tempPassword?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    if (!email.trim()) return toast.error('Email is required.');
    setBusy(true);
    try {
      const res = await ssaApi.createAdmin(company.id, { name: name.trim(), email: email.trim() });
      setResult(res);
      qc.invalidateQueries({ queryKey: ['ssa-admins', company.id] });
      qc.invalidateQueries({ queryKey: ['ssa-companies'] });
      toast.success('Super Admin created');
      setName(''); setEmail('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create admin.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`${company.name} — Administrators`} size="sm">
      <div className="space-y-4">
        <div className="divide-y divide-line">
          {admins.length === 0 ? <p className="py-3 text-sm text-content-subtle">No users yet.</p> : admins.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2.5">
              <div><p className="text-sm font-medium text-content">{a.name || a.email}</p><p className="text-xs text-content-muted">{a.email}</p></div>
              <StatusBadge status={a.role} size="sm" tone={a.role === 'Super Admin' ? 'brand' : 'neutral'} dot={false} />
            </div>
          ))}
        </div>

        {result ? (
          <div className="rounded-lg border border-line bg-surface-sunken p-3">
            <p className="mb-2 text-sm text-content">Login created for <span className="font-medium">{result.email}</span>. Share these one-time credentials:</p>
            {result.tempPassword && (
              <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2">
                <code className="text-sm">{result.tempPassword}</code>
                <button onClick={() => { navigator.clipboard.writeText(result.tempPassword!); setCopied(true); }} aria-label="Copy">{copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}</button>
              </div>
            )}
            <Button size="sm" className="mt-3" variant="outline" onClick={() => setResult(null)}>Add another</Button>
          </div>
        ) : (
          <div className="space-y-3 border-t border-line pt-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-content-muted"><Users2 size={14} /> Add a Super Admin</p>
            <FormField label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></FormField>
            <FormField label="Login email" required><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@company.com" /></FormField>
            <Button fullWidth loading={busy} onClick={create}>Create Super Admin</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
