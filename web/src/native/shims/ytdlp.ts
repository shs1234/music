// Stands in for server/src/ytdlp.ts in the Android build. There is no yt-dlp on a phone: search goes through
// YouTube Music only, and streams are resolved by native/streams.ts.

export interface SearchEntry {
  id: string;
  title: string;
  duration?: number;
  channel?: string;
  uploader?: string;
}

export async function ytdlpSearch(_query: string): Promise<SearchEntry[]> {
  throw new Error("지금은 검색할 수 없어요. 잠시 후 다시 시도하세요.");
}
