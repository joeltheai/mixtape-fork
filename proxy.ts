import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieMaxAge,
  cookieOptions,
  refreshAccessToken,
  sameOriginUrl,
} from "@/lib/spotify";

// Gatekeeper for every page:
// - logged in            → /login and / go to /collection, other pages load
// - access token expired → silently refresh it using the refresh token
// - logged out           → everything goes to /login
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = pathname === "/login";
  const to = (path: string) => sameOriginUrl(path, request);

  let loggedIn = request.cookies.has(ACCESS_COOKIE);
  let refreshed: { token: string; maxAge: number } | null = null;

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!loggedIn && refreshToken) {
    try {
      const tokens = await refreshAccessToken(refreshToken);
      refreshed = {
        token: tokens.access_token,
        maxAge: accessCookieMaxAge(tokens.expires_in),
      };
      loggedIn = true;
      // Make the new token visible to the page rendering this same request.
      request.cookies.set(ACCESS_COOKIE, tokens.access_token);
    } catch (e) {
      console.error(e);
    }
  }

  let response: NextResponse;
  if (loggedIn) {
    response =
      isPublic || pathname === "/"
        ? NextResponse.redirect(to("/collection"))
        : NextResponse.next({ request });
  } else {
    response = isPublic ? NextResponse.next() : NextResponse.redirect(to("/login"));
    if (refreshToken) response.cookies.delete(REFRESH_COOKIE); // refresh failed
  }

  if (refreshed) {
    response.cookies.set(ACCESS_COOKIE, refreshed.token, {
      ...cookieOptions,
      maxAge: refreshed.maxAge,
    });
  }
  return response;
}

export const config = {
  matcher: ["/", "/login", "/collection/:path*", "/tracklist/:path*", "/player/:path*"],
};
