import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { InventoryItem } from '@/lib/services/LocationService';
import { Package, Plus } from 'lucide-react';
import { DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableInventoryItem } from './SortableInventoryItem';
import { formatDate } from '@/lib/dateUtils';

interface InventoryListProps {
  filteredInventory: InventoryItem[];
  activeItem: InventoryItem | undefined;
  editingQuantity: number | null;
  tempQuantity: string;
  userCanEdit: boolean;
  onStartEdit: (id: number, quantity: number) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: number) => void;
  onTempQuantityChange: (value: string) => void;
  onDelete: (id: number) => void;
  onAddItem: () => void;
  translateCategory: (category: string) => string;
  getExpirationStatus: (date?: string) => Record<string, unknown>;
  isLowStock: (item: InventoryItem) => boolean;
}

export function InventoryList({
  filteredInventory,
  activeItem,
  editingQuantity,
  tempQuantity,
  userCanEdit,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onTempQuantityChange,
  onDelete,
  onAddItem,
  translateCategory,
  getExpirationStatus,
  isLowStock,
}: InventoryListProps) {
  if (filteredInventory.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-gray-500">No items found</p>
          {userCanEdit && (
            <Button onClick={onAddItem} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Item
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <SortableContext
        items={filteredInventory.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div>
          {filteredInventory.map((item) => (
            <SortableInventoryItem
              key={item.id}
              item={item}
              editingQuantity={editingQuantity}
              tempQuantity={tempQuantity}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
              onTempQuantityChange={onTempQuantityChange}
              onDelete={onDelete}
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
                <p className="text-sm text-gray-600">
                  {translateCategory(activeItem.item.category.name)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </DragOverlay>
    </>
  );
}
