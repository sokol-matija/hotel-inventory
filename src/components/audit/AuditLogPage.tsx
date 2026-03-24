import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '../auth/AuthProvider';
import { useTranslation } from 'react-i18next';
import { formatDateTimeForDisplay } from '@/lib/dateUtils';
import {
  History,
  Search,
  User,
  PlusCircle,
  Edit,
  Trash2,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { useAuditLogs, AuditLogEntry } from '@/lib/queries/hooks/useAuditLogs';

const actionIcons = {
  CREATE: PlusCircle,
  UPDATE: Edit,
  DELETE: Trash2,
  QUANTITY_UPDATE: TrendingUp,
};

const actionColors = {
  CREATE: 'text-green-600 bg-green-50',
  UPDATE: 'text-blue-600 bg-blue-50',
  DELETE: 'text-red-600 bg-red-50',
  QUANTITY_UPDATE: 'text-orange-600 bg-orange-50',
};

const tableDisplayNames = {
  items: 'Items',
  inventory: 'Inventory',
  locations: 'Locations',
  categories: 'Categories',
};

interface ValueChangeProps {
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}

const ValueChange: React.FC<ValueChangeProps> = ({ oldValues, newValues }) => {
  if (!oldValues && !newValues) return null;

  if (newValues && !oldValues) {
    return (
      <div className="mt-2 rounded bg-green-50 p-2 text-sm">
        <p className="mb-1 font-medium text-green-800">New Values:</p>
        {Object.entries(newValues).map(([key, value]) => (
          <div key={key} className="text-green-700">
            <span className="font-medium">{key}:</span> {JSON.stringify(value)}
          </div>
        ))}
      </div>
    );
  }

  if (oldValues && !newValues) {
    return (
      <div className="mt-2 rounded bg-red-50 p-2 text-sm">
        <p className="mb-1 font-medium text-red-800">Deleted Values:</p>
        {Object.entries(oldValues).map(([key, value]) => (
          <div key={key} className="text-red-700">
            <span className="font-medium">{key}:</span> {JSON.stringify(value)}
          </div>
        ))}
      </div>
    );
  }

  if (oldValues && newValues) {
    const changes = Object.keys({ ...oldValues, ...newValues }).filter(
      (key) => JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
    );
    if (changes.length === 0) return null;
    return (
      <div className="mt-2 rounded bg-blue-50 p-2 text-sm">
        <p className="mb-1 font-medium text-blue-800">Changes:</p>
        {changes.map((key) => (
          <div key={key} className="text-blue-700">
            <span className="font-medium">{key}:</span>{' '}
            <span className="text-gray-500 line-through">{JSON.stringify(oldValues![key])}</span> →{' '}
            <span className="text-blue-800">{JSON.stringify(newValues![key])}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default function AuditLogPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');

  const { data: logs = [], isLoading } = useAuditLogs();

  const filteredLogs = useMemo(() => {
    return logs.filter((log: AuditLogEntry) => {
      const matchesSearch =
        (log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.table_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = selectedAction === 'all' || log.action === selectedAction;
      const matchesTable = selectedTable === 'all' || log.table_name === selectedTable;

      let matchesDate = true;
      if (selectedDateRange !== 'all') {
        const logDate = new Date(log.created_at ?? 0);
        const now = new Date();
        switch (selectedDateRange) {
          case 'today':
            matchesDate = logDate.toDateString() === now.toDateString();
            break;
          case 'week': {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = logDate >= weekAgo;
            break;
          }
          case 'month': {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = logDate >= monthAgo;
            break;
          }
        }
      }

      return matchesSearch && matchesAction && matchesTable && matchesDate;
    });
  }, [logs, searchTerm, selectedAction, selectedTable, selectedDateRange]);

  const getActionDisplayName = (action: string) => {
    switch (action) {
      case 'CREATE':
        return t('audit.actions.create');
      case 'UPDATE':
        return t('audit.actions.update');
      case 'DELETE':
        return t('audit.actions.delete');
      case 'QUANTITY_UPDATE':
        return t('audit.actions.quantityUpdate');
      default:
        return action;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-8 text-center">
        <History className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <p className="text-gray-600">{t('audit.accessDenied')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t('audit.title')}</h1>
          <p className="text-gray-600">{t('audit.subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>
              {t('audit.allActivities')} ({filteredLogs.length} of {logs.length} entries)
            </span>
          </CardTitle>
          <CardDescription>{t('audit.allActivitiesDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('audit.searchLogs')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t('audit.actions.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('audit.actions.all')}</SelectItem>
                  <SelectItem value="CREATE">{t('audit.actions.create')}</SelectItem>
                  <SelectItem value="UPDATE">{t('audit.actions.update')}</SelectItem>
                  <SelectItem value="DELETE">{t('audit.actions.delete')}</SelectItem>
                  <SelectItem value="QUANTITY_UPDATE">
                    {t('audit.actions.quantityUpdate')}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t('audit.tables.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('audit.tables.all')}</SelectItem>
                  <SelectItem value="items">{t('audit.tables.items')}</SelectItem>
                  <SelectItem value="inventory">{t('audit.tables.inventory')}</SelectItem>
                  <SelectItem value="locations">{t('audit.tables.locations')}</SelectItem>
                  <SelectItem value="categories">{t('audit.tables.categories')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t('audit.dateRanges.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('audit.dateRanges.all')}</SelectItem>
                  <SelectItem value="today">{t('audit.dateRanges.today')}</SelectItem>
                  <SelectItem value="week">{t('audit.dateRanges.week')}</SelectItem>
                  <SelectItem value="month">{t('audit.dateRanges.month')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredLogs.map((log: AuditLogEntry) => {
              const ActionIcon = actionIcons[log.action] || History;
              const actionColor = actionColors[log.action] || 'text-gray-600 bg-gray-50';
              const { date, time } = formatDateTimeForDisplay(log.created_at ?? '');

              return (
                <div key={log.id} className="rounded-lg border bg-gray-50 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-1 items-start space-x-3">
                      <div className={`rounded-lg p-2 ${actionColor}`}>
                        <ActionIcon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">
                            {getActionDisplayName(log.action)}
                          </h4>
                          <span className="rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-700">
                            {tableDisplayNames[log.table_name as keyof typeof tableDisplayNames] ||
                              log.table_name}
                          </span>
                          {log.record_id && (
                            <span className="text-sm text-gray-500">ID: {log.record_id}</span>
                          )}
                        </div>

                        {log.description && <p className="mb-2 text-gray-700">{log.description}</p>}

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>
                              {log.user_profile?.role?.name?.replace('_', ' ') || 'Unknown'} User
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {date} at {time}
                            </span>
                          </div>
                        </div>

                        <ValueChange oldValues={log.old_values} newValues={log.new_values} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredLogs.length === 0 && (
            <div className="py-8 text-center">
              <History className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-600">
                {searchTerm ||
                selectedAction !== 'all' ||
                selectedTable !== 'all' ||
                selectedDateRange !== 'all'
                  ? t('audit.noLogsMatchingFilters')
                  : t('audit.noLogsFound')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
