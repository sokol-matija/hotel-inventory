import { useState, useCallback } from 'react';

export interface TimelineInteractionModesState {
  isExpansionMode: boolean;
  isMoveMode: boolean;
}

export interface TimelineInteractionModesActions {
  toggleExpansionMode: () => void;
  toggleMoveMode: () => void;
  exitAllModes: () => void;
}

export function useTimelineInteractionModes(): TimelineInteractionModesState &
  TimelineInteractionModesActions {
  const [isExpansionMode, setIsExpansionMode] = useState(false);
  const [isMoveMode, setIsMoveMode] = useState(false);

  const exitAllModes = useCallback(() => {
    setIsExpansionMode(false);
    setIsMoveMode(false);
  }, []);

  const toggleExpansionMode = useCallback(() => {
    setIsExpansionMode((prev) => {
      if (!prev) setIsMoveMode(false);
      return !prev;
    });
  }, []);

  const toggleMoveMode = useCallback(() => {
    setIsMoveMode((prev) => {
      if (!prev) setIsExpansionMode(false);
      return !prev;
    });
  }, []);

  return {
    isExpansionMode,
    isMoveMode,
    toggleExpansionMode,
    toggleMoveMode,
    exitAllModes,
  };
}
