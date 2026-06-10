import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button, Input, FormField, Checkbox } from '@ds/primitives';
import { useAuthStore } from '@/app/stores/auth';

interface PortalLoginPageProps {
  title: string;
  subtitle: string;
  redirectTo: string;
  poweredBy?: boolean;
  emailLabel?: string;
}

/** Shared centered login card for the Client & Employee portals (C2.1 / E2.1). */
export function PortalLoginPage({ title, subtitle, redirectTo, poweredBy, emailLabel = 'Email' }: PortalLoginPageProps) {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate(redirectTo);
    } catch {
      setError('Email or password is incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
        <div className="px-8 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 font-display text-2xl font-bold text-white shadow-lg shadow-brand-600/30">T</div>
          <h1 className="font-display text-xl font-bold text-content">{title}</h1>
          <p className="mt-1 text-sm text-content-muted">{subtitle}</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 p-8">
          <FormField label={emailLabel}><Input icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></FormField>
          <FormField label="Password"><Input type="password" icon={Lock} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></FormField>
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-content-muted"><Checkbox defaultChecked /> Remember me</label>
            <button type="button" className="text-sm font-medium text-brand-600 hover:text-brand-700">Forgot password?</button>
          </div>
          <Button type="submit" fullWidth size="lg" loading={loading} iconRight={ArrowRight}>Sign In</Button>
        </form>
      </div>
      {poweredBy && <p className="mt-6 text-center text-xs text-content-subtle">Powered by TECHXSERVE Business Platform</p>}
    </AuthLayout>
  );
}
