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

  // Separate useEffect for iOS Safari session refresh fix
  // This prevents infinite loading after app switching
  useEffect(() => {
    const refreshSessionOnFocus = async () => {
      if (!document.hidden && user) {
        try {
          console.log('App became active, refreshing session...')
          const { data, error } = await supabase.auth.refreshSession()
          if (error) {
            console.error('Session refresh failed:', error)
          } else {
            console.log('Session refreshed successfully')
          }
        } catch (error) {
          console.error('Error refreshing session:', error)
        }
      }
    }

    // Handle iOS Safari app switching with multiple event listeners for better coverage
    document.addEventListener('visibilitychange', refreshSessionOnFocus)
    window.addEventListener('pageshow', refreshSessionOnFocus)
    window.addEventListener('focus', refreshSessionOnFocus)

    return () => {
      document.removeEventListener('visibilitychange', refreshSessionOnFocus)
      window.removeEventListener('pageshow', refreshSessionOnFocus)
      window.removeEventListener('focus', refreshSessionOnFocus)
    }
  }, [user])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  )
}