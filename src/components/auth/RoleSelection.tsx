import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { User, ChefHat, UserCheck, Sparkles, Calculator, ShieldCheck, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Role {
  id: number
  name: string
  description: string
}

interface RoleSelectionProps {
  user: any
  onRoleSelected: () => void
}

export default function RoleSelection({ user, onRoleSelected }: RoleSelectionProps) {
  const { refreshUserProfile } = useAuth()
  const { t } = useTranslation()
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminRole, setAdminRole] = useState<Role | null>(null)

  const roleIcons = {
    'admin': ShieldCheck,
    'reception': UserCheck,
    'kitchen': ChefHat,
    'housekeeping': Sparkles,
    'bookkeeping': Calculator
  }

  const roleColors = {
    'admin': 'from-red-500 to-red-600',
    'reception': 'from-blue-500 to-blue-600',
    'kitchen': 'from-green-500 to-green-600',
    'housekeeping': 'from-purple-500 to-purple-600',
    'bookkeeping': 'from-yellow-500 to-yellow-600'
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('name')

      if (error) throw error
      
      // Separate admin role from others
      const allRoles = data || []
      const adminRoleData = allRoles.find(role => role.name === 'admin')
      const otherRoles = allRoles.filter(role => role.name !== 'admin')
      
      setRoles(otherRoles)
      setAdminRole(adminRoleData || null)
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleSelect = (roleId: number, roleName: string) => {
    if (roleName === 'admin') {
      setShowAdminPassword(true)
      setSelectedRole(roleId)
    } else {
      setSelectedRole(roleId)
      setShowAdminPassword(false)
      setAdminPassword('')
    }
  }

  const handleSubmit = async () => {
    if (!selectedRole) return

    // Check if admin role is selected and password is required
    if (adminRole && selectedRole === adminRole.id) {
      if (adminPassword !== 'Hp247@$&') {
        alert(t('auth.incorrectAdminPassword'))
        return
      }
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .insert([
          {
            user_id: user.id,
            role_id: selectedRole
          }
        ])

      if (error) throw error
      
      // Refresh the user profile in the auth context
      await refreshUserProfile()
      
      // Call the callback to trigger re-render
      onRoleSelected()
    } catch (error) {
      console.error('Error creating user profile:', error)
      alert(t('auth.errorCreatingProfile'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              <User className="w-10 h-10" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">
              {t('auth.welcome', { name: user.user_metadata?.full_name || 'User' })}
            </CardTitle>
            <CardDescription className="text-gray-600 text-lg">
              {t('auth.selectRoleDescription')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role) => {
                const IconComponent = roleIcons[role.name as keyof typeof roleIcons] || User
                const colorClass = roleColors[role.name as keyof typeof roleColors] || 'from-gray-500 to-gray-600'
                
                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id, role.name)}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                      selectedRole === role.id
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center text-white`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {t(`roles.${role.name}`)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {t(`roleDescriptions.${role.name}`)}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
              
              {/* Admin Role with Password Protection */}
              {adminRole && (
                <button
                  onClick={() => handleRoleSelect(adminRole.id, adminRole.name)}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                    selectedRole === adminRole.id
                      ? 'border-red-500 bg-red-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                                          <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">
                            {t(`roles.${adminRole.name}`)}
                          </h3>
                          <Lock className="w-4 h-4 text-red-600" />
                        </div>
                        <p className="text-sm text-gray-600">
                          {t(`roleDescriptions.${adminRole.name}`)} ({t('auth.adminPasswordRequired')})
                        </p>
                      </div>
                  </div>
                </button>
              )}
            </div>

            {/* Admin Password Input */}
            {showAdminPassword && (
              <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <Label htmlFor="admin-password" className="text-red-800 font-medium">
                  {t('auth.adminPasswordRequired')}
                </Label>
                <div className="mt-2 relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-red-500" />
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder={t('auth.adminPasswordPlaceholder')}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="pl-10 border-red-300 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
                <p className="mt-2 text-sm text-red-600">
                  {t('auth.contactAdminForPassword')}
                </p>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!selectedRole || isSubmitting || (showAdminPassword && !adminPassword)}
              className="w-full h-12 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('auth.settingUpAccount')}</span>
                </div>
              ) : (
                t('auth.continueToDashboard')
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}