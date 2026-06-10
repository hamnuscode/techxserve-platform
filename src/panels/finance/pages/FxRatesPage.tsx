import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCcw, Plus, Pencil } from 'lucide-react';
import { PageHeader } from '@/shared';
import { Button, Input, Card, Select, FormField } from '@ds/primitives';
import { DataTable, StatusBadge, type Column } from '@ds/data-display';
import { EmptyState, Modal, toast } from '@ds/feedback';
import { formatDate, type CurrencyCode } from '@/lib/format';
import { financeApi } from '@/data/mock-api';
import { qk } from '@/data/query-keys';
import type { FxRate } from '@/types';

const CURRENCIES: CurrencyCode[] = ['PKR', 'USD', 'EUR', 'GBP', 'AED'];

export function FxRatesPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data: rates = [], isLoading, refetch, isFetching } = useQuery({ queryKey: qk.fx, queryFn: financeApi.fx });

  // Override / add-pair modal state.
  const [editor, setEditor] = useState<{ base: string; quote: string; rate: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!editor || !editor.rate) return;
    setSaving(true);
    try {
      await financeApi.fxOverride(editor.base, editor.quote, Number(editor.rate), date);
      await qc.invalidateQueries({ queryKey: qk.fx });
      toast.success('Rate saved');
      setEditor(null);
    } catch {
      toast.error('Could not save rate');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<FxRate>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'base', header: 'Base Currency', render: (r) => <span className="nums font-medium">{r.base}</span> },
    { key: 'quote', header: 'Quote Currency', render: (r) => <span className="nums font-medium">{r.quote}</span> },
    { key: 'rate', header: 'Rate', align: 'right', render: (r) => <span className="nums">{r.rate.toFixed(4)}</span> },
    { key: 'source', header: 'Source', render: (r) => <StatusBadge status={r.source} dot={false} size="sm" tone={r.source === 'auto' ? 'info' : 'neutral'} /> },
    { key: 'actions', header: '', align: 'right', render: (r) => <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditor({ base: r.base, quote: r.quote, rate: String(r.rate) })}>Override</Button> },
  ];

  return (
    <div>
      <PageHeader
        title="FX Rates"
        description="Daily exchange rates against the presentation currency."
        actions={
          <>
            <Button variant="outline" icon={Plus} onClick={() => setEditor({ base: 'PKR', quote: 'USD', rate: '' })}>Add Pair</Button>
            <Button icon={RefreshCcw} loading={isFetching} onClick={() => { refetch(); toast.success('Refreshed from FX provider'); }}>Refresh from API</Button>
          </>
        }
      />

      <Card className="mb-4" padding="sm">
        <div className="flex items-center gap-3">
          <span className="text-sm text-content-muted">As of</span>
          <Input type="date" sizeVariant="sm" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          <span className="text-2xs text-content-subtle">Base currency is your presentation currency (PKR).</span>
        </div>
      </Card>

      <DataTable data={rates} columns={columns} rowKey={(r) => r.id} loading={isLoading} empty={<EmptyState icon={RefreshCcw} title="No FX pairs" description="Add a currency pair to start tracking rates." />} />

      <Modal open={!!editor} onClose={() => setEditor(null)} title="Set exchange rate" size="sm">
        {editor && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Base"><Select value={editor.base} onChange={(e) => setEditor({ ...editor, base: e.target.value })} options={CURRENCIES.map((c) => ({ value: c, label: c }))} /></FormField>
              <FormField label="Quote"><Select value={editor.quote} onChange={(e) => setEditor({ ...editor, quote: e.target.value })} options={CURRENCIES.map((c) => ({ value: c, label: c }))} /></FormField>
            </div>
            <FormField label={`Rate (1 ${editor.base} = ? ${editor.quote})`}>
              <Input type="number" step="0.0001" value={editor.rate} onChange={(e) => setEditor({ ...editor, rate: e.target.value })} placeholder="0.0000" autoFocus />
            </FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
              <Button loading={saving} onClick={save}>Save rate</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
