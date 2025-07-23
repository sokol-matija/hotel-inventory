import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  togglePushNotifications, 
  isPushNotificationSupported, 
  sendLocalNotification,
  createExpirationNotification 
} from '@/lib/pushNotifications';
import { Bell, BellOff, Settings, TestTube } from 'lucide-react';

interface NotificationSettings {
  pushNotificationsEnabled: boolean;
  pushSubscription: string | null;
}

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>({
    pushNotificationsEnabled: false,
    pushSubscription: null
  });
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [supportsPush, setSupportsPush] = useState(false);

  useEffect(() => {
    setSupportsPush(isPushNotificationSupported());
    loadSettings();
  }, [userProfile]);

  const loadSettings = async () => {
    if (!userProfile) {
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
        toast({
          title: t('settings.error'),
          description: t('settings.loadError'),
          variant: 'destructive'
        });
      } else {
        setSettings({
          pushNotificationsEnabled: data?.push_notifications_enabled || false,
          pushSubscription: data?.push_subscription || null
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
        setSettings(prev => ({
          ...prev,
          pushNotificationsEnabled: newEnabled
        }));

        toast({
          title: t('settings.success'),
          description: newEnabled 
            ? t('settings.notificationsEnabled') 
            : t('settings.notificationsDisabled'),
          variant: 'default'
        });

        // Refresh user profile to get updated data
        await refreshUserProfile();
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      toast({
        title: t('settings.error'),
        description: error instanceof Error ? error.message : t('settings.toggleError'),
        variant: 'destructive'
      });
    } finally {
      setIsToggling(false);
    }
  };

  const handleTestNotification = () => {
    const testNotification = createExpirationNotification(
      'Test Item',
      'Test Location', 
      3,
      5
    );

    sendLocalNotification(testNotification);
    
    toast({
      title: t('settings.testSent'),
      description: t('settings.testSentDescription'),
      variant: 'default'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-8 w-8" />
          {t('settings.title')}
        </h1>
        <p className="text-gray-600 mt-2">{t('settings.description')}</p>
      </div>

      {/* Notification Settings Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('settings.notifications.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.notifications.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!supportsPush && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <BellOff className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-800 font-medium">
                  {t('settings.notifications.notSupported')}
                </span>
              </div>
              <p className="text-yellow-700 text-sm mt-2">
                {t('settings.notifications.notSupportedDescription')}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">
                {t('settings.notifications.pushNotifications')}
              </Label>
              <p className="text-sm text-gray-600">
                {t('settings.notifications.pushDescription')}
              </p>
            </div>
            <Button
              variant={settings.pushNotificationsEnabled ? "default" : "outline"}
              onClick={handleToggleNotifications}
              disabled={isToggling || !supportsPush}
              className="min-w-[100px]"
            >
              {isToggling ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : settings.pushNotificationsEnabled ? (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  {t('settings.enabled')}
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  {t('settings.disabled')}
                </>
              )}
            </Button>
          </div>

          {settings.pushNotificationsEnabled && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  {t('settings.notifications.active')}
                </span>
              </div>
              <p className="text-green-700 text-sm mt-2">
                {t('settings.notifications.activeDescription')}
              </p>
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestNotification}
                  className="text-green-700 border-green-300 hover:bg-green-100"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {t('settings.notifications.testNotification')}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">
              {t('settings.notifications.schedule.title')}
            </h4>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span>{t('settings.notifications.schedule.thirtyDays')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>{t('settings.notifications.schedule.sevenDays')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <span>{t('settings.notifications.schedule.oneDay')}</span>
              </div>
            </div>
            <p className="text-blue-700 text-sm mt-3">
              {t('settings.notifications.schedule.description')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Additional Settings Card (Future expansion) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.general.title')}</CardTitle>
          <CardDescription>
            {t('settings.general.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm">
            {t('settings.general.comingSoon')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;