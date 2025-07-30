import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { supabase } from '@/lib/supabase'
import { auditLog } from '@/lib/auditLog'
import { useTranslation } from 'react-i18next'
import { X, Package, DollarSign, Hash, AlertCircle } from 'lucide-react'

interface Category {
  id: number
  name: string
  requires_expiration: boolean
}

interface AddItemDialogProps {
  isOpen: boolean
  onClose: () => void
  onItemAdded: () => void
}

export default function AddItemDialog({ isOpen, onClose, onItemAdded }: AddItemDialogProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    unit: 'pieces',
    price: '',
    minimum_stock: '0'
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('validation.nameRequired')
    }

    if (!formData.category_id) {
      newErrors.category_id = t('validation.categoryRequired')
    }

    if (!formData.unit.trim()) {
      newErrors.unit = t('validation.unitRequired')
    }

    if (formData.price && parseFloat(formData.price) < 0) {
      newErrors.price = t('validation.priceNegative')
    }

    if (parseInt(formData.minimum_stock) < 0) {
      newErrors.minimum_stock = t('validation.minStockNegative')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category_id: parseInt(formData.category_id),
        unit: formData.unit.trim(),
        price: formData.price ? parseFloat(formData.price) : null,
        minimum_stock: parseInt(formData.minimum_stock)
      }

      // Temporarily disable safeSupabaseCall to test if it's causing issues
      const { data, error } = await supabase
        .from('items')
        .insert([itemData])
        .select()
      if (error) throw error

      // Log the item creation
      if (data && data[0]) {
        await auditLog.itemCreated(data[0].id, itemData)
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        category_id: '',
        unit: 'pieces',
        price: '',
        minimum_stock: '0'
      })
      setErrors({})
      
      onItemAdded()
      onClose()
    } catch (error) {
      console.error('Error adding item:', error)
      setErrors({ submit: t('items.failedToAdd') })
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
              <CardTitle>{t('items.addNewItem')}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            {t('items.addItemDescription')}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Item Name */}
            <div>
              <Label htmlFor="name">{t('items.itemName')} *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t('items.enterItemName')}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">{t('common.description')}</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder={t('items.enterDescription')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">{t('common.category')} *</Label>
              <select
                id="category"
                value={formData.category_id}
                onChange={(e) => handleInputChange('category_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.category_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">{t('common.selectCategory')}</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.category_id}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Unit */}
              <div>
                <Label htmlFor="unit">{t('common.unit')} *</Label>
                <select
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => handleInputChange('unit', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.unit ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="pieces">{t('units.pieces')}</option>
                  <option value="kg">{t('units.kg')}</option>
                  <option value="liters">{t('units.liters')}</option>
                  <option value="grams">{t('units.grams')}</option>
                  <option value="bottles">{t('units.bottles')}</option>
                  <option value="boxes">{t('units.boxes')}</option>
                  <option value="packages">{t('units.packages')}</option>
                </select>
                {errors.unit && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.unit}
                  </p>
                )}
              </div>

              {/* Minimum Stock */}
              <div>
                <Label htmlFor="minimum_stock">{t('common.minStock')} *</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="minimum_stock"
                    type="number"
                    min="0"
                    value={formData.minimum_stock}
                    onChange={(e) => handleInputChange('minimum_stock', e.target.value)}
                    placeholder="0"
                    className={`pl-10 ${errors.minimum_stock ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.minimum_stock && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.minimum_stock}
                  </p>
                )}
              </div>
            </div>

            {/* Price */}
            <div>
              <Label htmlFor="price">{t('items.priceOptional')}</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="0.00"
                  className={`pl-10 ${errors.price ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.price && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.price}
                </p>
              )}
            </div>

            {/* Expiration Warning */}
            {formData.category_id && categories.find(c => c.id === parseInt(formData.category_id))?.requires_expiration && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-amber-800 text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 text-amber-600" />
                  {t('items.expirationWarning')}
                </p>
              </div>
            )}

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
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('common.adding')}</span>
                  </div>
                ) : (
                  t('items.addItem')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}