import { Link } from '@tanstack/react-router';
import { Button } from '../../ui/button';
import { Location } from '@/lib/services/LocationService';
import { ArrowLeft, Refrigerator, Warehouse, Plus, Settings } from 'lucide-react';

interface LocationHeaderProps {
  location: Location;
  supportsOrdering: boolean;
  orderingMode: boolean;
  userCanEdit: boolean;
  onToggleOrdering: () => void;
  onAddItem: () => void;
}

export function LocationHeader({
  location,
  supportsOrdering,
  orderingMode,
  userCanEdit,
  onToggleOrdering,
  onAddItem,
}: LocationHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Link to="/locations">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="flex items-center space-x-3">
          {location.type === 'refrigerated' ? (
            <Refrigerator className="h-8 w-8 text-blue-500" />
          ) : (
            <Warehouse className="h-8 w-8 text-green-500" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{location.name}</h1>
            <p className="text-gray-600">{location.description}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {supportsOrdering && (
          <Button
            onClick={onToggleOrdering}
            variant={orderingMode ? 'default' : 'outline'}
            size="sm"
          >
            <Settings className="mr-2 h-4 w-4" />
            {orderingMode ? 'Exit Ordering' : 'Reorder Items'}
          </Button>
        )}

        {userCanEdit && (
          <Button onClick={onAddItem} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>
    </div>
  );
}
