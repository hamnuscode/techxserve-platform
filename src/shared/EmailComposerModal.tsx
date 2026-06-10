import { useState } from 'react';
import { Button, Input, Textarea, FormField } from '@ds/primitives';
import { Modal, toast } from '@ds/feedback';
import { supabase } from '@/lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
}

/** Compose & send an email (invoice / statement). Sends via the send-email edge function. */
export function EmailComposerModal({ open, onClose, defaultTo = '', defaultSubject = '', defaultBody = '' }: Props) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [busy, setBusy] = useState(false);

  // Keep fields in sync when opened for a different record.
  const key = `${defaultTo}|${defaultSubject}`;
  const [lastKey, setLastKey] = useState(key);
  if (open && key !== lastKey) { setTo(defaultTo); setSubject(defaultSubject); setBody(defaultBody); setLastKey(key); }

  const send = async () => {
    if (!to || !subject) return toast.error('Recipient and subject are required.');
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', { body: { to, subject, body } });
      if (error) throw error;
      const res = data as { sent: boolean; message?: string };
      if (res.sent) toast.success('Email sent');
      else toast.info(res.message ?? 'Email provider not configured.');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Compose Email" size="md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={send}>Send</Button></>}>
      <div className="space-y-4">
        <FormField label="To" required><Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@example.com" /></FormField>
        <FormField label="Subject" required><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></FormField>
        <FormField label="Message"><Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} /></FormField>
      </div>
    </Modal>
  );
}
