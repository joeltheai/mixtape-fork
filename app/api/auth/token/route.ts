import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieMaxAge,
  cookieOptions,
  refreshAccessToken,
} from "@/lib/spotify";

// The Web Playback SDK runs in the browser and needs the access token itself.
// Tokens stay in httpOnly cookies; this hands the current one to our own page,
// refreshing it first if it has expired.
export async function GET(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (access) return NextResponse.json({ accessToken: access });

  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });

  try {
    const tokens = await refreshAccessToken(refresh);
    const res = NextResponse.json({ accessToken: tokens.access_token });
    res.cookies.set(ACCESS_COOKIE, tokens.access_token, {
      ...cookieOptions,
      maxAge: accessCookieMaxAge(tokens.expires_in),
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "refresh_failed" }, { status: 401 });
  }
}
