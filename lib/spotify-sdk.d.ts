// Minimal types for the Spotify Web Playback SDK (https://sdk.scdn.co/spotify-player.js).

declare namespace Spotify {
  interface Image {
    url: string;
  }
  interface Track {
    uri: string;
    id: string | null;
    name: string;
    artists: { name: string; uri: string }[];
    album: { name: string; uri: string; images: Image[] };
    linked_from?: { uri: string | null; id: string | null };
  }
  interface PlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: { current_track: Track; previous_tracks: Track[]; next_tracks: Track[] };
  }
  interface Error {
    message: string;
  }
  interface PlayerInit {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume?: number;
  }
  class Player {
    constructor(options: PlayerInit);
    connect(): Promise<boolean>;
    disconnect(): void;
    activateElement(): Promise<void>;
    togglePlay(): Promise<void>;
    resume(): Promise<void>;
    pause(): Promise<void>;
    nextTrack(): Promise<void>;
    previousTrack(): Promise<void>;
    getCurrentState(): Promise<PlaybackState | null>;
    addListener(event: "ready" | "not_ready", cb: (e: { device_id: string }) => void): boolean;
    addListener(event: "player_state_changed", cb: (state: PlaybackState | null) => void): boolean;
    addListener(
      event:
        | "initialization_error"
        | "authentication_error"
        | "account_error"
        | "playback_error"
        | "autoplay_failed",
      cb: (e: Error) => void,
    ): boolean;
  }
}

interface Window {
  Spotify?: typeof Spotify;
  onSpotifyWebPlaybackSDKReady?: () => void;
}
