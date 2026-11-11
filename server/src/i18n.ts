/**
 * Messages the server sends to people (errors, update progress). The app speaks Korean only; messages stay
 * keys translated when sent, so call sites read the same whatever the language.
 */

export type Lang = "ko";
type Params = Record<string, string | number>;

const ko = {
  invalidVideoId: "잘못된 동영상 ID예요.",
  emptyQuery: "검색어를 입력하세요.",
  searchFailed: "지금은 검색할 수 없어요 ({detail}). 잠시 후 다시 시도하세요.",
  missingTitle: "곡 제목을 입력하세요.",
  notBackup: "Musike 백업 파일이 아니에요.",
  newerBackup: "더 새로운 버전의 Musike에서 만든 백업이에요. 앱을 업데이트한 뒤 가져오세요.",
  idMismatch: "ID가 일치하지 않아요.",
  tracksRequired: "곡 목록을 보내 주세요.",
  invalidGenre: "잘못된 장르예요.",
  invalidOffset: "잘못된 위치예요.",
  invalidArtist: "잘못된 아티스트예요.",
  routeNotFound: "경로를 찾을 수 없어요.",
  noFreePort: "{from}~{to} 사이에 사용할 수 있는 포트가 없어요.",
  invalidTrack: "잘못된 곡이에요.",
  playlistNotFound: "재생목록을 찾을 수 없어요.",
  playlistNameRequired: "재생목록 이름을 입력하세요.",
  genresUnavailable: "지금은 장르를 불러올 수 없어요. 다시 시도하세요.",
  genreUnavailable: "지금은 이 장르를 열 수 없어요. 다시 시도하세요.",
  genreEmpty: "이 장르에서 찾은 것이 없어요.",
  artistUnavailable: "지금은 이 아티스트를 열 수 없어요. 다시 시도하세요.",
  artistNotFound: "아티스트를 찾을 수 없어요.",
  albumUnavailable: "지금은 이 앨범을 열 수 없어요. 다시 시도하세요.",
  albumNotFound: "앨범을 찾을 수 없어요.",
  invalidAlbum: "잘못된 앨범이에요.",
  ytdlpMissing: "이 컴퓨터에서 yt-dlp를 찾을 수 없어요. Musike 설정에서 설치하세요.",
  ytdlpTimeout: "yt-dlp 응답이 너무 오래 걸려요.",
  ytdlpCantRun: "yt-dlp를 실행할 수 없어요 ({error}). Musike 설정을 확인하세요.",
  botCheck: "YouTube가 이 연결에 봇이 아닌지 확인을 요구하고 있어요. VPN을 쓰고 있다면 끄고 다시 시도하세요.",
  videoUnavailable: "YouTube에서 볼 수 없는 동영상이에요.",
  ageRestricted: "연령 제한 동영상이에요. 로그인한 계정의 쿠키가 필요해요.",
  ytdlpFailed: "yt-dlp가 실패했어요.",
  ytdlpOutdated: "{detail} YouTube가 바뀌었을 수 있어요. 설정에서 yt-dlp를 업데이트하세요.",
  noAudio: "이 동영상에는 재생할 수 있는 오디오가 없어요.",
  noSdVideo: "이 동영상에는 SD 통합 버전이 없어요. HD를 사용하세요.",
  streamRefused: "YouTube가 스트림을 거부했어요 (HTTP {status}). 설정에서 yt-dlp를 업데이트해 보세요.",
  noWinget: "yt-dlp를 찾을 수 없고 winget도 사용할 수 없어요. 직접 설치하세요: https://github.com/yt-dlp/yt-dlp",
  installingYtdlp: "yt-dlp 설치 중",
  updatingYtdlp: "yt-dlp 업데이트 중",
  directUpdateFailed: "직접 업데이트에 실패해 winget으로 시도하는 중",
  downloadingTools: "GitHub에서 yt-dlp와 Deno 다운로드 중",
  alreadyLatest: "이미 최신 버전이에요 ({version})",
  ytdlpReady: "yt-dlp {version} 사용 준비 완료",
  updateFailed: "yt-dlp를 업데이트할 수 없어요.",
  toolMissing: "이 컴퓨터에서 {tool}을(를) 찾을 수 없어요.",
  downloadFailed: "{tool} 다운로드에 실패했어요 (HTTP {status}).",
  ffmpegPackage: "예상하지 못한 FFmpeg 패키지예요.",
};

export type MsgKey = keyof typeof ko;

const CATALOG: Record<Lang, Record<MsgKey, string>> = { ko };

/** A message translated when it is sent: a key plus the values for its {placeholders}. */
export interface Msg {
  key: MsgKey;
  params?: Params;
}

/** Something to show a person: a message to translate, or text that needs none (tool output). */
export type Text = Msg | string;

export const msg = (key: MsgKey, params?: Params): Msg => ({ key, params });

export function tr(lang: Lang, text: Text): string {
  if (typeof text === "string") return text;
  return CATALOG[lang][text.key].replace(/\{(\w+)\}/g, (all, name: string) => String(text.params?.[name] ?? all));
}

export const isLang = (v: unknown): v is Lang => v === "ko";

/** The language a request asked for (always Korean). */
export function langOf(req: { headers: Record<string, string | string[] | undefined> }): Lang {
  const asked = req.headers["x-musike-lang"];
  return isLang(asked) ? asked : "ko";
}

/** The code YouTube Music uses for its own words (genre names, artist bios). */
export const youtubeLang = (_lang: Lang) => "ko";
