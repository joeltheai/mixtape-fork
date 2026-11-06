import CutoutTitle from "../components/CutoutTitle";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center bg-[url('/cover.png')] bg-cover bg-fixed bg-center bg-no-repeat px-4">
      <header className="w-full px-4 pt-10 sm:pt-14">
        <CutoutTitle text="Login with Spotify" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center pb-24">
        {/* Plain <a>, not <Link>: this hits a route handler that redirects to Spotify. */}
        <a
          href="/api/auth/login"
          className="bg-white px-10 py-2 text-3xl uppercase tracking-widest text-black shadow-[4px_4px_0_rgba(0,0,0,0.8)] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(0,0,0,0.8)]"
        >
          Login
        </a>
      </main>
    </div>
  );
}
