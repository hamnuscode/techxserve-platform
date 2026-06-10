import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Plus, Banknote, Landmark, Send, Download, Coins, Wallet, ArrowLeftRight } from 'lucide-react';
import { PageHeader, KpiStrip, useFormatMoney } from '@/shared';
import { exportToXlsx } from '@/lib/export';
import { Button, Tabs, Input, Select, FormField, type TabItem } from '@ds/primitives';
import { KPICard, DataTable, StatusBadge, type Column } from '@ds/data-display';
import { EmptyState, Modal, toast } from '@ds/feedback';
import { formatDate } from '@/lib/format';
import { useBanks, useCheques, useReceivables, useVendors, useAddBank, useWireTransfer, useTransactions } from '../hooks';
import { routes } from '@/config/routes';
import type { BankAccount, Cheque, Vendor } from '@/types';
import type { Receivable } from '@/data/mock-api';

function AddBankModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useAddBank();
  const { register, handleSubmit, reset } = useForm<{ name: string; accountNumber: string; type: BankAccount['type']; balance: number }>({
    defaultValues: { type: 'Current', balance: 0 },
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Bank Account"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={add.isPending} onClick={handleSubmit(async (v) => { await add.mutateAsync({ ...v, balance: Number(v.balance) }); toast.success('Bank account added'); reset(); onClose(); })}>Add Account</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Account Name" required className="sm:col-span-2"><Input placeholder="Meezan Bank — Current" {...register('name')} /></FormField>
        <FormField label="Account # / IBAN"><Input {...register('accountNumber')} /></FormField>
        <FormField label="Type"><Select options={['Current', 'Savings', 'Cash', 'Treasury'].map((t) => ({ value: t, label: t }))} {...register('type')} /></FormField>
        <FormField label="Opening Balance"><Input type="number" {...register('balance')} /></FormField>
      </div>
    </Modal>
  );
}

function WireTransferModal({ open, onClose, banks }: { open: boolean; onClose: () => void; banks: BankAccount[] }) {
  const wire = useWireTransfer();
  const [fromBankId, setFrom] = useState('');
  const [toBankId, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setRef] = useState('');
  const submit = async () => {
    if (!fromBankId || !toBankId || fromBankId === toBankId || !amount) return toast.error('Pick two different accounts and an amount.');
    await wire.mutateAsync({ fromBankId, toBankId, amount: Number(amount), reference });
    toast.success('Wire transfer recorded');
    setAmount(''); setRef('');
    onClose();
  };
  const opts = banks.map((b) => ({ value: b.id, label: `${b.name} (${b.type})` }));
  return (
    <Modal open={open} onClose={onClose} title="Wire Transfer" size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={wire.isPending} onClick={submit}>Transfer</Button></>}>
      <div className="space-y-4">
        <FormField label="From account" required><Select value={fromBankId} onChange={(e) => setFrom(e.target.value)} options={[{ value: '', label: 'Select…' }, ...opts]} /></FormField>
        <FormField label="To account" required><Select value={toBankId} onChange={(e) => setTo(e.target.value)} options={[{ value: '', label: 'Select…' }, ...opts]} /></FormField>
        <FormField label="Amount (PKR)" required><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></FormField>
        <FormField label="Reference"><Input value={reference} onChange={(e) => setRef(e.target.value)} placeholder="Optional note" /></FormField>
      </div>
    </Modal>
  );
}

function TransactionLogModal({ open, onClose, banks }: { open: boolean; onClose: () => void; banks: BankAccount[] }) {
  const money = useFormatMoney();
  const [bankId, setBankId] = useState('');
  const { data: txns = [] } = useTransactions(bankId);
  return (
    <Modal open={open} onClose={onClose} title="Transaction Log" size="lg">
      <FormField label="Account"><Select value={bankId} onChange={(e) => setBankId(e.target.value)} options={[{ value: '', label: 'Select an account…' }, ...banks.map((b) => ({ value: b.id, label: b.name }))]} /></FormField>
      <div className="mt-4 max-h-80 overflow-y-auto">
        {!bankId ? <p className="py-6 text-center text-sm text-content-subtle">Pick an account to see its transactions.</p>
          : txns.length === 0 ? <p className="py-6 text-center text-sm text-content-subtle">No transactions yet.</p>
          : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-line text-left text-2xs uppercase text-content-subtle"><th className="py-2">Date</th><th>Description</th><th>Type</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className="py-2">{formatDate(t.date)}</td><td>{t.description}</td>
                  <td><StatusBadge status={t.type} size="sm" tone={t.type === 'Credit' ? 'success' : 'danger'} dot={false} /></td>
                  <td className="nums text-right font-medium">{money(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}

export function BanksLedgersPage() {
  const navigate = useNavigate();
  const money = useFormatMoney();
  const [tab, setTab] = useState('banks');
  const [addOpen, setAddOpen] = useState(false);
  const [wireOpen, setWireOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const { data: banks = [], isLoading } = useBanks();
  const { data: cheques = [] } = useCheques();
  const { data: receivables = [] } = useReceivables();
  const { data: vendors = [] } = useVendors();

  const kpis = useMemo(() => {
    const cash = banks.filter((b) => b.type === 'Treasury' || b.type === 'Cash').reduce((s, b) => s + b.balance, 0);
    const bank = banks.filter((b) => b.type !== 'Treasury' && b.type !== 'Cash').reduce((s, b) => s + b.balance, 0);
    const transit = cheques.filter((c) => c.status === 'In Transit').reduce((s, c) => s + c.amount, 0);
    return { cash, bank, transit, net: cash + bank - transit };
  }, [banks, cheques]);

  const bankCols: Column<BankAccount>[] = [
    { key: 'name', header: 'Account', render: (b) => <div><p className="font-medium text-content">{b.name}</p><p className="nums text-2xs text-content-subtle">{b.accountNumber}</p></div> },
    { key: 'type', header: 'Type', render: (b) => <StatusBadge status={b.type} dot={false} size="sm" tone="neutral" /> },
    { key: 'owner', header: 'Owner', render: (b) => <span className="text-content-muted">{b.owner}</span> },
    { key: 'balance', header: 'Balance', align: 'right', render: (b) => <span className="nums font-medium">{money(b.balance)}</span> },
    { key: 'cheque', header: 'Cheque Bal.', align: 'right', render: (b) => <span className="nums text-content-muted">{money(b.chequeBalance)}</span> },
    { key: 'total', header: 'Total', align: 'right', render: (b) => <span className="nums font-semibold">{money(b.balance + b.chequeBalance)}</span> },
  ];

  const chequeCols: Column<Cheque>[] = [
    { key: 'number', header: 'Cheque #', render: (c) => <span className="nums font-medium">{c.number}</span> },
    { key: 'type', header: 'Type', render: (c) => <StatusBadge status={c.type} dot={false} size="sm" tone={c.type === 'Incoming' ? 'success' : 'info'} /> },
    { key: 'bank', header: 'Bank', render: (c) => c.bankName },
    { key: 'date', header: 'Date', render: (c) => formatDate(c.date) },
    { key: 'recipient', header: 'Recipient', render: (c) => c.recipient },
    { key: 'amount', header: 'Amount', align: 'right', render: (c) => <span className="nums">{money(c.amount)}</span> },
    { key: 'linked', header: 'Linked', render: (c) => <span className="nums text-content-muted">{c.linkedTo ?? '—'}</span> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
  ];

  const receivableCols: Column<Receivable>[] = [
    { key: 'client', header: 'Client', render: (r) => <button className="font-medium text-brand-600 hover:underline" onClick={() => navigate(routes.client(r.clientId))}>{r.clientName}</button> },
    { key: 'invoiced', header: 'Invoiced', align: 'right', render: (r) => <span className="nums">{money(r.invoiced)}</span> },
    { key: 'withholding', header: 'Withholding', align: 'right', render: (r) => <span className="nums text-content-muted">{money(r.withholding)}</span> },
    { key: 'received', header: 'Received', align: 'right', render: (r) => <span className="nums text-success-strong">{money(r.received)}</span> },
    { key: 'outstanding', header: 'Outstanding', align: 'right', render: (r) => <span className={r.outstanding > 0 ? 'nums font-semibold text-danger' : 'nums'}>{money(r.outstanding)}</span> },
  ];

  const vendorCols: Column<Vendor>[] = [
    { key: 'name', header: 'Vendor', render: (v) => <span className="font-medium text-content">{v.name}</span> },
    { key: 'opening', header: 'Opening', align: 'right', render: (v) => <span className="nums">{money(v.openingBalance)}</span> },
    { key: 'billed', header: 'Billed', align: 'right', render: (v) => <span className="nums">{money(v.billed)}</span> },
    { key: 'paid', header: 'Paid', align: 'right', render: (v) => <span className="nums text-success-strong">{money(v.paid)}</span> },
    { key: 'outstanding', header: 'Outstanding', align: 'right', render: (v) => <span className="nums font-semibold text-danger">{money(v.openingBalance + v.billed - v.paid)}</span> },
  ];

  const tabs: TabItem[] = [
    { value: 'banks', label: 'Bank Accounts', count: banks.length },
    { value: 'receivables', label: 'Client Receivables', count: receivables.length },
    { value: 'payables', label: 'Accounts Payable', count: vendors.length },
  ];

  return (
    <div>
      <PageHeader
        title="Banks & Ledgers"
        description="Bank accounts, cheques, receivables and payables."
        actions={
          <>
            <Button variant="outline" icon={ArrowLeftRight} onClick={() => setWireOpen(true)}>Wire Transfer</Button>
            <Button variant="outline" icon={Download} onClick={() => {
              exportToXlsx('bank-accounts', banks.map((b) => ({
                Name: b.name, 'Account #': b.accountNumber, IBAN: b.iban ?? '', Type: b.type,
                Owner: b.owner, Balance: b.balance, 'Cheque Balance': b.chequeBalance, Currency: b.currency,
              })));
              toast.success('Exported to Excel');
            }}>Export</Button>
            <Button icon={Plus} onClick={() => setAddOpen(true)}>Add Bank Account</Button>
          </>
        }
      />

      <KpiStrip cols={4}>
        <KPICard label="Cash in Hand" value={kpis.cash} format={(n) => money(n, { compact: true })} icon={Coins} tone="success" loading={isLoading} />
        <KPICard label="Bank Balance" value={kpis.bank} format={(n) => money(n, { compact: true })} icon={Landmark} tone="brand" loading={isLoading} />
        <KPICard label="Cheques in Transit" value={kpis.transit} format={(n) => money(n, { compact: true })} icon={Send} tone="warning" loading={isLoading} />
        <KPICard label="Net Available Cash" value={kpis.net} format={(n) => money(n, { compact: true })} icon={Wallet} tone="info" loading={isLoading} />
      </KpiStrip>

      <Tabs items={tabs} value={tab} onChange={setTab} className="mb-5" />

      {tab === 'banks' && (
        <div className="space-y-6">
          <DataTable data={banks} columns={bankCols} rowKey={(b) => b.id} loading={isLoading} empty={<EmptyState icon={Landmark} title="No bank accounts" description="Add a bank account to start tracking balances." action={<Button icon={Plus} onClick={() => setAddOpen(true)}>Add Bank Account</Button>} />} />
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-content">Cheques</h3>
              <Button size="sm" variant="ghost" icon={Banknote} onClick={() => setLogOpen(true)}>Transactions</Button>
            </div>
            <DataTable data={cheques} columns={chequeCols} rowKey={(c) => c.id} empty={<EmptyState icon={Banknote} title="No cheques" size="sm" description="Cheque records will appear here." />} />
          </div>
        </div>
      )}

      {tab === 'receivables' && (
        <DataTable data={receivables} columns={receivableCols} rowKey={(r) => r.clientId} empty={<EmptyState icon={Wallet} title="No receivables" description="Client balances will appear here." />} />
      )}

      {tab === 'payables' && (
        <DataTable data={vendors} columns={vendorCols} rowKey={(v) => v.id} empty={<EmptyState icon={Wallet} title="No payables" description="Vendor balances will appear here." />} />
      )}

      <AddBankModal open={addOpen} onClose={() => setAddOpen(false)} />
      <WireTransferModal open={wireOpen} onClose={() => setWireOpen(false)} banks={banks} />
      <TransactionLogModal open={logOpen} onClose={() => setLogOpen(false)} banks={banks} />
    </div>
  );
}
