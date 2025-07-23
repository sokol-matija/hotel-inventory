import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useTranslation } from 'react-i18next'
import { 
  Settings,
  Edit,
  Save,
  X,
  Refrigerator,
  Warehouse
} from 'lucide-react'

interface Location {
  id: number
  name: string
  type: string
  description: string | null
  is_refrigerated: boolean
  created_at: string
}

export default function LocationManagement() {
  const { userProfile } = useAuth()
  const { t } = useTranslation()
  const [locations, setLocations] = useState<Location[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('type', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (location: Location) => {
    setEditingId(location.id)
    setEditName(location.name)
    setEditDescription(location.description || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditDescription('')
  }

  const saveEdit = async (id: number) => {
    try {
      const { error } = await supabase
        .from('locations')
        .update({
          name: editName,
          description: editDescription
        })
        .eq('id', id)

      if (error) throw error
      
      await fetchLocations()
      setEditingId(null)
      setEditName('')
      setEditDescription('')
    } catch (error) {
      console.error('Error updating location:', error)
    }
  }

  // Only allow admin users to access this
  if (userProfile?.role.name !== 'admin') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Access denied. Admin privileges required.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const refrigeratedLocations = locations.filter(loc => loc.is_refrigerated)
  const regularLocations = locations.filter(loc => !loc.is_refrigerated)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Location Management</h1>
        <p className="text-gray-600">Manage and rename storage locations</p>
      </div>

      {/* Refrigerated Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Refrigerator className="h-5 w-5 text-blue-600" />
            <span>Refrigerated Storage ({refrigeratedLocations.length})</span>
          </CardTitle>
          <CardDescription>
            Fridges and freezers that require temperature control
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {refrigeratedLocations.map((location) => (
              <div key={location.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex-1">
                  {editingId === location.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`name-${location.id}`}>Name</Label>
                        <Input
                          id={`name-${location.id}`}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`desc-${location.id}`}>Description</Label>
                        <Input
                          id={`desc-${location.id}`}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="mt-1"
                          placeholder="Optional description"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-medium text-gray-900">{location.name}</h3>
                      <p className="text-sm text-gray-600">
                        {location.description || 'No description'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Type: {location.type} • Created: {new Date(location.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {editingId === location.id ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => saveEdit(location.id)}
                        disabled={!editName.trim()}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(location)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regular Storage Locations */}
      {regularLocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Warehouse className="h-5 w-5 text-gray-600" />
              <span>Regular Storage ({regularLocations.length})</span>
            </CardTitle>
            <CardDescription>
              Non-refrigerated storage locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regularLocations.map((location) => (
                <div key={location.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    {editingId === location.id ? (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`name-${location.id}`}>Name</Label>
                          <Input
                            id={`name-${location.id}`}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`desc-${location.id}`}>Description</Label>
                          <Input
                            id={`desc-${location.id}`}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="mt-1"
                            placeholder="Optional description"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-medium text-gray-900">{location.name}</h3>
                        <p className="text-sm text-gray-600">
                          {location.description || 'No description'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Type: {location.type} • Created: {new Date(location.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {editingId === location.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => saveEdit(location.id)}
                          disabled={!editName.trim()}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(location)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}