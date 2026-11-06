import { connection, NextResponse, type NextRequest } from "next/server";
import { STATE_COOKIE, authorizeUrl, cookieOptions } from "@/lib/spotify";

// Sends the user to Spotify's consent screen.
export async function GET(request: NextRequest) {
  // Only ever run per request: never prerender this at build time (env vars and
  // the random state value only make sense for a real visitor).
  await connection();

  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!redirectUri) {
    return new NextResponse("SPOTIFY_REDIRECT_URI is not set on the server.", { status: 500 });
  }

  // The state cookie must be set on the same origin Spotify redirects back to
  // (e.g. localhost vs 127.0.0.1 are different sites to the browser), so hop
  // over to the redirect URI's origin first if we're on a different one.
  // (nextUrl reflects the server's hostname in dev, so use the browser's Host header.
  // 303, not 307: Next dev treats localhost/127.0.0.1 as itself and rewrites 307s.)
  const callback = new URL(redirectUri);
  if (request.headers.get("host") !== callback.host) {
    return NextResponse.redirect(new URL(request.nextUrl.pathname, callback.origin), 303);
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(authorizeUrl(state));
  response.cookies.set(STATE_COOKIE, state, { ...cookieOptions, maxAge: 600 });
  return response;
}
