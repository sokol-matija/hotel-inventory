/**
 * DragCreateGuidance - Visual guidance component for drag-to-create workflow
 * 
 * Provides clear, step-by-step instructions to users during the drag-to-create
 * reservation process with real-time feedback and progress indication.
 * 
 * Features:
 * - Floating guidance panel with current step instructions
 * - Progress indicator showing workflow steps
 * - Real-time validation feedback and conflict warnings
 * - Smooth animations and professional styling
 * - Keyboard shortcut hints and accessibility features
 * 
 * @author Hotel Management System v2.8
 * @since August 2025
 */

import React from 'react';
import { AlertCircle, Calendar, CheckCircle, Clock, MapPin, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { DragCreateState } from '../../../../lib/hotel/services/DragCreateService';

interface DragCreateGuidanceProps {
  state: DragCreateState;
  onDisable: () => void;
  className?: string;
}

const DragCreateGuidance: React.FC<DragCreateGuidanceProps> = ({
  state,
  onDisable,
  className = ''
}) => {
  if (!state.isEnabled) return null;

  // Step configuration
  const steps = [
    { id: 'selecting_checkin', label: 'Check-in', icon: MapPin },
    { id: 'selecting_checkout', label: 'Check-out', icon: Calendar },
    { id: 'confirming', label: 'Confirm', icon: CheckCircle },
    { id: 'creating', label: 'Creating', icon: Clock }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === state.mode);
  const currentStep = steps[currentStepIndex];

  // Get status color based on current state
  const getStatusColor = () => {
    if (state.error) return 'border-red-500 bg-red-50';
    if (state.preview && !state.preview.isValid) return 'border-orange-500 bg-orange-50';
    return 'border-blue-500 bg-blue-50';
  };

  const getStatusIcon = () => {
    if (state.error) return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (state.preview && !state.preview.isValid) return <AlertCircle className="h-5 w-5 text-orange-500" />;
    return currentStep ? <currentStep.icon className="h-5 w-5 text-blue-600" /> : null;
  };

  return (
    <Card className={`fixed top-4 right-4 z-50 w-96 shadow-lg transition-all duration-300 ${getStatusColor()} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            {getStatusIcon()}
            <span>Create Reservation</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDisable}
            className="h-8 w-8 p-0 hover:bg-gray-200"
            title="Exit drag-create mode (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Progress indicator */}
        <div className="flex items-center space-x-2 mt-3">
          {steps.map((step, index) => {
            const isComplete = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isUpcoming = index > currentStepIndex;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                  isComplete 
                    ? 'bg-green-500 text-white' 
                    : isCurrent 
                    ? 'bg-blue-500 text-white ring-2 ring-blue-200' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {isComplete ? '✓' : index + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isCurrent ? 'text-blue-700' : isComplete ? 'text-green-700' : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${
                    isComplete ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Current instruction */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-800 leading-relaxed">
            {state.currentStep.instruction}
          </p>
        </div>

        {/* Selection info */}
        {state.selection && (
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Selection</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Room:</span>
                <span className="font-medium">{state.selection.room?.number || state.selection.roomId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Check-in:</span>
                <span className="font-medium">
                  {state.selection.checkIn.toLocaleDateString()} 3:00 PM
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Check-out:</span>
                <span className="font-medium">
                  {state.selection.checkOut.toLocaleDateString()} 11:00 AM
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">
                  {Math.ceil((state.selection.checkOut.getTime() - state.selection.checkIn.getTime()) / (24 * 60 * 60 * 1000))} nights
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Validation feedback */}
        {state.preview && (
          <div className="space-y-2">
            {/* Conflicts */}
            {state.preview.conflicts.length > 0 && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center space-x-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">Conflicts</span>
                </div>
                <ul className="text-xs text-red-600 space-y-1">
                  {state.preview.conflicts.map((conflict, index) => (
                    <li key={index}>• {conflict}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {state.preview.warnings.length > 0 && (
              <div className="p-2 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-center space-x-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-700">Warnings</span>
                </div>
                <ul className="text-xs text-orange-600 space-y-1">
                  {state.preview.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alternative rooms */}
            {state.preview.suggestedAlternatives && state.preview.suggestedAlternatives.length > 0 && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center space-x-2 mb-1">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-700">Alternative Rooms</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {state.preview.suggestedAlternatives.map(room => (
                    <Badge key={room.id} variant="outline" className="text-xs">
                      Room {room.number}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {state.error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{state.error}</p>
          </div>
        )}

        {/* Keyboard shortcuts */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Keyboard shortcuts:</p>
          <div className="text-xs text-gray-500 space-y-1">
            <div>• <kbd className="bg-gray-100 px-1 rounded">Esc</kbd> - Exit drag mode</div>
            <div>• <kbd className="bg-gray-100 px-1 rounded">Enter</kbd> - Confirm current step</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DragCreateGuidance;