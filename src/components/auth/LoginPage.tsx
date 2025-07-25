import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { supabase } from '@/lib/supabase'
import { Chrome, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      // Use the current origin for redirect, which will be correct for both development and production
      const redirectUrl = `${window.location.origin}/dashboard`
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      })
      
      if (error) {
        console.error('Error signing in:', error)
        alert('Google OAuth is not configured yet. Please use email/password login.')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Google OAuth is not configured yet. Please use email/password login.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailAuth = async () => {
    setIsLoading(true)
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) {
          alert(error.message)
        } else {
          alert('Check your email for the confirmation link!')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          alert(error.message)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred during authentication')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Full-screen background image */}
      <div className="absolute inset-0 pointer-events-none">
        <img 
          src="/mozaik_gp1 copy.png" 
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

              <Button
                onClick={handleEmailAuth}
                disabled={isLoading || !email || !password}
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
                  onClick={() => setIsSignUp(!isSignUp)}
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
    </div>
  )
}