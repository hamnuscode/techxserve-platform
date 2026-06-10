import { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { Button, Input, FormField } from '@ds/primitives';
import { toast } from '@ds/feedback';
import { useAuthStore } from '@/app/stores/auth';

/**
 * Full-screen gate shown when must_change_password is set (first login of an
 * invited user). Blocks the app until a new password is chosen.
 */
export function ForcedPasswordReset() {
  const changePassword = useAuthStore((s) => s.changePassword);
  const logout = useAuthStore((s) => s.logout);
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pwd.length < 8) return setError('Password must be at least 8 characters.');
    if (pwd !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await changePassword(pwd);
      toast.success('Password set — welcome!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
        <div className="px-8 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30"><ShieldCheck size={26} /></div>
          <h1 className="font-display text-xl font-bold text-content">Set a new password</h1>
          <p className="mt-1 text-sm text-content-muted">For your security, please choose a new password before continuing.</p>
        </div>
        <form onSubmit={submit} className="space-y-4 p-8">
          <FormField label="New password"><Input type="password" icon={Lock} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" autoFocus /></FormField>
          <FormField label="Confirm new password"><Input type="password" icon={Lock} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" /></FormField>
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
          <Button type="submit" fullWidth size="lg" loading={busy}>Set password & continue</Button>
          <button type="button" onClick={() => logout()} className="block w-full text-center text-sm text-content-muted hover:text-content">Sign out instead</button>
        </form>
      </div>
    </div>
  );
}
