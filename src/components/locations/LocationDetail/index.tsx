import { Link } from '@tanstack/react-router';
import { Button } from '../../ui/button';
import { useLocationState } from '@/lib/hooks/useLocationState';
import { useAuth } from '@/stores/authStore';
import AddInventoryDialog from '../AddInventoryDialog';
import { ArrowLeft, Package } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { LocationHeader } from './LocationHeader';
import { LocationStatsCards } from './LocationStatsCards';
import { LocationFilterBar } from './LocationFilterBar';
import { InventoryList } from './InventoryList';

export default function LocationDetail() {
  const { user } = useAuth();

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
    translateCategory,
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

    const oldIndex = state.filteredInventory.findIndex((item) => item.id === active.id);
    const newIndex = state.filteredInventory.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      await handleDragEnd(oldIndex, newIndex, active.id as number);
    }
  };

  const handleDelete = async (inventoryId: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await deleteItem(inventoryId);
    }
  };

  const userCanEdit = !!user;

  if (state.loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-gray-500">Loading location details...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-700">{state.error}</p>
          <Button onClick={clearError} className="mt-2">
            Try Again
          </Button>
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
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Locations
          </Button>
        </Link>
      </div>
    );
  }

  const activeItem = state.filteredInventory.find((item) => item.id === state.activeId);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <LocationHeader
        location={state.location}
        supportsOrdering={state.supportsOrdering}
        orderingMode={state.orderingMode}
        userCanEdit={userCanEdit}
        onToggleOrdering={toggleOrderingMode}
        onAddItem={openAddDialog}
      />

      <LocationStatsCards
        totalItems={locationStats.totalItems}
        lowStockItems={locationStats.lowStockItems}
        expiredItems={locationStats.expiredItems}
        expiringItems={locationStats.expiringItems}
      />

      <LocationFilterBar
        searchTerm={state.searchTerm}
        selectedCategory={state.selectedCategory}
        uniqueCategories={uniqueCategories}
        onSearchChange={setSearchTerm}
        onCategoryChange={setSelectedCategory}
        onClearFilters={clearFilters}
        translateCategory={translateCategory}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEndEvent}
      >
        <InventoryList
          filteredInventory={state.filteredInventory}
          activeItem={activeItem}
          editingQuantity={state.editingQuantity}
          tempQuantity={state.tempQuantity}
          userCanEdit={userCanEdit}
          onStartEdit={startEditingQuantity}
          onCancelEdit={cancelEditingQuantity}
          onSaveEdit={saveQuantity}
          onTempQuantityChange={setTempQuantity}
          onDelete={handleDelete}
          onAddItem={openAddDialog}
          translateCategory={translateCategory}
          getExpirationStatus={getExpirationStatus}
          isLowStock={isLowStock}
        />
      </DndContext>

      <AddInventoryDialog
        isOpen={state.showAddDialog}
        onClose={closeAddDialog}
        locationId={parseInt(state.location.id, 10)}
        onInventoryAdded={refreshAfterAdd}
      />
    </div>
  );
}
