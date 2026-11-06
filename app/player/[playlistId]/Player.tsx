"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PixelIcon from "../../components/PixelIcon";
import type { PlaylistTrack } from "@/lib/playlist";

const SDK_SRC = "https://sdk.scdn.co/spotify-player.js";
const READY_TIMEOUT_MS = 15_000;

// Shows up in the browser console (and in `next dev`'s log file).
const log = (...args: unknown[]) => console.info("[mixtape player]", ...args);

type NowPlaying = { position?: number; name: string; artists: string; cover?: string };

async function getToken(): Promise<string> {
  const res = await fetch("/api/auth/token", { cache: "no-store" });
  if (res.status === 401) {
    // Full reload on purpose: session is gone, start fresh at the login page.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
    throw new Error("Not logged in");
  }
  const { accessToken } = await res.json();
  return accessToken;
}

export default function Player({
  playlistId,
  tracks,
  startPosition,
}: {
  playlistId: string;
  tracks: PlaylistTrack[];
  startPosition: number;
}) {
  const start = tracks.find((t) => t.position === startPosition)!;
  const [now, setNow] = useState<NowPlaying>(start);
  const [paused, setPaused] = useState(true);
  const [message, setMessage] = useState<string | null>("Loading player…");

  const playerRef = useRef<Spotify.Player | null>(null);
  const deviceRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  // Ask Spotify to play this playlist on our in-browser device, from the chosen track.
  const startPlayback = useCallback(async () => {
    const deviceId = deviceRef.current;
    if (!deviceId) return;
    const token = await getToken();
    const play = () =>
      fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          context_uri: `spotify:playlist:${playlistId}`,
          offset: { position: startPosition },
        }),
      });

    let res = await play();
    log("play request →", res.status);
    if (res.status === 404) {
      // A brand-new device can take a moment to register with Spotify.
      await new Promise((r) => setTimeout(r, 1000));
      res = await play();
      log("play retry →", res.status);
    }
    if (res.ok) {
      startedRef.current = true;
      setMessage(null);
    } else if (res.status === 403) {
      setMessage("Spotify Premium is needed to play music here.");
    } else {
      log("play failed:", await res.text());
      setMessage("Couldn't start playback. Press play to try again.");
    }
  }, [playlistId, startPosition]);

  useEffect(() => {
    let player: Spotify.Player | null = null;
    let cancelled = false;

    // If Spotify never reports the player as ready, say so instead of spinning forever.
    const readyTimer = setTimeout(() => {
      log("no 'ready' event after", READY_TIMEOUT_MS, "ms");
      setMessage("Spotify's player didn't connect. Refresh to try again.");
    }, READY_TIMEOUT_MS);

    const init = () => {
      log("SDK loaded, creating player");
      if (cancelled || !window.Spotify) return;
      player = new window.Spotify.Player({
        name: "Mixtape",
        getOAuthToken: (cb) => void getToken().then(cb),
        volume: 0.8,
      });
      playerRef.current = player;

      player.addListener("ready", ({ device_id }) => {
        log("ready, device", device_id);
        clearTimeout(readyTimer);
        setMessage("Starting…");
        deviceRef.current = device_id;
        void startPlayback();
      });
      player.addListener("not_ready", () => {
        log("not_ready");
        deviceRef.current = null;
      });
      player.addListener("player_state_changed", (state) => {
        if (!state) return;
        const t = state.track_window.current_track;
        const uri = t.linked_from?.uri ?? t.uri;
        const match = tracks.find((x) => x.uri === uri || x.uri === t.uri);
        setNow({
          position: match?.position,
          name: t.name,
          artists: t.artists.map((a) => a.name).join(", "),
          cover: t.album.images[0]?.url,
        });
        setPaused(state.paused);
      });
      player.addListener("account_error", (e) =>
        fail("account_error", e, "Spotify Premium is needed to play music here."),
      );
      player.addListener("authentication_error", (e) =>
        fail("authentication_error", e, "Spotify login expired. Log in again."),
      );
      player.addListener("initialization_error", (e) =>
        fail("initialization_error", e, "This browser can't play Spotify. Try Chrome, Firefox or Edge."),
      );
      player.addListener("playback_error", (e) => fail("playback_error", e, e.message));
      player.addListener("autoplay_failed", () => {
        setPaused(true);
        setMessage("Press play to start.");
      });

      void player.connect().then((ok) => log("connect() →", ok));
    };

    const fail = (event: string, e: Spotify.Error, text: string) => {
      log(event, e.message);
      clearTimeout(readyTimer);
      setMessage(text);
    };

    if (window.Spotify) {
      init();
    } else {
      window.onSpotifyWebPlaybackSDKReady = init;
      if (!document.querySelector(`script[src="${SDK_SRC}"]`)) {
        const script = document.createElement("script");
        script.src = SDK_SRC;
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      clearTimeout(readyTimer);
      player?.disconnect();
      playerRef.current = null;
      deviceRef.current = null;
    };
  }, [tracks, startPlayback]);

  const onPlayPause = async () => {
    const player = playerRef.current;
    if (!player) return;
    await player.activateElement(); // unlocks audio on Safari/mobile
    if (!startedRef.current) await startPlayback();
    else await player.togglePlay();
  };

  const trackNumber = (now.position ?? startPosition) + 1;

  return (
    <div className="flex flex-1 flex-col items-center px-6 pb-12 pt-6 text-[#8e1b52] sm:px-10">
      <header className="flex w-full items-center justify-between">
        <nav className="flex items-center gap-6">
          <Link href={`/tracklist/${playlistId}`} aria-label="Track list">
            <PixelIcon name="menu" size={26} />
          </Link>
          <Link href="/collection" aria-label="Collection">
            <PixelIcon name="home" size={32} />
          </Link>
        </nav>
        <p className="text-3xl">Track {trackNumber}</p>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6">
        <Disc cover={now.cover} spinning={!paused} />

        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl leading-tight sm:text-5xl">{now.name}</h1>
          <p className="text-2xl sm:text-3xl">{now.artists}</p>
        </div>

        <div className="flex items-center gap-16 sm:gap-24">
          <button
            aria-label="Previous track"
            onClick={() => void playerRef.current?.previousTrack()}
            className="transition-transform active:scale-90"
          >
            <PixelIcon name="previous" size={40} />
          </button>
          <button
            aria-label={paused ? "Play" : "Pause"}
            onClick={() => void onPlayPause()}
            className="transition-transform active:scale-90"
          >
            <PixelIcon name={paused ? "play" : "pause"} size={52} />
          </button>
          <button
            aria-label="Next track"
            onClick={() => void playerRef.current?.nextTrack()}
            className="transition-transform active:scale-90"
          >
            <PixelIcon name="next" size={40} />
          </button>
        </div>

        {message && <p className="text-xl">{message}</p>}
      </main>
    </div>
  );
}

// cd.png's disc, 400px across: the hub (black ring and inward) is the inner 28.5%
// of the radius, the hole the inner 11.5%. The song cover fills the disc between
// the hole and the rim, with the hub and rim edge drawn back over it.
const HOLE = "11.5%";
const HUB = "28.5%";
function Disc({ cover, spinning }: { cover?: string; spinning: boolean }) {
  const coverMask = `radial-gradient(circle closest-side, transparent ${HOLE}, #000 calc(${HOLE} + 0.5%))`;
  const discMask = `radial-gradient(circle closest-side, #000 ${HUB}, transparent calc(${HUB} + 0.5%), transparent 98%, #000 98.5%)`;

  return (
    <div
      className="relative aspect-square w-[min(72vw,26rem)] animate-[spin_5s_linear_infinite] drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)]"
      style={{ animationPlayState: spinning ? "running" : "paused" }}
    >
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element -- Spotify CDN hosts vary
        <img
          src={cover}
          alt=""
          className="absolute inset-0 size-full rounded-full object-cover"
          style={{ maskImage: coverMask, WebkitMaskImage: coverMask }}
        />
      )}
      <Image
        src="/assets/disc.png"
        alt=""
        fill
        sizes="26rem"
        priority
        style={
          cover ? { maskImage: discMask, WebkitMaskImage: discMask } : undefined
        }
      />
    </div>
  );
}
