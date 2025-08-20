/**
 * Simple Drag Create Button
 * 
 * A basic button for enabling/disabling drag-to-create mode
 */

import React from 'react';
import { Button } from '../../ui/button';
import { MousePointer2 } from 'lucide-react';
import { SimpleDragCreateState } from '../../../lib/hooks/useSimpleDragCreate';

interface SimpleDragCreateButtonProps {
  state: SimpleDragCreateState;
  onToggle: () => void;
}

const SimpleDragCreateButton: React.FC<SimpleDragCreateButtonProps> = ({
  state,
  onToggle
}) => {
  const getButtonText = () => {
    if (!state.isEnabled) return 'Drag to Create';
    if (state.isSelecting) return 'Select Check-out (AM)';
    if (state.currentSelection && !state.currentSelection.checkOutDate) return 'Select Check-out (AM)';
    return 'Drag Create Active';
  };

  const getButtonVariant = () => {
    return state.isEnabled ? 'default' : 'outline';
  };

  return (
    <Button
      variant={getButtonVariant()}
      onClick={onToggle}
      className="transition-all duration-200"
      title={state.isEnabled ? 'Click to disable drag-create mode' : 'Click to enable drag-create mode'}
    >
      <MousePointer2 className="h-4 w-4 mr-2" />
      {getButtonText()}
    </Button>
  );
};

export default SimpleDragCreateButton;