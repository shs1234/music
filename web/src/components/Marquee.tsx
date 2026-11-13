import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "../lib/format";

/** Gap between the end of the text and its repeat, and how fast it drifts. */
const GAP = 56;
const SPEED = 34; // px per second

/**
 * One line of text that, when it is too long for its box, drifts sideways in a loop so its end can be read too.
 * Text that fits stays still.
 */
export function Marquee({ text, className }: { text: string; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const first = useRef<HTMLSpanElement>(null);
  // Width of the text while it overflows; 0 while it fits.
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const w = first.current?.offsetWidth ?? 0;
      setWidth(w > el.clientWidth + 1 ? w : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  const moving = width > 0;
  return (
    <span ref={box} className={cn("block overflow-hidden whitespace-nowrap", moving && "marquee-box", className)}>
      <span
        // A new title starts from its beginning again.
        key={text}
        className={cn("inline-flex", moving && "marquee")}
        style={moving ? { ["--marquee-shift" as string]: `-${width + GAP}px`, animationDuration: `${(width + GAP) / SPEED + 2}s` } : undefined}
      >
        <span ref={first}>{text}</span>
        {moving && (
          <span aria-hidden="true" style={{ paddingLeft: GAP }}>
            {text}
          </span>
        )}
      </span>
    </span>
  );
}
