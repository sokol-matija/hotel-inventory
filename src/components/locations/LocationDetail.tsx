import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { userHasPermission } from '@/lib/permissions'
import AddInventoryDialog from './AddInventoryDialog'
import { useTranslation } from 'react-i18next'
import { formatDate } from '@/lib/dateUtils'
import { 
  ArrowLeft, 
  Refrigerator, 
  Warehouse, 
  Package, 
  Plus,
  Minus,
  Search,
  Calendar,
  DollarSign,
  Trash2
} from 'lucide-react'

interface InventoryItem {
  id: number
  quantity: number
  expiration_date: string | null
  cost_per_unit: number | null
  created_at: string
  updated_at: string
  item: {
    id: number
    name: string
    description: string | null
    unit: string
    minimum_stock: number
    category: {
      id: number
      name: string
      requires_expiration: boolean
    }
  }
}

interface Location {
  id: number
  name: string
  type: string
  description: string | null
  is_refrigerated: boolean
}

export default function LocationDetail() {
  const { id } = useParams<{ id: string }>()
  const { userProfile } = useAuth()
  const [location, setLocation] = useState<Location | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const { t } = useTranslation()

  // Helper function to translate category names
  const translateCategory = (categoryName: string) => {
    // Convert category name to lowercase for translation key
    const key = categoryName.toLowerCase().replace(/\s+/g, '')
    return t(`categories.${key}`, { defaultValue: categoryName })
  }

  useEffect(() => {
    if (id) {
      fetchLocationData()
    }
  }, [id])

  useEffect(() => {
    let filtered = inventory.filter(item =>
      item.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item.category.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.item.category.name === selectedCategory)
    }
    
    setFilteredInventory(filtered)
  }, [inventory, searchTerm, selectedCategory])

  const fetchLocationData = async () => {
    try {
      // Fetch location details
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .single()

      if (locationError) throw locationError

      // Fetch inventory for this location
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select(`
          *,
          item:items(
            id,
            name,
            description,
            unit,
            minimum_stock,
            category:categories(id, name, requires_expiration)
          )
        `)
        .eq('location_id', id)
        .order('item(name)')

      if (inventoryError) throw inventoryError

      setLocation(locationData)
      setInventory(inventoryData || [])
    } catch (error) {
      console.error('Error fetching location data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (inventoryId: number, newQuantity: number) => {
    if (newQuantity < 0) return

    try {
      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', inventoryId)

      if (error) throw error
      
      // Update local state
      setInventory(prev => prev.map(item => 
        item.id === inventoryId ? { ...item, quantity: newQuantity } : item
      ))
    } catch (error) {
      console.error('Error updating quantity:', error)
    }
  }

  const removeItem = async (inventoryId: number) => {
    if (!window.confirm(t('locations.removeItemConfirm'))) return

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', inventoryId)

      if (error) throw error
      
      // Update local state
      setInventory(prev => prev.filter(item => item.id !== inventoryId))
    } catch (error) {
      console.error('Error removing item:', error)
    }
  }

  const getExpirationStatus = (expirationDate: string | null, requiresExpiration: boolean) => {
    if (!expirationDate || !requiresExpiration) return 'none'
    
    const expDate = new Date(expirationDate)
    const today = new Date()
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'expired'
    if (diffDays <= 3) return 'critical'
    if (diffDays <= 7) return 'warning'
    return 'good'
  }

  const getExpirationBadge = (status: string) => {
    switch (status) {
      case 'expired':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">{t('locations.expired')}</span>
      case 'critical':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">{t('locations.critical')}</span>
      case 'warning':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">{t('locations.warning')}</span>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
        <span>{t('common.loading')}</span>
      </div>
    )
  }

  if (!location) {
    return (
      <div className="text-center">
        <p className="text-gray-600">{t('locations.locationNotFound')}</p>
        <Link to="/locations">
          <Button className="mt-4">{t('locations.backToLocations')}</Button>
        </Link>
      </div>
    )
  }

  const canModifyInventory = userHasPermission(userProfile, 'canModifyQuantity')
  const canAddInventory = userHasPermission(userProfile, 'canAddInventory')
  const canDeleteInventory = userHasPermission(userProfile, 'canDeleteInventory')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <Link to="/locations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
          <div className="flex items-center space-x-3 flex-1 sm:flex-initial">
            {location.is_refrigerated ? (
              <Refrigerator className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            ) : (
              <Warehouse className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 break-words">{location.name}</h1>
              <p className="text-sm sm:text-base text-gray-600">
                {t(`locationTypes.${location.type.toLowerCase()}`)} • {location.is_refrigerated ? t('locations.refrigeratedStorage') : t('locations.regularStorage')}
              </p>
            </div>
          </div>
        </div>
        {canAddInventory && (
          <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t('locations.addItem')}
          </Button>
        )}
      </div>

      {location.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-700">{location.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>{t('locations.inventory', { count: filteredInventory.length })}</span>
          </CardTitle>
          <CardDescription>
            {t('locations.inventoryDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('locations.searchItems')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('common.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.allCategories')}</SelectItem>
                  {Array.from(new Set(inventory.map(item => item.item.category.name))).map(category => (
                    <SelectItem key={category} value={category}>{translateCategory(category)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCategory !== 'all' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  {t('common.clearFilter')}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {filteredInventory.map((item) => {
              const expirationStatus = getExpirationStatus(
                item.expiration_date, 
                item.item.category.requires_expiration
              )
              const isLowStock = item.quantity <= item.item.minimum_stock
              
              return (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg space-y-3 sm:space-y-0">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <p className="font-medium text-gray-900">{item.item.name}</p>
                      {isLowStock && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                          {t('common.lowStock')}
                        </span>
                      )}
                      {getExpirationBadge(expirationStatus)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 flex-wrap">
                      <p>{translateCategory(item.item.category.name)}</p>
                      <p>{t('common.unit')}: {item.item.unit}</p>
                      <p>{t('common.min')}: {item.item.minimum_stock}</p>
                    </div>
                    {item.item.description && (
                      <p className="text-sm text-gray-500">{item.item.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end space-x-4 sm:space-x-6">
                    <div className="text-center sm:text-right">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-gray-900">{item.quantity}</span>
                        <span className="text-sm text-gray-600">{item.item.unit}</span>
                      </div>
                      {item.expiration_date && (
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(item.expiration_date)}</span>
                        </div>
                      )}
                      {item.cost_per_unit && (
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <DollarSign className="h-3 w-3" />
                          <span>{item.cost_per_unit}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {canModifyInventory && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {canDeleteInventory && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredInventory.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? t('locations.noItemsFound') : t('locations.noItemsYet')}
              </p>
              {canAddInventory && (
                <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('locations.addFirstItem')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Inventory Dialog */}
      <AddInventoryDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onInventoryAdded={fetchLocationData}
        locationId={parseInt(id!)}
      />
    </div>
  )
}