import { create } from "zustand";
import { shuffled } from "../lib/format";
import type { Track } from "../lib/types";
import { MUSIC_MIXES, musicMix, picks, SignedOutError, videoMix, type Picks } from "../native/account";
import { useAccount } from "./account";
import { useLibrary } from "./library";

/** One shelf on Home: the blended list, or one of YouTube Music's mixes. */
export interface Mix {
  key: string;
  title: string;
  tracks: Track[];
}

/**
 * My Mix comes back almost the same on every request, so it is blended with YouTube's mix for two tracks picked at
 * random from what the user played or liked: every refresh gives a different list.
 */
async function blended(seeds: string[]): Promise<Picks> {
  const chosen = shuffled(seeds).slice(0, 2);
  const [mix, ...mixes] = await Promise.all([
    picks(seeds),
    ...chosen.map((id) => videoMix(id).catch(() => [] as Track[])),
  ]);
  // Quick picks (Premium) already change on their own; My Mix gets the seed tracks' mixes blended in.
  if (mix.title !== "My Mix") return mix;
  const pools = [shuffled(mix.tracks).slice(0, 25), ...mixes.map((m) => shuffled(m).slice(0, 13))];
  const seen = new Set<string>();
  const tracks = shuffled(pools.flat()).filter((t) => !seen.has(t.id) && !!seen.add(t.id));
  return { title: mix.title, tracks };
}

/** Every shelf, fetched together. `previous`: what is on screen now. */
async function loadMixes(seeds: string[], previous: Mix[]): Promise<Mix[]> {
  const wanted: { key: string; load: () => Promise<Omit<Mix, "key">> }[] = [
    {
      key: "picks",
      load: async () => {
        const p = await blended(seeds);
        return { title: p.title === "My Mix" ? "내 믹스" : p.title, tracks: p.tracks };
      },
    },
    ...MUSIC_MIXES.map((m) => ({ key: m.id, load: async () => ({ title: m.title, tracks: await musicMix(m.id) }) })),
  ];
  const results = await Promise.allSettled(wanted.map((w) => w.load()));
  const failures = results.flatMap((r) => (r.status === "rejected" ? [r.reason as Error] : []));
  const signedOut = failures.find((e) => e instanceof SignedOutError);
  if (signedOut) throw signedOut;
  if (failures.length === results.length) throw failures[0];
  const mixes = wanted.flatMap((w, i): Mix[] => {
    const r = results[i]!;
    // A shelf whose request failed keeps what it had; one that came back empty is left out.
    if (r.status === "rejected") return previous.filter((m) => m.key === w.key);
    return r.value.tracks.length ? [{ key: w.key, ...r.value }] : [];
  });
  if (!mixes.length) throw new Error("추천곡이 비어 있어요. 계정에 시청 기록이 어느 정도 있어야 해요.");
  return mixes;
}

// Saved across app restarts: after the first load the shelves are only fetched again when the user refreshes.
const KEY = "musike:picks";

function read(): Mix[] | null {
  try {
    const m = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return Array.isArray(m) && m.length && m.every((x) => x?.key && Array.isArray(x.tracks)) ? m : null;
  } catch {
    return null;
  }
}

function save(m: Mix[] | null) {
  try {
    if (m) localStorage.setItem(KEY, JSON.stringify(m));
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable: the shelves just won't survive a restart
  }
}

/** The signed-in account's recommendation shelves on Home, shared with the refresh controls around them. */
interface PicksState {
  mixes: Mix[] | null;
  loading: boolean;
  error: string | null;
  /** Fetches every shelf again. A failure keeps the shelves there were. */
  refresh: () => Promise<void>;
  /** Signed out: nothing to show or keep. */
  clear: () => void;
}

export const usePicks = create<PicksState>((set, get) => ({
  mixes: read(),
  loading: false,
  error: null,
  refresh: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const { history, favorites } = useLibrary.getState();
      const seeds = [...new Set([...history.slice(0, 30), ...favorites].map((t) => t.id))];
      const mixes = await loadMixes(seeds, get().mixes ?? []);
      // Signed out while the requests were on their way: these are no longer wanted.
      if (useAccount.getState().status === "signedOut") return;
      save(mixes);
      set({ mixes });
    } catch (e) {
      if (e instanceof SignedOutError) useAccount.getState().expired();
      else set({ error: (e as Error).message || "추천곡을 불러오지 못했어요." });
    } finally {
      set({ loading: false });
    }
  },
  clear: () => {
    save(null);
    set({ mixes: null, error: null });
  },
}));
