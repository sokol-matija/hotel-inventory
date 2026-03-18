import { createRouter } from '@tanstack/react-router'
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
}

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
