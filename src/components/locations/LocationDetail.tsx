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
  Trash2,
  Edit3,
  Check,
  X,
  Move,
  Settings
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableInventoryItemProps {
  item: InventoryItem
  orderingMode: boolean
  canModifyInventory: boolean
  canDeleteInventory: boolean
  editingQuantity: number | null
  tempQuantity: string
  onStartQuantityEdit: (item: InventoryItem) => void
  onSaveQuantityEdit: (inventoryId: number) => void
  onCancelQuantityEdit: () => void
  onQuantityInputChange: (value: string) => void
  onQuantityKeyDown: (e: React.KeyboardEvent, inventoryId: number) => void
  onUpdateQuantity: (inventoryId: number, newQuantity: number) => void
  onRemoveItem: (inventoryId: number) => void
  getExpirationStatus: (expirationDate: string | null, requiresExpiration: boolean) => string
  getExpirationBadge: (status: string) => React.ReactNode
  translateCategory: (categoryName: string) => string
  formatDate: (date: string) => string
  t: (key: string) => string
}

function SortableInventoryItem({
  item,
  orderingMode,
  canModifyInventory,
  canDeleteInventory,
  editingQuantity,
  tempQuantity,
  onStartQuantityEdit,
  onSaveQuantityEdit,
  onCancelQuantityEdit,
  onQuantityInputChange,
  onQuantityKeyDown,
  onUpdateQuantity,
  onRemoveItem,
  getExpirationStatus,
  getExpirationBadge,
  translateCategory,
  formatDate,
  t,
}: SortableInventoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const expirationStatus = getExpirationStatus(
    item.expiration_date, 
    item.item.category.requires_expiration
  )
  const isLowStock = item.quantity <= item.item.minimum_stock

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(orderingMode ? { touchAction: 'pan-y' } : {}) // Allow vertical scrolling but prevent horizontal gestures
      }}
      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg space-y-3 sm:space-y-0 transition-all duration-200 ${
        orderingMode 
          ? 'border-2 border-dashed border-gray-300 hover:bg-gray-100 hover:shadow-md hover:border-blue-300' 
          : ''
      }`}
      title={orderingMode ? t('locations.dragToReorder') : ""}
    >
      <div className="flex-1 space-y-2">
        <div className="flex items-center space-x-2 flex-wrap">
          {orderingMode && (
            <div 
              {...attributes} 
              {...listeners}
              className="text-gray-500 flex-shrink-0 p-3 -m-2 cursor-grab active:cursor-grabbing bg-gray-100 rounded-md border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors select-none"
              style={{ 
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                minWidth: '44px', // Minimum touch target size
                minHeight: '44px', // Minimum touch target size
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Drag to reorder"
            >
              <Move className="h-6 w-6" />
            </div>
          )}
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
            {editingQuantity === item.id ? (
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  value={tempQuantity}
                  onChange={(e) => onQuantityInputChange(e.target.value)}
                  onKeyDown={(e) => onQuantityKeyDown(e, item.id)}
                  className="w-20 text-center text-xl font-bold"
                  placeholder="0"
                  autoFocus
                />
                <span className="text-sm text-gray-600">{item.item.unit}</span>
              </div>
            ) : (
              <>
                <span 
                  className="text-2xl font-bold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                  onClick={() => canModifyInventory && !orderingMode && onStartQuantityEdit(item)}
                  title={canModifyInventory && !orderingMode ? t('locations.clickToEditQuantity') : ""}
                >
                  {item.quantity}
                </span>
                <span className="text-sm text-gray-600">{item.item.unit}</span>
              </>
            )}
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
        
        {!orderingMode && (
          <div className="flex items-center space-x-2">
            {canModifyInventory && editingQuantity === item.id ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSaveQuantityEdit(item.id)}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelQuantityEdit}
                  className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : canModifyInventory ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    console.log('➖ DECREMENT BUTTON CLICKED:', {
                      itemId: item.id,
                      currentQuantity: item.quantity,
                      newQuantity: item.quantity - 1,
                      timestamp: new Date().toISOString(),
                      itemName: item.item?.name,
                      documentHidden: document.hidden,
                      windowFocused: document.hasFocus()
                    })
                    onUpdateQuantity(item.id, item.quantity - 1)
                  }}
                  disabled={item.quantity <= 0}
                  title={t('locations.decreaseQuantity')}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStartQuantityEdit(item)}
                  title={t('locations.editQuantityManually')}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    console.log('➕ INCREMENT BUTTON CLICKED:', {
                      itemId: item.id,
                      currentQuantity: item.quantity,
                      newQuantity: item.quantity + 1,
                      timestamp: new Date().toISOString(),
                      itemName: item.item?.name,
                      documentHidden: document.hidden,
                      windowFocused: document.hasFocus()
                    })
                    onUpdateQuantity(item.id, item.quantity + 1)
                  }}
                  title={t('locations.increaseQuantity')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </>
            ) : null}
            {canDeleteInventory && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRemoveItem(item.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface InventoryItem {
  id: number
  quantity: number
  expiration_date: string | null
  cost_per_unit: number | null
  display_order: number
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
  const [editingQuantity, setEditingQuantity] = useState<number | null>(null)
  const [tempQuantity, setTempQuantity] = useState('')
  const [orderingMode, setOrderingMode] = useState(false)
  const [supportsOrdering, setSupportsOrdering] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const { t } = useTranslation()

  // Drag and drop sensors - optimized for both desktop and mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require moving 8px before starting drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 10, // Require more movement to start drag
        delay: 250, // Longer delay to distinguish from scrolling
        tolerance: 8, // Higher tolerance for touch accuracy
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Helper function to translate category names
  const translateCategory = (categoryName: string) => {
    // Create a direct mapping for known categories to handle special characters
    const categoryMap: Record<string, string> = {
      'Food & Beverage': t('categories.foodbeverage', { defaultValue: 'Food & Beverage' }),
      'Cleaning': t('categories.cleaning', { defaultValue: 'Cleaning' }),
      'Supplies': t('categories.supplies', { defaultValue: 'Supplies' }),
      'Toiletries': t('categories.toiletries', { defaultValue: 'Toiletries' }),
      'Equipment': t('categories.equipment', { defaultValue: 'Equipment' }),
      'Office': t('categories.office', { defaultValue: 'Office' }),
    }
    
    // Use direct mapping first
    if (categoryMap[categoryName]) {
      return categoryMap[categoryName]
    }
    
    // Fallback: convert to key and try translation
    const key = categoryName.toLowerCase().replace(/\s+/g, '').replace(/&/g, '').replace(/[^a-z0-9]/g, '')
    const translatedValue = t(`categories.${key}`, { defaultValue: '' })
    
    // If translation found, return it; otherwise return original name
    return translatedValue || categoryName
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = filteredInventory.findIndex(item => item.id === active.id)
    const newIndex = filteredInventory.findIndex(item => item.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      // Update the main inventory state first to get correct ordering
      const updatedInventory = [...inventory]
      const oldIdx = updatedInventory.findIndex(item => item.id === active.id)
      const newIdx = updatedInventory.findIndex(item => item.id === over.id)
      
      if (oldIdx !== -1 && newIdx !== -1) {
        const newInventoryOrder = arrayMove(updatedInventory, oldIdx, newIdx)
        
        // Update display_order properties to match new positions
        const updatedInventoryWithOrder = newInventoryOrder.map((item, index) => ({
          ...item,
          display_order: index + 1
        }))
        
        // Update both states with the correct display_order values
        setInventory(updatedInventoryWithOrder)
        
        // The filteredInventory will be updated automatically by the useEffect
        // that responds to inventory changes, preserving the new order
        
        // Update display_order in database
        await updateDisplayOrders(updatedInventoryWithOrder)
      }
    }
  }


  const updateDisplayOrders = async (reorderedItems: InventoryItem[]) => {
    try {
      console.log('Updating display orders for items:', reorderedItems.map(item => ({ id: item.id, display_order: item.display_order })))
      
      // Use individual update operations instead of upsert
      for (let i = 0; i < reorderedItems.length; i++) {
        const item = reorderedItems[i]
        const newDisplayOrder = i + 1
        
        console.log(`Updating item ${item.id} to display_order ${newDisplayOrder}`)
        
        const { error } = await supabase
          .from('inventory')
          .update({ display_order: newDisplayOrder })
          .eq('id', item.id)

        if (error) {
          console.error(`Error updating item ${item.id}:`, error)
          throw error
        }
      }
      
      console.log('Successfully updated all display orders')
    } catch (error) {
      console.error('Error updating display orders:', error)
      // Show user-friendly error message
      alert('Failed to save item order. Please try again.')
    }
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
    
    // IMPORTANT: Preserve the display_order sorting after filtering
    filtered.sort((a, b) => {
      // Handle null display_order values by putting them at the end
      if (a.display_order === null && b.display_order === null) return 0
      if (a.display_order === null) return 1
      if (b.display_order === null) return -1
      return a.display_order - b.display_order
    })
    
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

      // Fetch inventory for this location ordered by display_order
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
        .order('display_order', { ascending: true, nullsFirst: false })
      
      // Enable ordering since display_order column now exists
      setSupportsOrdering(true)

      if (inventoryError) throw inventoryError

      setLocation(locationData)
      
      // Sort the inventory data by display_order to ensure correct ordering
      const sortedInventory = (inventoryData || []).sort((a, b) => {
        // Handle null display_order values by putting them at the end
        if (a.display_order === null && b.display_order === null) return 0
        if (a.display_order === null) return 1
        if (b.display_order === null) return -1
        return a.display_order - b.display_order
      })
      
      console.log('Loaded inventory with display_order:', sortedInventory.map(item => ({ 
        id: item.id, 
        display_order: item.display_order, 
        name: item.item.name 
      })))
      
      setInventory(sortedInventory)
    } catch (error) {
      console.error('Error fetching location data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (inventoryId: number, newQuantity: number) => {
    if (newQuantity < 0) return

    console.log('🔢 QUANTITY UPDATE ATTEMPT:', {
      inventoryId,
      newQuantity,
      timestamp: new Date().toISOString(),
      documentHidden: document.hidden
    })

    try {
      // Check session before attempting update
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('🔢 SESSION CHECK BEFORE UPDATE:', {
        hasSession: !!session,
        sessionUser: session?.user?.id,
        sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none',
        sessionError: sessionError?.message
      })

      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', inventoryId)

      if (error) {
        console.error('🔢 QUANTITY UPDATE ERROR:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw error
      }

      console.log('🔢 QUANTITY UPDATE SUCCESS:', { inventoryId, newQuantity })
      
      // Update local state
      setInventory(prev => prev.map(item => 
        item.id === inventoryId ? { ...item, quantity: newQuantity } : item
      ))
    } catch (error) {
      console.error('🔢 QUANTITY UPDATE FAILED:', error)
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

  const startQuantityEdit = (item: InventoryItem) => {
    // Disable ordering mode when editing quantity to avoid conflicts
    if (orderingMode) {
      setOrderingMode(false)
    }
    setEditingQuantity(item.id)
    setTempQuantity(item.quantity.toString())
  }

  const cancelQuantityEdit = () => {
    setEditingQuantity(null)
    setTempQuantity('')
  }

  const saveQuantityEdit = async (inventoryId: number) => {
    const newQuantity = parseInt(tempQuantity, 10)
    
    if (isNaN(newQuantity) || newQuantity < 0) {
      return // Invalid quantity
    }

    await updateQuantity(inventoryId, newQuantity)
    setEditingQuantity(null)
    setTempQuantity('')
  }

  const handleQuantityInputChange = (value: string) => {
    // Only allow digits
    const numericValue = value.replace(/\D/g, '')
    setTempQuantity(numericValue)
  }

  const handleQuantityKeyDown = (e: React.KeyboardEvent, inventoryId: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveQuantityEdit(inventoryId)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelQuantityEdit()
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
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full flex items-center justify-center">{t('locations.expired')}</span>
      case 'critical':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full flex items-center justify-center">{t('locations.critical')}</span>
      case 'warning':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center justify-center">{t('locations.warning')}</span>
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
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-4">
          <Link to="/locations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
          <div className="flex items-center space-x-3 flex-1">
            {location.is_refrigerated ? (
              <Refrigerator className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
            ) : (
              <Warehouse className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 break-words">{location.name}</h1>
              <p className="text-sm sm:text-base text-gray-600 break-words">
                {t(`locationTypes.${location.type.toLowerCase()}`)} • {location.is_refrigerated ? t('locations.refrigeratedStorage') : t('locations.regularStorage')}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
          {canModifyInventory && supportsOrdering && (
            <Button
              onClick={() => setOrderingMode(!orderingMode)}
              variant={orderingMode ? "default" : "outline"}
              className="w-full sm:w-auto flex-shrink-0 min-w-0"
            >
              <Settings className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">
                {orderingMode ? t('locations.finishOrdering') : t('locations.reorderItems')}
              </span>
            </Button>
          )}
          {canAddInventory && (
            <Button 
              onClick={() => setShowAddDialog(true)} 
              className="w-full sm:w-auto flex-shrink-0 min-w-0"
            >
              <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">
                {t('locations.addItem')}
              </span>
            </Button>
          )}
        </div>
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

          {orderingMode && filteredInventory.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <Move className="h-4 w-4 inline mr-1" />
                {t('locations.dragHint')}
              </p>
              <p className="text-xs text-blue-700 mt-1 sm:hidden">
                📱 On mobile: Press and hold the drag handle (⋮⋮) for a moment, then drag to reorder
              </p>
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filteredInventory.map(item => item.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {filteredInventory.map((item) => (
                  <SortableInventoryItem
                    key={item.id}
                    item={item}
                    orderingMode={orderingMode}
                    canModifyInventory={canModifyInventory}
                    canDeleteInventory={canDeleteInventory}
                    editingQuantity={editingQuantity}
                    tempQuantity={tempQuantity}
                    onStartQuantityEdit={startQuantityEdit}
                    onSaveQuantityEdit={saveQuantityEdit}
                    onCancelQuantityEdit={cancelQuantityEdit}
                    onQuantityInputChange={handleQuantityInputChange}
                    onQuantityKeyDown={handleQuantityKeyDown}
                    onUpdateQuantity={updateQuantity}
                    onRemoveItem={removeItem}
                    getExpirationStatus={getExpirationStatus}
                    getExpirationBadge={getExpirationBadge}
                    translateCategory={translateCategory}
                    formatDate={formatDate}
                    t={t}
                  />
                ))}
              </div>
            </SortableContext>
            
            <DragOverlay>
              {activeId ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-lg shadow-lg border-2 border-blue-300 space-y-3 sm:space-y-0 opacity-95">
                  <div className="flex items-center space-x-2">
                    <Move className="h-4 w-4 text-blue-500" />
                    <p className="font-medium text-gray-900">
                      {filteredInventory.find(item => item.id === activeId)?.item.name}
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredInventory.find(item => item.id === activeId)?.quantity}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

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