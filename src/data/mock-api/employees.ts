import type { Employee, Paged } from '@/types';
import { supabase } from '@/lib/supabase';
import { rowToCamel, rowsToCamel, toSnake } from '@/lib/case';
import type { ListParams } from './transport';

export interface EmployeeFilters extends ListParams {
  branch?: string;
  department?: string;
  type?: string;
  status?: string;
  shift?: string;
}

/** Fields that live only on the employee_list view (derived) — never written back. */
function toInsert(data: Partial<Employee>) {
  const { id: _i, code: _c, department: _d, branch: _b, docsComplete: _dc, docsCount: _dn, docsRequired: _dr, ...rest } = data;
  return toSnake(rest);
}

export const employeesApi = {
  async list(params: EmployeeFilters = {}): Promise<Paged<Employee>> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = params.pageSize ?? 25;
    const from = (page - 1) * pageSize;

    let q = supabase.from('employee_list').select('*', { count: 'exact' });
    if (params.search) q = q.or(`name.ilike.%${params.search}%,code.ilike.%${params.search}%,email.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
    if (params.branch) q = q.eq('branch_id', params.branch);
    if (params.department) q = q.eq('department_id', params.department);
    if (params.type) q = q.eq('type', params.type);
    if (params.status) q = q.eq('status', params.status);
    if (params.shift) q = q.eq('shift', params.shift);

    const sortMap: Record<string, string> = {
      name: 'name', code: 'code', department: 'department', branch: 'branch', joinDate: 'join_date',
    };
    const dbSort = sortMap[params.sortKey ?? ''] ?? 'name';
    q = q.order(dbSort, { ascending: params.sortDir !== 'desc' }).range(from, from + pageSize - 1);

    const { data, count, error } = await q;
    if (error) throw error;
    return { rows: rowsToCamel<Employee>(data), total: count ?? 0, page, pageSize };
  },

  async get(id: string): Promise<Employee | undefined> {
    const { data, error } = await supabase.from('employee_list').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return rowToCamel<Employee>(data) ?? undefined;
  },

  async create(data: Partial<Employee>): Promise<Employee> {
    const { data: row, error } = await supabase.from('employees').insert(toInsert(data)).select('id').single();
    if (error) throw error;
    return (await employeesApi.get(row.id))!;
  },

  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    const { error } = await supabase.from('employees').update(toInsert(data)).eq('id', id);
    if (error) throw error;
    return (await employeesApi.get(id))!;
  },
};
