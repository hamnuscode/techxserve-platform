import type {
  BankAccount,
  CashflowMonth,
  Cheque,
  Expense,
  FxRate,
  Paged,
  Transaction,
  Vendor,
} from '@/types';
import { supabase } from '@/lib/supabase';
import { rowToCamel, rowsToCamel, toSnake } from '@/lib/case';
import type { ListParams } from './transport';

export interface Receivable {
  clientId: string;
  clientName: string;
  openingBalance: number;
  invoiced: number;
  withholding: number;
  received: number;
  outstanding: number;
}

export interface ClientProfit {
  clientId: string;
  clientName: string;
  invoiced: number;
  expenses: number;
  netIncome: number;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
}

export interface Partner {
  id: string;
  name: string;
  sharePercent: number;
}

export const financeApi = {
  async banks(): Promise<BankAccount[]> {
    const { data, error } = await supabase.from('bank_accounts').select('*').order('name');
    if (error) throw error;
    return rowsToCamel<BankAccount>(data);
  },
  async addBank(data: Partial<BankAccount>): Promise<BankAccount> {
    const { id: _i, chequeBalance: _cb, ...rest } = data;
    const { data: row, error } = await supabase.from('bank_accounts').insert(toSnake(rest)).select().single();
    if (error) throw error;
    return rowToCamel<BankAccount>(row)!;
  },
  async cheques(): Promise<Cheque[]> {
    const { data, error } = await supabase.from('cheque_list').select('*').order('date', { ascending: false });
    if (error) throw error;
    return rowsToCamel<Cheque>(data);
  },
  async transactions(bankId?: string): Promise<Transaction[]> {
    let q = supabase.from('bank_transactions').select('*').order('date', { ascending: false });
    if (bankId) q = q.eq('bank_id', bankId);
    const { data, error } = await q;
    if (error) throw error;
    return rowsToCamel<Transaction>(data);
  },
  async vendors(): Promise<Vendor[]> {
    const { data, error } = await supabase.from('vendors').select('*').order('name');
    if (error) throw error;
    return rowsToCamel<Vendor>(data);
  },
  async receivables(): Promise<Receivable[]> {
    const { data, error } = await supabase.from('client_receivables').select('*').gt('invoiced', 0);
    if (error) throw error;
    return rowsToCamel<Receivable>(data);
  },
  async cashflow(): Promise<CashflowMonth[]> {
    const { data, error } = await supabase.rpc('cashflow_monthly');
    if (error) throw error;
    return (data ?? []) as CashflowMonth[];
  },
  async fx(): Promise<FxRate[]> {
    const { data, error } = await supabase.from('fx_rates').select('*').order('date', { ascending: false });
    if (error) throw error;
    return rowsToCamel<FxRate>(data);
  },
  async clientProfitability(): Promise<ClientProfit[]> {
    const { data, error } = await supabase.from('client_profitability').select('*').order('invoiced', { ascending: false });
    if (error) throw error;
    return rowsToCamel<ClientProfit>(data);
  },
  /** Manually override (or add) an FX rate for a base/quote pair on a date. */
  async fxOverride(base: string, quote: string, rate: number, date?: string): Promise<void> {
    const { error } = await supabase.from('fx_rates').insert({
      base, quote, rate, source: 'manual', date: date ?? new Date().toISOString().slice(0, 10),
    });
    if (error) throw error;
  },
  async chartOfAccounts(): Promise<Account[]> {
    const { data, error } = await supabase.from('chart_of_accounts').select('id, account_code, account_name, account_type').order('account_code');
    if (error) throw error;
    return (data ?? []).map((a) => ({ id: a.id as string, code: a.account_code as string, name: a.account_name as string, type: a.account_type as Account['type'] }));
  },
  async partners(): Promise<Partner[]> {
    const { data, error } = await supabase.from('partners').select('id, name, profit_share_percent').order('profit_share_percent', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((p) => ({ id: p.id as string, name: p.name as string, sharePercent: Number(p.profit_share_percent) }));
  },
  async addVendor(name: string): Promise<Vendor> {
    const { data, error } = await supabase.from('vendors').insert({ name }).select('*').single();
    if (error) throw error;
    return rowToCamel<Vendor>(data)!;
  },
  /** Move money between two accounts: records two transactions + adjusts balances. */
  async wireTransfer(fromBankId: string, toBankId: string, amount: number, reference?: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const { error: tErr } = await supabase.from('bank_transactions').insert([
      { bank_id: fromBankId, date: today, description: 'Wire transfer (out)', type: 'Debit', amount, reference: reference ?? null },
      { bank_id: toBankId, date: today, description: 'Wire transfer (in)', type: 'Credit', amount, reference: reference ?? null },
    ]);
    if (tErr) throw tErr;
    const { data: rows } = await supabase.from('bank_accounts').select('id, balance').in('id', [fromBankId, toBankId]);
    const from = (rows ?? []).find((b) => b.id === fromBankId);
    const to = (rows ?? []).find((b) => b.id === toBankId);
    if (from) await supabase.from('bank_accounts').update({ balance: Number(from.balance) - amount }).eq('id', fromBankId);
    if (to) await supabase.from('bank_accounts').update({ balance: Number(to.balance) + amount }).eq('id', toBankId);
  },
};

export interface ExpenseFilters extends ListParams {
  category?: string;
  client?: string;
  mode?: string;
}

/** Find-or-create an expense category by name; returns its id (or null). */
async function categoryId(name?: string): Promise<string | null> {
  if (!name) return null;
  const { data: found } = await supabase.from('expense_categories').select('id').eq('name', name).maybeSingle();
  if (found) return found.id;
  const { data: created, error } = await supabase.from('expense_categories').insert({ name }).select('id').single();
  if (error) throw error;
  return created.id;
}

async function vendorId(name?: string): Promise<string | null> {
  if (!name) return null;
  const { data: found } = await supabase.from('vendors').select('id').eq('name', name).maybeSingle();
  if (found) return found.id;
  const { data: created, error } = await supabase.from('vendors').insert({ name }).select('id').single();
  if (error) throw error;
  return created.id;
}

export const expensesApi = {
  async list(params: ExpenseFilters = {}): Promise<Paged<Expense>> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = params.pageSize ?? 25;
    const from = (page - 1) * pageSize;

    let q = supabase.from('expense_list').select('*', { count: 'exact' });
    if (params.search) q = q.or(`description.ilike.%${params.search}%,category.ilike.%${params.search}%,vendor.ilike.%${params.search}%,client_name.ilike.%${params.search}%`);
    if (params.category) q = q.eq('category', params.category);
    if (params.client) q = q.eq('client_id', params.client);
    if (params.mode) q = q.eq('mode', params.mode);

    const sortMap: Record<string, string> = { date: 'date', amount: 'amount', category: 'category' };
    const dbSort = sortMap[params.sortKey ?? ''] ?? 'date';
    q = q.order(dbSort, { ascending: params.sortDir !== 'desc' }).range(from, from + pageSize - 1);

    const { data, count, error } = await q;
    if (error) throw error;
    return { rows: rowsToCamel<Expense>(data), total: count ?? 0, page, pageSize };
  },

  async categoryBreakdown(): Promise<Array<{ category: string; amount: number }>> {
    const { data, error } = await supabase.from('expense_list').select('category, amount');
    if (error) throw error;
    const map = new Map<string, number>();
    (data ?? []).forEach((e) => map.set((e.category as string) ?? 'Uncategorised', (map.get((e.category as string) ?? 'Uncategorised') ?? 0) + Number(e.amount)));
    return [...map.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  },

  async create(data: Partial<Expense> & { category?: string; vendor?: string }): Promise<Expense> {
    const insert = {
      date: data.date,
      category_id: await categoryId(data.category),
      client_id: data.clientId ?? null,
      project_id: data.projectId ?? null,
      vendor_id: await vendorId(data.vendor),
      description: data.description,
      amount: data.amount ?? 0,
      currency: data.currency ?? 'PKR',
      mode: data.mode ?? 'Cash',
      has_receipt: data.hasReceipt ?? false,
    };
    const { data: row, error } = await supabase.from('expenses').insert(insert).select('id').single();
    if (error) throw error;
    const { data: full } = await supabase.from('expense_list').select('*').eq('id', row.id).single();
    return rowToCamel<Expense>(full)!;
  },
};
