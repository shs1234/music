import { PlayIcon, ShuffleIcon, SignInIcon } from "@phosphor-icons/react";
import { useEffect } from "react";
import { shuffled } from "../lib/format";
import { accountAvailable } from "../native/account";
import { usePlayer } from "../player/player";
import { useAccount } from "../stores/account";
import { usePicks } from "../stores/picks";
import { Section } from "./Page";
import { TrackListSkeleton, TrackShelf } from "./TrackList";

/**
 * The signed-in account's recommendations at the top of Home, one shelf each: YouTube Music's "Quick picks" (or
 * YouTube's My Mix), then YouTube Music's personalized mixes. Home refreshes them all at once.
 */
export function QuickPicks() {
  const mixes = usePicks((s) => s.mixes);
  const error = usePicks((s) => s.error);
  const playList = usePlayer((s) => s.playList);
  const status = useAccount((s) => s.status);
  const busy = useAccount((s) => s.busy);

  useEffect(() => {
    if (status === "unknown") void useAccount.getState().check();
    else if (status === "signedOut") usePicks.getState().clear();
    // Only the first time: after that the shelves are fetched again when the user refreshes.
    else if (!usePicks.getState().mixes) void usePicks.getState().refresh();
  }, [status]);

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

  const failed = error && (
    <div className="mx-4 flex flex-col items-start gap-3 text-sm text-fg-2 md:mx-6">
      <p>{error}</p>
      <button type="button" onClick={() => void usePicks.getState().refresh()} className="underline">
        다시 시도
      </button>
    </div>
  );

  if (!mixes?.length) {
    return (
      <Section className="mb-10" title="추천곡">
        {failed || <TrackListSkeleton rows={4} />}
      </Section>
    );
  }

  return (
    <div className="mb-10 flex flex-col gap-8">
      {failed}
      {mixes.map((mix) => (
        <Section
          key={mix.key}
          title={mix.title}
          action={
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={`${mix.title} 재생`}
                onClick={() => playList(mix.tracks, 0)}
                className={`${button} bg-accent text-accent-ink`}
              >
                <PlayIcon size={16} weight="fill" />
              </button>
              <button
                type="button"
                aria-label={`${mix.title} 셔플 재생`}
                onClick={() => playList(shuffled(mix.tracks), 0)}
                className={`${button} bg-surface-2 text-fg`}
              >
                <ShuffleIcon size={16} weight="bold" />
              </button>
            </div>
          }
        >
          <TrackShelf tracks={mix.tracks} />
        </Section>
      ))}
    </div>
  );
}
