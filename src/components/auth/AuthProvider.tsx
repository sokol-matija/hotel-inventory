import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  user_id: string
  role_id: number
  created_at: string
  updated_at?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  userProfile: UserProfile | null
  hasProfile: boolean
  profileLoading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
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
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [hasProfile, setHasProfile] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const profileCheckInProgressRef = React.useRef(false)

  const checkUserProfile = async (userId: string) => {
    console.log('checkUserProfile: Starting for user:', userId)

    // Skip if already checking profile to avoid race conditions
    if (profileCheckInProgressRef.current) {
      console.log('checkUserProfile: Already checking profile, skipping duplicate call')
      return
    }

    profileCheckInProgressRef.current = true
    setProfileLoading(true)

    try {
      console.log('checkUserProfile: Making database query...')

      // Create a promise that rejects after 15 seconds to prevent infinite hanging
      // (5 seconds was too aggressive - legitimate queries can take longer on cold start)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile query timeout after 15 seconds')), 15000)
      )

      const queryPromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

      console.log('checkUserProfile: Query returned', { data, error, errorCode: error?.code })

      if (error) {
        console.error('checkUserProfile: Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })

        // PGRST116 means no rows found - that's OK
        if (error.code === 'PGRST116') {
          console.log('checkUserProfile: No profile found (user needs to select role)')
          setUserProfile(null)
          setHasProfile(false)
        } else {
          console.error('checkUserProfile: Database error:', error)
          // Treat as no profile - user can go to onboarding
          setUserProfile(null)
          setHasProfile(false)
        }
      } else {
        console.log('checkUserProfile: Success! Profile data:', data)
        setUserProfile(data)
        setHasProfile(!!data)
      }
    } catch (error) {
      console.error('checkUserProfile: Catch block error:', error)
      // On any error (including timeout), treat as no profile
      // This allows user to proceed to onboarding
      setUserProfile(null)
      setHasProfile(false)
    } finally {
      profileCheckInProgressRef.current = false
      setProfileLoading(false)
      console.log('checkUserProfile: Finished')
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await checkUserProfile(user.id)
    }
  }

  useEffect(() => {
    let mounted = true

    // Get initial session first
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return

      console.log('Initial session check:', session?.user?.email)
      setSession(session)
      setUser(session?.user ?? null)

      // Check for user profile on initial load (this is the reliable one)
      if (session?.user) {
        await checkUserProfile(session.user.id)
      } else {
        setUserProfile(null)
        setHasProfile(false)
      }

      setLoading(false)
    })

    // Set up auth state listener for future changes (don't await - let it run in background)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return

        console.log('Auth state changed:', event, session?.user?.email)

        // Only process SIGNED_IN and SIGNED_OUT events to avoid duplicates
        // But don't wait for profile check on initial load - getSession already does this
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          setSession(session)
          setUser(session?.user ?? null)

          if (session?.user) {
            // Fire and forget - don't await this on page load
            // Only getSession's call blocks the initial page load
            checkUserProfile(session.user.id)
          } else {
            setUserProfile(null)
            setHasProfile(false)
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUserProfile(null)
    setHasProfile(false)
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      userProfile,
      hasProfile,
      profileLoading,
      refreshProfile,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}