import { useState, useCallback } from 'react';

const DEFAULT_EXPANDED = { 1: true, 2: true, 3: true, 4: true };

export interface FloorExpansionState {
  expandedFloors: Record<number, boolean>;
  expandedOverviewFloors: Record<number, boolean>;
}

export interface FloorExpansionActions {
  toggleFloor: (floor: number) => void;
  toggleOverviewFloor: (floor: number) => void;
}

export function useFloorExpansion(): FloorExpansionState & FloorExpansionActions {
  const [expandedFloors, setExpandedFloors] = useState<Record<number, boolean>>(DEFAULT_EXPANDED);
  const [expandedOverviewFloors, setExpandedOverviewFloors] =
    useState<Record<number, boolean>>(DEFAULT_EXPANDED);

  const toggleFloor = useCallback((floor: number) => {
    setExpandedFloors((prev) => ({ ...prev, [floor]: !prev[floor] }));
  }, []);

  const toggleOverviewFloor = useCallback((floor: number) => {
    setExpandedOverviewFloors((prev) => ({ ...prev, [floor]: !prev[floor] }));
  }, []);

  return { expandedFloors, expandedOverviewFloors, toggleFloor, toggleOverviewFloor };
}
