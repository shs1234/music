import { QueueIcon, XIcon } from "@phosphor-icons/react";
import { useT } from "../i18n";
import { cn, formatTime } from "../lib/format";
import { usePlayer } from "../player/player";
import { Artwork } from "./Artwork";
import { Equalizer } from "./Brand";

/** The playing track and what follows it, in one list: the playing one is marked, the rest can be removed. */
export function QueueList() {
  const t = useT();
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const live = usePlayer((s) => s.status === "playing" || s.status === "loading");
  const jumpTo = usePlayer((s) => s.jumpTo);
  const removeAt = usePlayer((s) => s.removeAt);
  const clearUpcoming = usePlayer((s) => s.clearUpcoming);

  const current = queue[index];
  const upcoming = queue.slice(index + 1);

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-[14px] bg-surface-3 text-fg-3">
          <QueueIcon size={26} />
        </span>
        <p className="font-medium">{t.queue.emptyTitle}</p>
        <p className="max-w-[28ch] text-sm text-fg-2">{t.queue.emptyBody}</p>
      </div>
    );
  }

  const row = (i: number, isCurrent: boolean) => {
    const track = queue[i];
    return (
      <li
        key={`${track.id}-${i}`}
        className={cn("group relative flex items-center gap-3 rounded-xl px-2 py-2", isCurrent ? "bg-surface-3" : "hover:bg-surface-3")}
      >
        <button type="button" onClick={() => jumpTo(i)} className="absolute inset-0 rounded-xl" aria-label={t.common.playX(track.title)} />
        <div className="pointer-events-none relative shrink-0">
          <Artwork src={track.thumb} className="size-12 rounded-[8px]" />
          {isCurrent && (
            <span className="absolute inset-0 grid place-items-center rounded-[8px] bg-black/45">
              <Equalizer live={live} />
            </span>
          )}
        </div>
        <div className="pointer-events-none min-w-0 flex-1">
          <p className={cn("line-clamp-2 text-[15px] leading-snug font-medium", isCurrent ? "text-accent-text" : "text-fg")}>{track.title}</p>
          <p className="mt-0.5 truncate text-[13px] text-fg-2">
            {[track.artist, track.duration ? formatTime(track.duration) : ""].filter(Boolean).join(" • ")}
          </p>
        </div>
        {!isCurrent && (
          <button
            type="button"
            onClick={() => removeAt(i)}
            aria-label={t.queue.removeX(track.title)}
            title={t.queue.remove}
            className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full text-fg-2 hover:bg-surface-4 hover:text-fg md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          >
            <XIcon size={18} />
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-2 pb-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-lg font-bold tracking-tight">{t.queue.title}</h3>
        {upcoming.length > 0 && (
          <button type="button" onClick={clearUpcoming} className="h-9 px-1 text-sm font-medium text-fg-2 hover:text-fg">
            {t.queue.clear}
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-0.5">
        {row(index, true)}
        {upcoming.map((_, k) => row(index + 1 + k, false))}
      </ul>
    </div>
  );
}
