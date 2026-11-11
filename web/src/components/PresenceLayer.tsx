import { useIsPresent } from "motion/react";
import { useEffect, useRef, type HTMLAttributes } from "react";
import { cn } from "../lib/format";

/**
 * A full-screen overlay (sheet, menu, dialog) inside AnimatePresence.
 *
 * - Once it starts leaving it stops taking touches, so a tap made while the closing animation plays reaches the
 *   list or player underneath instead of the scrim of a sheet that is already gone.
 * - Touch moves on it don't reach the browser's own scrolling, except inside a `.scroll-area`. Android's WebView
 *   otherwise treats a quick swipe on the sheet (dragging it closed) as a fling, even though nothing scrolls, and
 *   swallows the next tap as "stop the fling": the user had to tap twice right after closing a sheet.
 */
export function PresenceLayer({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const present = useIsPresent();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: TouchEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest(".scroll-area")) e.preventDefault();
    };
    // Must be non-passive to cancel the move; React's onTouchMove is passive.
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, []);

  return <div ref={ref} {...rest} className={cn(className, !present && "pointer-events-none")} />;
}
