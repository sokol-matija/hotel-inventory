import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  user_id: string
  role_id: number
  is_active: boolean
  role: {
    id: number
    name: string
    description: string
  }
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUserProfile: () => Promise<void>
  validateAndRefreshSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching user profile for:', userId)
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          role:user_roles(*)
        `)
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('User profile fetch error:', error)
        setUserProfile(null)
        return
      }

      if (!data) {
        console.log('No user profile found')
        setUserProfile(null)
      } else {
        console.log('User profile fetched successfully:', data)
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUserProfile(null)
    }
  }

  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id)
    }
  }

  const validateAndRefreshSession = async (): Promise<boolean> => {
    try {
      console.log('Validating session...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      // Only redirect if there's a clear session error, not just missing session
      if (error) {
        console.log('Session error detected:', error.message)
        // Only redirect on specific session errors
        if (error.message?.includes('Invalid refresh token') || 
            error.message?.includes('refresh_token_not_found') ||
            error.message?.includes('JWT expired')) {
          console.log('Invalid session detected, signing out and redirecting to login')
          await supabase.auth.signOut()
          setUser(null)
          setUserProfile(null)
          window.location.href = '/login'
          return false
        }
      }
      
      if (!session) {
        // Don't redirect immediately - session might be loading
        console.log('No session found, but not redirecting (might be loading)')
        return false
      }
      
      // Only refresh if token is very close to expiry (within 2 minutes instead of 5)
      const tokenExp = session.expires_at ? session.expires_at * 1000 : 0
      const now = Date.now()
      const twoMinutes = 2 * 60 * 1000
      
      if (tokenExp && tokenExp - now < twoMinutes) {
        console.log('Token close to expiry, attempting refresh...')
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError) {
          console.log('Session refresh failed:', refreshError.message)
          // Only redirect on specific refresh errors
          if (refreshError.message?.includes('Invalid refresh token') || 
              refreshError.message?.includes('refresh_token_not_found')) {
            console.log('Invalid refresh token, signing out and redirecting to login')
            await supabase.auth.signOut()
            setUser(null)
            setUserProfile(null)
            window.location.href = '/login'
            return false
          }
        } else {
          console.log('Session refreshed successfully')
        }
      }
      
      console.log('Session validation successful')
      return true
    } catch (error) {
      console.error('Session validation failed:', error)
      // Don't redirect on generic errors, let normal auth flow handle it
      return false
    }
  }

  useEffect(() => {
    let isMounted = true
    let initialLoadComplete = false
    
    const getSession = async () => {
      try {
        console.log('Getting session...')
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        console.log('Session retrieved:', session?.user ? 'User found' : 'No user')
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        }
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        if (isMounted) {
          console.log('Setting loading to false - initial load complete')
          initialLoadComplete = true
          setLoading(false)
        }
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        
        console.log('Auth state changed:', event, session?.user ? 'User present' : 'No user')
        
        // Only update loading state after initial load is complete
        if (initialLoadComplete) {
          setUser(session?.user ?? null)
          
          if (session?.user) {
            await fetchUserProfile(session.user.id)
          } else {
            setUserProfile(null)
          }
        }
      }
    )

    return () => {
      console.log('Cleaning up auth subscription')
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // PWA iOS session validation fix - validates session when app becomes active
  useEffect(() => {
    let lastValidationTime = 0
    const validationThrottle = 30000 // Only validate once every 30 seconds

    const validateSessionOnFocus = async () => {
      const now = Date.now()
      
      // Only validate if user exists, document is visible, and enough time has passed
      if (!document.hidden && user && (now - lastValidationTime > validationThrottle)) {
        console.log('App became active, validating session...')
        lastValidationTime = now
        await validateAndRefreshSession()
      }
    }

    // Handle iOS Safari/PWA app switching with multiple event listeners for better coverage
    document.addEventListener('visibilitychange', validateSessionOnFocus)
    window.addEventListener('pageshow', validateSessionOnFocus)
    window.addEventListener('focus', validateSessionOnFocus)

    return () => {
      document.removeEventListener('visibilitychange', validateSessionOnFocus)
      window.removeEventListener('pageshow', validateSessionOnFocus)
      window.removeEventListener('focus', validateSessionOnFocus)
    }
  }, [user, validateAndRefreshSession])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut, refreshUserProfile, validateAndRefreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}