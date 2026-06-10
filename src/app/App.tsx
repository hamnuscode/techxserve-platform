import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Providers } from './providers';
import { router } from './router';
import { initAuth } from './stores/auth';

export function App() {
  // Resolve the persisted Supabase session once and keep the store in sync.
  useEffect(() => initAuth(), []);

  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
