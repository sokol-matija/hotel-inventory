import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import {
  User,
  ChefHat,
  UserCheck,
  Sparkles,
  Calculator,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface Role {
  id: number;
  name: string;
  description: string;
}

interface RoleSelectionProps {
  onRoleSelected: () => void;
}

// Move icon and color mappings outside component to prevent recreation
const ROLE_ICONS = {
  admin: ShieldCheck,
  reception: UserCheck,
  kitchen: ChefHat,
  housekeeping: Sparkles,
  bookkeeping: Calculator,
} as const;

const ROLE_COLORS = {
  admin: 'from-red-500 to-red-600',
  reception: 'from-blue-500 to-blue-600',
  kitchen: 'from-green-500 to-green-600',
  housekeeping: 'from-purple-500 to-purple-600',
  bookkeeping: 'from-yellow-500 to-yellow-600',
} as const;

const BACKGROUND_STYLE = {
  backgroundImage: 'url(/zemlja_gp_copy.webp)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
} as const;

export default function RoleSelection({ onRoleSelected }: RoleSelectionProps) {
  useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminRole, setAdminRole] = useState<Role | null>(null);
  const [showPasswordText, setShowPasswordText] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('user_roles').select('*').order('name');

      if (error) throw error;

      // Separate admin role from others
      const allRoles = data || [];
      const adminRoleData = allRoles.find((role) => role.name === 'admin');
      const otherRoles = allRoles.filter((role) => role.name !== 'admin');

      setRoles(otherRoles);
      setAdminRole(adminRoleData || null);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = useCallback((roleId: number, roleName: string) => {
    if (roleName === 'admin') {
      setShowAdminPassword(true);
      setSelectedRole(roleId);
    } else {
      setSelectedRole(roleId);
      setShowAdminPassword(false);
      setAdminPassword('');
    }
  }, []);

  const handleTogglePasswordVisibility = useCallback(() => {
    setShowPasswordText((prev) => !prev);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAdminPassword(e.target.value);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedRole) return;

    setIsSubmitting(true);
    try {
      const body: { role_id: number; admin_password?: string } = { role_id: selectedRole };
      if (adminRole && selectedRole === adminRole.id && adminPassword) {
        body.admin_password = adminPassword;
      }

      const { error } = await supabase.functions.invoke('assign-role', { body });

      if (error) throw error;

      // Call the callback to trigger re-render
      onRoleSelected();
    } catch (error) {
      console.error('Error creating user profile:', error);
      const message =
        error instanceof Error && error.message.includes('Incorrect admin password')
          ? t('auth.incorrectAdminPassword')
          : t('auth.errorCreatingProfile');
      toast({
        title: t('auth.settingUpAccount'),
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedRole, adminRole, adminPassword, onRoleSelected, t, toast]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Background image - same as module selector */}
      <div className="absolute inset-0 opacity-20" style={BACKGROUND_STYLE} />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6">
        {/* Hotel Logo and Welcome */}
        <div className="mb-12 text-center">
          <div className="mb-6">
            <img
              src="/LOGO1-hires.png"
              alt="Hotel Porec Logo"
              className="mx-auto h-20 w-32 object-contain"
            />
          </div>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Welcome to Hotel Porec!</h1>
          <p className="text-xl text-gray-600">Select your role to continue</p>
        </div>

        {/* Role Cards Grid */}
        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {roles.map((role) => {
            const IconComponent = ROLE_ICONS[role.name as keyof typeof ROLE_ICONS] || User;
            const colorClass =
              ROLE_COLORS[role.name as keyof typeof ROLE_COLORS] || 'from-gray-500 to-gray-600';

            return (
              <Card
                key={role.id}
                onClick={() => handleRoleSelect(role.id, role.name)}
                className={`relative cursor-pointer transition-all duration-300 ${
                  selectedRole === role.id
                    ? 'scale-105 border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg'
                }`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`rounded-lg bg-gradient-to-br p-3 ${colorClass} flex items-center justify-center text-white`}
                    >
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t(`roles.${role.name}`)}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{t(`roleDescriptions.${role.name}`)}</p>
                </CardContent>
              </Card>
            );
          })}

          {/* Admin Role with Password Protection */}
          {adminRole && (
            <Card
              onClick={() => handleRoleSelect(adminRole.id, adminRole.name)}
              className={`relative cursor-pointer transition-all duration-300 ${
                selectedRole === adminRole.id
                  ? 'scale-105 border-red-500 bg-red-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:-translate-y-1 hover:border-red-300 hover:shadow-lg'
              }`}
            >
              <div className="absolute top-3 right-3">
                <Lock className="h-5 w-5 text-red-600" />
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600 p-3 text-white">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t(`roles.${adminRole.name}`)}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{t(`roleDescriptions.${adminRole.name}`)}</p>
                <p className="mt-2 text-xs font-medium text-red-600">
                  {t('auth.adminPasswordRequired')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Admin Password Input */}
        {showAdminPassword && (
          <Card className="mt-6 w-full max-w-md border-red-200 bg-red-50 shadow-lg">
            <CardContent className="pt-6">
              <Label htmlFor="admin-password" className="text-base font-medium text-red-800">
                {t('auth.adminPasswordRequired')}
              </Label>
              <div className="relative mt-3">
                <Lock className="absolute top-3.5 left-3 h-5 w-5 text-red-500" />
                <Input
                  id="admin-password"
                  type={showPasswordText ? 'text' : 'password'}
                  placeholder={t('auth.adminPasswordPlaceholder')}
                  value={adminPassword}
                  onChange={handlePasswordChange}
                  className="h-12 border-red-300 bg-white pr-12 pl-11 focus:border-red-500 focus:ring-red-500"
                />
                <button
                  type="button"
                  onClick={handleTogglePasswordVisibility}
                  className="absolute top-3.5 right-3 text-red-500 transition-colors hover:text-red-700"
                  aria-label={showPasswordText ? 'Hide password' : 'Show password'}
                >
                  {showPasswordText ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-3 text-sm text-red-600">{t('auth.contactAdminForPassword')}</p>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="mt-8 w-full max-w-md">
          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || isSubmitting || (showAdminPassword && !adminPassword)}
            className="h-14 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-lg font-semibold shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>{t('auth.settingUpAccount')}</span>
              </div>
            ) : (
              t('auth.continueToDashboard')
            )}
          </Button>
        </div>

        {/* Hotel Info Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Hotel Porec • 52440 Poreč, Croatia • +385(0)52/451 611</p>
          <p>hotelporec@pu.t-com.hr • www.hotelporec.com</p>
        </div>
      </div>
    </div>
  );
}
