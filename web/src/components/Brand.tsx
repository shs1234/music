import { cn } from "../lib/format";

/** The app's mark: two beamed eighth notes, as on the launcher icon (same 108-unit drawing, cropped). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="24 24.5 60 60" className={className} aria-hidden="true">
      <g fill="currentColor">
        <circle cx="38.5" cy="72" r="9.5" />
        <circle cx="69.5" cy="66" r="9.5" />
        <path d="M42.5,34 L48,33 L48,72 L42.5,72z" />
        <path d="M73.5,28.5 L79,27.5 L79,66 L73.5,66z" />
        <path d="M42.5,34 L79,27.5 L79,37 L42.5,43.5z" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <LogoMark className="size-7 text-accent-text" />
      <span className="text-[17px] font-semibold tracking-tight">music</span>
    </span>
  );
}

/** The mark in motion: marks the track that is playing. */
export function Equalizer({ live, className }: { live: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("inline-flex h-3.5 items-end gap-[2px]", live && "eq-live", className)}>
      <span className="eq-bar h-full w-[3px] rounded-full bg-accent-text" />
      <span className="eq-bar h-full w-[3px] rounded-full bg-accent-text" />
      <span className="eq-bar h-full w-[3px] rounded-full bg-accent-text" />
    </span>
  );
}
