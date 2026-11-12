import { Capacitor, registerPlugin } from "@capacitor/core";
import type { Track } from "../lib/types";
import { nativeFetch } from "./http";

/**
 * The signed-in home feed. MusikeAuthPlugin.java signs in to YouTube Music in a WebView and keeps
 * the music.youtube.com cookies; the requests here carry them with a SAPISIDHASH Authorization header, the way the
 * YouTube Music website does.
 *
 * 1st: "Quick picks" from the YouTube Music home (WEB_REMIX, browse FEmusic_home).
 * 2nd: YouTube's "My Mix" (WEB, next playlistId=RDMM). In some countries (Korea) YouTube Music is Premium-only,
 *      so a free account's home comes back empty while My Mix still works.
 *
 * Next to it: YouTube Music's own personalized mixes (WEB_REMIX, next playlistId=RDTMAK5uy_…), which free accounts get
 * there too.
 */

interface AuthPlugin {
  status(): Promise<{ cookie: string | null }>;
  login(): Promise<{ cookie: string | null }>;
  logout(options?: { forgetGoogle?: boolean }): Promise<{ cookie: string | null }>;
}

const Auth = registerPlugin<AuthPlugin>("MusikeAuth", {
  web: () => ({
    status: async () => ({ cookie: null }),
    login: async () => ({ cookie: null }),
    logout: async () => ({ cookie: null }),
  }),
});

export const accountAvailable = () => Capacitor.getPlatform() === "android";

export class SignedOutError extends Error {
  constructor() {
    super("YouTube Music에서 로그아웃되었어요.");
  }
}

export interface Picks {
  /** The shelf's title as YouTube words it ("빠른 선곡", "Quick picks") or "My Mix". */
  title: string;
  tracks: Track[];
}

export const signedIn = async () => !!(await Auth.status()).cookie;
export const signIn = async () => !!(await Auth.login()).cookie;
/** `forgetGoogle`: also sign the Google account out of the login page (to switch accounts). */
export const signOut = async (forgetGoogle = false) => {
  await Auth.logout({ forgetGoogle });
};

const MUSIC = "https://music.youtube.com";
const YT = "https://www.youtube.com";
const WEB_REMIX = { name: "WEB_REMIX", id: "67", version: "1.20261104.01.00" };
const WEB = { name: "WEB", id: "1", version: "2.20261105.01.00" };
const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const QUICK_PICKS_TITLES = new Set(["빠른 선곡", "Quick picks", "Escolhas rápidas"]);

/**
 * `seeds`: video ids the user played or liked. My Mix itself barely changes between requests, so it is asked to start
 * from one of them at random, which gives a different window of the mix each time.
 */
export async function picks(seeds: string[] = []): Promise<Picks> {
  const { cookie } = await Auth.status();
  if (!cookie) throw new SignedOutError();
  try {
    const quick = await quickPicks(cookie);
    if (quick.tracks.length) return quick;
  } catch (e) {
    if (e instanceof SignedOutError) throw e;
    // no Quick picks for this account or country: My Mix instead
  }
  return myMix(cookie, seeds[Math.floor(Math.random() * seeds.length)]);
}

async function quickPicks(cookie: string): Promise<Picks> {
  const json = await post(cookie, MUSIC, "browse", WEB_REMIX, { browseId: "FEmusic_home" });
  const shelves: any[] = (
    json?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ?? []
  )
    .map((s: any) => s?.musicCarouselShelfRenderer)
    .filter(Boolean);
  const titleOf = (s: any): string => runs(s?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs);
  const shelf =
    shelves.find((s) => QUICK_PICKS_TITLES.has(titleOf(s))) ??
    shelves.find((s) => (s.contents ?? []).some((c: any) => c?.musicResponsiveListItemRenderer));
  if (!shelf) return { title: "", tracks: [] };
  const tracks = unique((shelf.contents ?? []).map((c: any) => c?.musicResponsiveListItemRenderer).map(musicItem));
  return { title: titleOf(shelf) || "Quick picks", tracks };
}

async function myMix(cookie: string, seed?: string): Promise<Picks> {
  const json = await post(cookie, YT, "next", WEB, seed ? { playlistId: "RDMM", videoId: seed } : { playlistId: "RDMM" });
  const items: any[] = json?.contents?.twoColumnWatchNextResults?.playlist?.playlist?.contents ?? [];
  const tracks = unique(items.map((c) => c?.playlistPanelVideoRenderer).map(panelItem));
  if (!tracks.length && seed) return myMix(cookie);
  if (!tracks.length) throw new Error("내 믹스가 비어 있어요. 계정에 시청 기록이 어느 정도 있어야 해요.");
  return { title: "My Mix", tracks };
}

/**
 * YouTube's own mix for one video (playlist "RD" + id), asked as the signed-in user so it leans on their taste.
 */
export async function videoMix(id: string): Promise<Track[]> {
  const { cookie } = await Auth.status();
  if (!cookie) throw new SignedOutError();
  const json = await post(cookie, YT, "next", WEB, { videoId: id, playlistId: `RD${id}` });
  const items: any[] = json?.contents?.twoColumnWatchNextResults?.playlist?.playlist?.contents ?? [];
  return unique(items.map((c) => c?.playlistPanelVideoRenderer).map(panelItem)).filter((t) => t.id !== id);
}

/** YouTube Music's personalized mixes. The playlist ids are the same for every account; what is in them is not. */
export const MUSIC_MIXES = [
  { id: "RDTMAK5uy_kset8DisdE7LSD4TNjEVvrKRTmG7a56sY", title: "나만의 믹스" },
  { id: "RDTMAK5uy_n_5IN6hzAOwdCnM8D8rzrs3vDl12UcZpA", title: "나만을 위한 추천 믹스" },
  { id: "RDTMAK5uy_lr0LWzGrq6FU9GIxWvFHTRPQD2LHMqlFA", title: "최신음악 믹스" },
  { id: "RDTMAK5uy_mZtXeU08kxXJOUhL0ETdAuZTh1z7aAFAo", title: "보관 콘텐츠 믹스" },
] as const;

/**
 * One of YouTube Music's mixes (WEB_REMIX, next playlistId). Unlike the home feed, the mixes are served to free
 * accounts in Premium-only countries too. Only the first page (about 24 tracks) is read.
 */
export async function musicMix(playlistId: string): Promise<Track[]> {
  const { cookie } = await Auth.status();
  if (!cookie) throw new SignedOutError();
  const json = await post(cookie, MUSIC, "next", WEB_REMIX, { playlistId });
  const items: any[] =
    json?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer
      ?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents ?? [];
  return unique(items.map((c) => c?.playlistPanelVideoRenderer).map(queueItem));
}

function musicItem(r: any): Track | null {
  if (!r) return null;
  const id: string | undefined =
    r.playlistItemData?.videoId ??
    r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
  if (!id) return null;
  const columns: any[][] = (r.flexColumns ?? []).map((c: any) => c?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ?? []);
  // Second column: "Artist • Album" or "Artist • 1.2M views". Artist runs link to a channel.
  const second = columns[1] ?? [];
  const artists = second.filter((x) => x?.navigationEndpoint?.browseEndpoint?.browseId?.startsWith("UC")).map((x) => x.text);
  const album = second.find((x) => x?.navigationEndpoint?.browseEndpoint?.browseId?.startsWith("MPRE"))?.text;
  const thumbs: any[] = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? [];
  return {
    id,
    title: runs(columns[0]),
    artist: artists.join(", ") || second[0]?.text || "",
    album,
    duration: 0,
    ...cover(id, thumbs[thumbs.length - 1]?.url ?? ""),
  };
}

/** A track of a YouTube Music queue (the `next` response of WEB_REMIX). */
function queueItem(r: any): Track | null {
  const id: string | undefined = r?.videoId;
  if (!id) return null;
  const thumbs: any[] = r.thumbnail?.thumbnails ?? [];
  return {
    id,
    title: runs(r.title?.runs),
    artist: runs(r.shortBylineText?.runs),
    duration: seconds(runs(r.lengthText?.runs)),
    ...cover(id, thumbs[thumbs.length - 1]?.url ?? ""),
  };
}

/** Songs carry a square cover on Google's image host, resized by its URL suffix; videos only have their own frame. */
function cover(id: string, thumb: string): Pick<Track, "thumb" | "art" | "kind"> {
  const square = /googleusercontent\.com|ggpht\.com/.test(thumb);
  return {
    thumb: square ? thumb.replace(/=w\d+-h\d+[^&]*$/, "=w120-h120-l90-rj") : `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    art: square ? thumb.replace(/=w\d+-h\d+[^&]*$/, "=w544-h544-l90-rj") : `https://i.ytimg.com/vi/${id}/hq720.jpg`,
    kind: square ? "song" : "video",
  };
}

/** "3:05" or "1:02:03" in seconds. */
const seconds = (length: string): number => length.split(":").reduce((acc, p) => acc * 60 + (Number(p) || 0), 0);

function panelItem(r: any): Track | null {
  const id: string | undefined = r?.videoId;
  if (!id) return null;
  return {
    id,
    title: r.title?.simpleText ?? runs(r.title?.runs),
    artist: runs(r.shortBylineText?.runs ?? r.longBylineText?.runs),
    duration: seconds(r.lengthText?.simpleText ?? ""),
    thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    art: `https://i.ytimg.com/vi/${id}/hq720.jpg`,
    kind: "video",
  };
}

const runs = (r: any[] | undefined): string => (r ?? []).map((x) => x?.text ?? "").join("");

function unique(list: (Track | null)[]): Track[] {
  const seen = new Set<string>();
  return list.filter((t): t is Track => !!t && !seen.has(t.id) && !!seen.add(t.id));
}

async function post(cookie: string, origin: string, endpoint: string, client: typeof WEB, params: object): Promise<any> {
  const body = { ...params, context: { client: { clientName: client.name, clientVersion: client.version, hl: "ko", gl: "KR" } } };
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": DESKTOP_UA,
    cookie,
    origin,
    referer: `${origin}/`,
    "x-origin": origin,
    "x-goog-authuser": "0",
    "x-youtube-client-name": client.id,
    "x-youtube-client-version": client.version,
  };
  const auth = await authorization(cookie, origin);
  if (auth) headers.authorization = auth;
  const res = await nativeFetch(`${origin}/youtubei/v1/${endpoint}?prettyPrint=false`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (res.status === 401 || res.status === 403) throw new SignedOutError();
  if (!res.ok) throw new Error(`YouTube 요청이 실패했어요 (HTTP ${res.status}).`);
  const json = await res.json();
  if (!loggedIn(json)) throw new SignedOutError();
  return json;
}

/** The logged_in tracking param is "0" when the cookies no longer sign in. */
function loggedIn(json: any): boolean {
  const params: any[] = (json?.responseContext?.serviceTrackingParams ?? []).flatMap((s: any) => s?.params ?? []);
  const flag = params.find((p) => p?.key === "logged_in") ?? params.find((p) => p?.key === "yt_li");
  return flag?.value !== "0";
}

function parseCookie(cookie: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of cookie.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) map.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  return map;
}

async function sha1(s: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** SAPISIDHASH (with the 1P/3P variants), as music.youtube.com sends it. */
async function authorization(cookie: string, origin: string): Promise<string | null> {
  const c = parseCookie(cookie);
  const ts = Math.floor(Date.now() / 1000);
  const hash = async (name: string, sid: string | undefined) => (sid ? `${name} ${ts}_${await sha1(`${ts} ${sid} ${origin}`)}` : null);
  const parts = await Promise.all([
    hash("SAPISIDHASH", c.get("SAPISID") ?? c.get("__Secure-3PAPISID")),
    hash("SAPISID1PHASH", c.get("__Secure-1PAPISID")),
    hash("SAPISID3PHASH", c.get("__Secure-3PAPISID")),
  ]);
  const header = parts.filter(Boolean).join(" ");
  return header || null;
}
