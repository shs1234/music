import type { DragControls } from "motion/react";
import { useEffect, type RefObject } from "react";

/**
 * Pulling a sheet's content down drags the sheet instead (to close it), as phone apps do: anywhere in content that
 * doesn't scroll, and in a list (`.scroll-area`) while it is at its top. Moving up, or starting lower in a list,
 * scrolls the list as usual. Text fields and sliders keep their own gestures.
 */
export function usePullDownToDrag(ref: RefObject<HTMLElement | null>, drag: DragControls, enabled: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let startY = 0;
    let scroller: Element = el;
    let atTop = false;
    let dragging = false;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element;
      startY = e.clientY;
      scroller = target.closest(".scroll-area") ?? el;
      atTop = scroller.scrollTop <= 0 && !target.closest("input, textarea, [role=slider]");
      dragging = false;
    };
    const onMove = (e: PointerEvent) => {
      if (atTop && !dragging && e.clientY - startY > 6) {
        dragging = true;
        drag.start(e);
      }
    };
    // Keep the browser from scrolling (or bouncing) the content while it is being pulled down from the top.
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0;
      if (atTop && scroller.scrollTop <= 0 && y >= startY) e.preventDefault();
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [ref, drag, enabled]);
}
