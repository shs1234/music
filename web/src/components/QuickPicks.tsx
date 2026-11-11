import { ArrowClockwiseIcon, PlayIcon, ShuffleIcon, SignInIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { accountAvailable, picks, SignedOutError, videoMix, type Picks } from "../native/account";
import { useAccount } from "../stores/account";
import { usePlayer } from "../player/player";
import type { Track } from "../lib/types";
import { useLibrary } from "../stores/library";
import { Section } from "./Page";
import { TrackList, TrackListSkeleton } from "./TrackList";

type State =
  | { kind: "loading" }
  | { kind: "ready"; picks: Picks }
  | { kind: "error"; message: string };

const shuffle = <T,>(list: T[]): T[] => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

/**
 * My Mix comes back almost the same on every request, so it is blended with YouTube's mix for two tracks picked at
 * random from what the user played or liked: every refresh gives a different list.
 */
async function blended(seeds: string[]): Promise<Picks> {
  const chosen = shuffle(seeds).slice(0, 2);
  const [mix, ...mixes] = await Promise.all([
    picks(seeds),
    ...chosen.map((id) => videoMix(id).catch(() => [] as Track[])),
  ]);
  // Quick picks (Premium) already change on their own; My Mix gets the seed tracks' mixes blended in.
  if (mix.title !== "My Mix") return mix;
  const pools = [shuffle(mix.tracks).slice(0, 25), ...mixes.map((m) => shuffle(m).slice(0, 13))];
  const seen = new Set<string>();
  const tracks = shuffle(pools.flat()).filter((t) => !seen.has(t.id) && !!seen.add(t.id));
  return { title: mix.title, tracks };
}

// Kept for the session so coming back to Home doesn't fetch (and reshuffle) the list again.
let lastPicks: Picks | null = null;

/** The signed-in account's YouTube Music "Quick picks" (or My Mix) at the top of Home. */
export function QuickPicks() {
  const [state, setState] = useState<State>(lastPicks ? { kind: "ready", picks: lastPicks } : { kind: "loading" });
  const playList = usePlayer((s) => s.playList);
  const status = useAccount((s) => s.status);
  const busy = useAccount((s) => s.busy);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const { history, favorites } = useLibrary.getState();
      const seeds = [...new Set([...history.slice(0, 30), ...favorites].map((t) => t.id))];
      lastPicks = await blended(seeds);
      setState({ kind: "ready", picks: lastPicks });
    } catch (e) {
      lastPicks = null;
      if (e instanceof SignedOutError) useAccount.getState().expired();
      else setState({ kind: "error", message: (e as Error).message || "추천곡을 불러오지 못했어요." });
    }
  }, []);

  useEffect(() => {
    if (status === "unknown") void useAccount.getState().check();
    else if (status === "signedOut") lastPicks = null;
    else if (!lastPicks) void load();
  }, [status, load]);

  if (!accountAvailable()) return null;

  const button =
    "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-transform active:scale-[0.97]";

  if (status === "signedOut") {
    return (
      <div className="mx-4 mb-10 flex flex-col items-start gap-4 rounded-[20px] bg-surface-2 p-5 ring-1 ring-line md:mx-6">
        <div>
          <p className="text-lg font-semibold tracking-tight">빠른 선곡</p>
          <p className="mt-1 text-sm text-fg-2">YouTube Music 계정으로 로그인하면 내 추천곡을 여기서 바로 들을 수 있어요.</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void useAccount.getState().signIn()}
          className={`${button} bg-accent text-accent-ink disabled:opacity-60`}
        >
          <SignInIcon size={18} weight="bold" /> Google 계정으로 로그인
        </button>
      </div>
    );
  }

  const title = state.kind === "ready" ? (state.picks.title === "My Mix" ? "내 믹스" : state.picks.title) : "빠른 선곡";
  const tracks = state.kind === "ready" ? state.picks.tracks : [];

  return (
    <Section
      className="mb-10"
      title={title}
      action={
        <div className="flex items-center gap-1">
          {tracks.length > 0 && (
            <>
              <button type="button" aria-label="재생" onClick={() => playList(tracks, 0)} className={`${button} bg-accent text-accent-ink`}>
                <PlayIcon size={16} weight="fill" />
              </button>
              <button
                type="button"
                aria-label="셔플 재생"
                onClick={() => playList([...tracks].sort(() => Math.random() - 0.5), 0)}
                className={`${button} bg-surface-2 text-fg`}
              >
                <ShuffleIcon size={16} weight="bold" />
              </button>
            </>
          )}
          <button type="button" aria-label="새로고침" onClick={() => void load()} className={`${button} text-fg-2`}>
            <ArrowClockwiseIcon size={16} weight="bold" />
          </button>
        </div>
      }
    >
      {(status === "unknown" || state.kind === "loading") && <TrackListSkeleton rows={5} />}
      {state.kind === "error" && (
        <div className="mx-4 flex flex-col items-start gap-3 text-sm text-fg-2 md:mx-6">
          <p>{state.message}</p>
          <button type="button" onClick={() => void load()} className="underline">
            다시 시도
          </button>
        </div>
      )}
      {status === "signedIn" && state.kind === "ready" && (
        <div className="px-2 md:px-3">
          <TrackList tracks={tracks} context={tracks} header={false} showAlbum={false} />
        </div>
      )}
    </Section>
  );
}
