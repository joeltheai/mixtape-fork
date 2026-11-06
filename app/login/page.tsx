import { Suspense } from "react";
import CutoutTitle from "../components/CutoutTitle";

const ERRORS: Record<string, string> = {
  access_denied: "Login was cancelled.",
  state_mismatch: "Login expired. Please try again.",
  token_exchange_failed: "Couldn't finish logging in with Spotify. Please try again.",
};

async function LoginError({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  if (typeof error !== "string") return null;
  return (
    <p className="rounded bg-black/70 px-4 py-2 text-sm text-white">
      {ERRORS[error] ?? `Login failed (${error}).`}
    </p>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center bg-[url('/cover.png')] bg-cover bg-fixed bg-center bg-no-repeat px-4">
      <header className="w-full px-4 pt-10 sm:pt-14">
        <CutoutTitle text="Login" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-10 pb-24">
        <p className="text-center text-lg font-semibold uppercase tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-xl">
          Login with your Spotify details
        </p>

        {/* Plain <a>, not <Link>: this hits a route handler that redirects to Spotify. */}
        <a
          href="/api/auth/login"
          className="bg-white px-10 py-3 text-lg font-bold uppercase tracking-widest text-black shadow-[4px_4px_0_rgba(0,0,0,0.8)] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(0,0,0,0.8)]"
        >
          Login
        </a>

        <Suspense>
          <LoginError {...props} />
        </Suspense>
      </main>
    </div>
  );
}
