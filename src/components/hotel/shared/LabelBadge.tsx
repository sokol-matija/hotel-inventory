/**
 * LabelBadge - Display component for reservation labels
 *
 * Shows a small badge with the label name, designed to appear at the top-center
 * of reservation cards in both timeline and room status views.
 *
 * Design:
 * - White background with black text (default)
 * - Subtle border with shadow
 * - Customizable size (sm, md, lg)
 * - Supports custom colors via label.color and label.bgColor
 */

import React from 'react';
import { cn } from '../../../lib/utils';
import { Label } from '../../../lib/hotel/types';

interface LabelBadgeProps {
  label: Label;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LabelBadge: React.FC<LabelBadgeProps> = ({
  label,
  size = 'sm',
  className
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium",
        "border shadow-sm",
        "transition-all duration-150",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: label.bgColor || '#FFFFFF',
        color: label.color || '#000000',
        borderColor: label.color || '#E5E7EB' // Gray-200 as fallback
      }}
      title={`Group: ${label.name}`}
    >
      {label.name}
    </span>
  );
};

export default LabelBadge;
