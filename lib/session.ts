import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, SpotifyError } from "./spotify";

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
