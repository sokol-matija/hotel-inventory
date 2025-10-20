import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { supabase } from '@/lib/supabase'
import { Chrome, Mail, Lock, CheckCircle2, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from 'react-i18next'

export default function LoginPage() {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showError, setShowError] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setShowError(false)
    try {
      // Use the current origin for redirect, which will be correct for both development and production
      const redirectUrl = `${window.location.origin}/onboarding`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      })

      if (error) {
        console.error('Error signing in:', error)
        setErrorMessage('Google OAuth is not configured yet. Please use email/password login.')
        setShowError(true)
      }
    } catch (error) {
      console.error('Error:', error)
      setErrorMessage('Google OAuth is not configured yet. Please use email/password login.')
      setShowError(true)
    } finally {
      setIsLoading(false)
    }
  }

  const checkEmailExists = async (emailToCheck: string): Promise<boolean> => {
    try {
      // Try to sign in with a dummy password to check if the email exists
      // Supabase will return a specific error if the email doesn't exist
      const { error } = await supabase.auth.signInWithPassword({
        email: emailToCheck,
        password: 'dummy-check-password'
      })

      // If we get an "Invalid login credentials" error, it means the email exists
      // If we get an "Email not confirmed" error, the email also exists
      if (error && (error.message.includes('Invalid') || error.message.includes('not confirmed'))) {
        return true
      }

      return false
    } catch (error) {
      return false
    }
  }

  const handleEmailAuth = async () => {
    setIsLoading(true)
    setShowError(false)
    try {
      if (isSignUp) {
        // Check if email already exists
        const emailExists = await checkEmailExists(email)
        if (emailExists) {
          toast({
            title: 'Email Already Registered',
            description: 'This email is already associated with an account. Please use a different email or sign in with your existing account.',
            variant: 'destructive'
          })
          setIsLoading(false)
          return
        }

        const redirectUrl = `${window.location.origin}/onboarding`

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        })
        if (error) {
          setErrorMessage(error.message)
          setShowError(true)
        } else {
          setShowConfirmation(true)
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          setErrorMessage(error.message)
          setShowError(true)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setErrorMessage('An error occurred during authentication')
      setShowError(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Full-screen background image */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/mozaik_gp1.png"
          alt="Hotel Porec Background"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 to-indigo-100/60"></div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-2 text-center py-4">
            <div className="mx-auto w-48 h-32 flex items-center justify-center">
              <img 
                src="/LOGO1-hires.png" 
                alt="Hotel Porec Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Terms of Service - Only show during signup */}
              {isSignUp && (
                <div className="flex items-start space-x-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700">
                    I agree to the{' '}
                    <a
                      href="/terms-of-service"
                      target="_blank"
                      className="text-blue-600 hover:text-blue-700 underline font-medium"
                    >
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                      href="/privacy-policy"
                      target="_blank"
                      className="text-blue-600 hover:text-blue-700 underline font-medium"
                    >
                      Privacy Policy
                    </a>
                  </label>
                </div>
              )}

              <Button
                onClick={handleEmailAuth}
                disabled={isLoading || !email || !password || (isSignUp && !acceptedTerms)}
                className="w-full h-12 text-lg font-medium"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{isSignUp ? 'Creating account...' : 'Signing in...'}</span>
                  </div>
                ) : (
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                )}
              </Button>

              <div className="text-center">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setAcceptedTerms(false)
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
              </div>

              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full h-12 text-lg font-medium bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-lg"
                variant="outline"
              >
                <div className="flex items-center space-x-3">
                  <Chrome className="w-5 h-5 text-blue-600" />
                  <span>Continue with Google</span>
                </div>
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Secure sign-in for hotel staff only
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Made by Matija Sokol for Mara with <span className="text-red-500">♥</span>
          </p>
        </div>
      </div>

      {/* Email Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
            <CardHeader className="text-center space-y-4 pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Check Your Email</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-gray-600">
                We've sent a confirmation link to:
              </p>
              <p className="text-center font-semibold text-blue-600 break-all">
                {email}
              </p>
              <p className="text-center text-sm text-gray-500">
                Please check your inbox and click the confirmation link to complete your registration.
              </p>
              <Button
                onClick={() => {
                  setShowConfirmation(false)
                  setEmail('')
                  setPassword('')
                  setIsSignUp(false)
                  setAcceptedTerms(false)
                }}
                className="w-full h-12 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                OK
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Modal */}
      {showError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
            <CardHeader className="text-center space-y-4 pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                <X className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Authentication Error</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-gray-600">
                {errorMessage}
              </p>
              <Button
                onClick={() => setShowError(false)}
                className="w-full h-12 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                OK
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}