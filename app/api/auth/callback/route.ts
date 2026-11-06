import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  STATE_COOKIE,
  accessCookieMaxAge,
  cookieOptions,
  exchangeCode,
  sameOriginUrl,
} from "@/lib/spotify";

// Spotify redirects here after the user approves (or cancels) login.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const savedState = request.cookies.get(STATE_COOKIE)?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(sameOriginUrl(`/login?error=${reason}`, request), 303);
    res.cookies.delete(STATE_COOKIE);
    return res;
  };

  if (error) return fail(error);
  if (!code || !state || state !== savedState) return fail("state_mismatch");

  try {
    const tokens = await exchangeCode(code);
    const res = NextResponse.redirect(sameOriginUrl("/collection", request), 303);
    res.cookies.delete(STATE_COOKIE);
    res.cookies.set(ACCESS_COOKIE, tokens.access_token, {
      ...cookieOptions,
      maxAge: accessCookieMaxAge(tokens.expires_in),
    });
    if (tokens.refresh_token) {
      res.cookies.set(REFRESH_COOKIE, tokens.refresh_token, {
        ...cookieOptions,
        maxAge: REFRESH_MAX_AGE,
      });
    }
    return res;
  } catch (e) {
    console.error(e);
    return fail("token_exchange_failed");
  }
}
