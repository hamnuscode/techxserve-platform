import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button, Input, FormField } from '@ds/primitives';
import { Modal, toast } from '@ds/feedback';
import { useAuthStore } from '@/app/stores/auth';

/** Self-service password change (admin menu + portals). */
export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const changePassword = useAuthStore((s) => s.changePassword);
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (pwd.length < 8) return setError('Password must be at least 8 characters.');
    if (pwd !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await changePassword(pwd);
      toast.success('Password updated');
      setPwd(''); setConfirm('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Change Password" size="sm">
      <div className="space-y-4">
        <FormField label="New password"><Input type="password" icon={Lock} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" autoFocus /></FormField>
        <FormField label="Confirm new password"><Input type="password" icon={Lock} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" /></FormField>
        {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={busy} onClick={submit}>Update Password</Button>
        </div>
      </div>
    </Modal>
  );
}
