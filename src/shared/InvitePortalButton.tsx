import { useState } from 'react';
import { UserPlus, Copy, Check } from 'lucide-react';
import { Button, Input, FormField } from '@ds/primitives';
import { Modal, toast } from '@ds/feedback';
import { portalApi } from '@/data/mock-api';

interface Props {
  kind: 'client' | 'employee';
  recordId: string;
  defaultEmail?: string;
  /** Render as a full button (default) or a compact menu-style trigger label. */
  label?: string;
}

/** Admin control: create a portal login for a client or employee. */
export function InvitePortalButton({ kind, recordId, defaultEmail, label }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ email: string; tempPassword?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const res = await portalApi.invite(kind, recordId, email.trim());
      setResult(res);
      toast.success('Portal login created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create portal login');
    } finally {
      setBusy(false);
    }
  };

  const close = () => { setOpen(false); setResult(null); setCopied(false); };

  return (
    <>
      <Button variant="outline" icon={UserPlus} onClick={() => { setEmail(defaultEmail ?? ''); setOpen(true); }}>
        {label ?? 'Invite to Portal'}
      </Button>

      <Modal open={open} onClose={close} title={`Invite ${kind === 'client' ? 'client' : 'employee'} to portal`} size="sm">
        {result ? (
          <div className="space-y-4">
            <p className="text-sm text-content">Login created for <span className="font-medium">{result.email}</span>. Share these one-time credentials — they'll be asked to reset the password on first sign-in.</p>
            {result.tempPassword && (
              <div className="flex items-center justify-between rounded-lg border border-line bg-surface-sunken px-3 py-2">
                <code className="text-sm">{result.tempPassword}</code>
                <button
                  className="text-content-muted hover:text-content"
                  onClick={() => { navigator.clipboard.writeText(result.tempPassword!); setCopied(true); }}
                  aria-label="Copy password"
                >
                  {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                </button>
              </div>
            )}
            <div className="flex justify-end"><Button onClick={close}>Done</Button></div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-content-muted">They'll sign in at the {kind} portal to view their own {kind === 'client' ? 'invoices, statements and projects' : 'attendance, payslips and leaves'}.</p>
            <FormField label="Login email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus /></FormField>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button loading={busy} onClick={submit}>Create login</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
