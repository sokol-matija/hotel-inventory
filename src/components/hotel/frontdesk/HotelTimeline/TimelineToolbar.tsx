import { Maximize2, Minimize2, Move, ArrowLeftRight, Square, RefreshCw } from 'lucide-react';
import { Button } from '../../../ui/button';
import SimpleDragCreateButton from '../SimpleDragCreateButton';
import hotelNotification from '../../../../lib/notifications';

interface TimelineToolbarProps {
  isFullscreen: boolean;
  onToggleFullscreen?: () => void;
  isUpdating: boolean;
  dragCreateState: { isEnabled: boolean; isSelecting: boolean };
  onToggleDragCreate: () => void;
  isExpansionMode: boolean;
  onToggleExpansionMode: () => void;
  isMoveMode: boolean;
  onToggleMoveMode: () => void;
  onRefresh: () => Promise<void>;
}

export function TimelineToolbar({
  isFullscreen,
  onToggleFullscreen,
  isUpdating,
  dragCreateState,
  onToggleDragCreate,
  isExpansionMode,
  onToggleExpansionMode,
  isMoveMode,
  onToggleMoveMode,
  onRefresh,
}: TimelineToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white p-4">
      <div>
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-900">Front Desk Timeline</h2>
          {isUpdating && (
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-600">Updating...</span>
            </div>
          )}
        </div>
        <p className="text-gray-600">Hotel Porec - Timeline View</p>
      </div>

      <div className="flex items-center space-x-2">
        <SimpleDragCreateButton state={dragCreateState} onToggle={onToggleDragCreate} />

        <Button
          variant={isExpansionMode ? 'default' : 'outline'}
          onClick={onToggleExpansionMode}
          className={`transition-all duration-200 ${isExpansionMode ? 'bg-green-600 text-white shadow-lg hover:bg-green-700' : 'hover:bg-green-50'}`}
          title={
            isExpansionMode ? 'Click to exit expand mode' : 'Show resize controls on reservations'
          }
        >
          {isExpansionMode ? (
            <Square className="h-4 w-4" />
          ) : (
            <ArrowLeftRight className="h-4 w-4" />
          )}
          {isExpansionMode ? 'Exit Expand Mode' : 'Expand Reservations'}
        </Button>

        <Button
          variant={isMoveMode ? 'default' : 'outline'}
          onClick={onToggleMoveMode}
          className={`transition-all duration-200 ${isMoveMode ? 'bg-purple-600 text-white shadow-lg hover:bg-purple-700' : 'hover:bg-purple-50'}`}
          title={isMoveMode ? 'Click to exit move mode' : 'Show drag handles on reservations'}
        >
          {isMoveMode ? <Square className="h-4 w-4" /> : <Move className="h-4 w-4" />}
          {isMoveMode ? 'Exit Move Mode' : 'Move Reservations'}
        </Button>

        <Button
          variant="outline"
          onClick={async () => {
            hotelNotification.info('Refreshing Data', 'Loading latest reservations...', 2);
            try {
              await onRefresh();
              hotelNotification.success(
                'Data Refreshed',
                'All reservations and rooms updated successfully',
                3
              );
            } catch {
              hotelNotification.error(
                'Refresh Failed',
                'Unable to refresh data. Please try again.',
                4
              );
            }
          }}
          disabled={isUpdating}
          title="Refresh all data from server"
        >
          <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        {onToggleFullscreen && (
          <Button variant="outline" onClick={onToggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
        )}
      </div>
    </div>
  );
}
