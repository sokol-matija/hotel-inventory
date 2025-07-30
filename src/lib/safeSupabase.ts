import { supabase } from './supabase'

// Safe wrapper for Supabase calls that handles invalid sessions automatically
export const safeSupabaseCall = async <T>(
  operation: () => Promise<T>,
  redirectOnFailure: boolean = true
): Promise<T | null> => {
  try {
    const result = await operation()
    return result
  } catch (error: any) {
    const errorMessage = error?.message?.toLowerCase() || ''
    
    // Only handle very specific session errors - be much more conservative
    if (
      errorMessage.includes('invalid refresh token') ||
      errorMessage.includes('refresh_token_not_found') ||
      errorMessage.includes('jwt expired') ||
      (error?.status === 401 && errorMessage.includes('expired'))
    ) {
      console.log('Specific session error detected during API call:', error.message)
      
      // Sign out and redirect to login
      await supabase.auth.signOut()
      
      if (redirectOnFailure) {
        window.location.href = '/login'
      }
      
      return null
    }
    
    // Don't handle generic 401s - they could be permission errors, not session errors
    // Let the calling code handle other errors normally
    throw error
  }
}

// Helper function to check if an error is session-related
export const isSessionError = (error: any): boolean => {
  const errorMessage = error?.message?.toLowerCase() || ''
  return (
    errorMessage.includes('invalid refresh token') ||
    errorMessage.includes('jwt expired') ||
    errorMessage.includes('refresh_token_not_found') ||
    errorMessage.includes('invalid_token') ||
    error?.status === 401
  )
}

// TEMPORARILY DISABLED - Complex type wrapping causing TypeScript errors
// This was causing build failures due to complex Supabase type definitions
// Since we're testing without safeSupabase calls anyway, commenting out for now

// export const createSafeSupabaseClient = () => {
//   // Complex type wrapping removed to fix build
//   return supabase
// }

// export const safeSupabase = createSafeSupabaseClient()