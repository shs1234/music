import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/format";

/** How far the indicator has to come down before letting go refreshes, and how far it can go. */
const TRIGGER = 64;
const LIMIT = 96;

/**
 * Pull-to-refresh for the page it is rendered in: dragging down while the page is scrolled to its top brings a
 * disc down from under the header, and letting go past the trigger point calls `onRefresh`. The disc stays, spinning,
 * while `busy` after such a pull.
 */
export function PullToRefresh({ onRefresh, busy }: { onRefresh: () => void; busy: boolean }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [pull, setPull] = useState(0);
  const [pulled, setPulled] = useState(false);
  const refresh = useRef(onRefresh);
  refresh.current = onRefresh;

  // Also covers a refresh that had nothing to wait for and so never was busy.
  useEffect(() => {
    if (pulled && !busy) setPulled(false);
  }, [busy, pulled]);

  useEffect(() => {
    const scroller = anchor.current?.closest("main");
    if (!scroller) return;
    let mode: "idle" | "undecided" | "pulling" = "idle";
    let startX = 0;
    let startY = 0;
    let distance = 0;

    const start = (e: TouchEvent) => {
      mode = e.touches.length === 1 && scroller.scrollTop <= 0 ? "undecided" : "idle";
      startX = e.touches[0]?.clientX ?? 0;
      startY = e.touches[0]?.clientY ?? 0;
      distance = 0;
    };
    const move = (e: TouchEvent) => {
      if (mode === "idle") return;
      const dx = (e.touches[0]?.clientX ?? startX) - startX;
      const dy = (e.touches[0]?.clientY ?? startY) - startY;
      if (mode === "undecided") {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        // Sideways is a shelf being swiped; upwards is the page scrolling.
        if (Math.abs(dx) > Math.abs(dy) || dy < 0 || scroller.scrollTop > 0) {
          mode = "idle";
          return;
        }
        mode = "pulling";
      }
      if (e.cancelable) e.preventDefault();
      // The disc follows the finger at half speed, like something being stretched.
      distance = Math.min(LIMIT, Math.max(0, dy) / 2);
      setPull(distance);
    };
    const end = (e: TouchEvent) => {
      if (mode === "pulling" && e.type === "touchend" && distance >= TRIGGER) {
        setPulled(true);
        refresh.current();
      }
      mode = "idle";
      distance = 0;
      setPull(0);
    };

    scroller.addEventListener("touchstart", start, { passive: true });
    scroller.addEventListener("touchmove", move, { passive: false });
    scroller.addEventListener("touchend", end);
    scroller.addEventListener("touchcancel", end);
    return () => {
      scroller.removeEventListener("touchstart", start);
      scroller.removeEventListener("touchmove", move);
      scroller.removeEventListener("touchend", end);
      scroller.removeEventListener("touchcancel", end);
    };
  }, []);

  const spinning = pulled && busy;
  const shown = spinning || pull > 0;
  const offset = spinning ? TRIGGER : pull;

  return (
    <span ref={anchor} aria-hidden className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3rem)] z-20 flex justify-center">
      {shown && (
        <span
          style={{ transform: `translateY(${offset - 24}px)`, opacity: spinning ? 1 : Math.min(1, pull / (TRIGGER / 2)) }}
          className={cn(
            "grid size-10 place-items-center rounded-full bg-surface-3 shadow-lg ring-1 ring-line",
            // Past the trigger point the arrow lights up: letting go now refreshes.
            spinning || pull >= TRIGGER ? "text-accent-text" : "text-fg-2",
            !pull && "transition-transform duration-200",
          )}
        >
          <ArrowClockwiseIcon
            size={20}
            weight="bold"
            className={spinning ? "animate-spin" : undefined}
            style={spinning ? undefined : { transform: `rotate(${pull * 4}deg)` }}
          />
        </span>
      )}
    </span>
  );
}
