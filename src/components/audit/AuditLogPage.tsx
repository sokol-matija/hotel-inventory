import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useTranslation } from 'react-i18next'
import { formatDateTimeForDisplay } from '@/lib/dateUtils'
import { 
  History,
  Search,
  User,
  PlusCircle,
  Edit,
  Trash2,
  TrendingUp,
  Calendar
} from 'lucide-react'

interface AuditLogEntry {
  id: number
  user_id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'QUANTITY_UPDATE'
  table_name: string
  record_id: number | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  description: string | null
  created_at: string
  user_profile?: {
    role: {
      name: string
    }
  }
}

const actionIcons = {
  CREATE: PlusCircle,
  UPDATE: Edit,
  DELETE: Trash2,
  QUANTITY_UPDATE: TrendingUp,
}

const actionColors = {
  CREATE: 'text-green-600 bg-green-50',
  UPDATE: 'text-blue-600 bg-blue-50',
  DELETE: 'text-red-600 bg-red-50',
  QUANTITY_UPDATE: 'text-orange-600 bg-orange-50',
}

const tableDisplayNames = {
  items: 'Items',
  inventory: 'Inventory',
  locations: 'Locations',
  categories: 'Categories',
}

export default function AuditLogPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [selectedTable, setSelectedTable] = useState<string>('all')
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  useEffect(() => {
    let filtered = logs.filter(log => {
      const matchesSearch = 
        (log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.table_name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesAction = selectedAction === 'all' || log.action === selectedAction
      const matchesTable = selectedTable === 'all' || log.table_name === selectedTable
      
      // Date range filtering
      let matchesDate = true
      if (selectedDateRange !== 'all') {
        const logDate = new Date(log.created_at)
        const now = new Date()
        
        switch (selectedDateRange) {
          case 'today':
            matchesDate = logDate.toDateString() === now.toDateString()
            break
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            matchesDate = logDate >= weekAgo
            break
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            matchesDate = logDate >= monthAgo
            break
        }
      }
      
      return matchesSearch && matchesAction && matchesTable && matchesDate
    })
    
    setFilteredLogs(filtered)
  }, [logs, searchTerm, selectedAction, selectedTable, selectedDateRange])

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user_profile:user_profiles!user_profiles_user_id_fkey(
            role:user_roles(name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Use optimized date formatting utility
  const formatDateTime = (dateString: string) => {
    return formatDateTimeForDisplay(dateString)
  }

  const getActionDisplayName = (action: string) => {
    switch (action) {
      case 'CREATE': return t('audit.actions.create')
      case 'UPDATE': return t('audit.actions.update')
      case 'DELETE': return t('audit.actions.delete')
      case 'QUANTITY_UPDATE': return t('audit.actions.quantityUpdate')
      default: return action
    }
  }

  const renderValueChange = (oldValues: any, newValues: any) => {
    if (!oldValues && !newValues) return null
    
    if (newValues && !oldValues) {
      // Creation - show new values
      return (
        <div className="mt-2 p-2 bg-green-50 rounded text-sm">
          <p className="font-medium text-green-800 mb-1">{t('audit.newValues')}:</p>
          {Object.entries(newValues).map(([key, value]) => (
            <div key={key} className="text-green-700">
              <span className="font-medium">{key}:</span> {JSON.stringify(value)}
            </div>
          ))}
        </div>
      )
    }

    if (oldValues && !newValues) {
      // Deletion - show old values
      return (
        <div className="mt-2 p-2 bg-red-50 rounded text-sm">
          <p className="font-medium text-red-800 mb-1">{t('audit.deletedValues')}:</p>
          {Object.entries(oldValues).map(([key, value]) => (
            <div key={key} className="text-red-700">
              <span className="font-medium">{key}:</span> {JSON.stringify(value)}
            </div>
          ))}
        </div>
      )
    }

    if (oldValues && newValues) {
      // Update - show changes
      const changes = Object.keys({ ...oldValues, ...newValues }).filter(
        key => JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
      )

      if (changes.length === 0) return null

      return (
        <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
          <p className="font-medium text-blue-800 mb-1">{t('audit.changes')}:</p>
          {changes.map(key => (
            <div key={key} className="text-blue-700">
              <span className="font-medium">{key}:</span>{' '}
              <span className="line-through text-gray-500">{JSON.stringify(oldValues[key])}</span>{' '}
              → <span className="text-blue-800">{JSON.stringify(newValues[key])}</span>
            </div>
          ))}
        </div>
      )
    }

    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Allow all authenticated users access
  if (!user) {
    return (
      <div className="text-center py-8">
        <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">
          {t('audit.accessDenied')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('audit.title')}</h1>
          <p className="text-gray-600">{t('audit.subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>{t('audit.allActivities')} ({filteredLogs.length} of {logs.length} entries)</span>
          </CardTitle>
          <CardDescription>
            {t('audit.allActivitiesDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('audit.searchLogs')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t('audit.actions.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('audit.actions.all')}</SelectItem>
                  <SelectItem value="CREATE">{t('audit.actions.create')}</SelectItem>
                  <SelectItem value="UPDATE">{t('audit.actions.update')}</SelectItem>
                  <SelectItem value="DELETE">{t('audit.actions.delete')}</SelectItem>
                  <SelectItem value="QUANTITY_UPDATE">{t('audit.actions.quantityUpdate')}</SelectItem>
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
            {filteredLogs.map((log) => {
              const ActionIcon = actionIcons[log.action] || History
              const actionColor = actionColors[log.action] || 'text-gray-600 bg-gray-50'
              const { date, time } = formatDateTime(log.created_at)
              
              return (
                <div key={log.id} className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-lg ${actionColor}`}>
                        <ActionIcon className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900">
                            {getActionDisplayName(log.action)}
                          </h4>
                          <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                            {tableDisplayNames[log.table_name as keyof typeof tableDisplayNames] || log.table_name}
                          </span>
                          {log.record_id && (
                            <span className="text-sm text-gray-500">
                              ID: {log.record_id}
                            </span>
                          )}
                        </div>
                        
                        {log.description && (
                          <p className="text-gray-700 mb-2">{log.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>
                              {log.user_profile?.role?.name?.replace('_', ' ') || 'Unknown'} User
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{date} at {time}</span>
                          </div>
                        </div>

                        {renderValueChange(log.old_values, log.new_values)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm || selectedAction !== 'all' || selectedTable !== 'all' || selectedDateRange !== 'all' ? 
                  t('audit.noLogsMatchingFilters') : 
                  t('audit.noLogsFound')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}