import { supabase } from '@/lib/supabase';

export interface SearchResult {
  id: string;
  type: 'Client' | 'Employee' | 'Invoice' | 'Project' | 'Expense';
  label: string;
  sub: string;
  href: string;
}

/** Cross-entity global search (clients, employees, invoices, projects, expenses). */
export const searchApi = {
  async global(query: string): Promise<SearchResult[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const like = `%${q}%`;

    const [clients, employees, invoices, projects, expenses] = await Promise.all([
      supabase.from('client_list').select('id, code, name, industry').or(`name.ilike.${like},code.ilike.${like}`).limit(5),
      supabase.from('employee_list').select('id, code, name, department').or(`name.ilike.${like},code.ilike.${like}`).limit(5),
      supabase.from('invoice_list').select('id, number, client_name, total').or(`number.ilike.${like},client_name.ilike.${like}`).limit(5),
      supabase.from('project_list').select('id, code, name, client_name').or(`name.ilike.${like},code.ilike.${like}`).limit(5),
      supabase.from('expense_list').select('id, description, category, amount').or(`description.ilike.${like},category.ilike.${like}`).limit(5),
    ]);

    const out: SearchResult[] = [];
    (clients.data ?? []).forEach((c) => out.push({ id: c.id as string, type: 'Client', label: c.name as string, sub: `${c.code} · ${c.industry ?? ''}`, href: `/clients/${c.id}` }));
    (employees.data ?? []).forEach((e) => out.push({ id: e.id as string, type: 'Employee', label: e.name as string, sub: `${e.code} · ${e.department ?? ''}`, href: `/workforce/employees/${e.id}` }));
    (invoices.data ?? []).forEach((i) => out.push({ id: i.id as string, type: 'Invoice', label: i.number as string, sub: `${i.client_name}`, href: `/invoices/${i.id}` }));
    (projects.data ?? []).forEach((p) => out.push({ id: p.id as string, type: 'Project', label: p.name as string, sub: `${p.code} · ${p.client_name ?? ''}`, href: `/projects/${p.id}` }));
    (expenses.data ?? []).forEach((x) => out.push({ id: x.id as string, type: 'Expense', label: (x.description as string) || 'Expense', sub: `${x.category ?? ''}`, href: `/finance/expenses` }));
    return out;
  },
};
