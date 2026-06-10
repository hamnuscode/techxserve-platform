import type { Contract, Paged, Project, Task } from '@/types';
import { supabase } from '@/lib/supabase';
import { rowToCamel, rowsToCamel, toSnake } from '@/lib/case';
import type { ListParams } from './transport';

export interface ContractFilters extends ListParams {
  type?: string;
  status?: string;
}

export const contractsApi = {
  async list(params: ContractFilters = {}): Promise<Paged<Contract>> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = params.pageSize ?? 25;
    const from = (page - 1) * pageSize;

    let q = supabase.from('contract_list').select('*', { count: 'exact' });
    if (params.search) q = q.or(`code.ilike.%${params.search}%,client_name.ilike.%${params.search}%`);
    if (params.type) q = q.eq('type', params.type);
    if (params.status) q = q.eq('status', params.status);

    const sortMap: Record<string, string> = { code: 'code', client: 'client_name', endDate: 'end_date', value: 'value' };
    const dbSort = sortMap[params.sortKey ?? ''] ?? 'code';
    q = q.order(dbSort, { ascending: params.sortDir !== 'desc' }).range(from, from + pageSize - 1);

    const { data, count, error } = await q;
    if (error) throw error;
    return { rows: rowsToCamel<Contract>(data), total: count ?? 0, page, pageSize };
  },

  async create(data: Partial<Contract>): Promise<Contract> {
    const insert = {
      client_id: data.clientId,
      type: data.type ?? 'Service Agreement',
      start_date: data.startDate,
      end_date: data.endDate,
      value: data.value ?? 0,
      currency: data.currency ?? 'PKR',
      monthly_value: data.type === 'Retainer' ? data.monthlyValue ?? Math.round((data.value ?? 0) / 12) : null,
      auto_invoice: data.autoInvoice ?? false,
      status: data.status ?? 'Active',
    };
    const { data: row, error } = await supabase.from('contracts').insert(insert).select('id').single();
    if (error) throw error;
    const { data: full } = await supabase.from('contract_list').select('*').eq('id', row.id).single();
    return rowToCamel<Contract>(full)!;
  },

  async update(id: string, data: Partial<Contract>): Promise<Contract> {
    const { id: _i, code: _c, clientName: _cn, ...rest } = data;
    const { error } = await supabase.from('contracts').update(toSnake(rest)).eq('id', id);
    if (error) throw error;
    const { data: full } = await supabase.from('contract_list').select('*').eq('id', id).single();
    return rowToCamel<Contract>(full)!;
  },

  renew(id: string, endDate: string): Promise<Contract> {
    return contractsApi.update(id, { status: 'Active', endDate });
  },
  cancel(id: string): Promise<Contract> {
    return contractsApi.update(id, { status: 'Cancelled' });
  },
};

export interface ProjectFilters extends ListParams {
  client?: string;
  status?: string;
  billingModel?: string;
}

export const projectsApi = {
  async list(params: ProjectFilters = {}): Promise<Paged<Project>> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = params.pageSize ?? 25;
    const from = (page - 1) * pageSize;

    let q = supabase.from('project_list').select('*', { count: 'exact' });
    if (params.search) q = q.or(`name.ilike.%${params.search}%,code.ilike.%${params.search}%,client_name.ilike.%${params.search}%,manager_name.ilike.%${params.search}%`);
    if (params.client) q = q.eq('client_id', params.client);
    if (params.status) q = q.eq('status', params.status);
    if (params.billingModel) q = q.eq('billing_model', params.billingModel);

    const sortMap: Record<string, string> = { name: 'name', code: 'code', endDate: 'end_date', spent: 'spent' };
    const dbSort = sortMap[params.sortKey ?? ''] ?? 'name';
    q = q.order(dbSort, { ascending: params.sortDir !== 'desc' }).range(from, from + pageSize - 1);

    const { data, count, error } = await q;
    if (error) throw error;
    return { rows: rowsToCamel<Project>(data), total: count ?? 0, page, pageSize };
  },

  async get(id: string): Promise<Project | undefined> {
    const { data, error } = await supabase.from('project_list').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return rowToCamel<Project>(data) ?? undefined;
  },

  async create(data: Partial<Project>): Promise<Project> {
    const insert = {
      name: data.name,
      client_id: data.clientId ?? null,
      manager_name: data.managerName,
      status: data.status ?? 'Lead',
      billing_model: data.billingModel ?? 'Fixed',
      budget: data.budget ?? null,
      currency: data.currency ?? 'PKR',
      start_date: data.startDate,
      end_date: data.endDate,
    };
    const { data: row, error } = await supabase.from('projects').insert(insert).select('id').single();
    if (error) throw error;
    return (await projectsApi.get(row.id))!;
  },

  async update(id: string, data: Partial<Project>): Promise<Project> {
    const { id: _i, code: _c, clientName: _cn, ...rest } = data;
    const { error } = await supabase.from('projects').update(toSnake(rest)).eq('id', id);
    if (error) throw error;
    return (await projectsApi.get(id))!;
  },
};

export interface TaskFilters extends ListParams {
  assignee?: string;
  priority?: string;
  project?: string;
  label?: string;
  status?: string;
}

export const tasksApi = {
  async list(params: TaskFilters = {}): Promise<Task[]> {
    let q = supabase.from('task_list').select('*');
    if (params.search) q = q.or(`title.ilike.%${params.search}%,project_name.ilike.%${params.search}%`);
    if (params.assignee) q = q.contains('assignees', [params.assignee]);
    if (params.priority) q = q.eq('priority', params.priority);
    if (params.project) q = q.eq('project_id', params.project);
    if (params.label) q = q.contains('labels', [params.label]);
    if (params.status) q = q.eq('status', params.status);
    const { data, error } = await q.order('position');
    if (error) throw error;
    return rowsToCamel<Task>(data);
  },

  async get(id: string): Promise<Task | undefined> {
    const { data, error } = await supabase.from('task_list').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return rowToCamel<Task>(data) ?? undefined;
  },

  async create(data: Partial<Task>): Promise<Task> {
    const insert = {
      title: data.title ?? 'New Task',
      description: data.description,
      project_id: data.projectId ?? null,
      assignees: data.assignees ?? [],
      priority: data.priority ?? 'Medium',
      status: data.status ?? 'To Do',
      due_date: data.dueDate ?? null,
      labels: data.labels ?? [],
      created_by: data.createdBy,
    };
    const { data: row, error } = await supabase.from('tasks').insert(insert).select('id').single();
    if (error) throw error;
    return (await tasksApi.get(row.id))!;
  },

  async update(id: string, data: Partial<Task>): Promise<Task> {
    const { id: _i, projectName: _pn, createdAt: _ca, ...rest } = data;
    const { error } = await supabase.from('tasks').update(toSnake(rest)).eq('id', id);
    if (error) throw error;
    return (await tasksApi.get(id))!;
  },
};
