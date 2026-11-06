import { Suspense } from "react";
import Link from "next/link";
import CutoutTitle from "../../components/CutoutTitle";
import PixelIcon from "../../components/PixelIcon";
import { withSpotify } from "@/lib/session";
import { getPlaylistTracks, SpotifyError } from "@/lib/spotify";

// Small alternating tilts so each strip looks hand-glued.
const TILTS = [-0.6, 0.4, -0.3, 0.7, -0.5, 0.2, 0.5, -0.7];

async function Tracks({ params }: { params: PageProps<"/tracklist/[playlistId]">["params"] }) {
  const { playlistId } = await params;

  let tracks;
  try {
    tracks = await withSpotify((token) => getPlaylistTracks(playlistId, token));
  } catch (e) {
    if (e instanceof SpotifyError && (e.status === 403 || e.status === 404)) {
      return <p className="text-2xl text-white">Couldn&apos;t open this playlist.</p>;
    }
    throw e;
  }

  if (tracks.length === 0) {
    return <p className="text-2xl text-white">This mixtape is empty.</p>;
  }

  return (
    // CSS columns fill top-to-bottom, so 1–11 sit on the left and 12–22 on the right.
    <ol className="w-full max-w-4xl columns-1 gap-8 sm:columns-2">
      {tracks.map((t, i) => (
        <li key={t.position} className="mb-3 break-inside-avoid">
          <Link
            href={`/player/${playlistId}?track=${t.position + 1}`}
            className="block bg-[url('/assets/paper.png')] bg-size-[100%_100%] bg-no-repeat px-7 py-3 text-xl text-black transition-transform hover:scale-[1.02] sm:text-2xl"
            style={{ rotate: `${TILTS[i % TILTS.length]}deg` }}
          >
            <span className="block truncate">
              {t.position + 1}. {t.name}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default function TracklistPage(props: PageProps<"/tracklist/[playlistId]">) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center gap-8 bg-[url('/cover.png')] bg-cover bg-fixed bg-center bg-no-repeat px-4 pb-16">
      <header className="relative w-full px-4 pt-10 sm:pt-14">
        <Link
          href="/collection"
          aria-label="Back to collection"
          className="absolute left-4 top-6 text-white sm:left-8"
        >
          <PixelIcon name="home" size={30} />
        </Link>
        <CutoutTitle text="Track List" />
      </header>
      <Suspense fallback={<p className="text-2xl text-white">Unpacking the tracks…</p>}>
        <Tracks params={props.params} />
      </Suspense>
    </div>
  );
}
