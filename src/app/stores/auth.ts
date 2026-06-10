import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export type AuthRole = 'Super Super Admin' | 'Super Admin' | 'Manager' | 'Finance' | 'HR' | 'Ops';

export type PortalKind = 'admin' | 'client' | 'employee';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  companyId: string | null;
  title: string;
  permissions: string[];
  mustChangePassword: boolean;
  // Portal linkage (admin staff have portalKind 'admin').
  portalKind: PortalKind;
  clientId: string | null;
  employeeId: string | null;
  /** Super Super Admin: the company they're currently "viewing as" (null = unscoped). */
  viewAsCompany: string | null;
}

interface AuthState {
  /** 'loading' while we resolve the initial session; then 'authed' | 'anon'. */
  status: 'loading' | 'authed' | 'anon';
  /** Back-compat boolean used by route guards. */
  authenticated: boolean;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Async sign-out (kept named `logout` for existing callers). */
  logout: () => Promise<void>;
  /** Update the signed-in user's password; clears the must-change flag. */
  changePassword: (newPassword: string) => Promise<void>;
  /** SSA only: enter (companyId) or exit (null) a company's admin view. */
  setViewAsCompany: (companyId: string | null) => Promise<void>;
}

/** Load the profile row for a signed-in user and shape it into AuthUser. */
async function loadUser(id: string, email: string): Promise<AuthUser> {
  const { data } = await supabase
    .from('profiles')
    .select('full_name, role, company_id, title, permissions, must_change_password, portal_kind, client_id, employee_id, view_as_company')
    .eq('id', id)
    .maybeSingle();

  return {
    id,
    email,
    name: data?.full_name ?? email,
    role: (data?.role as AuthRole) ?? 'Ops',
    companyId: data?.company_id ?? null,
    title: data?.title ?? '',
    permissions: data?.permissions ?? [],
    mustChangePassword: data?.must_change_password ?? false,
    portalKind: (data?.portal_kind as PortalKind) ?? 'admin',
    clientId: data?.client_id ?? null,
    employeeId: data?.employee_id ?? null,
    viewAsCompany: data?.view_as_company ?? null,
  };
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'loading',
  authenticated: false,
  user: null,

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const u = await loadUser(data.user.id, data.user.email ?? email);
    set({ status: 'authed', authenticated: true, user: u });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ status: 'anon', authenticated: false, user: null });
  },

  changePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    const u = get().user;
    if (u?.mustChangePassword) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', u.id);
    }
    if (u) set({ user: { ...u, mustChangePassword: false } });
  },

  setViewAsCompany: async (companyId) => {
    const u = get().user;
    if (!u || u.role !== 'Super Super Admin') return;
    const { error } = await supabase.from('profiles').update({ view_as_company: companyId }).eq('id', u.id);
    if (error) throw error;
    set({ user: { ...u, viewAsCompany: companyId } });
  },
}));

/**
 * Resolve the persisted Supabase session on boot and keep the store in sync
 * with auth changes (token refresh, sign-out in another tab, etc).
 * Call once from App.
 */
export function initAuth(): () => void {
  supabase.auth.getSession().then(async ({ data }) => {
    const session = data.session;
    if (!session) {
      set_anon();
      return;
    }
    const u = await loadUser(session.user.id, session.user.email ?? '');
    useAuthStore.setState({ status: 'authed', authenticated: true, user: u });
  });

  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      set_anon();
      return;
    }
    // On SIGNED_IN / TOKEN_REFRESHED, refresh the profile-backed user.
    loadUser(session.user.id, session.user.email ?? '').then((u) =>
      useAuthStore.setState({ status: 'authed', authenticated: true, user: u }),
    );
  });

  return () => sub.subscription.unsubscribe();
}

function set_anon() {
  useAuthStore.setState({ status: 'anon', authenticated: false, user: null });
}
