import type { Invoice, InvoiceLineItem, Paged, Payment } from '@/types';
import { supabase } from '@/lib/supabase';
import { rowToCamel, rowsToCamel, toSnake } from '@/lib/case';
import type { ListParams } from './transport';

export interface InvoiceFilters extends ListParams {
  status?: string;
  client?: string;
}

/** invoice_list row -> Invoice header (without children). */
function toHeader(r: Record<string, unknown>): Invoice {
  const m = rowToCamel<Invoice>(r)!;
  return { ...m, lineItems: [], payments: [] };
}

async function fetchFull(id: string): Promise<Invoice | undefined> {
  const [{ data: head, error: e1 }, { data: items, error: e2 }, { data: pays, error: e3 }] = await Promise.all([
    supabase.from('invoice_list').select('*').eq('id', id).maybeSingle(),
    supabase.from('invoice_line_items').select('*').eq('invoice_id', id).order('position'),
    supabase.from('invoice_payments').select('*').eq('invoice_id', id).order('date'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;
  if (!head) return undefined;
  return {
    ...toHeader(head),
    lineItems: rowsToCamel<InvoiceLineItem>(items),
    payments: rowsToCamel<Payment>(pays),
  };
}

async function replaceLineItems(invoiceId: string, items: InvoiceLineItem[]): Promise<void> {
  await supabase.from('invoice_line_items').delete().eq('invoice_id', invoiceId);
  if (items.length) {
    const rows = items.map((li, i) => ({
      invoice_id: invoiceId,
      description: li.description,
      quantity: li.quantity,
      rate: li.rate,
      tax_rate: li.taxRate,
      position: i,
    }));
    const { error } = await supabase.from('invoice_line_items').insert(rows);
    if (error) throw error;
  }
}

export const invoicesApi = {
  async list(params: InvoiceFilters = {}): Promise<Paged<Invoice>> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = params.pageSize ?? 25;
    const from = (page - 1) * pageSize;

    let q = supabase.from('invoice_list').select('*', { count: 'exact' });
    if (params.search) q = q.or(`number.ilike.%${params.search}%,client_name.ilike.%${params.search}%,client_code.ilike.%${params.search}%`);
    if (params.status) q = q.eq('status', params.status);
    if (params.client) q = q.eq('client_id', params.client);

    const sortMap: Record<string, string> = {
      number: 'number', client: 'client_name', issueDate: 'issue_date',
      dueDate: 'due_date', total: 'total', received: 'received',
    };
    const dbSort = sortMap[params.sortKey ?? ''] ?? 'issue_date';
    q = q.order(dbSort, { ascending: params.sortDir !== 'desc' }).range(from, from + pageSize - 1);

    const { data, count, error } = await q;
    if (error) throw error;
    return { rows: (data ?? []).map(toHeader), total: count ?? 0, page, pageSize };
  },

  get(id: string): Promise<Invoice | undefined> {
    return fetchFull(id);
  },

  async create(data: Partial<Invoice>): Promise<Invoice> {
    const insert = {
      client_id: data.clientId,
      project_id: data.projectId ?? null,
      issue_date: data.issueDate,
      due_date: data.dueDate,
      currency: data.currency ?? 'PKR',
      status: data.status ?? 'Draft',
      notes: data.notes,
      terms: data.terms,
      withholding_tax: data.withholdingTax ?? 0,
    };
    const { data: row, error } = await supabase.from('invoices').insert(insert).select('id').single();
    if (error) throw error;
    await replaceLineItems(row.id, data.lineItems ?? []);
    return (await fetchFull(row.id))!;
  },

  async update(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const patch = toSnake({
      clientId: data.clientId, projectId: data.projectId, issueDate: data.issueDate,
      dueDate: data.dueDate, currency: data.currency, status: data.status,
      notes: data.notes, terms: data.terms, withholdingTax: data.withholdingTax,
    });
    const { error } = await supabase.from('invoices').update(patch).eq('id', id);
    if (error) throw error;
    if (data.lineItems) await replaceLineItems(id, data.lineItems);
    return (await fetchFull(id))!;
  },

  async recordPayment(id: string, payment: Omit<Payment, 'id'>): Promise<Invoice> {
    const { error } = await supabase.from('invoice_payments').insert({
      invoice_id: id,
      date: payment.date,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference,
      recorded_by: payment.recordedBy,
    });
    if (error) throw error;
    // If now fully received, flip a Draft/Sent invoice to a non-derived terminal state is handled by the view.
    return (await fetchFull(id))!;
  },

  async setStatus(ids: string[], status: Invoice['status']): Promise<void> {
    const { error } = await supabase.from('invoices').update({ status }).in('id', ids);
    if (error) throw error;
  },

  /** Create a draft invoice for each active auto-invoice contract. Returns how many were made. */
  async generateRecurring(): Promise<number> {
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('client_id, monthly_value, value')
      .eq('status', 'Active')
      .eq('auto_invoice', true);
    if (error) throw error;
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    let count = 0;
    for (const c of contracts ?? []) {
      const amount = Number(c.monthly_value ?? c.value ?? 0);
      if (amount <= 0) continue;
      const { data: inv } = await supabase.from('invoices').insert({ client_id: c.client_id, issue_date: today, due_date: due, status: 'Draft' }).select('id').single();
      if (inv) {
        await supabase.from('invoice_line_items').insert({ invoice_id: inv.id, description: 'Monthly recurring charge', quantity: 1, rate: amount, tax_rate: 0, position: 0 });
        count++;
      }
    }
    return count;
  },

  async remove(ids: string[]): Promise<void> {
    const { error } = await supabase.from('invoices').delete().in('id', ids);
    if (error) throw error;
  },
};
