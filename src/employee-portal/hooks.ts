import { useQuery } from '@tanstack/react-query';
import { employeesApi, payrollApi, leavesApi, tasksApi } from '@/data/mock-api';
import { qk } from '@/data/query-keys';
import { useAuthStore } from '@/app/stores/auth';

/** The logged-in portal user's linked employee id (RLS scopes them to it). */
export function useMyEmployeeId(): string | null {
  return useAuthStore((s) => s.user?.employeeId ?? null);
}

export function useMe() {
  const id = useMyEmployeeId();
  return useQuery({ queryKey: qk.employee(id ?? 'none'), queryFn: () => employeesApi.get(id!), enabled: !!id });
}
export function useMyPayslips() {
  const id = useMyEmployeeId();
  return useQuery({ queryKey: ['ep-payslips', id ?? 'none'], queryFn: async () => (await payrollApi.list({})).filter((p) => p.employeeId === id), enabled: !!id });
}
export function useMyLeaves() {
  const id = useMyEmployeeId();
  return useQuery({ queryKey: ['ep-leaves', id ?? 'none'], queryFn: async () => (await leavesApi.list()).filter((l) => l.employeeId === id), enabled: !!id });
}
export function useMyTasks(name: string | undefined) {
  return useQuery({ queryKey: ['ep-tasks', name], queryFn: () => tasksApi.list({ assignee: name }), enabled: !!name });
}
