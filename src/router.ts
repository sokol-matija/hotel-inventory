import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'

export interface AuthContext {
  user: import('@supabase/supabase-js').User | null
  loading: boolean
  hasProfile: boolean
  profileLoading: boolean
  refreshProfile: () => Promise<void>
}

export interface RouterContext {
  auth: AuthContext
  queryClient: QueryClient
}

export const queryClient = new QueryClient()

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
    queryClient,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
