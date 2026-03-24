import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/dateUtils';
import { Edit, Save, X, Refrigerator, Warehouse } from 'lucide-react';

interface Location {
  id: number;
  name: string;
  type: string;
  description: string | null;
  is_refrigerated: boolean;
  created_at: string;
}

export default function LocationManagement() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [locations, setLocations] = useState<Location[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLocations((data || []) as any);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (location: Location) => {
    setEditingId(location.id);
    setEditName(location.name);
    setEditDescription(location.description || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  const saveEdit = async (id: number) => {
    try {
      const { error } = await supabase
        .from('locations')
        .update({
          name: editName,
          description: editDescription,
        })
        .eq('id', id);

      if (error) throw error;

      await fetchLocations();
      setEditingId(null);
      setEditName('');
      setEditDescription('');
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  // Allow all authenticated users access
  if (!user) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-600">{t('admin.accessDenied')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="mr-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  const refrigeratedLocations = locations.filter((loc) => loc.is_refrigerated);
  const regularLocations = locations.filter((loc) => !loc.is_refrigerated);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {t('admin.locationManagement')}
        </h1>
        <p className="text-gray-600">{t('admin.locationManagementDescription')}</p>
      </div>

      {/* Refrigerated Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Refrigerator className="h-5 w-5 text-blue-600" />
            <span>{t('admin.refrigeratedStorage', { count: refrigeratedLocations.length })}</span>
          </CardTitle>
          <CardDescription>{t('admin.refrigeratedStorageDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {refrigeratedLocations.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between rounded-lg bg-blue-50 p-4"
              >
                <div className="flex-1">
                  {editingId === location.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`name-${location.id}`}>{t('common.name')}</Label>
                        <Input
                          id={`name-${location.id}`}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`desc-${location.id}`}>{t('common.description')}</Label>
                        <Input
                          id={`desc-${location.id}`}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="mt-1"
                          placeholder={t('admin.optionalDescription')}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-medium text-gray-900">{location.name}</h3>
                      <p className="text-sm text-gray-600">
                        {location.description || t('admin.noDescription')}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {t('common.type')}: {t(`locationTypes.${location.type.toLowerCase()}`)} •{' '}
                        {t('admin.created')}: {formatDate(location.created_at)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="ml-4 flex items-center space-x-2">
                  {editingId === location.id ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => saveEdit(location.id)}
                        disabled={!editName.trim()}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => startEdit(location)}>
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
              <span>{t('admin.regularStorage', { count: regularLocations.length })}</span>
            </CardTitle>
            <CardDescription>{t('admin.regularStorageDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regularLocations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                >
                  <div className="flex-1">
                    {editingId === location.id ? (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`name-${location.id}`}>{t('common.name')}</Label>
                          <Input
                            id={`name-${location.id}`}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`desc-${location.id}`}>{t('common.description')}</Label>
                          <Input
                            id={`desc-${location.id}`}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="mt-1"
                            placeholder={t('admin.optionalDescription')}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-medium text-gray-900">{location.name}</h3>
                        <p className="text-sm text-gray-600">
                          {location.description || t('admin.noDescription')}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {t('common.type')}: {t(`locationTypes.${location.type.toLowerCase()}`)} •{' '}
                          {t('admin.created')}: {formatDate(location.created_at)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex items-center space-x-2">
                    {editingId === location.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => saveEdit(location.id)}
                          disabled={!editName.trim()}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEdit(location)}>
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
  );
}
