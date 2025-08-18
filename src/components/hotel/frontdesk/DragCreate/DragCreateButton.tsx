/**
 * DragCreateButton - Enhanced button for drag-to-create functionality
 * 
 * A modern, accessible button that integrates with the new DragCreateService
 * to provide clear visual feedback and smooth user interaction.
 * 
 * Features:
 * - Visual state indication with colors and icons
 * - Smooth transitions and hover effects
 * - Accessibility features with proper ARIA labels
 * - Integration with keyboard shortcuts
 * - Real-time validation feedback
 * 
 * @author Hotel Management System v2.8  
 * @since August 2025
 */

import React from 'react';
import { MousePointer2, Square, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { DragCreateState } from '../../../../lib/hotel/services/DragCreateService';

interface DragCreateButtonProps {
  state: DragCreateState;
  onToggle: () => void;
  className?: string;
}

const DragCreateButton: React.FC<DragCreateButtonProps> = ({
  state,
  onToggle,
  className = ''
}) => {
  // Button configuration based on current state
  const getButtonConfig = () => {
    const baseConfig = {
      variant: state.isEnabled ? 'default' as const : 'outline' as const,
      onClick: onToggle,
      className: `transition-all duration-200 ${className}`
    };

    switch (state.mode) {
      case 'idle':
        return {
          ...baseConfig,
          icon: <MousePointer2 className="h-4 w-4" />,
          text: 'Drag to Create',
          description: 'Start creating a new reservation',
          className: `${baseConfig.className} hover:bg-blue-50 hover:border-blue-300`,
          statusBadge: null,
          disabled: false
        };

      case 'selecting_checkin':
        return {
          ...baseConfig,
          icon: <MousePointer2 className="h-4 w-4 animate-pulse" />,
          text: 'Select Check-in',
          description: 'Click a PM slot to set check-in time',
          className: `${baseConfig.className} bg-blue-600 hover:bg-blue-700 text-white shadow-lg ring-2 ring-blue-200`,
          statusBadge: <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">Step 1</Badge>,
          disabled: false
        };

      case 'selecting_checkout':
        return {
          ...baseConfig,
          icon: <MousePointer2 className="h-4 w-4 animate-pulse" />,
          text: 'Select Check-out',
          description: 'Click an AM slot to set check-out time',
          className: `${baseConfig.className} bg-green-600 hover:bg-green-700 text-white shadow-lg ring-2 ring-green-200`,
          statusBadge: <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">Step 2</Badge>,
          disabled: false
        };

      case 'confirming':
        return {
          ...baseConfig,
          icon: <CheckCircle className="h-4 w-4" />,
          text: 'Ready to Create',
          description: 'Selection complete - ready to open booking form',
          className: `${baseConfig.className} bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg ring-2 ring-emerald-200`,
          statusBadge: <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-800">Ready</Badge>,
          disabled: false
        };

      case 'creating':
        return {
          ...baseConfig,
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: 'Creating...',
          description: 'Opening booking form',
          className: `${baseConfig.className} bg-blue-600 text-white shadow-lg`,
          statusBadge: null,
          disabled: true
        };

      default:
        return {
          ...baseConfig,
          icon: <Square className="h-4 w-4" />,
          text: 'Exit Drag Mode',
          description: 'Click to exit drag-create mode',
          className: `${baseConfig.className} bg-gray-600 hover:bg-gray-700 text-white shadow-lg`,
          statusBadge: null,
          disabled: false
        };
    }
  };

  const config = getButtonConfig();

  // Show error state if there are conflicts
  const hasError = state.error || (state.preview && !state.preview.isValid);
  if (hasError && state.isEnabled && state.mode !== 'creating') {
    config.icon = <AlertTriangle className="h-4 w-4" />;
    config.className = config.className.replace(/bg-\w+-\d+/, 'bg-red-600').replace(/hover:bg-\w+-\d+/, 'hover:bg-red-700');
    if (state.preview && !state.preview.isValid) {
      config.statusBadge = <Badge variant="destructive" className="ml-2">Conflict</Badge>;
    }
  }

  return (
    <div className="relative">
      <Button
        variant={config.variant}
        onClick={config.onClick}
        disabled={config.disabled}
        className={config.className}
        title={config.description}
        aria-label={`${config.text}. ${config.description}`}
        aria-pressed={state.isEnabled}
      >
        <div className="flex items-center space-x-2">
          {config.icon}
          <span className="font-medium">{config.text}</span>
          {config.statusBadge}
        </div>
      </Button>

      {/* Keyboard shortcut indicator */}
      {state.mode === 'idle' && (
        <div className="absolute -top-2 -right-2 bg-gray-700 text-white text-xs px-1.5 py-0.5 rounded-md opacity-75">
          D
        </div>
      )}

      {/* Progress indicator for active states */}
      {state.isEnabled && state.mode !== 'idle' && state.mode !== 'creating' && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 ease-out"
            style={{ 
              width: state.mode === 'selecting_checkin' 
                ? '33%' 
                : state.mode === 'selecting_checkout' 
                ? '66%' 
                : '100%' 
            }}
          />
        </div>
      )}
    </div>
  );
};

export default DragCreateButton;