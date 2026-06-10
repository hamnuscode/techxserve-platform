import type { AppNotification, AppUser, Branch, CompanyProfile, Department } from '@/types';
import { supabase } from '@/lib/supabase';
import { rowToCamel, rowsToCamel } from '@/lib/case';

export const usersApi = {
  async list(search?: string): Promise<AppUser[]> {
    let q = supabase.from('profiles').select('id, full_name, email, title, permissions, role');
    if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,title.ilike.%${search}%`);
    const { data, error } = await q.order('full_name');
    if (error) throw error;
    return (data ?? []).map((u) => ({
      id: u.id as string,
      name: (u.full_name as string) ?? '',
      email: (u.email as string) ?? '',
      title: (u.title as string) ?? '',
      permissions: (u.permissions as string[]) ?? [],
      role: (u.role as AppUser['role']) ?? 'Ops',
    }));
  },

  /** Creating a login requires admin privileges — handled by the `create-user` edge function. */
  async create(data: Partial<AppUser> & { password?: string }): Promise<AppUser> {
    const { data: res, error } = await supabase.functions.invoke('create-user', { body: data });
    if (error) throw error;
    return res as AppUser;
  },

  async update(id: string, data: Partial<AppUser>): Promise<AppUser> {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.full_name = data.name;
    if (data.title !== undefined) patch.title = data.title;
    if (data.role !== undefined) patch.role = data.role;
    if (data.permissions !== undefined) patch.permissions = data.permissions;
    const { error } = await supabase.from('profiles').update(patch).eq('id', id);
    if (error) throw error;
    return (await usersApi.list()).find((u) => u.id === id)!;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.functions.invoke('delete-user', { body: { id } });
    if (error) throw error;
  },
};

export const settingsApi = {
  async company(): Promise<CompanyProfile> {
    const { data, error } = await supabase
      .from('companies')
      .select('name, legal_address, tax_id, presentation_currency, fiscal_year_start')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return {
      name: data?.name ?? '',
      legalAddress: data?.legal_address ?? '',
      taxId: data?.tax_id ?? '',
      presentationCurrency: data?.presentation_currency ?? 'PKR',
      fiscalYearStart: data?.fiscal_year_start ?? '01-01',
    };
  },

  async updateCompany(data: Partial<CompanyProfile>): Promise<CompanyProfile> {
    const { data: cur } = await supabase.from('companies').select('id').limit(1).single();
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.legalAddress !== undefined) patch.legal_address = data.legalAddress;
    if (data.taxId !== undefined) patch.tax_id = data.taxId;
    if (data.presentationCurrency !== undefined) patch.presentation_currency = data.presentationCurrency;
    if (data.fiscalYearStart !== undefined) patch.fiscal_year_start = data.fiscalYearStart;
    const { error } = await supabase.from('companies').update(patch).eq('id', cur!.id);
    if (error) throw error;
    return settingsApi.company();
  },

  async branches(): Promise<Branch[]> {
    const { data, error } = await supabase.from('branches').select('id, name, city').order('name');
    if (error) throw error;
    return (data ?? []).map((b) => ({ id: b.id as string, name: b.name as string, city: (b.city as string) ?? '' }));
  },
  async addBranch(data: { name: string; city?: string }): Promise<Branch> {
    const { data: row, error } = await supabase.from('branches').insert({ name: data.name, city: data.city ?? null }).select('id, name, city').single();
    if (error) throw error;
    return { id: row.id as string, name: row.name as string, city: (row.city as string) ?? '' };
  },
  async updateBranch(id: string, data: { name?: string; city?: string }): Promise<Branch> {
    const { data: row, error } = await supabase.from('branches').update({ name: data.name, city: data.city }).eq('id', id).select('id, name, city').single();
    if (error) throw error;
    return { id: row.id as string, name: row.name as string, city: (row.city as string) ?? '' };
  },
  async removeBranch(id: string): Promise<void> {
    const { error } = await supabase.from('branches').delete().eq('id', id);
    if (error) throw error;
  },

  async departments(): Promise<Department[]> {
    const { data, error } = await supabase.from('departments').select('id, name').order('name');
    if (error) throw error;
    return rowsToCamel<Department>(data);
  },

  /** Lightweight company name + logo for the shell chrome. */
  async branding(): Promise<{ name: string; logoUrl: string | null }> {
    const { data } = await supabase.from('companies').select('name, logo_url').limit(1).maybeSingle();
    return { name: (data?.name as string) ?? 'TechXServe', logoUrl: (data?.logo_url as string) ?? null };
  },
  /** The company's free-form settings bag (invoice template, email, AI, integrations, notifications) + logo. */
  async getSettings(): Promise<{ settings: Record<string, unknown>; logoUrl: string | null }> {
    const { data, error } = await supabase.from('companies').select('settings, logo_url').limit(1).maybeSingle();
    if (error) throw error;
    return { settings: (data?.settings as Record<string, unknown>) ?? {}, logoUrl: (data?.logo_url as string) ?? null };
  },
  async updateSettings(patch: Record<string, unknown>): Promise<void> {
    const { data: cur } = await supabase.from('companies').select('id, settings').limit(1).single();
    const merged = { ...((cur!.settings as Record<string, unknown>) ?? {}), ...patch };
    const { error } = await supabase.from('companies').update({ settings: merged }).eq('id', cur!.id);
    if (error) throw error;
  },
  /** Upload a logo to the public branding bucket and store its URL on the company. */
  async uploadLogo(file: File): Promise<string> {
    const { data: cur } = await supabase.from('companies').select('id').limit(1).single();
    const path = `${cur!.id}/logo-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('branding').upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from('branding').getPublicUrl(path);
    const url = pub.publicUrl;
    await supabase.from('companies').update({ logo_url: url }).eq('id', cur!.id);
    return url;
  },

  /** Keys of dashboard widgets the company has hidden. */
  async dashboardHiddenWidgets(): Promise<string[]> {
    const { data, error } = await supabase.from('companies').select('dashboard_hidden_widgets').limit(1).maybeSingle();
    if (error) throw error;
    return (data?.dashboard_hidden_widgets as string[]) ?? [];
  },
  async setDashboardHiddenWidgets(keys: string[]): Promise<void> {
    const { data: cur } = await supabase.from('companies').select('id').limit(1).single();
    const { error } = await supabase.from('companies').update({ dashboard_hidden_widgets: keys }).eq('id', cur!.id);
    if (error) throw error;
  },
  async addDepartment(name: string): Promise<Department> {
    const { data: row, error } = await supabase.from('departments').insert({ name }).select('id, name').single();
    if (error) throw error;
    return rowToCamel<Department>(row)!;
  },
  async removeDepartment(id: string): Promise<void> {
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) throw error;
  },
};

export const portalApi = {
  /** Admin action: create a portal login for a client or employee. */
  async invite(kind: 'client' | 'employee', recordId: string, email: string): Promise<{ email: string; tempPassword?: string }> {
    const { data, error } = await supabase.functions.invoke('invite-portal-user', { body: { kind, recordId, email } });
    if (error) throw error;
    if ((data as { error?: string }).error) throw new Error((data as { error: string }).error);
    return data as { email: string; tempPassword?: string };
  },
};

export const notificationsApi = {
  async list(): Promise<AppNotification[]> {
    // Refresh event-driven alerts (overdue invoices, approaching dates, pending approvals).
    await supabase.rpc('generate_notifications');
    const { data, error } = await supabase.from('notifications').select('*').order('at', { ascending: false });
    if (error) throw error;
    return rowsToCamel<AppNotification>(data);
  },
  async markRead(id: string): Promise<void> {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) throw error;
  },
  async markAllRead(): Promise<void> {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
    if (error) throw error;
  },
};
