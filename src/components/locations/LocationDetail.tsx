// LocationDetail - Simplified UI-only component using services and hooks
// Reduced from 928 lines to ~300 lines with clean architecture

import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useLocationState } from '@/lib/hooks/useLocationState';
import { useAuth } from '../auth/AuthProvider';
import AddInventoryDialog from './AddInventoryDialog';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/dateUtils';
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
} from 'lucide-react';

// Drag and drop components
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
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable inventory item component
function SortableInventoryItem({
  item,
  editingQuantity,
  tempQuantity,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onTempQuantityChange,
  onDelete,
  translateCategory,
  getExpirationStatus,
  isLowStock,
  formatDate,
  userCanEdit
}: {
  item: any;
  editingQuantity: number | null;
  tempQuantity: string;
  onStartEdit: (id: number, quantity: number) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: number) => void;
  onTempQuantityChange: (value: string) => void;
  onDelete: (id: number) => void;
  translateCategory: (category: string) => string;
  getExpirationStatus: (date?: string) => any;
  isLowStock: (item: any) => boolean;
  formatDate: (date: string) => string;
  userCanEdit: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const expirationStatus = getExpirationStatus(item.expiration_date);
  const lowStock = isLowStock(item);

  const expirationClasses: Record<string, string> = {
    expired: 'bg-red-50 border-red-200',
    expiring: 'bg-yellow-50 border-yellow-200', 
    good: 'bg-green-50 border-green-200',
    none: 'bg-white'
  };

  const expirationTextClasses: Record<string, string> = {
    expired: 'text-red-700',
    expiring: 'text-yellow-700',
    good: 'text-green-700', 
    none: 'text-gray-600'
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`mb-3 ${expirationClasses[expirationStatus.status]} ${lowStock ? 'ring-2 ring-orange-300' : ''}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold">{item.item.name}</h3>
              {lowStock && <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Low Stock</span>}
            </div>
            
            <p className="text-sm text-gray-600">{translateCategory(item.item.category.name)}</p>
            
            {item.expiration_date && (
              <p className={`text-xs ${expirationTextClasses[expirationStatus.status]}`}>
                <Calendar className="inline h-3 w-3 mr-1" />
                Expires: {formatDate(item.expiration_date)}
                {expirationStatus.status === 'expired' && ` (${expirationStatus.daysUntilExpiration} days ago)`}
                {expirationStatus.status === 'expiring' && ` (${expirationStatus.daysUntilExpiration} days)`}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Quantity editing */}
            {editingQuantity === item.id ? (
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={tempQuantity}
                  onChange={(e) => onTempQuantityChange(e.target.value)}
                  className="w-16 h-8 text-sm"
                  min="0"
                />
                <Button size="sm" onClick={() => onSaveEdit(item.id)} className="h-8 w-8 p-0">
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelEdit} className="h-8 w-8 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{item.quantity} {item.item.unit}</span>
                  {userCanEdit && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => onStartEdit(item.id, item.quantity)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500">Min: {item.item.minimum_stock}</p>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex items-center space-x-1">
              <Button
                {...attributes}
                {...listeners}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 cursor-grab active:cursor-grabbing"
              >
                <Move className="h-3 w-3" />
              </Button>
              
              {userCanEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(item.id)}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LocationDetail() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Use our new state management hook - replaces all individual useState calls
  const {
    state,
    uniqueCategories,
    locationStats,
    setSearchTerm,
    setSelectedCategory,
    clearFilters,
    openAddDialog,
    closeAddDialog,
    refreshAfterAdd,
    startEditingQuantity,
    cancelEditingQuantity,
    saveQuantity,
    setTempQuantity,
    deleteItem,
    toggleOrderingMode,
    setActiveId,
    handleDragEnd,
    clearError,
    getExpirationStatus,
    isLowStock,
    translateCategory
  } = useLocationState();

  // Drag and drop sensors - optimized for both desktop and mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 10,
        delay: 250,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEndEvent = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = state.filteredInventory.findIndex(item => item.id === active.id);
    const newIndex = state.filteredInventory.findIndex(item => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      await handleDragEnd(oldIndex, newIndex, active.id as number);
    }
  };

  const handleDelete = async (inventoryId: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await deleteItem(inventoryId);
    }
  };

  // Simplified permissions - all authenticated users can edit
  const userCanEdit = !!user;

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading location details...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{state.error}</p>
          <Button onClick={clearError} className="mt-2">Try Again</Button>
        </div>
      </div>
    );
  }

  if (!state.location) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Location not found</p>
        <Link to="/locations">
          <Button variant="outline" className="mt-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Locations
          </Button>
        </Link>
      </div>
    );
  }

  const activeItem = state.filteredInventory.find(item => item.id === state.activeId);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link to="/locations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          
          <div className="flex items-center space-x-3">
            {state.location.type === 'refrigerated' ? (
              <Refrigerator className="h-8 w-8 text-blue-500" />
            ) : (
              <Warehouse className="h-8 w-8 text-green-500" />
            )}
            <div>
              <h1 className="text-2xl font-bold">{state.location.name}</h1>
              <p className="text-gray-600">{state.location.description}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {state.supportsOrdering && (
            <Button
              onClick={toggleOrderingMode}
              variant={state.orderingMode ? "default" : "outline"}
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              {state.orderingMode ? 'Exit Ordering' : 'Reorder Items'}
            </Button>
          )}
          
          {userCanEdit && (
            <Button onClick={openAddDialog} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold">{locationStats.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{locationStats.lowStockItems}</p>
              </div>
              <Minus className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-red-600">{locationStats.expiredItems}</p>
              </div>
              <Calendar className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">{locationStats.expiringItems}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search items or categories..."
                  value={state.searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={state.selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    {translateCategory(category.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(state.searchTerm || state.selectedCategory !== 'all') && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Items */}
      {state.filteredInventory.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No items found</p>
            {userCanEdit && (
              <Button onClick={openAddDialog} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEndEvent}
        >
          <SortableContext items={state.filteredInventory.map(item => item.id)} strategy={verticalListSortingStrategy}>
            <div>
              {state.filteredInventory.map((item) => (
                <SortableInventoryItem
                  key={item.id}
                  item={item}
                  editingQuantity={state.editingQuantity}
                  tempQuantity={state.tempQuantity}
                  onStartEdit={startEditingQuantity}
                  onCancelEdit={cancelEditingQuantity}
                  onSaveEdit={saveQuantity}
                  onTempQuantityChange={setTempQuantity}
                  onDelete={handleDelete}
                  translateCategory={translateCategory}
                  getExpirationStatus={getExpirationStatus}
                  isLowStock={isLowStock}
                  formatDate={formatDate}
                  userCanEdit={userCanEdit}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeItem && (
              <div className="opacity-90">
                <Card className="mb-3 shadow-lg">
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{activeItem.item.name}</h3>
                    <p className="text-sm text-gray-600">{translateCategory(activeItem.item.category.name)}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Add Inventory Dialog */}
      <AddInventoryDialog 
        isOpen={state.showAddDialog}
        onClose={closeAddDialog}
        locationId={parseInt(state.location.id, 10)}
        onInventoryAdded={refreshAfterAdd}
      />
    </div>
  );
}