import { Suspense } from "react";
import { withSpotify } from "@/lib/session";
import { getPlaylistTracks } from "@/lib/spotify";
import Player from "./Player";

async function PlayerLoader({ params, searchParams }: PageProps<"/player/[playlistId]">) {
  const { playlistId } = await params;
  const { track } = await searchParams;
  const tracks = await withSpotify((token) => getPlaylistTracks(playlistId, token));

  // ?track= is the 1-based track number shown on the tracklist.
  const wanted = Number(typeof track === "string" ? track : 1) - 1;
  const start = tracks.find((t) => t.position === wanted) ?? tracks[0];

  if (!start) {
    return <p className="m-auto text-3xl text-white">This mixtape is empty.</p>;
  }

  return (
    <Player
      key={`${playlistId}-${start.position}`}
      playlistId={playlistId}
      tracks={tracks}
      startPosition={start.position}
    />
  );
}

export default function PlayerPage(props: PageProps<"/player/[playlistId]">) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-grey-noise">
      <Suspense>
        <PlayerLoader {...props} />
      </Suspense>
    </div>
  );
}
