/**
 * LabelBadge - Compact expandable label display for reservations
 *
 * Design Philosophy:
 * - Default: Small colored circle (16x16px) - soft, modern look
 * - Hover: Expands smoothly to rounded pill shape revealing full label text
 * - Uses GSAP for buttery smooth animations
 * - Colors auto-assigned from modern palette
 * - Responsive positioning based on context
 */

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Label } from '../../../lib/hotel/types';

interface LabelBadgeProps {
  label: Label;
  className?: string;
  alwaysExpanded?: boolean;
  expandDirection?: 'left' | 'right'; // Direction to expand: left (for top-right positioning) or right (default)
  semiCircle?: boolean; // If true, renders as semi-circle on border edge
}

export const LabelBadge: React.FC<LabelBadgeProps> = ({
  label,
  className = '',
  alwaysExpanded = false,
  expandDirection = 'right',
  semiCircle = false
}) => {
  const badgeRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const badge = badgeRef.current;
    const text = textRef.current;

    if (!badge || !text) return;

    // If always expanded, set to expanded state and skip animations
    if (alwaysExpanded) {
      gsap.set(badge, {
        width: 'auto',
        height: 'auto',
        paddingTop: '4px',
        paddingBottom: '4px',
        paddingLeft: '8px',
        paddingRight: '8px',
        borderRadius: '6px'
      });

      gsap.set(text, {
        opacity: 1,
        width: 'auto'
      });

      return; // Skip hover listeners
    }

    // Set initial state - text hidden, badge is circle or corner label
    if (semiCircle) {
      // Corner label: matches card's rounded corner
      gsap.set(badge, {
        width: '20px',
        height: '20px',
        paddingTop: '2px',
        paddingBottom: '2px',
        paddingLeft: 0,
        paddingRight: '8px',
        borderRadius: '0 8px 0 12px' // Top-right matches card (8px), bottom-left rounded
      });
    } else {
      // Full circle
      gsap.set(badge, {
        width: '16px',
        height: '16px',
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        borderRadius: '50%' // Perfect circle
      });
    }

    gsap.set(text, {
      opacity: 0,
      width: 0
    });

    const handleMouseEnter = () => {
      // Create timeline for synchronized animation
      const tl = gsap.timeline();

      // Expand badge width and add padding (circle → rounded pill)
      tl.to(badge, {
        width: 'auto',
        height: 'auto',
        paddingTop: '4px',
        paddingBottom: '4px',
        paddingLeft: '8px',
        paddingRight: '8px',
        borderRadius: '12px', // Rounded pill shape when expanded
        duration: 0.3,
        ease: 'power2.out'
      }, 0);

      // Reveal text
      tl.to(text, {
        opacity: 1,
        width: 'auto',
        duration: 0.3,
        ease: 'power2.out'
      }, 0);
    };

    const handleMouseLeave = () => {
      // Create timeline for collapse
      const tl = gsap.timeline();

      // Hide text
      tl.to(text, {
        opacity: 0,
        width: 0,
        duration: 0.2,
        ease: 'power2.in'
      }, 0);

      // Collapse badge back to corner label or circle
      tl.to(badge, {
        width: semiCircle ? '20px' : '16px',
        height: semiCircle ? '20px' : '16px',
        paddingTop: semiCircle ? '2px' : 0,
        paddingBottom: semiCircle ? '2px' : 0,
        paddingLeft: 0,
        paddingRight: semiCircle ? '8px' : 0,
        borderRadius: semiCircle ? '0 8px 0 12px' : '50%', // Back to corner label or circle
        duration: 0.2,
        ease: 'power2.in'
      }, 0.05);
    };

    badge.addEventListener('mouseenter', handleMouseEnter);
    badge.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      badge.removeEventListener('mouseenter', handleMouseEnter);
      badge.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [alwaysExpanded, semiCircle]);

  return (
    <div
      ref={badgeRef}
      className={`
        inline-flex items-center overflow-hidden
        cursor-pointer
        shadow-md hover:shadow-lg
        transition-shadow duration-300
        ${expandDirection === 'left' ? 'justify-end' : 'justify-start'}
        ${className}
      `}
      style={{
        backgroundColor: label.bgColor || '#3B82F6'
      }}
      title={`Group: ${label.name}`}
    >
      <span
        ref={textRef}
        className="text-xs font-semibold whitespace-nowrap"
        style={{
          color: label.color || '#FFFFFF'
        }}
      >
        {label.name}
      </span>
    </div>
  );
};

export default LabelBadge;
