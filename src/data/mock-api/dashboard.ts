import type { ActivityEvent, BankAccount } from '@/types';
import { supabase } from '@/lib/supabase';

export interface DashboardAlert {
  id: string;
  message: string;
  tone: 'danger' | 'warning';
}

export interface DashboardData {
  kpis: {
    totalEmployees: number;
    employeeDelta: number;
    attendanceToday: number;
    attendanceDelta: number;
    expensesMtd: number;
    expensesDelta: number;
    payrollMtd: number;
    payrollStatus: 'Processed' | 'Pending';
  };
  banks: BankAccount[];
  totalCash: number;
  revenueByClient: Array<Record<string, string | number>>;
  attendanceTrend: Array<Record<string, string | number>>;
  activity: ActivityEvent[];
  alerts: DashboardAlert[];
}

export const dashboardApi = {
  async get(): Promise<DashboardData> {
    // Single server-side aggregation returns the exact shape the page expects.
    const { data, error } = await supabase.rpc('dashboard_summary');
    if (error) throw error;
    return data as DashboardData;
  },
};
