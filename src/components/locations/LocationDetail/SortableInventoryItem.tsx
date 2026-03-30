import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { InventoryItem } from '@/lib/services/LocationService';
import { Calendar, Trash2, Edit3, Check, X, Move } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface SortableInventoryItemProps {
  item: InventoryItem;
  editingQuantity: number | null;
  tempQuantity: string;
  onStartEdit: (id: number, quantity: number) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: number) => void;
  onTempQuantityChange: (value: string) => void;
  onDelete: (id: number) => void;
  translateCategory: (category: string) => string;
  getExpirationStatus: (date?: string) => Record<string, unknown>;
  isLowStock: (item: InventoryItem) => boolean;
  formatDate: (date: string) => string;
  userCanEdit: boolean;
}

const expirationClasses: Record<string, string> = {
  expired: 'bg-red-50 border-red-200',
  expiring: 'bg-yellow-50 border-yellow-200',
  good: 'bg-green-50 border-green-200',
  none: 'bg-white',
};

const expirationTextClasses: Record<string, string> = {
  expired: 'text-red-700',
  expiring: 'text-yellow-700',
  good: 'text-green-700',
  none: 'text-gray-600',
};

export function SortableInventoryItem({
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
  userCanEdit,
}: SortableInventoryItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const expirationStatus = getExpirationStatus(item.expiration_date);
  const lowStock = isLowStock(item);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`mb-3 ${expirationClasses[expirationStatus.status as string]} ${lowStock ? 'ring-2 ring-orange-300' : ''}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold">{item.item.name}</h3>
              {lowStock && (
                <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-800">
                  Low Stock
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600">{translateCategory(item.item.category.name)}</p>

            {item.expiration_date && (
              <p className={`text-xs ${expirationTextClasses[expirationStatus.status as string]}`}>
                <Calendar className="mr-1 inline h-3 w-3" />
                Expires: {formatDate(item.expiration_date)}
                {expirationStatus.status === 'expired' &&
                  ` (${expirationStatus.daysUntilExpiration} days ago)`}
                {expirationStatus.status === 'expiring' &&
                  ` (${expirationStatus.daysUntilExpiration} days)`}
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
                  className="h-8 w-16 text-sm"
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
                  <span className="font-medium">
                    {item.quantity} {item.item.unit}
                  </span>
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
                className="h-6 w-6 cursor-grab p-0 active:cursor-grabbing"
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
