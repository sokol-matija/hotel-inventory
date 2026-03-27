import { differenceInCalendarDays } from 'date-fns';
import type React from 'react';

/** Returns Tailwind border+bg classes for a given reservation status. */
export function getStatusCardColors(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'bg-orange-200 border-orange-600';
    case 'checked-in':
      return 'bg-green-200 border-green-600';
    case 'checked-out':
      return 'bg-gray-200 border-gray-600';
    case 'room-closure':
      return 'bg-red-200 border-red-600';
    case 'unallocated':
      return 'bg-blue-200 border-blue-600';
    case 'incomplete-payment':
      return 'bg-red-200 border-red-600';
    default:
      return 'bg-white border-gray-200';
  }
}

/** Clamps a context menu to within the viewport. */
export function calculateContextMenuPosition(
  e: React.MouseEvent,
  menuWidth = 180,
  menuHeight = 300
): { x: number; y: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let x = e.clientX;
  let y = e.clientY;
  if (x + menuWidth > viewportWidth) x = e.clientX - menuWidth;
  if (y + menuHeight > viewportHeight) y = e.clientY - menuHeight;
  if (y < 0) y = 10;
  if (x < 0) x = 10;
  return { x, y };
}

/** Days remaining until check-out (negative when already checked out). */
export function calcDaysLeft(checkOutDate: string): number {
  return differenceInCalendarDays(new Date(checkOutDate), new Date());
}
