import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, sameOriginUrl } from "@/lib/spotify";

// POST (from a form button) so link prefetching can never log the user out.
export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(sameOriginUrl("/login", request), 303);
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}
