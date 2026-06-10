import { useQuery } from '@tanstack/react-query';
import { clientsApi, projectsApi } from '@/data/mock-api';
import { qk } from '@/data/query-keys';
import { useAuthStore } from '@/app/stores/auth';

/** The logged-in portal user's linked client id (RLS guarantees they see only this one). */
export function useMyClientId(): string | null {
  return useAuthStore((s) => s.user?.clientId ?? null);
}

export function useMyClient() {
  const id = useMyClientId();
  return useQuery({ queryKey: qk.client(id ?? 'none'), queryFn: () => clientsApi.get(id!), enabled: !!id });
}
export function useMyInvoices() {
  const id = useMyClientId();
  return useQuery({ queryKey: qk.clientInvoices(id ?? 'none'), queryFn: () => clientsApi.invoices(id!), enabled: !!id });
}
export function useMyContracts() {
  const id = useMyClientId();
  return useQuery({ queryKey: qk.clientContracts(id ?? 'none'), queryFn: () => clientsApi.contracts(id!), enabled: !!id });
}
export function useMyProjects() {
  const id = useMyClientId();
  return useQuery({ queryKey: ['cp-projects', id ?? 'none'], queryFn: () => projectsApi.list({ client: id!, pageSize: 100 }), enabled: !!id });
}
