import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { supabase } from '@/lib/supabase'
import AddLocationDialog from './AddLocationDialog'
import { useTranslation } from 'react-i18next'
import { 
  MapPin, 
  Refrigerator, 
  Warehouse, 
  Package, 
  AlertTriangle,
  Clock,
  Plus
} from 'lucide-react'

interface Location {
  id: number
  name: string
  type: string
  description: string | null
  is_refrigerated: boolean
  inventory_count: number
  low_stock_count: number
  expiring_count: number
  total_items: number
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    fetchLocations()
  }, []) // Empty dependency array to run only once

  const fetchLocations = async () => {
    try {
      // First get all locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('*')
        .order('name')

      if (locationsError) throw locationsError

      // Get all inventory data in one query with proper joins
      // Use left join instead of inner join to handle empty tables
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select(`
          location_id,
          quantity,
          expiration_date,
          item:items(minimum_stock)
        `)

      // Don't throw error if inventory is empty, just use empty array
      if (inventoryError && inventoryError.code !== 'PGRST116') {
        throw inventoryError
      }

      // Calculate stats for each location
      const locationsWithStats = (locationsData || []).map(location => {
        const locationInventory = inventoryData?.filter(inv => inv.location_id === location.id) || []
        
        const totalItems = locationInventory.reduce((sum, item) => sum + item.quantity, 0)
        const inventoryCount = locationInventory.length
        
        // Calculate low stock
        const lowStockCount = locationInventory.filter(item => 
          item.item && item.quantity <= (item.item as any).minimum_stock
        ).length

        // Calculate expiring items (within 7 days)
        const sevenDaysFromNow = new Date()
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
        
        const expiringCount = locationInventory.filter(item => {
          if (!item.expiration_date) return false
          const expDate = new Date(item.expiration_date)
          return expDate <= sevenDaysFromNow && expDate >= new Date()
        }).length

        return {
          ...location,
          inventory_count: inventoryCount,
          low_stock_count: lowStockCount,
          expiring_count: expiringCount,
          total_items: totalItems
        }
      })

      setLocations(locationsWithStats)
    } catch (error) {
      console.error('Error fetching locations:', error)
      // Still show something even if there's an error
      setLocations([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t('locations.title')}</h1>
          <p className="text-gray-600 text-sm lg:text-base">{t('locations.subtitle')}</p>
        </div>
        <Button className="mt-3 lg:mt-0" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('locations.addLocation')}
        </Button>
      </div>

      {/* Refrigerated Locations */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Refrigerator className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">{t('locations.refrigeratedStorage')}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {locations.filter(location => location.is_refrigerated).map((location) => (
            <Link key={location.id} to={`/locations/${location.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-blue-900 flex items-center space-x-2">
                      <Refrigerator className="h-5 w-5 text-blue-600" />
                      <span>{location.name}</span>
                    </CardTitle>
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                      {location.type}
                    </span>
                  </div>
                  {location.description && (
                    <CardDescription className="text-blue-700">
                      {location.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-900">{location.total_items}</div>
                      <div className="text-sm text-blue-600">{t('locations.totalItems')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-900">{location.inventory_count}</div>
                      <div className="text-sm text-blue-600">{t('locations.differentItems')}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {location.low_stock_count > 0 && (
                        <div className="flex items-center space-x-1 text-orange-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">{location.low_stock_count}</span>
                        </div>
                      )}
                      {location.expiring_count > 0 && (
                        <div className="flex items-center space-x-1 text-red-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">{location.expiring_count}</span>
                        </div>
                      )}
                    </div>
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Regular Storage Locations */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Warehouse className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">{t('locations.regularStorage')}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {locations.filter(location => !location.is_refrigerated).map((location) => (
            <Link key={location.id} to={`/locations/${location.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-gray-100 bg-gradient-to-br from-gray-50 to-gray-100">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <Warehouse className="h-5 w-5 text-gray-600" />
                      <span>{location.name}</span>
                    </CardTitle>
                    <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full">
                      {location.type}
                    </span>
                  </div>
                  {location.description && (
                    <CardDescription className="text-gray-700">
                      {location.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{location.total_items}</div>
                      <div className="text-sm text-gray-600">{t('locations.totalItems')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{location.inventory_count}</div>
                      <div className="text-sm text-gray-600">{t('locations.differentItems')}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {location.low_stock_count > 0 && (
                        <div className="flex items-center space-x-1 text-orange-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">{location.low_stock_count}</span>
                        </div>
                      )}
                      {location.expiring_count > 0 && (
                        <div className="flex items-center space-x-1 text-red-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">{location.expiring_count}</span>
                        </div>
                      )}
                    </div>
                    <Package className="h-5 w-5 text-gray-600" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Add Location Dialog */}
      <AddLocationDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onLocationAdded={fetchLocations}
      />
    </div>
  )
}