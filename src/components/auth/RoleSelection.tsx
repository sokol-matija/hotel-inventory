import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { User, ChefHat, UserCheck, Sparkles, Calculator, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/hooks/use-toast'

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
  const { user: authUser } = useAuth()
  const { t } = useTranslation()
  const { toast } = useToast()
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminRole, setAdminRole] = useState<Role | null>(null)
  const [showPasswordText, setShowPasswordText] = useState(false)

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
        toast({
          title: t('auth.adminPasswordRequired'),
          description: t('auth.incorrectAdminPassword'),
          variant: 'destructive'
        })
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

      // Call the callback to trigger re-render
      onRoleSelected()
    } catch (error) {
      console.error('Error creating user profile:', error)
      toast({
        title: t('auth.settingUpAccount'),
        description: t('auth.errorCreatingProfile'),
        variant: 'destructive'
      })
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background image - same as module selector */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'url(/zemlja_gp_copy.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        {/* Hotel Logo and Welcome */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <img
              src="/LOGO1-hires.png"
              alt="Hotel Porec Logo"
              className="w-32 h-20 mx-auto object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Hotel Porec!
          </h1>
          <p className="text-xl text-gray-600">
            Select your role to continue
          </p>
        </div>


        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {roles.map((role) => {
            const IconComponent = roleIcons[role.name as keyof typeof roleIcons] || User
            const colorClass = roleColors[role.name as keyof typeof roleColors] || 'from-gray-500 to-gray-600'

            return (
              <Card
                key={role.id}
                onClick={() => handleRoleSelect(role.id, role.name)}
                className={`relative transition-all duration-300 cursor-pointer ${
                  selectedRole === role.id
                    ? 'shadow-lg scale-105 border-blue-500 bg-blue-50'
                    : 'hover:shadow-lg hover:-translate-y-1 border-gray-200 hover:border-blue-300 bg-white'
                }`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center text-white`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t(`roles.${role.name}`)}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">
                    {t(`roleDescriptions.${role.name}`)}
                  </p>
                </CardContent>
              </Card>
            )
          })}

          {/* Admin Role with Password Protection */}
          {adminRole && (
            <Card
              onClick={() => handleRoleSelect(adminRole.id, adminRole.name)}
              className={`relative transition-all duration-300 cursor-pointer ${
                selectedRole === adminRole.id
                  ? 'shadow-lg scale-105 border-red-500 bg-red-50'
                  : 'hover:shadow-lg hover:-translate-y-1 border-gray-200 hover:border-red-300 bg-white'
              }`}
            >
              <div className="absolute top-3 right-3">
                <Lock className="w-5 h-5 text-red-600" />
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t(`roles.${adminRole.name}`)}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  {t(`roleDescriptions.${adminRole.name}`)}
                </p>
                <p className="text-red-600 text-xs mt-2 font-medium">
                  {t('auth.adminPasswordRequired')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Admin Password Input */}
        {showAdminPassword && (
          <Card className="mt-6 max-w-md w-full shadow-lg border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <Label htmlFor="admin-password" className="text-red-800 font-medium text-base">
                {t('auth.adminPasswordRequired')}
              </Label>
              <div className="mt-3 relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-red-500" />
                <Input
                  id="admin-password"
                  type={showPasswordText ? "text" : "password"}
                  placeholder={t('auth.adminPasswordPlaceholder')}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="pl-11 pr-12 h-12 border-red-300 focus:border-red-500 focus:ring-red-500 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-3 top-3.5 text-red-500 hover:text-red-700 transition-colors"
                  aria-label={showPasswordText ? "Hide password" : "Show password"}
                >
                  {showPasswordText ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="mt-3 text-sm text-red-600">
                {t('auth.contactAdminForPassword')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="mt-8 max-w-md w-full">
          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || isSubmitting || (showAdminPassword && !adminPassword)}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
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
        </div>

        {/* Hotel Info Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Hotel Porec • 52440 Poreč, Croatia • +385(0)52/451 611</p>
          <p>hotelporec@pu.t-com.hr • www.hotelporec.com</p>
        </div>
      </div>
    </div>
  )
}