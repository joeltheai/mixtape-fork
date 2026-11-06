import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, SpotifyError } from "./spotify";
import { getPlaylistTracks } from "./playlist";

/** The current Spotify access token, or a redirect to /login. */
export async function requireAccessToken() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect("/login");
  return token;
}

/** Run a Spotify call; an expired/invalid token sends the user to /login. */
export async function withSpotify<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const token = await requireAccessToken();
  try {
    return await fn(token);
  } catch (e) {
    if (e instanceof SpotifyError && e.status === 401) redirect("/login");
    throw e;
  }
}

/** A playlist's tracks; an expired token sends the user to /login. */
export async function loadPlaylistTracks(playlistId: string) {
  const token = await requireAccessToken();
  const result = await getPlaylistTracks(playlistId, token);
  if (!result.ok) {
    if (result.status === 401) redirect("/login");
    console.error(`Playlist ${playlistId}: Spotify ${result.status} ${result.message}`);
  }
  return result;
}
