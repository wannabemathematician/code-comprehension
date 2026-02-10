import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  /** Percentage (0–100) for the left pane width */
  leftPercent: number;
  onResize: (leftPercent: number) => void;
  left: React.ReactNode;
  right: React.ReactNode;
  /** Min width % for left pane */
  minLeftPercent?: number;
  /** Max width % for left pane */
  maxLeftPercent?: number;
};

const DIVIDER_WIDTH_PX = 6;
const DEFAULT_MIN = 15;
const DEFAULT_MAX = 85;

export function ResizableSplit({
  leftPercent,
  onResize,
  left,
  right,
  minLeftPercent = DEFAULT_MIN,
  maxLeftPercent = DEFAULT_MAX
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(() => setIsDragging(true), []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      if (width <= 0) return;
      let pct = (x - DIVIDER_WIDTH_PX / 2) / width * 100;
      pct = Math.max(minLeftPercent, Math.min(maxLeftPercent, pct));
      onResize(pct);
    },
    [onResize, minLeftPercent, maxLeftPercent]
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="flex h-full min-h-0 w-full">
      <div
        className="min-h-0 min-w-0 overflow-hidden"
        style={{ flex: `0 0 ${leftPercent}%` }}
      >
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        tabIndex={0}
        onMouseDown={handleMouseDown}
        className={`shrink-0 select-none cursor-col-resize border-slate-800 bg-slate-800/80 hover:bg-sky-500/30 active:bg-sky-500/50 ${isDragging ? 'bg-sky-500/40' : ''}`}
        style={{ width: DIVIDER_WIDTH_PX }}
        title="Drag to resize"
      />
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{right}</div>
    </div>
  );
}
