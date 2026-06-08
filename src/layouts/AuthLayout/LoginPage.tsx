import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button, Checkbox, FormField, Input } from '@ds/primitives';
import { useAuthStore } from '@/app/stores/auth';
import { routes } from '@/config/routes';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'faisal@techxserve.co', password: 'demo', remember: true },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500)); // simulate auth
    login(values.email);
    navigate(routes.dashboard);
  };

  return (
    <AuthLayout>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
        <div className="px-8 pt-8 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 font-display text-2xl font-bold text-white shadow-lg shadow-brand-600/30"
          >
            T
          </motion.div>
          <h1 className="font-display text-xl font-bold text-content">Welcome back</h1>
          <p className="mt-1 text-sm text-content-muted">Sign in to the TechxServe Business Platform</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-8">
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" icon={Mail} placeholder="you@company.com" invalid={!!errors.email} {...register('email')} />
          </FormField>
          <FormField label="Password" htmlFor="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              icon={Lock}
              placeholder="••••••••"
              invalid={!!errors.password}
              {...register('password')}
            />
          </FormField>

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-content-muted">
              <Checkbox {...register('remember')} defaultChecked /> Remember me
            </label>
            <button type="button" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Forgot password?
            </button>
          </div>

          <Button type="submit" fullWidth size="lg" loading={submitting} iconRight={ArrowRight}>
            Sign In
          </Button>
        </form>
      </div>
      <p className="mt-6 text-center text-xs text-content-subtle">
        Demo build — any email/password signs you in.
      </p>
      <div className="mt-3 flex items-center justify-center gap-4 text-xs">
        <button
          type="button"
          onClick={() => { login('faisal@techxserve.co'); navigate(routes.dashboard); }}
          className="font-medium text-content-muted hover:text-brand-600"
        >
          Admin Panel →
        </button>
        <span className="text-content-subtle">·</span>
        <a href={routes.cpLogin} className="font-medium text-content-muted hover:text-brand-600">Client Portal →</a>
        <span className="text-content-subtle">·</span>
        <a href={routes.epLogin} className="font-medium text-content-muted hover:text-brand-600">Employee Portal →</a>
      </div>
    </AuthLayout>
  );
}
