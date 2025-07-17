import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  Refrigerator,
  Warehouse,
  Plus,
  Minus
} from 'lucide-react'

interface InventoryItem {
  id: number
  quantity: number
  expiration_date: string | null
  item: {
    id: number
    name: string
    minimum_stock: number
    category: {
      name: string
      requires_expiration: boolean
    }
  }
  location: {
    id: number
    name: string
    is_refrigerated: boolean
  }
}

interface DashboardStats {
  totalItems: number
  lowStockItems: number
  expiringItems: number
  locations: number
}

export default function Dashboard() {
  const { userProfile } = useAuth()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    lowStockItems: 0,
    expiringItems: 0,
    locations: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch inventory with related data
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select(`
          *,
          item:items(
            id,
            name,
            minimum_stock,
            category:categories(name, requires_expiration)
          ),
          location:locations(id, name, is_refrigerated)
        `)
        .order('expiration_date', { ascending: true })

      if (inventoryError) throw inventoryError

      // Fetch locations count
      const { count: locationsCount, error: locationsError } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })

      if (locationsError) throw locationsError

      const inventoryItems = inventoryData || []
      const totalItems = inventoryItems.reduce((sum, item) => sum + item.quantity, 0)
      
      // Calculate low stock items
      const lowStockItems = inventoryItems.filter(item => 
        item.quantity <= item.item.minimum_stock
      ).length
      
      // Calculate expiring items (within 7 days)
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
      const expiringItems = inventoryItems.filter(item => 
        item.expiration_date && 
        new Date(item.expiration_date) <= sevenDaysFromNow &&
        new Date(item.expiration_date) >= new Date()
      ).length

      setInventory(inventoryItems)
      setStats({
        totalItems,
        lowStockItems,
        expiringItems,
        locations: locationsCount || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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
      
      // Recalculate stats
      fetchDashboardData()
    } catch (error) {
      console.error('Error updating quantity:', error)
    }
  }

  const getExpirationStatus = (expirationDate: string | null) => {
    if (!expirationDate) return 'none'
    
    const expDate = new Date(expirationDate)
    const today = new Date()
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'expired'
    if (diffDays <= 3) return 'critical'
    if (diffDays <= 7) return 'warning'
    return 'good'
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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 text-sm lg:text-base">Welcome back, {userProfile?.role.name.replace('_', ' ')}</p>
        </div>
        <div className="text-left lg:text-right mt-2 lg:mt-0">
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-blue-800">Total Items</CardTitle>
            <Package className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-blue-900">{stats.totalItems}</div>
            <p className="text-xs text-blue-600">across all locations</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-orange-800">Low Stock</CardTitle>
            <AlertTriangle className="h-3 w-3 lg:h-4 lg:w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-orange-900">{stats.lowStockItems}</div>
            <p className="text-xs text-orange-600">items need restocking</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-red-800">Expiring Soon</CardTitle>
            <Clock className="h-3 w-3 lg:h-4 lg:w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-red-900">{stats.expiringItems}</div>
            <p className="text-xs text-red-600">within 7 days</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-green-800">Locations</CardTitle>
            <Warehouse className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-green-900">{stats.locations}</div>
            <p className="text-xs text-green-600">storage locations</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Inventory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Recent Inventory</span>
          </CardTitle>
          <CardDescription>
            Latest items with quick quantity adjustments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inventory.slice(0, 10).map((item) => {
              const expirationStatus = getExpirationStatus(item.expiration_date)
              const isLowStock = item.quantity <= item.item.minimum_stock
              
              return (
                <div key={item.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 bg-gray-50 rounded-lg space-y-3 lg:space-y-0">
                  <div className="flex items-start space-x-3 lg:space-x-4">
                    <div className="flex items-center space-x-2">
                      {item.location.is_refrigerated && (
                        <Refrigerator className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{item.item.name}</p>
                        <p className="text-sm text-gray-600">
                          {item.location.name} • {item.item.category.name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1 lg:gap-2">
                      {isLowStock && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                          Low Stock
                        </span>
                      )}
                      {expirationStatus === 'critical' && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          Expires Soon
                        </span>
                      )}
                      {expirationStatus === 'warning' && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          Check Date
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between lg:justify-end lg:space-x-4">
                    <div className="text-left lg:text-right">
                      <p className="font-medium text-gray-900">Qty: {item.quantity}</p>
                      {item.expiration_date && (
                        <p className="text-sm text-gray-600">
                          Exp: {new Date(item.expiration_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    {(['admin', 'cooking'].includes(userProfile?.role.name || '')) && (
                      <div className="flex items-center space-x-2">
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
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}