"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import PixelIcon from "../../components/PixelIcon";
import Disc from "./Disc";
import MeshBackground, { useCoverPalette } from "./MeshBackground";
import ProgressBar from "./ProgressBar";
import { usePictureInPicture } from "./usePictureInPicture";
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
  /** null = a followed playlist whose track list Spotify won't share with this app. */
  tracks: PlaylistTrack[] | null;
  startPosition: number;
}) {
  const start = tracks?.find((t) => t.position === startPosition);
  const [now, setNow] = useState<NowPlaying>(start ?? { name: "", artists: "" });
  const [paused, setPaused] = useState(true);
  const [time, setTime] = useState({ position: 0, duration: 0 });
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
        const match = tracks?.find((x) => x.uri === uri || x.uri === t.uri);
        setNow({
          position: match?.position,
          name: t.name,
          artists: t.artists.map((a) => a.name).join(", "),
          cover: t.album.images[0]?.url,
        });
        setPaused(state.paused);
        setTime({ position: state.position, duration: state.duration });
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

  // Spotify only reports the position on changes, so advance it locally while playing.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(
      () =>
        setTime((t) => ({ ...t, position: Math.min(t.position + 250, t.duration) })),
      250,
    );
    return () => clearInterval(id);
  }, [paused]);

  const onSeek = (ms: number) => {
    setTime((t) => ({ ...t, position: ms })); // move the bar now, don't wait for Spotify
    void playerRef.current?.seek(ms);
  };

  const pip = usePictureInPicture();

  const onPlayPause = async () => {
    const player = playerRef.current;
    if (!player) return;
    await player.activateElement(); // unlocks audio on Safari/mobile
    if (!startedRef.current) await startPlayback();
    else await player.togglePlay();
  };

  // Followed playlists have no track list, so there's no number to show.
  const trackNumber = tracks ? (now.position ?? startPosition) + 1 : null;
  const palette = useCoverPalette(now.cover);

  const controls = {
    paused,
    onPrevious: () => void playerRef.current?.previousTrack(),
    onPlayPause: () => void onPlayPause(),
    onNext: () => void playerRef.current?.nextTrack(),
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (e) {
      log("fullscreen not allowed:", e);
    }
  };

  // From the mini player: close it, bring this tab forward and go full screen.
  const backToFullscreen = async () => {
    pip.pipWindow?.close();
    window.focus();
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {
      log("fullscreen not allowed:", e); // e.g. the tab isn't in front
    }
  };

  return (
    <div
      className="relative isolate flex flex-1 flex-col items-center px-6 pb-12 pt-6 transition-colors duration-1000 sm:px-10"
      style={{ color: palette.text }}
    >
      <MeshBackground colors={palette.colors} />
      <header className="flex w-full items-center justify-between">
        <nav className="flex items-center gap-6">
          {tracks && (
            <Link href={`/tracklist/${playlistId}`} aria-label="Track list">
              <PixelIcon name="menu" size={26} />
            </Link>
          )}
          <Link href="/collection" aria-label="Collection">
            <PixelIcon name="home" size={32} />
          </Link>
        </nav>
        <div className="flex items-center gap-6">
          {pip.supported && (
            <button onClick={() => void pip.open()} aria-label="Pop out mini player">
              <PixelIcon name="pip" size={24} />
            </button>
          )}
          <button onClick={() => void toggleFullscreen()} aria-label="Toggle full screen">
            <PixelIcon name="fullscreen" size={24} />
          </button>
          {trackNumber && <p className="text-3xl">Track {trackNumber}</p>}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6">
        <Disc cover={now.cover} spinning={!paused} />

        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl leading-tight sm:text-5xl">{now.name}</h1>
          <p className="text-2xl sm:text-3xl">{now.artists}</p>
        </div>

        <Controls {...controls} className="gap-16 sm:gap-24" size={40} />

        <ProgressBar position={time.position} duration={time.duration} onSeek={onSeek} />

        {message && <p className="text-xl">{message}</p>}
      </main>

      {/* Floating mini player: same background and spinning disc. */}
      {pip.pipWindow &&
        createPortal(
          <div
            className="relative isolate flex h-screen w-screen flex-col items-center justify-center gap-3 overflow-hidden p-4 transition-colors duration-1000"
            style={{ color: palette.text }}
          >
            <MeshBackground colors={palette.colors} />
            <Disc cover={now.cover} spinning={!paused} className="w-[min(78vw,62vh)]" />
            <p className="max-w-full truncate text-2xl">{now.name}</p>
            <Controls {...controls} className="gap-10" size={24} />
            <button
              onClick={() => void backToFullscreen()}
              aria-label="Back to full screen player"
              className="absolute right-3 top-3 transition-transform active:scale-90"
            >
              <PixelIcon name="fullscreen" size={20} />
            </button>
          </div>,
          pip.pipWindow.document.body,
        )}
    </div>
  );
}

function Controls({
  paused,
  onPrevious,
  onPlayPause,
  onNext,
  size,
  className,
}: {
  paused: boolean;
  onPrevious: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  /** Height of the previous/next icons; play/pause is 30% bigger. */
  size: number;
  className?: string;
}) {
  const btn = "transition-transform active:scale-90";
  return (
    <div className={`flex items-center ${className ?? ""}`}>
      <button aria-label="Previous track" onClick={onPrevious} className={btn}>
        <PixelIcon name="previous" size={size} />
      </button>
      <button aria-label={paused ? "Play" : "Pause"} onClick={onPlayPause} className={btn}>
        <PixelIcon name={paused ? "play" : "pause"} size={Math.round(size * 1.3)} />
      </button>
      <button aria-label="Next track" onClick={onNext} className={btn}>
        <PixelIcon name="next" size={size} />
      </button>
    </div>
  );
}
