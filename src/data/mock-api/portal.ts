import { supabase } from '@/lib/supabase';
import { rowsToCamel, rowToCamel } from '@/lib/case';

export interface SupportTicket {
  id: string;
  code: string;
  subject: string;
  category: 'Billing' | 'Service Issue' | 'Feature Request' | 'Other';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  description?: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  createdAt: string;
}

export interface ExpenseClaim {
  id: string;
  date: string;
  category?: string;
  description?: string;
  amount: number;
  currency: string;
  paymentMode: string;
  hasReceipt: boolean;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Reimbursed';
}

export const ticketsApi = {
  async mine(): Promise<SupportTicket[]> {
    const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return rowsToCamel<SupportTicket>(data);
  },
  async create(data: Partial<SupportTicket> & { clientId: string }): Promise<SupportTicket> {
    const { data: row, error } = await supabase.from('support_tickets').insert({
      client_id: data.clientId,
      subject: data.subject,
      category: data.category ?? 'Other',
      priority: data.priority ?? 'Medium',
      description: data.description,
    }).select('*').single();
    if (error) throw error;
    return rowToCamel<SupportTicket>(row)!;
  },
};

export const claimsApi = {
  async mine(): Promise<ExpenseClaim[]> {
    const { data, error } = await supabase.from('expense_claims').select('*').order('date', { ascending: false });
    if (error) throw error;
    return rowsToCamel<ExpenseClaim>(data);
  },
  async create(data: Partial<ExpenseClaim> & { employeeId: string }): Promise<ExpenseClaim> {
    const { data: row, error } = await supabase.from('expense_claims').insert({
      employee_id: data.employeeId,
      date: data.date,
      category: data.category,
      description: data.description,
      amount: data.amount ?? 0,
      payment_mode: data.paymentMode ?? 'Paid by me',
      has_receipt: data.hasReceipt ?? false,
    }).select('*').single();
    if (error) throw error;
    return rowToCamel<ExpenseClaim>(row)!;
  },
  async cancel(id: string): Promise<void> {
    const { error } = await supabase.from('expense_claims').delete().eq('id', id);
    if (error) throw error;
  },
};
