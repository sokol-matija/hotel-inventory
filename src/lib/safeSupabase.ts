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

// Safe Supabase client that automatically handles session errors
export const createSafeSupabaseClient = () => {
  return {
    // Wrap common Supabase operations
    from: (table: string) => {
      const query = supabase.from(table)
      
      // Wrap the select method
      const originalSelect = query.select
      query.select = function(columns?: string) {
        const selectQuery = originalSelect.call(this, columns)
        
        // Wrap the execution methods
        const wrapMethod = (methodName: string) => {
          const originalMethod = (selectQuery as any)[methodName]
          if (typeof originalMethod === 'function') {
            (selectQuery as any)[methodName] = async function(...args: any[]) {
              return safeSupabaseCall(() => originalMethod.apply(this, args))
            }
          }
        }
        
        // Wrap common query methods
        wrapMethod('single')
        wrapMethod('maybeSingle')
        wrapMethod('then')
        
        return selectQuery
      }
      
      // Wrap insert method
      const originalInsert = query.insert
      query.insert = function(values: any) {
        const insertQuery = originalInsert.call(this, values)
        
        // Wrap execution methods
        const originalThen = insertQuery.then
        if (originalThen) {
          insertQuery.then = async function(onFulfilled?: any, onRejected?: any) {
            return safeSupabaseCall(() => originalThen.call(this, onFulfilled, onRejected))
          }
        }
        
        return insertQuery
      }
      
      // Wrap update method
      const originalUpdate = query.update
      query.update = function(values: any) {
        const updateQuery = originalUpdate.call(this, values)
        
        // Wrap execution methods
        const originalThen = updateQuery.then
        if (originalThen) {
          updateQuery.then = async function(onFulfilled?: any, onRejected?: any) {
            return safeSupabaseCall(() => originalThen.call(this, onFulfilled, onRejected))
          }
        }
        
        return updateQuery
      }
      
      // Wrap delete method
      const originalDelete = query.delete
      query.delete = function() {
        const deleteQuery = originalDelete.call(this)
        
        // Wrap execution methods
        const originalThen = deleteQuery.then
        if (originalThen) {
          deleteQuery.then = async function(onFulfilled?: any, onRejected?: any) {
            return safeSupabaseCall(() => originalThen.call(this, onFulfilled, onRejected))
          }
        }
        
        return deleteQuery
      }
      
      return query
    },
    
    // Expose auth methods directly (they handle their own errors)
    auth: supabase.auth,
    
    // Add other Supabase methods as needed
    storage: supabase.storage,
    functions: supabase.functions,
    realtime: supabase.realtime
  }
}

export const safeSupabase = createSafeSupabaseClient()