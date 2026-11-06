"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/** Copy the page's stylesheets (Tailwind, fonts) into the PiP window. */
function copyStyles(target: Window) {
  for (const sheet of Array.from(document.styleSheets)) {
    if (sheet.href) {
      const link = target.document.createElement("link");
      link.rel = "stylesheet";
      link.href = sheet.href; // absolute, so it resolves inside the PiP window
      target.document.head.appendChild(link);
      continue;
    }
    try {
      const style = target.document.createElement("style");
      style.textContent = Array.from(sheet.cssRules, (r) => r.cssText).join("\n");
      target.document.head.appendChild(style);
    } catch {
      // cross-origin sheet without href: nothing we can copy
    }
  }
  // Font CSS variables (Jersey 10) live on <html>.
  target.document.documentElement.className = document.documentElement.className;
  target.document.body.style.margin = "0";
}

const noopSubscribe = () => () => {};

/**
 * A floating always-on-top mini player (Document Picture-in-Picture, Chrome/Edge).
 * Opens automatically when the user switches tab/app while music is playing
 * (Chrome's automatic PiP for media sites), or manually via `open()`.
 */
export function usePictureInPicture({ width = 300, height = 380 } = {}) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  // false on the server, real answer in the browser (no hydration mismatch).
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => "documentPictureInPicture" in window,
    () => false,
  );

  const open = useCallback(async () => {
    const api = window.documentPictureInPicture;
    if (!api || api.window) return;
    try {
      const w = await api.requestWindow({ width, height });
      copyStyles(w);
      w.addEventListener("pagehide", () => setPipWindow(null));
      setPipWindow(w);
    } catch (e) {
      console.info("[mixtape player] PiP not opened:", e);
    }
  }, [width, height]);

  // Automatic PiP: Chrome calls this when the tab is hidden while audio plays.
  useEffect(() => {
    if (!supported) return;
    const action = "enterpictureinpicture" as MediaSessionAction;
    try {
      navigator.mediaSession.setActionHandler(action, () => void open());
    } catch {
      return; // browser doesn't support automatic PiP
    }
    return () => {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {}
    };
  }, [supported, open]);

  // Close the floating window when leaving the player page.
  useEffect(() => () => pipWindow?.close(), [pipWindow]);

  return { pipWindow, open, supported };
}
