import type { Client, Contract, Invoice, Paged } from '@/types';
import { supabase } from '@/lib/supabase';
import { rowToCamel, rowsToCamel, toSnake } from '@/lib/case';
import type { ListParams } from './transport';

export interface ClientFilters extends ListParams {
  status?: string;
  industry?: string;
  branch?: string;
}

/** invoice_list row -> Invoice (line items/payments loaded lazily elsewhere). */
function toInvoice(r: Record<string, unknown>): Invoice {
  const m = rowToCamel<Invoice & { hasAttachment: boolean }>(r)!;
  return { ...m, lineItems: [], payments: [] };
}

export const clientsApi = {
  async list(params: ClientFilters = {}): Promise<Paged<Client>> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = params.pageSize ?? 25;
    const from = (page - 1) * pageSize;

    let q = supabase.from('client_list').select('*', { count: 'exact' });
    if (params.search) q = q.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,code.ilike.%${params.search}%`);
    if (params.status) q = q.eq('status', params.status);
    if (params.industry) q = q.eq('industry', params.industry);
    if (params.branch) q = q.eq('default_branch_id', params.branch);

    const sortKey = params.sortKey ?? 'created_at';
    const dbSort = ({ name: 'name', code: 'code', outstanding: 'outstanding', industry: 'industry' } as Record<string, string>)[sortKey] ?? sortKey;
    q = q.order(dbSort, { ascending: params.sortDir !== 'desc' }).range(from, from + pageSize - 1);

    const { data, count, error } = await q;
    if (error) throw error;
    return { rows: rowsToCamel<Client>(data), total: count ?? 0, page, pageSize };
  },

  async get(id: string): Promise<Client | undefined> {
    const { data, error } = await supabase.from('client_list').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return rowToCamel<Client>(data) ?? undefined;
  },

  async contracts(clientId: string): Promise<Contract[]> {
    const { data, error } = await supabase.from('contract_list').select('*').eq('client_id', clientId);
    if (error) throw error;
    return rowsToCamel<Contract>(data);
  },

  async invoices(clientId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoice_list')
      .select('*')
      .eq('client_id', clientId)
      .order('issue_date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toInvoice);
  },

  async create(data: Partial<Client>): Promise<Client> {
    // company_id + code are filled by DB default/trigger. Strip derived fields.
    const { outstanding: _o, activeContracts: _a, id: _id, code: _c, createdAt: _ca, ...rest } = data;
    const { data: row, error } = await supabase.from('clients').insert(toSnake(rest)).select().single();
    if (error) throw error;
    return rowToCamel<Client>(row)!;
  },

  async update(id: string, data: Partial<Client>): Promise<Client> {
    const { outstanding: _o, activeContracts: _a, id: _id, code: _c, createdAt: _ca, ...rest } = data;
    const { data: row, error } = await supabase.from('clients').update(toSnake(rest)).eq('id', id).select().single();
    if (error) throw error;
    return rowToCamel<Client>(row)!;
  },

  async setStatus(id: string, status: Client['status']): Promise<Client> {
    return clientsApi.update(id, { status });
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
  },
};
