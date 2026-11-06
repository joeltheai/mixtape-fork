export const ACCESS_COOKIE = "sp_access";
export const REFRESH_COOKIE = "sp_refresh";
export const STATE_COOKIE = "sp_auth_state";

export const SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
};

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

export function authorizeUrl(state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env("SPOTIFY_CLIENT_ID"),
    scope: SCOPES,
    redirect_uri: env("SPOTIFY_REDIRECT_URI"),
    state,
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  const basic = Buffer.from(
    `${env("SPOTIFY_CLIENT_ID")}:${env("SPOTIFY_CLIENT_SECRET")}`,
  ).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export function exchangeCode(code: string) {
  return requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: env("SPOTIFY_REDIRECT_URI"),
  });
}

export function refreshAccessToken(refreshToken: string) {
  return requestToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}

// Access token cookie expires a minute early so we refresh before Spotify rejects it.
export function accessCookieMaxAge(expiresIn: number) {
  return Math.max(expiresIn - 60, 60);
}
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export async function spotifyGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new SpotifyError(res.status, await res.text());
  }
  return res.json();
}

export class SpotifyError extends Error {
  constructor(public status: number, body: string) {
    super(`Spotify API ${status}: ${body}`);
  }
}

export type SpotifyImage = { url: string; width: number | null; height: number | null };

export type SimplifiedPlaylist = {
  id: string;
  name: string;
  images: SpotifyImage[] | null;
  owner: { display_name: string | null };
};

export type Paging<T> = { items: T[]; next: string | null; total: number };

// Build an absolute URL on the origin the browser actually used. In dev,
// request.url reports the server's hostname (e.g. localhost) even when the
// browser is on 127.0.0.1, and cookies don't carry across the two.
export function sameOriginUrl(path: string, request: Request) {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return new URL(path, host ? `${proto}://${host}` : request.url);
}
