import { cacheLife } from "next/cache";
import type { SpotifyImage } from "./spotify";

type ApiTrack = {
  type?: string;
  uri: string;
  name: string;
  artists?: { name: string }[];
  album?: { images?: SpotifyImage[] };
  images?: SpotifyImage[]; // podcast episodes
};
type ApiPlaylistItem = { track?: ApiTrack | null; item?: ApiTrack | null };

export type PlaylistTrack = {
  /** 0-based position in the playlist — what Spotify's play `offset` expects. */
  position: number;
  uri: string;
  name: string;
  artists: string;
  cover?: string;
};

// Only ask Spotify for the fields we display (items are `item` in the current API,
// `track` in older responses). Keeps each page of a big playlist small.
const TRACK_FIELDS = "type,uri,name,artists(name),album(images),images";
const ITEMS_FIELDS = `next,items(item(${TRACK_FIELDS}),track(${TRACK_FIELDS}))`;

export type TracksResult =
  | { ok: true; tracks: PlaylistTrack[] }
  | { ok: false; status: number; message: string };

/** Every track in a playlist, or the Spotify error status. */
export async function getPlaylistTracks(
  playlistId: string,
  accessToken: string,
): Promise<TracksResult> {
  try {
    return { ok: true, tracks: await fetchPlaylistTracks(playlistId, accessToken) };
  } catch (e) {
    const m = /^spotify:(\d+):([\s\S]*)$/.exec(e instanceof Error ? e.message : "");
    if (!m) throw e;
    return { ok: false, status: Number(m[1]), message: m[2] };
  }
}

/**
 * Follows Spotify's pagination. Cached for a few minutes per token + playlist,
 * so opening the player right after the tracklist doesn't download the whole
 * playlist again. Failures throw, so they're never cached.
 */
async function fetchPlaylistTracks(
  playlistId: string,
  accessToken: string,
): Promise<PlaylistTrack[]> {
  "use cache";
  cacheLife("minutes");

  let url: string | null =
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items` +
    `?limit=50&fields=${encodeURIComponent(ITEMS_FIELDS)}`;

  const items: ApiPlaylistItem[] = [];
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`spotify:${res.status}:${await res.text()}`);
    const page: { items: ApiPlaylistItem[]; next: string | null } = await res.json();
    items.push(...page.items);
    url = page.next;
  }

  const tracks: PlaylistTrack[] = [];
  items.forEach((it, position) => {
    const t = it?.item ?? it?.track;
    if (!t?.name) return; // removed/unavailable items: keep positions aligned, skip display
    tracks.push({
      position,
      uri: t.uri,
      name: t.name,
      artists: (t.artists ?? []).map((a) => a.name).join(", "),
      cover: (t.album?.images ?? t.images)?.[0]?.url,
    });
  });
  return tracks;
}
