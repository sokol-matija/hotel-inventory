import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import setupLocatorUI from '@locator/runtime'

if (import.meta.env.DEV) {
  setupLocatorUI()
}
import './i18n'
import { RouterProvider } from '@tanstack/react-router'
import { AuthProvider, useAuth } from './components/auth/AuthProvider'
import { router } from './router'

function InnerApp() {
  const auth = useAuth()

  // Wait for auth to resolve before rendering the router so that
  // beforeLoad guards can safely read auth state without race conditions.
  if (auth.loading || auth.profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <RouterProvider router={router} context={{ auth }} />
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  </React.StrictMode>,
)
