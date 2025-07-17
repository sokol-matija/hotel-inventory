import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { supabase } from '@/lib/supabase'
import { X, Package, Hash, Calendar, DollarSign, AlertCircle } from 'lucide-react'

interface Item {
  id: number
  name: string
  category: {
    name: string
    requires_expiration: boolean
  }
  unit: string
}

interface Location {
  id: number
  name: string
  is_refrigerated: boolean
}

interface AddInventoryDialogProps {
  isOpen: boolean
  onClose: () => void
  onInventoryAdded: () => void
  locationId: number
}

export default function AddInventoryDialog({ isOpen, onClose, onInventoryAdded, locationId }: AddInventoryDialogProps) {
  const [formData, setFormData] = useState({
    item_id: '',
    quantity: '1',
    expiration_date: '',
    cost_per_unit: ''
  })
  const [items, setItems] = useState<Item[]>([])
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      fetchItems()
    }
  }, [isOpen])

  useEffect(() => {
    if (formData.item_id) {
      const item = items.find(i => i.id === parseInt(formData.item_id))
      setSelectedItem(item || null)
    } else {
      setSelectedItem(null)
    }
  }, [formData.item_id, items])

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          id,
          name,
          unit,
          categories!inner(name, requires_expiration)
        `)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      
      // Transform the data to match our interface
      const transformedData = data?.map(item => ({
        ...item,
        category: (item as any).categories
      })) || []
      
      setItems(transformedData)
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.item_id) {
      newErrors.item_id = 'Item is required'
    }

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0'
    }

    if (selectedItem?.category.requires_expiration && !formData.expiration_date) {
      newErrors.expiration_date = 'Expiration date is required for this item'
    }

    if (formData.cost_per_unit && parseFloat(formData.cost_per_unit) < 0) {
      newErrors.cost_per_unit = 'Cost cannot be negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('inventory')
        .insert([
          {
            item_id: parseInt(formData.item_id),
            location_id: locationId,
            quantity: parseInt(formData.quantity),
            expiration_date: formData.expiration_date || null,
            cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : null
          }
        ])

      if (error) throw error

      // Reset form
      setFormData({
        item_id: '',
        quantity: '1',
        expiration_date: '',
        cost_per_unit: ''
      })
      setErrors({})
      setSelectedItem(null)
      
      onInventoryAdded()
      onClose()
    } catch (error) {
      console.error('Error adding inventory:', error)
      setErrors({ submit: 'Failed to add item to inventory. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <CardTitle>Add Item to Location</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Add an existing item to this location's inventory
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Item Selection */}
            <div>
              <Label htmlFor="item">Select Item *</Label>
              <select
                id="item"
                value={formData.item_id}
                onChange={(e) => handleInputChange('item_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.item_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Choose an item</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category.name})
                  </option>
                ))}
              </select>
              {errors.item_id && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.item_id}
                </p>
              )}
            </div>

            {/* Show item details if selected */}
            {selectedItem && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Unit:</strong> {selectedItem.unit}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Category:</strong> {selectedItem.category.name}
                </p>
                {selectedItem.category.requires_expiration && (
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This item requires an expiration date
                  </p>
                )}
              </div>
            )}

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  placeholder="1"
                  className={`pl-10 ${errors.quantity ? 'border-red-500' : ''}`}
                />
                {selectedItem && (
                  <span className="absolute right-3 top-3 text-sm text-gray-500">
                    {selectedItem.unit}
                  </span>
                )}
              </div>
              {errors.quantity && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.quantity}
                </p>
              )}
            </div>

            {/* Expiration Date (if required) */}
            {selectedItem?.category.requires_expiration && (
              <div>
                <Label htmlFor="expiration_date">Expiration Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="expiration_date"
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => handleInputChange('expiration_date', e.target.value)}
                    className={`pl-10 ${errors.expiration_date ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.expiration_date && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.expiration_date}
                  </p>
                )}
              </div>
            )}

            {/* Cost per Unit (optional) */}
            <div>
              <Label htmlFor="cost_per_unit">Cost per Unit (optional)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="cost_per_unit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_per_unit}
                  onChange={(e) => handleInputChange('cost_per_unit', e.target.value)}
                  placeholder="0.00"
                  className={`pl-10 ${errors.cost_per_unit ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.cost_per_unit && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.cost_per_unit}
                </p>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {errors.submit}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Adding...</span>
                  </div>
                ) : (
                  'Add to Inventory'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}