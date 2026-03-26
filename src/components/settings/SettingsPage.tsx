import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Settings } from 'lucide-react';

const NTFY_TOPIC = import.meta.env.VITE_NTFY_STAFF_TOPIC ?? 'hotel-porec-staff';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
          <Settings className="h-8 w-8" />
          {t('settings.title')}
        </h1>
        <p className="mt-2 text-gray-600">{t('settings.description')}</p>
      </div>

      {/* Mobile Notifications via ntfy */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('settings.notifications.title')}
          </CardTitle>
          <CardDescription>{t('settings.notifications.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-2 font-medium text-blue-900">
              {t('settings.notifications.ntfy.title', 'Mobile push notifications (ntfy)')}
            </h4>
            <p className="mb-3 text-sm text-blue-800">
              {t(
                'settings.notifications.ntfy.description',
                'Install the ntfy app and subscribe to the topic below to receive hotel alerts on your phone.'
              )}
            </p>
            <div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-2 font-mono text-sm text-blue-900">
              <span className="text-blue-400">ntfy.sh/</span>
              <span className="font-semibold">{NTFY_TOPIC}</span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h4 className="mb-2 font-medium text-gray-900">
              {t('settings.notifications.schedule.title')}
            </h4>
            <div className="space-y-2 text-sm text-gray-700">
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
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
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
