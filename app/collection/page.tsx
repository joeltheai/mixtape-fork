import { Suspense } from "react";
import Link from "next/link";
import CutoutTitle from "../components/CutoutTitle";
import CdCase from "../components/CdCase";
import { withSpotify } from "@/lib/session";
import { spotifyGet, type Paging, type SimplifiedPlaylist } from "@/lib/spotify";

async function Playlists() {
  const [me, page] = await withSpotify((token) =>
    Promise.all([
      spotifyGet<{ id: string }>("/me", token),
      spotifyGet<Paging<SimplifiedPlaylist>>("/me/playlists?limit=50", token),
    ]),
  );
  // Apps in Spotify's Development Mode can only read the tracks of playlists the
  // user owns or collaborates on (others return 403), so only show those.
  const playlists = page.items.filter(
    (p) => p && (p.owner.id === me.id || p.collaborative),
  );

  if (playlists.length === 0) {
    return <p className="text-2xl text-white">No playlists found on your Spotify account.</p>;
  }

  return (
    <ul className="grid w-full max-w-6xl grid-cols-4 gap-x-8 gap-y-14 sm:gap-x-14 sm:gap-y-20 sm:px-6">
      {playlists.map((p) => (
        <li key={p.id}>
          <Link
            href={`/tracklist/${p.id}`}
            className="group flex flex-col items-center gap-2"
          >
            <div className="w-full transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-1">
              <CdCase cover={p.images?.[0]?.url} />
            </div>
            <span className="text-center text-lg leading-tight text-white sm:text-2xl">
              {p.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function CollectionPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center gap-10 bg-grey-noise px-4 pb-16">
      <header className="w-full px-4 pt-10 pb-10 sm:pt-14 sm:pb-16">
        <CutoutTitle text="My Mixtape Collection" />
      </header>
      <Suspense fallback={<p className="text-2xl text-white">Loading your mixtapes…</p>}>
        <Playlists />
      </Suspense>
      <form action="/api/auth/logout" method="post">
        <button className="text-xl text-white/80 underline">Log out</button>
      </form>
    </div>
  );
}
