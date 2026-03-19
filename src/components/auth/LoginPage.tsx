import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { supabase } from '@/lib/supabase';
import { Chrome, Mail, Lock, CheckCircle2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setShowError(false);
    try {
      // Use the current origin for redirect, which will be correct for both development and production
      const redirectUrl = `${window.location.origin}/onboarding`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('Error signing in:', error);
        setErrorMessage('Google sign-in failed. Please try again or use email/password.');
        setShowError(true);
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Google sign-in failed. Please try again or use email/password.');
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    setIsLoading(true);
    setShowError(false);
    try {
      if (isSignUp) {
        // Check if passwords match
        if (password !== confirmPassword) {
          toast({
            title: 'Passwords Do Not Match',
            description: 'Please make sure both password fields match.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        const redirectUrl = `${window.location.origin}/onboarding`;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        if (error) {
          // Check if the error is about email already existing
          if (
            error.message.includes('already registered') ||
            error.message.includes('User already exists')
          ) {
            toast({
              title: 'Email Already Registered',
              description:
                'This email is already associated with an account. Please use a different email or sign in with your existing account.',
              variant: 'destructive',
            });
          } else {
            setErrorMessage(error.message);
            setShowError(true);
          }
        } else {
          setShowConfirmation(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setErrorMessage(error.message);
          setShowError(true);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('An error occurred during authentication');
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Full-screen background image */}
      <div className="pointer-events-none absolute inset-0">
        <img
          src="/mozaik_gp1.png"
          alt="Hotel Porec Background"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 to-indigo-100/60"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="border-0 bg-white/80 shadow-2xl backdrop-blur-sm">
          <CardHeader className="space-y-2 py-4 text-center">
            <div className="mx-auto flex h-32 w-48 items-center justify-center">
              <img
                src="/LOGO1-hires.png"
                alt="Hotel Porec Logo"
                className="h-full w-full object-contain"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
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
                    <Lock className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
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

                {/* Confirm Password - Only show during signup */}
                {isSignUp && (
                  <div>
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`pl-10 ${
                          confirmPassword && password !== confirmPassword
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : ''
                        }`}
                      />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                    )}
                    {confirmPassword && password === confirmPassword && (
                      <p className="mt-1 text-sm text-green-600">Passwords match</p>
                    )}
                  </div>
                )}
              </div>

              {/* Terms of Service - Only show during signup */}
              {isSignUp && (
                <div className="flex items-start space-x-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700">
                    I agree to the{' '}
                    <a
                      href="/terms-of-service"
                      target="_blank"
                      className="font-medium text-blue-600 underline hover:text-blue-700"
                    >
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                      href="/privacy-policy"
                      target="_blank"
                      className="font-medium text-blue-600 underline hover:text-blue-700"
                    >
                      Privacy Policy
                    </a>
                  </label>
                </div>
              )}

              <Button
                onClick={handleEmailAuth}
                disabled={
                  isLoading ||
                  !email ||
                  !password ||
                  (isSignUp && (!acceptedTerms || !confirmPassword || password !== confirmPassword))
                }
                className="h-12 w-full text-lg font-medium"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{isSignUp ? 'Creating account...' : 'Signing in...'}</span>
                  </div>
                ) : (
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                )}
              </Button>

              <div className="text-center">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAcceptedTerms(false);
                    setPassword('');
                    setConfirmPassword('');
                    setErrorMessage('');
                  }}
                  className="text-sm text-blue-600 underline hover:text-blue-700"
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
                className="h-12 w-full border-2 border-gray-200 bg-white text-lg font-medium text-gray-700 shadow-lg transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
                variant="outline"
              >
                <div className="flex items-center space-x-3">
                  <Chrome className="h-5 w-5 text-blue-600" />
                  <span>Continue with Google</span>
                </div>
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">Secure sign-in for hotel staff only</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md border-0 bg-white shadow-2xl">
            <CardHeader className="space-y-4 pb-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Check Your Email</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-gray-600">We've sent a confirmation link to:</p>
              <p className="text-center font-semibold break-all text-blue-600">{email}</p>
              <p className="text-center text-sm text-gray-500">
                Please check your inbox and click the confirmation link to complete your
                registration.
              </p>
              <Button
                onClick={() => {
                  setShowConfirmation(false);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setIsSignUp(false);
                  setAcceptedTerms(false);
                }}
                className="h-12 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-lg font-medium hover:from-blue-700 hover:to-purple-700"
              >
                OK
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Modal */}
      {showError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md border-0 bg-white shadow-2xl">
            <CardHeader className="space-y-4 pb-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600">
                <X className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Authentication Error</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-gray-600">{errorMessage}</p>
              <Button
                onClick={() => setShowError(false)}
                className="h-12 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-lg font-medium hover:from-blue-700 hover:to-purple-700"
              >
                OK
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
