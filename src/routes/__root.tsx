import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ToastProvider } from '@/components/ui/toast'
import { Toaster } from '@/components/Toaster'
import type { RouterContext } from '../router'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ToastProvider>
      <Outlet />
      <Toaster />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </ToastProvider>
  )
}
