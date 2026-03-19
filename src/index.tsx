import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import setupLocatorUI from '@locator/runtime';

if (import.meta.env.DEV) {
  setupLocatorUI();
}
import './i18n';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import { router, queryClient } from './router';
import { ErrorBoundary } from './components/ErrorBoundary';

// eslint-disable-next-line react-refresh/only-export-components
function InnerApp() {
  const auth = useAuth();

  // Wait for auth to resolve before rendering the router so that
  // beforeLoad guards can safely read auth state without race conditions.
  if (auth.loading || auth.profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return <RouterProvider router={router} context={{ auth, queryClient }} />;
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <InnerApp />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
