import {
  CaretDownIcon,
  DotsThreeVerticalIcon,
  HeartIcon,
  ListPlusIcon,
  MagnifyingGlassIcon,
  VideoCameraSlashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router";
import { usePullDownToDrag } from "../hooks/usePullDownToDrag";
import { useT } from "../i18n";
import { capabilities } from "../lib/api";
import { cn } from "../lib/format";
import type { Track } from "../lib/types";
import { selectCurrent, usePlayer, useStatusText } from "../player/player";
import { useLibrary } from "../stores/library";
import { useUi, type PanelTab } from "../stores/ui";
import { Artwork } from "./Artwork";
import { FavoriteButton, ModeSwitch, PlayPauseIcon, Scrubber, Transport } from "./Controls";
import { IconButton } from "./IconButton";
import { Marquee } from "./Marquee";
import { PresenceLayer } from "./PresenceLayer";
import { QueueList } from "./Queue";
import { SLOT, VideoSlot } from "./Video";

/** Artwork or the live video, with a soft ambient glow from the cover behind it. */
function Stage({ track, slot, className }: { track: Track; slot: number; className?: string }) {
  const t = useT();
  const showsVideo = usePlayer((s) => s.mediaKind === "video");
  const aspect = usePlayer((s) => s.videoAspect);
  // In Video mode on a song: say we're looking for its clip, or that it has none.
  const note = usePlayer((s) =>
    s.preferVideo ? (s.videoNote ?? (s.statusText === "findingClip" ? s.statusText : null)) : null,
  );
  if (showsVideo) {
    const portrait = aspect < 1;
    return (
      <div className="flex justify-center">
        <VideoSlot
          priority={slot}
          expandable
          className={cn("rounded-[16px]", portrait ? "h-[min(52dvh,560px)]" : "w-full")}
          style={{ aspectRatio: Math.min(16 / 9, Math.max(9 / 16, aspect)) }}
        />
      </div>
    );
  }
  return (
    <div className={cn("relative mx-auto aspect-square w-full", className)}>
      <img
        src={track.thumb}
        alt=""
        aria-hidden="true"
        className="absolute inset-[8%] h-[84%] w-[84%] scale-110 rounded-full object-cover opacity-50 blur-3xl"
      />
      <Artwork
        src={track.art}
        fallback={track.thumb}
        alt={t.nowPlaying.coverOf(track.title)}
        iconSize={48}
        className="relative size-full rounded-[18px] shadow-[0_24px_60px_rgb(0_0_0/0.45)]"
      />
      {note && (
        <span className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-full bg-black/65 px-3 py-2 text-center text-[13px] font-medium text-white backdrop-blur-md">
          {note === "findingClip" ? (
            <MagnifyingGlassIcon size={16} className="shrink-0" />
          ) : (
            <VideoCameraSlashIcon size={16} className="shrink-0" />
          )}{" "}
          {note === "findingClip" ? t.player.status.findingClip : t.player.noClip}
        </span>
      )}
    </div>
  );
}

function TrackHeading({ track }: { track: Track }) {
  const statusText = useStatusText();
  const status = usePlayer((s) => s.status);
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-semibold tracking-tight">{track.title}</h2>
        <p className={cn("truncate text-sm", status === "error" ? "text-danger" : "text-fg-2")}>
          {statusText ?? [track.artist, track.album].filter(Boolean).join(" · ")}
        </p>
      </div>
      <FavoriteButton track={track} />
    </div>
  );
}

/** The phone player's title: large, drifting sideways when it doesn't fit, with the artist under it. */
function SheetHeading({ track }: { track: Track }) {
  const statusText = useStatusText();
  const status = usePlayer((s) => s.status);
  return (
    <div>
      <h2>
        <Marquee text={track.title} className="text-2xl leading-tight font-bold tracking-tight" />
      </h2>
      <p className={cn("mt-1 truncate text-base", status === "error" ? "text-danger" : "text-fg-2")}>
        {statusText ?? [track.artist, track.album].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}

/** Like and save, as a row of chips under the title. */
function SheetActions({ track }: { track: Track }) {
  const isFavorite = useLibrary((s) => s.favorites.some((x) => x.id === track.id));
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const openAddToPlaylist = useUi((s) => s.openAddToPlaylist);
  const t = useT();
  const chip = "flex h-10 items-center gap-2 rounded-full bg-fg/10 px-4 text-sm font-medium transition-transform active:scale-[0.97]";
  return (
    <div className="flex gap-2">
      <button
        type="button"
        aria-label={isFavorite ? t.common.removeFromFavorites : t.common.addToFavorites}
        aria-pressed={isFavorite}
        onClick={() => void toggleFavorite(track)}
        className={cn(chip, isFavorite && "text-accent-text")}
      >
        <HeartIcon size={20} weight={isFavorite ? "fill" : "regular"} /> {t.common.favorite}
      </button>
      <button type="button" aria-label={t.trackMenu.addToPlaylist} onClick={() => openAddToPlaylist([track])} className={chip}>
        <ListPlusIcon size={20} /> {t.nowPlaying.save}
      </button>
    </div>
  );
}

function PanelBody({ tab, slot }: { tab: PanelTab; slot: number }) {
  const track = usePlayer(selectCurrent);
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const t = useT();

  if (tab === "queue") return <QueueList />;
  if (!track) {
    return <p className="px-2 py-16 text-center text-sm text-fg-2">{t.nowPlaying.playSomething}</p>;
  }
  const nextUp = queue[index + 1];
  return (
    <div className="flex flex-col gap-5 px-1 pb-4">
      <Stage track={track} slot={slot} />
      <TrackHeading track={track} />
      <ModeSwitch />
      {nextUp && (
        <div className="rounded-[14px] bg-surface-1 p-3 ring-1 ring-line">
          <p className="pb-2 text-xs font-medium text-fg-3">{t.nowPlaying.upNext}</p>
          <div className="flex items-center gap-3">
            <Artwork src={nextUp.thumb} className="size-10 rounded-[8px]" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{nextUp.title}</p>
              <p className="truncate text-xs text-fg-2">{nextUp.artist}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelTabs({ tab, onTab }: { tab: PanelTab; onTab: (t: PanelTab) => void }) {
  const t = useT();
  return (
    <div role="tablist" className="flex gap-1">
      {(
        [
          ["playing", t.nowPlaying.tabPlaying],
          ["queue", t.nowPlaying.tabQueue],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          role="tab"
          type="button"
          aria-selected={tab === id}
          onClick={() => onTab(id)}
          className={cn(
            "h-9 rounded-full px-4 text-sm font-medium transition-colors",
            tab === id ? "bg-surface-4 text-fg" : "text-fg-2 hover:text-fg",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Docked right column (≥1280px). */
export function SidePanel() {
  const tab = useUi((s) => s.panelTab);
  const openPanel = useUi((s) => s.openPanel);
  const togglePanel = useUi((s) => s.togglePanel);
  const t = useT();
  return (
    <aside className="island hidden w-[360px] shrink-0 xl:flex" aria-label={t.nowPlaying.panel}>
      <div className="island-core flex w-full flex-col overflow-hidden">
        <div className="flex h-16 items-center justify-between px-3">
          <PanelTabs tab={tab} onTab={openPanel} />
          <IconButton label={t.nowPlaying.closePanel} size="sm" onClick={() => togglePanel(tab)}>
            <XIcon size={18} />
          </IconButton>
        </div>
        <div className="scroll-area flex-1 overflow-y-auto px-2">
          <PanelBody tab={tab} slot={SLOT.panel} />
        </div>
      </div>
    </aside>
  );
}

/** Same content as an overlay drawer for tablets and small laptops (768-1279px). */
export function PanelDrawer() {
  const open = useUi((s) => s.drawerOpen);
  const tab = useUi((s) => s.panelTab);
  const openPanel = useUi((s) => s.openPanel);
  const close = useUi((s) => s.closePanel);
  const reduce = useReducedMotion();
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 hidden md:block xl:hidden">
          <motion.div className="absolute inset-0 bg-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.aside
            aria-label={t.nowPlaying.panel}
            data-escape-closes
            initial={reduce ? { opacity: 0 } : { x: "105%" }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { x: "105%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="island drawer-top absolute right-2 bottom-2 flex w-[380px] max-w-[calc(100vw-16px)]"
          >
            <div className="island-core flex w-full flex-col overflow-hidden">
              <div className="flex h-16 items-center justify-between px-3">
                <PanelTabs tab={tab} onTab={openPanel} />
                <IconButton label={t.common.close} size="sm" onClick={close}>
                  <XIcon size={18} />
                </IconButton>
              </div>
              <div className="scroll-area flex-1 overflow-y-auto px-2">
                <PanelBody tab={tab} slot={SLOT.panel} />
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** The cover, blurred, as the backdrop of the phone player and of the queue over it. */
function Backdrop({ track }: { track: Track }) {
  return (
    <>
      <img
        src={track.thumb}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-1/2 w-full scale-125 object-cover opacity-25 blur-3xl"
      />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-bg/70 to-bg" />
    </>
  );
}

const SHEET_SPRING = { type: "spring", stiffness: 380, damping: 36 } as const;

/**
 * Full-screen Now Playing for phones. Drag down (or Back) to close.
 *
 * The queue comes up over the player (swipe up, or its label at the bottom) and goes back down to it the same way:
 * dragging it down, its handle, the small player at its top, or Back. It is a history entry of its own on top of
 * the sheet's, which is what makes Back return to the player rather than leave the sheet.
 */
export function NowPlayingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const track = usePlayer(selectCurrent);
  const reduce = useReducedMotion();
  const drag = useDragControls();
  const queueDrag = useDragControls();
  const queueRef = useRef<HTMLDivElement>(null);
  const toggle = usePlayer((s) => s.toggle);
  const playing = usePlayer((s) => s.status === "playing");
  const openMenu = useUi((s) => s.openMenu);
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();

  const queueOpen = open && !!(location.state as { queue?: boolean } | null)?.queue;
  const openQueue = () => navigate({ hash: location.hash }, { state: { queue: true } });
  const closeQueue = () => {
    if (queueOpen) navigate(-1);
  };
  usePullDownToDrag(queueRef, queueDrag, queueOpen);

  return createPortal(
    <AnimatePresence>
      {open && track && (
        <PresenceLayer className="contents">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={t.nowPlaying.title}
          initial={reduce ? { opacity: 0 } : { y: "100%" }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "100%" }}
          transition={SHEET_SPRING}
          drag="y"
          dragListener={false}
          dragControls={drag}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.9 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 700) onClose();
            // The sheet itself can't go up, but a swipe up on the player asks for the queue under it.
            else if (!queueOpen && (info.offset.y < -70 || info.velocity.y < -600)) openQueue();
          }}
          className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-bg md:hidden"
        >
          <Backdrop track={track} />

          <div className="overlay-top relative flex min-h-0 flex-1 flex-col px-5">
            <div className="flex h-14 touch-none items-center justify-between" onPointerDown={(e) => drag.start(e)}>
              <IconButton label={t.common.close} onClick={onClose} className="-ml-2 text-fg!">
                <CaretDownIcon size={24} />
              </IconButton>
              {capabilities.video ? <ModeSwitch /> : <div className="h-1 w-10 rounded-full bg-fg-3/50" />}
              <IconButton
                label={t.trackList.moreFor(track.title)}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  openMenu({ track, x: r.right - 256, y: r.bottom + 6 });
                }}
                className="-mr-2 text-fg!"
              >
                <DotsThreeVerticalIcon size={24} weight="bold" />
              </IconButton>
            </div>

            <div
              className="flex flex-1 touch-none flex-col justify-evenly gap-3"
              onPointerDown={(e) => {
                // Anywhere but the progress bar drags the sheet; taps on buttons still go through.
                if (!(e.target as Element).closest("[role=slider]")) drag.start(e);
              }}
            >
              <div>
                <Stage track={track} slot={SLOT.sheet} className="max-w-[min(100%,40dvh)]" />
              </div>
              <div className="flex flex-col gap-4">
                <SheetHeading track={track} />
                <SheetActions track={track} />
                <Scrubber touch />
                <Transport big />
              </div>
              <button
                type="button"
                onClick={openQueue}
                className="mx-auto flex flex-col items-center gap-3 px-8 pb-[calc(12px+env(safe-area-inset-bottom))] text-[15px] font-semibold"
              >
                <span className="h-1 w-10 rounded-full bg-fg-3/50" />
                {t.queue.title}
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {queueOpen && (
              <motion.div
                initial={reduce ? { opacity: 0 } : { y: "100%" }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { y: "100%" }}
                transition={SHEET_SPRING}
                drag="y"
                dragListener={false}
                dragControls={queueDrag}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.9 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 100 || info.velocity.y > 600) closeQueue();
                }}
                className="absolute inset-0 flex flex-col overflow-hidden bg-bg"
              >
                <Backdrop track={track} />
                <div className="overlay-top relative flex min-h-0 flex-1 flex-col px-5">
                  {/* What is playing, small; a tap goes back to the player. */}
                  <div className="flex h-16 touch-none items-center gap-2" onPointerDown={(e) => queueDrag.start(e)}>
                    <button
                      type="button"
                      onClick={closeQueue}
                      aria-label={t.nowPlaying.backToPlayer}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Artwork src={track.thumb} className="size-12 shrink-0 rounded-[8px]" />
                      <span className="min-w-0 flex-1">
                        <Marquee text={track.title} className="text-base font-semibold" />
                        <span className="block truncate text-sm text-fg-2">{track.artist}</span>
                      </span>
                    </button>
                    <IconButton label={playing ? t.common.pause : t.common.play} size="lg" onClick={toggle} className="-mr-2 text-fg!">
                      <PlayPauseIcon size={28} />
                    </IconButton>
                  </div>
                  <div className="-mx-5 mt-1 flex min-h-0 flex-1 flex-col rounded-t-[20px] bg-fg/[0.06]">
                    <button
                      type="button"
                      onClick={closeQueue}
                      aria-label={t.nowPlaying.backToPlayer}
                      className="grid h-6 shrink-0 touch-none place-items-center"
                      onPointerDown={(e) => queueDrag.start(e)}
                    >
                      <span className="h-1 w-10 rounded-full bg-fg-3/50" />
                    </button>
                    <div
                      ref={queueRef}
                      className="scroll-area min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[calc(24px+env(safe-area-inset-bottom))]"
                    >
                      <QueueList />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        </PresenceLayer>
      )}
    </AnimatePresence>,
    document.body,
  );
}
