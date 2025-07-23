import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { MapPin, Loader2 } from 'lucide-react'

interface AddLocationDialogProps {
  isOpen: boolean
  onClose: () => void
  onLocationAdded: () => void
}

const LOCATION_TYPES = [
  'refrigerator',
  'freezer', 
  'pantry',
  'storage',
  'bar',
  'kitchen',
  'office'
]

export default function AddLocationDialog({ isOpen, onClose, onLocationAdded }: AddLocationDialogProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    is_refrigerated: false
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('locations')
        .insert([
          {
            name: formData.name,
            type: formData.type,
            description: formData.description || null,
            is_refrigerated: formData.is_refrigerated || ['refrigerator', 'freezer'].includes(formData.type)
          }
        ])

      if (error) throw error

      onLocationAdded()
      onClose()
      setFormData({ name: '', type: '', description: '', is_refrigerated: false })
    } catch (error) {
      console.error('Error adding location:', error)
      alert('Error adding location. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      type,
      is_refrigerated: ['refrigerator', 'freezer'].includes(type)
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>{t('locations.addNewLocation')}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t('locations.locationName')} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder={t('locations.enterLocationName')}
              required
            />
          </div>

          <div>
            <Label htmlFor="type">{t('locations.locationType')} *</Label>
            <Select
              value={formData.type}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('locations.selectLocationType')} />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`locationTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder={t('locations.enterLocationDescription')}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_refrigerated"
              checked={formData.is_refrigerated}
              onChange={(e) => handleChange('is_refrigerated', e.target.checked)}
              className="rounded border-gray-300"
              disabled={['refrigerator', 'freezer'].includes(formData.type)}
            />
            <Label htmlFor="is_refrigerated" className="text-sm">
              Refrigerated storage
              {['refrigerator', 'freezer'].includes(formData.type) && (
                <span className="text-gray-500 ml-1">(automatic for this type)</span>
              )}
            </Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                'Add Location'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}