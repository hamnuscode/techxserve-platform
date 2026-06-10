import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi, settingsApi, periodsApi } from '@/data/mock-api';
import { qk } from '@/data/query-keys';
import type { AppUser, CompanyProfile } from '@/types';

export function useUsers(search: string) {
  return useQuery({ queryKey: qk.users(search), queryFn: () => usersApi.list(search) });
}
export function useUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });
  const create = useMutation({ mutationFn: (d: Partial<AppUser>) => usersApi.create(d), onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<AppUser> }) => usersApi.update(id, data), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => usersApi.remove(id), onSuccess: invalidate });
  return { create, update, remove };
}

export function useCompany() {
  return useQuery({ queryKey: qk.company, queryFn: settingsApi.company });
}
export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Partial<CompanyProfile>) => settingsApi.updateCompany(d), onSuccess: () => qc.invalidateQueries({ queryKey: qk.company }) });
}
export function useBranchesQuery() {
  return useQuery({ queryKey: qk.branches, queryFn: settingsApi.branches });
}
export function useDepartmentsQuery() {
  return useQuery({ queryKey: qk.departments, queryFn: settingsApi.departments });
}

export function useBranchMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.branches });
  const add = useMutation({ mutationFn: (d: { name: string; city?: string }) => settingsApi.addBranch(d), onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, data }: { id: string; data: { name?: string; city?: string } }) => settingsApi.updateBranch(id, data), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => settingsApi.removeBranch(id), onSuccess: invalidate });
  return { add, update, remove };
}

export function useDepartmentMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.departments });
  const add = useMutation({ mutationFn: (name: string) => settingsApi.addDepartment(name), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => settingsApi.removeDepartment(id), onSuccess: invalidate });
  return { add, remove };
}

export function useDashboardWidgets() {
  return useQuery({ queryKey: ['dashboard-widgets'], queryFn: settingsApi.dashboardHiddenWidgets });
}
export function useCompanySettings() {
  return useQuery({ queryKey: ['company-settings'], queryFn: settingsApi.getSettings });
}
export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (patch: Record<string, unknown>) => settingsApi.updateSettings(patch), onSuccess: () => qc.invalidateQueries({ queryKey: ['company-settings'] }) });
}
export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (file: File) => settingsApi.uploadLogo(file), onSuccess: () => { qc.invalidateQueries({ queryKey: ['company-settings'] }); qc.invalidateQueries({ queryKey: qk.company }); } });
}
export function useSetDashboardWidgets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keys: string[]) => settingsApi.setDashboardHiddenWidgets(keys),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard-widgets'] }),
  });
}

export function usePeriods() {
  return useQuery({ queryKey: qk.periods, queryFn: periodsApi.list });
}
export function usePeriodMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.periods });
  const close = useMutation({ mutationFn: ({ month, note }: { month: string; note?: string }) => periodsApi.close(month, note), onSuccess: invalidate });
  const reopen = useMutation({ mutationFn: (month: string) => periodsApi.reopen(month), onSuccess: invalidate });
  return { close, reopen };
}
