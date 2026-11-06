import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CutoutTitle from "../components/CutoutTitle";
import {
  ACCESS_COOKIE,
  SpotifyError,
  spotifyGet,
  type Paging,
  type SimplifiedPlaylist,
} from "@/lib/spotify";

async function Playlists() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect("/login");

  let playlists: SimplifiedPlaylist[];
  try {
    const page = await spotifyGet<Paging<SimplifiedPlaylist>>("/me/playlists?limit=50", token);
    playlists = page.items.filter(Boolean);
  } catch (e) {
    if (e instanceof SpotifyError && e.status === 401) redirect("/login");
    throw e;
  }

  if (playlists.length === 0) {
    return <p className="text-white">No playlists found on your Spotify account.</p>;
  }

  // Placeholder grid — the CD cover design from Figma goes here.
  return (
    <ul className="grid w-full max-w-5xl grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
      {playlists.map((p) => (
        <li key={p.id} className="flex flex-col items-center gap-2">
          {p.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element -- Spotify CDN hosts vary
            <img
              src={p.images[0].url}
              alt=""
              className="aspect-square w-full rounded-full object-cover shadow-lg"
            />
          ) : (
            <div className="aspect-square w-full rounded-full bg-black/60" />
          )}
          <span className="text-center text-sm font-medium text-white drop-shadow">
            {p.name}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function CollectionPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center gap-10 bg-[url('/cover.png')] bg-cover bg-fixed bg-center bg-no-repeat px-4 pb-16">
      <header className="w-full px-4 pt-10 sm:pt-14">
        <CutoutTitle text="My Mixtape Collection" />
      </header>
      <Suspense fallback={<p className="text-white">Loading your mixtapes…</p>}>
        <Playlists />
      </Suspense>
      <form action="/api/auth/logout" method="post">
        <button className="text-sm text-white/80 underline">Log out</button>
      </form>
    </div>
  );
}
