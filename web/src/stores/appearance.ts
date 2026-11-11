import { create } from "zustand";

/** How the app looks and what it shows, per device. The Now Playing panel lives in the UI store (it has a button too). */
export interface Appearance {
  sidebarPlaylists: boolean;
  compactSidebar: boolean;
  albumColumn: boolean;
  texture: boolean;
  homeShortcuts: boolean;
  homeRecent: boolean;
  homeFavorites: boolean;
}

export const DEFAULT_APPEARANCE: Appearance = {
  sidebarPlaylists: true,
  compactSidebar: false,
  albumColumn: true,
  texture: true,
  homeShortcuts: true,
  homeRecent: true,
  homeFavorites: true,
};

const KEY = "musike:appearance";
// Left by versions that let the accent colour be changed; the app now has one (styles.css).
const OLD_ACCENT_CSS_KEY = "musike:accent-css";

/** Keeps only known keys with the right types: the value may come from an old version or a backup file. */
export function cleanAppearance(input: unknown): Appearance {
  const v = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: Appearance = { ...DEFAULT_APPEARANCE };
  for (const k of Object.keys(DEFAULT_APPEARANCE) as (keyof Appearance)[]) {
    if (typeof v[k] === "boolean") out[k] = v[k];
  }
  return out;
}

function read(): Appearance {
  try {
    return cleanAppearance(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

/** Applies the two switches read by stylesheets (compact rail, texture). */
function apply(a: Appearance) {
  const root = document.documentElement;
  if (a.compactSidebar) root.dataset.rail = "compact";
  else delete root.dataset.rail;
  if (a.texture) delete root.dataset.texture;
  else root.dataset.texture = "off";
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
    localStorage.removeItem(OLD_ACCENT_CSS_KEY);
  } catch {
    /* private mode */
  }
}

interface AppearanceState extends Appearance {
  set: (patch: Partial<Appearance>) => void;
  reset: () => void;
}

const initial = read();
apply(initial);

export const useAppearance = create<AppearanceState>((set, get) => ({
  ...initial,
  set: (patch) => {
    const { set: _s, reset: _r, ...current } = get();
    const next = cleanAppearance({ ...current, ...patch });
    apply(next);
    set(next);
  },
  reset: () => {
    apply(DEFAULT_APPEARANCE);
    set({ ...DEFAULT_APPEARANCE });
  },
}));

/** The current preferences without the store's functions (for backups). */
export function currentAppearance(): Appearance {
  const { set: _s, reset: _r, ...a } = useAppearance.getState();
  return a;
}
