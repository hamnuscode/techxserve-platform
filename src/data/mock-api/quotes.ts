import type { Paged, Quote } from '@/types';
import { supabase } from '@/lib/supabase';
import { rowToCamel, rowsToCamel } from '@/lib/case';
import type { ListParams } from './transport';

export interface QuoteFilters extends ListParams {
  status?: string;
}

async function getQuote(id: string): Promise<Quote> {
  const { data, error } = await supabase.from('quote_list').select('*').eq('id', id).single();
  if (error) throw error;
  return rowToCamel<Quote>(data)!;
}

export const quotesApi = {
  async list(params: QuoteFilters = {}): Promise<Paged<Quote>> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = params.pageSize ?? 25;
    const from = (page - 1) * pageSize;

    let q = supabase.from('quote_list').select('*', { count: 'exact' });
    if (params.search) q = q.or(`number.ilike.%${params.search}%,client_name.ilike.%${params.search}%,client_code.ilike.%${params.search}%`);
    if (params.status) q = q.eq('status', params.status);

    const sortMap: Record<string, string> = { number: 'number', client: 'client_name', issueDate: 'issue_date', total: 'total' };
    const dbSort = sortMap[params.sortKey ?? ''] ?? 'issue_date';
    q = q.order(dbSort, { ascending: params.sortDir !== 'desc' }).range(from, from + pageSize - 1);

    const { data, count, error } = await q;
    if (error) throw error;
    return { rows: rowsToCamel<Quote>(data), total: count ?? 0, page, pageSize };
  },

  async create(data: Partial<Quote>): Promise<Quote> {
    const insert = {
      client_id: data.clientId,
      issue_date: data.issueDate,
      expiry_date: data.expiryDate,
      currency: data.currency ?? 'PKR',
      status: data.status ?? 'Draft',
      total: data.total ?? 0,
    };
    const { data: row, error } = await supabase.from('quotes').insert(insert).select('id').single();
    if (error) throw error;
    return getQuote(row.id);
  },

  async setStatus(id: string, status: Quote['status']): Promise<Quote> {
    const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
    if (error) throw error;
    return getQuote(id);
  },

  /** Convert an accepted quote into a real draft invoice. */
  async convert(id: string): Promise<Quote> {
    const quote = await getQuote(id);
    const { data: inv, error: e1 } = await supabase
      .from('invoices')
      .insert({
        client_id: quote.clientId,
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: new Date().toISOString().slice(0, 10),
        currency: quote.currency,
        status: 'Draft',
      })
      .select('id')
      .single();
    if (e1) throw e1;

    const { error: e2 } = await supabase.from('invoice_line_items').insert({
      invoice_id: inv.id,
      description: `From quote ${quote.number}`,
      quantity: 1,
      rate: quote.total,
      tax_rate: 0,
      position: 0,
    });
    if (e2) throw e2;

    const { error: e3 } = await supabase
      .from('quotes')
      .update({ status: 'Accepted', converted_invoice_id: inv.id })
      .eq('id', id);
    if (e3) throw e3;
    return getQuote(id);
  },
};
