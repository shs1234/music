import { create } from "zustand";
import { shuffled } from "../lib/format";
import type { Track } from "../lib/types";
import { MUSIC_MIXES, musicMix, picks, SignedOutError, videoMix } from "../native/account";
import { useAccount } from "./account";
import { useLibrary } from "./library";

/** One shelf on Home: the blended list, or one of YouTube Music's mixes. */
export interface Mix {
  key: string;
  title: string;
  tracks: Track[];
}

/**
 * Everything fetched for one shelf, of which the shelf shows a random handful: `take` tracks of each part.
 * Kept on the phone so that a refresh can show a new handful at once, without waiting for YouTube.
 */
interface Pool {
  key: string;
  title: string;
  parts: { tracks: Track[]; take: number }[];
}

/** How many tracks of a YouTube Music mix (50-65 in all) a shelf shows. */
const MIX_SIZE = 24;

/** Pools older than this are fetched again before a refresh shows anything: YouTube has likely remade its mixes. */
const POOL_MAX_AGE = 6 * 60 * 60 * 1000;

/** A new handful of a pool, in a new order. */
function sample(pool: Pool): Mix {
  const seen = new Set<string>();
  const tracks = shuffled(pool.parts.flatMap((p) => shuffled(p.tracks).slice(0, p.take))).filter((t) => !seen.has(t.id) && !!seen.add(t.id));
  return { key: pool.key, title: pool.title, tracks };
}

/**
 * My Mix comes back almost the same on every request, so it is blended with YouTube's mix for two tracks picked at
 * random from what the user played or liked: every fetch gives a different pool.
 */
async function blendPool(seeds: string[]): Promise<Omit<Pool, "key">> {
  const chosen = shuffled(seeds).slice(0, 2);
  const [mix, ...mixes] = await Promise.all([
    picks(seeds),
    ...chosen.map((id) => videoMix(id).catch(() => [] as Track[])),
  ]);
  // Quick picks (Premium) are a list of their own; My Mix gets the seed tracks' mixes blended in.
  if (mix.title !== "My Mix") return { title: mix.title, parts: [{ tracks: mix.tracks, take: mix.tracks.length }] };
  return { title: "내 믹스", parts: [{ tracks: mix.tracks, take: 25 }, ...mixes.map((m) => ({ tracks: m, take: 13 }))] };
}

/** Every shelf's pool, fetched together. `previous`: the pools there are now. */
async function loadPools(seeds: string[], previous: Pool[]): Promise<Pool[]> {
  const wanted: { key: string; load: () => Promise<Omit<Pool, "key">> }[] = [
    { key: "picks", load: () => blendPool(seeds) },
    // YouTube Music hands out the same mix, in the same order, for hours on end: a different handful of it each
    // time is what makes a refresh show something new.
    ...MUSIC_MIXES.map((m) => ({
      key: m.id,
      load: async () => ({ title: m.title, parts: [{ tracks: await musicMix(m.id), take: MIX_SIZE }] }),
    })),
  ];
  const results = await Promise.allSettled(wanted.map((w) => w.load()));
  const failures = results.flatMap((r) => (r.status === "rejected" ? [r.reason as Error] : []));
  const signedOut = failures.find((e) => e instanceof SignedOutError);
  if (signedOut) throw signedOut;
  if (failures.length === results.length) throw failures[0];
  const pools = wanted.flatMap((w, i): Pool[] => {
    const r = results[i]!;
    // A shelf whose request failed keeps what it had; one that came back empty is left out.
    if (r.status === "rejected") return previous.filter((p) => p.key === w.key);
    return r.value.parts.some((p) => p.tracks.length) ? [{ key: w.key, ...r.value }] : [];
  });
  if (!pools.length) throw new Error("추천곡이 비어 있어요. 계정에 시청 기록이 어느 정도 있어야 해요.");
  return pools;
}

function seeds(): string[] {
  const { history, favorites } = useLibrary.getState();
  return [...new Set([...history.slice(0, 30), ...favorites].map((t) => t.id))];
}

// Saved across app restarts: the shelves as shown, and the pools behind them with when they were fetched.
// Nothing is fetched on start; only a refresh does.
const KEY = "musike:picks";
const POOLS_KEY = "musike:picks-pools";

interface SavedPools {
  at: number;
  pools: Pool[];
}

function read<T>(key: string, valid: (v: any) => boolean): T | null {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return v && valid(v) ? (v as T) : null;
  } catch {
    return null;
  }
}

function save(key: string, value: unknown) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch {
    // storage unavailable or full: this just won't survive a restart
  }
}

const readMixes = () => read<Mix[]>(KEY, (m) => Array.isArray(m) && m.length > 0 && m.every((x) => x?.key && Array.isArray(x.tracks)));
const readPools = () =>
  read<SavedPools>(POOLS_KEY, (s) => typeof s.at === "number" && Array.isArray(s.pools) && s.pools.every((p: any) => p?.key && Array.isArray(p.parts)));

let saved: SavedPools | null = readPools();
/** The fetch going on behind an instant refresh, if any. */
let renewing = false;

/** Fetches the pools again and keeps them for the next refresh. */
async function renew(): Promise<Pool[]> {
  const pools = await loadPools(seeds(), saved?.pools ?? []);
  // Signed out while the requests were on their way: these are no longer wanted.
  if (useAccount.getState().status === "signedOut") return [];
  saved = { at: Date.now(), pools };
  save(POOLS_KEY, saved);
  return pools;
}

/** The signed-in account's recommendation shelves on Home, shared with the refresh controls around them. */
interface PicksState {
  mixes: Mix[] | null;
  /** Waiting for YouTube before there is anything new to show. */
  loading: boolean;
  error: string | null;
  /**
   * New shelves. With pools fetched in the last hours they come from those at once, and the pools are fetched again
   * behind that for the next time; otherwise the pools are fetched first. A failure keeps the shelves there were.
   */
  refresh: () => Promise<void>;
  /** Signed out: nothing to show or keep. */
  clear: () => void;
}

export const usePicks = create<PicksState>((set, get) => {
  const show = (pools: Pool[]) => {
    if (!pools.length) return;
    const mixes = pools.map(sample).filter((m) => m.tracks.length);
    save(KEY, mixes);
    set({ mixes });
  };
  const failed = (e: unknown, quiet: boolean) => {
    if (e instanceof SignedOutError) useAccount.getState().expired();
    else if (!quiet) set({ error: (e as Error).message || "추천곡을 불러오지 못했어요." });
  };

  return {
    mixes: readMixes(),
    loading: false,
    error: null,
    refresh: async () => {
      if (get().loading) return;
      if (saved && Date.now() - saved.at < POOL_MAX_AGE) {
        set({ error: null });
        show(saved.pools);
        if (renewing) return;
        renewing = true;
        // Nothing on screen depends on this: if it fails, the next refresh uses the pools there are.
        try {
          await renew();
        } catch (e) {
          failed(e, true);
        } finally {
          renewing = false;
        }
        return;
      }
      set({ loading: true, error: null });
      try {
        show(await renew());
      } catch (e) {
        failed(e, false);
      } finally {
        set({ loading: false });
      }
    },
    clear: () => {
      saved = null;
      save(POOLS_KEY, null);
      save(KEY, null);
      set({ mixes: null, error: null });
    },
  };
});
