import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  togglePushNotifications,
  isPushNotificationSupported,
  sendLocalNotification,
  createExpirationNotification,
} from '@/lib/pushNotifications';
import { Bell, BellOff, Settings, TestTube } from 'lucide-react';

interface NotificationSettings {
  pushNotificationsEnabled: boolean;
  pushSubscription: string | null;
}

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>({
    pushNotificationsEnabled: false,
    pushSubscription: null,
  });
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [supportsPush, setSupportsPush] = useState(false);

  useEffect(() => {
    setSupportsPush(isPushNotificationSupported());
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSettings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('push_notifications_enabled, push_subscription')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error loading settings:', error);
        toast.error(t('settings.error'), { description: t('settings.loadError') });
      } else {
        setSettings({
          pushNotificationsEnabled: data?.push_notifications_enabled || false,
          pushSubscription: data?.push_subscription || null,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!user) return;

    setIsToggling(true);
    try {
      const newEnabled = !settings.pushNotificationsEnabled;

      const success = await togglePushNotifications(user.id, newEnabled);

      if (success || !newEnabled) {
        setSettings((prev) => ({
          ...prev,
          pushNotificationsEnabled: newEnabled,
        }));

        toast.success(t('settings.success'), {
          description: newEnabled
            ? t('settings.notificationsEnabled')
            : t('settings.notificationsDisabled'),
        });

        // Settings updated successfully
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      toast.error(t('settings.error'), {
        description: error instanceof Error ? error.message : t('settings.toggleError'),
      });
    } finally {
      setIsToggling(false);
    }
  };

  const handleTestNotification = () => {
    const testNotification = createExpirationNotification('Test Item', 'Test Location', 3, 5);

    sendLocalNotification(testNotification);

    toast.success(t('settings.testSent'), { description: t('settings.testSentDescription') });
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
          <Settings className="h-8 w-8" />
          {t('settings.title')}
        </h1>
        <p className="mt-2 text-gray-600">{t('settings.description')}</p>
      </div>

      {/* Notification Settings Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('settings.notifications.title')}
          </CardTitle>
          <CardDescription>{t('settings.notifications.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!supportsPush && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-center gap-2">
                <BellOff className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  {t('settings.notifications.notSupported')}
                </span>
              </div>
              <p className="mt-2 text-sm text-yellow-700">
                {t('settings.notifications.notSupportedDescription')}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">
                {t('settings.notifications.pushNotifications')}
              </Label>
              <p className="text-sm text-gray-600">{t('settings.notifications.pushDescription')}</p>
            </div>
            <Button
              variant={settings.pushNotificationsEnabled ? 'default' : 'outline'}
              onClick={handleToggleNotifications}
              disabled={isToggling || !supportsPush}
              className="min-w-[100px]"
            >
              {isToggling ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : settings.pushNotificationsEnabled ? (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  {t('settings.enabled')}
                </>
              ) : (
                <>
                  <BellOff className="mr-2 h-4 w-4" />
                  {t('settings.disabled')}
                </>
              )}
            </Button>
          </div>

          {settings.pushNotificationsEnabled && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">
                  {t('settings.notifications.active')}
                </span>
              </div>
              <p className="mt-2 text-sm text-green-700">
                {t('settings.notifications.activeDescription')}
              </p>
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestNotification}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  <TestTube className="mr-2 h-4 w-4" />
                  {t('settings.notifications.testNotification')}
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-2 font-medium text-blue-900">
              {t('settings.notifications.schedule.title')}
            </h4>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                <span>{t('settings.notifications.schedule.thirtyDays')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                <span>{t('settings.notifications.schedule.sevenDays')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-600"></div>
                <span>{t('settings.notifications.schedule.oneDay')}</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-blue-700">
              {t('settings.notifications.schedule.description')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Additional Settings Card (Future expansion) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.general.title')}</CardTitle>
          <CardDescription>{t('settings.general.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{t('settings.general.comingSoon')}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
