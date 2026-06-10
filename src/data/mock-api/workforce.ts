import type { Advance, AttendanceMark, AttendanceRecord, Employee, Leave, Payslip } from '@/types';
import { supabase } from '@/lib/supabase';
import { rowToCamel, rowsToCamel } from '@/lib/case';

export interface AttendanceRow extends AttendanceRecord {
  employee: Employee;
}

const today = () => new Date().toISOString().slice(0, 10);

export const attendanceApi = {
  async today(
    filters: { branch?: string; department?: string; shift?: string; search?: string; onlyUnmarked?: boolean } = {},
  ): Promise<AttendanceRow[]> {
    let eq = supabase.from('employee_list').select('*').neq('status', 'Inactive');
    if (filters.branch) eq = eq.eq('branch_id', filters.branch);
    if (filters.department) eq = eq.eq('department_id', filters.department);
    if (filters.shift) eq = eq.eq('shift', filters.shift);
    if (filters.search) eq = eq.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);

    const [{ data: emps, error: e1 }, { data: att, error: e2 }] = await Promise.all([
      eq.order('name'),
      supabase.from('attendance_records').select('employee_id,status').eq('date', today()),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;

    const statusByEmp = new Map((att ?? []).map((a) => [a.employee_id as string, a.status as AttendanceMark]));
    const rows = (emps ?? []).map((e) => {
      const employee = rowToCamel<Employee>(e)!;
      return {
        employeeId: employee.id,
        date: today(),
        status: statusByEmp.get(employee.id) ?? 'Unmarked',
        employee,
      } as AttendanceRow;
    });
    return filters.onlyUnmarked ? rows.filter((r) => r.status === 'Unmarked') : rows;
  },

  async mark(employeeId: string, status: AttendanceMark): Promise<void> {
    const { error } = await supabase
      .from('attendance_records')
      .upsert({ employee_id: employeeId, date: today(), status, marked_at: new Date().toISOString() }, { onConflict: 'employee_id,date' });
    if (error) throw error;
  },

  async markAllPresent(employeeIds: string[]): Promise<void> {
    if (!employeeIds.length) return;
    const rows = employeeIds.map((id) => ({ employee_id: id, date: today(), status: 'Present', marked_at: new Date().toISOString() }));
    const { error } = await supabase.from('attendance_records').upsert(rows, { onConflict: 'employee_id,date' });
    if (error) throw error;
  },
};

function netOf(p: Pick<Payslip, 'base' | 'bonus' | 'deductions' | 'statutoryDeductions' | 'advances'>): number {
  return p.base + p.bonus - p.deductions - p.statutoryDeductions.reduce((s, x) => s + x.amount, 0) - p.advances;
}

export const payrollApi = {
  async list(filters: { search?: string; branch?: string; shift?: string; status?: string } = {}): Promise<Payslip[]> {
    let q = supabase.from('payslip_list').select('*');
    if (filters.search) q = q.or(`employee_name.ilike.%${filters.search}%,employee_code.ilike.%${filters.search}%`);
    if (filters.branch) q = q.eq('branch_id', filters.branch);
    if (filters.shift) q = q.eq('shift', filters.shift);
    if (filters.status) q = q.eq('status', filters.status);
    const { data, error } = await q.order('employee_name');
    if (error) throw error;
    return rowsToCamel<Payslip>(data);
  },

  async update(id: string, data: Partial<Payslip>): Promise<Payslip> {
    const { data: cur, error: e0 } = await supabase.from('payslips').select('*').eq('id', id).single();
    if (e0) throw e0;
    const merged = { ...rowToCamel<Payslip>(cur)!, ...data };
    merged.netSalary = netOf(merged);
    const patch = {
      bonus: merged.bonus,
      deductions: merged.deductions,
      statutory_deductions: merged.statutoryDeductions,
      advances: merged.advances,
      net_salary: merged.netSalary,
      status: merged.status,
      payment_mode: merged.paymentMode ?? null,
    };
    const { data: row, error } = await supabase.from('payslips').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    // Re-read through the view so employee labels come back populated.
    return (await payrollApi.list({ search: (rowToCamel<Payslip>(row)!).employeeCode })).find((p) => p.id === id) ?? rowToCamel<Payslip>(row)!;
  },

  async disburse(id: string): Promise<Payslip> {
    const { error } = await supabase
      .from('payslips')
      .update({ status: 'Disbursed', disbursed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    const list = await payrollApi.list({});
    return list.find((p) => p.id === id)!;
  },

  async disburseAll(): Promise<void> {
    const { error } = await supabase
      .from('payslips')
      .update({ status: 'Disbursed', disbursed_at: new Date().toISOString() })
      .eq('status', 'Pending');
    if (error) throw error;
  },
};

export const leavesApi = {
  async list(): Promise<Leave[]> {
    const { data, error } = await supabase.from('leave_list').select('*').order('applied_on', { ascending: false });
    if (error) throw error;
    return rowsToCamel<Leave>(data);
  },
  async advances(): Promise<Advance[]> {
    const { data, error } = await supabase.from('advance_list').select('*').order('date', { ascending: false });
    if (error) throw error;
    return rowsToCamel<Advance>(data);
  },
  async setStatus(id: string, status: Leave['status']): Promise<void> {
    const { error } = await supabase.from('leave_applications').update({ status }).eq('id', id);
    if (error) throw error;
  },
};
