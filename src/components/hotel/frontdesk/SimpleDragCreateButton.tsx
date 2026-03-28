import React from 'react';
import { Button } from '../../ui/button';
import { MousePointer2, Plus } from 'lucide-react';

interface SimpleDragCreateButtonProps {
  state: { isEnabled: boolean; isSelecting: boolean };
  onToggle: () => void;
}

const SimpleDragCreateButton: React.FC<SimpleDragCreateButtonProps> = ({ state, onToggle }) => {
  return (
    <Button
      variant={state.isEnabled ? 'default' : 'outline'}
      onClick={onToggle}
      className={`gap-2 transition-all duration-200 ${
        state.isEnabled
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700'
          : 'hover:border-blue-300 hover:bg-blue-50'
      }`}
      title={
        state.isEnabled
          ? 'Click to disable drag-create mode (Esc)'
          : 'Click PM then AM to create a reservation'
      }
    >
      {state.isEnabled ? <Plus className="h-4 w-4" /> : <MousePointer2 className="h-4 w-4" />}
      {!state.isEnabled
        ? 'Drag to Create'
        : state.isSelecting
          ? 'Click AM to set check-out'
          : 'Click PM to set check-in'}
    </Button>
  );
};

export default SimpleDragCreateButton;
