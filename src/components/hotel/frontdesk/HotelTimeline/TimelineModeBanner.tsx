import { MousePointer2, ArrowLeftRight, Move } from 'lucide-react';

interface TimelineModeBannerProps {
  isDragCreateEnabled: boolean;
  isDragCreateSelecting: boolean;
  nightCount: number | null;
  isExpansionMode: boolean;
  isMoveMode: boolean;
}

export function TimelineModeBanner({
  isDragCreateEnabled,
  isDragCreateSelecting,
  nightCount,
  isExpansionMode,
  isMoveMode,
}: TimelineModeBannerProps) {
  if (!isDragCreateEnabled && !isExpansionMode && !isMoveMode) return null;

  return (
    <div
      className={`px-4 py-2 text-sm font-medium text-white/95 ${
        isDragCreateEnabled
          ? 'bg-gradient-to-r from-blue-600 to-blue-500'
          : isExpansionMode
            ? 'bg-gradient-to-r from-green-600 to-green-500'
            : 'bg-gradient-to-r from-purple-600 to-purple-500'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {isDragCreateEnabled && (
          <>
            <MousePointer2 className="h-4 w-4 shrink-0" />
            <span>
              {isDragCreateSelecting
                ? nightCount
                  ? `${nightCount} ${nightCount === 1 ? 'night' : 'nights'} — click AM to confirm`
                  : 'Hover to preview, click an AM cell to set check-out'
                : 'Click a PM cell to set check-in'}
            </span>
            <span className="ml-1 rounded bg-white/15 px-1.5 py-0.5 text-xs font-normal tracking-wide">
              Esc to exit
            </span>
          </>
        )}
        {isExpansionMode && (
          <>
            <ArrowLeftRight className="h-4 w-4 shrink-0" />
            <span>Use resize controls on reservations to extend or shorten stays</span>
            <span className="ml-1 rounded bg-white/15 px-1.5 py-0.5 text-xs font-normal tracking-wide">
              Esc to exit
            </span>
          </>
        )}
        {isMoveMode && (
          <>
            <Move className="h-4 w-4 shrink-0" />
            <span>Drag reservations or use arrows to move between rooms and dates</span>
            <span className="ml-1 rounded bg-white/15 px-1.5 py-0.5 text-xs font-normal tracking-wide">
              Esc to exit
            </span>
          </>
        )}
      </div>
    </div>
  );
}
