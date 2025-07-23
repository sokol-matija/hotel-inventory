import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { supabase } from '@/lib/supabase'
import AddItemDialog from './AddItemDialog'
import EditItemDialog from './EditItemDialog'
import { useTranslation } from 'react-i18next'
import { 
  Package, 
  Plus,
  Search,
  Edit,
  Trash2,
  DollarSign,
  AlertTriangle
} from 'lucide-react'

interface Item {
  id: number
  name: string
  description: string | null
  unit: string
  price: number | null
  minimum_stock: number
  is_active: boolean
  created_at: string
  category_id: number
  category: {
    id: number
    name: string
    requires_expiration: boolean
  }
  inventory_count: number
  total_quantity: number
}

interface Category {
  id: number
  name: string
  requires_expiration: boolean
}

export default function ItemsPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    let filtered = items

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category.name === selectedCategory)
    }

    setFilteredItems(filtered)
  }, [items, searchTerm, selectedCategory])

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (categoriesError) throw categoriesError

      // Fetch items with inventory counts
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select(`
          *,
          category:categories(id, name, requires_expiration)
        `)
        .eq('is_active', true)
        .order('name')

      if (itemsError) throw itemsError

      // Get inventory counts efficiently with a single query
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('item_id, quantity')
      
      // Calculate counts locally to avoid N+1 query problem
      const itemsWithCounts = (itemsData || []).map(item => {
        const itemInventory = inventoryData?.filter(inv => inv.item_id === item.id) || []
        const totalQuantity = itemInventory.reduce((sum, inv) => sum + inv.quantity, 0)
        const inventoryCount = itemInventory.length
        
        return {
          ...item,
          inventory_count: inventoryCount,
          total_quantity: totalQuantity
        }
      })

      setCategories(categoriesData || [])
      setItems(itemsWithCounts)
    } catch (error) {
      console.error('Error fetching data:', error)
      // Still set empty arrays on error
      setCategories([])
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleEditItem = (item: Item) => {
    setEditingItem(item)
    setShowEditDialog(true)
  }

  const deleteItem = async (itemId: number) => {
    if (!window.confirm(t('items.deleteConfirm'))) return

    try {
      const { error } = await supabase
        .from('items')
        .update({ is_active: false })
        .eq('id', itemId)

      if (error) throw error

      setItems(prev => prev.filter(item => item.id !== itemId))
    } catch (error) {
      console.error('Error deleting item:', error)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('items.title')}</h1>
          <p className="text-gray-600">{t('items.subtitle')}</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('items.addItem')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>{t('items.itemsCatalog', { count: filteredItems.length })}</span>
          </CardTitle>
          <CardDescription>
            {t('items.allItemsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('items.searchItems')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('items.allCategories')}</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {item.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {item.category.name}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditItem(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{item.total_quantity}</div>
                      <div className="text-sm text-gray-600">{t('items.totalStock')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{item.inventory_count}</div>
                      <div className="text-sm text-gray-600">{t('items.locations')}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('items.unit')}:</span>
                      <span className="text-sm font-medium">{item.unit}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('items.minStock')}:</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-medium">{item.minimum_stock}</span>
                        {item.total_quantity <= item.minimum_stock && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                    </div>
                    {item.price && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('items.price')}:</span>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3 text-gray-500" />
                          <span className="text-sm font-medium">{item.price}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center space-x-2">
                    {item.category.requires_expiration && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {t('items.expires')}
                      </span>
                    )}
                    {item.total_quantity <= item.minimum_stock && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                        {t('items.lowStock')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm || selectedCategory !== 'all' 
                  ? t('items.noItemsFound') 
                  : t('items.noItemsYet')}
              </p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('items.addFirstItem')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <AddItemDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onItemAdded={fetchData}
      />

      {/* Edit Item Dialog */}
      {editingItem && (
        <EditItemDialog
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false)
            setEditingItem(null)
          }}
          onItemUpdated={fetchData}
          item={editingItem}
        />
      )}
    </div>
  )
}