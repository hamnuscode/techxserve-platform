import { supabase } from '@/lib/supabase';

export interface CompanyRow {
  id: string;
  name: string;
  active: boolean;
  presentationCurrency: string;
  employeeCount: number;
  adminCount: number;
  createdAt: string;
  subscriptionExpiresAt: string | null;
}

export interface SubscriptionPayment {
  id: string;
  amount: number;
  daysAdded: number;
  paymentDate: string;
  notes: string | null;
}

export interface CompanyAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** Super Super Admin operations: manage companies and their Super Admins. */
export const ssaApi = {
  /** Deactivate any lapsed companies, then list all tenants with counts + subscription status. */
  async companies(): Promise<CompanyRow[]> {
    await supabase.rpc('enforce_subscription_expiry');
    const [{ data: cos, error }, { data: emps }, { data: profs }] = await Promise.all([
      supabase.from('companies').select('id, name, active, presentation_currency, created_at, subscription_expires_at').order('created_at', { ascending: false }),
      supabase.from('employees').select('company_id'),
      supabase.from('profiles').select('company_id, role'),
    ]);
    if (error) throw error;
    const empCount = new Map<string, number>();
    (emps ?? []).forEach((e) => empCount.set(e.company_id as string, (empCount.get(e.company_id as string) ?? 0) + 1));
    const adminCount = new Map<string, number>();
    (profs ?? []).forEach((p) => { if (p.company_id) adminCount.set(p.company_id as string, (adminCount.get(p.company_id as string) ?? 0) + 1); });
    return (cos ?? []).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      active: c.active as boolean,
      presentationCurrency: (c.presentation_currency as string) ?? 'PKR',
      employeeCount: empCount.get(c.id as string) ?? 0,
      adminCount: adminCount.get(c.id as string) ?? 0,
      createdAt: c.created_at as string,
      subscriptionExpiresAt: (c.subscription_expires_at as string) ?? null,
    }));
  },

  async subscriptionPayments(companyId: string): Promise<SubscriptionPayment[]> {
    const { data, error } = await supabase.from('subscription_payments').select('id, amount, days_added, payment_date, notes').eq('company_id', companyId).order('payment_date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((p) => ({ id: p.id as string, amount: Number(p.amount), daysAdded: p.days_added as number, paymentDate: p.payment_date as string, notes: (p.notes as string) ?? null }));
  },
  async addSubscriptionPayment(companyId: string, amount: number, days: number, paymentDate?: string, notes?: string): Promise<void> {
    const { error } = await supabase.rpc('add_subscription_payment', {
      p_company_id: companyId, p_amount: amount, p_days: days,
      p_payment_date: paymentDate ?? new Date().toISOString().slice(0, 10), p_notes: notes ?? null,
    });
    if (error) throw error;
  },

  async createCompany(data: { name: string; legalAddress?: string; taxId?: string; presentationCurrency?: string }): Promise<string> {
    const { data: row, error } = await supabase.from('companies').insert({
      name: data.name,
      legal_address: data.legalAddress ?? null,
      tax_id: data.taxId ?? null,
      presentation_currency: data.presentationCurrency ?? 'PKR',
    }).select('id').single();
    if (error) throw error;
    return row.id as string;
  },

  async admins(companyId: string): Promise<CompanyAdmin[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('company_id', companyId)
      .order('role');
    if (error) throw error;
    return (data ?? []).map((p) => ({ id: p.id as string, name: (p.full_name as string) ?? '', email: (p.email as string) ?? '', role: (p.role as string) ?? '' }));
  },

  /** Create a Super Admin for a company (via the create-user edge function). */
  async createAdmin(companyId: string, data: { name: string; email: string; password?: string }): Promise<{ email: string; tempPassword?: string }> {
    const { data: res, error } = await supabase.functions.invoke('create-user', {
      body: { company_id: companyId, role: 'Super Admin', name: data.name, email: data.email, password: data.password },
    });
    if (error) throw error;
    if ((res as { error?: string }).error) throw new Error((res as { error: string }).error);
    return res as { email: string; tempPassword?: string };
  },
};
