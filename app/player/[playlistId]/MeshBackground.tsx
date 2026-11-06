"use client";

import { useEffect, useState } from "react";

type Palette = { colors: [string, string, string, string]; text: string };

// Shown before a cover loads (and if one can't be read): the old grey look.
const DEFAULT: Palette = {
  colors: ["#8a8a8a", "#6f6f6f", "#9d9d9d", "#7c7c7c"],
  text: "#ffffff",
};

const SIZE = 32; // sample a 32×32 thumbnail: plenty for colour, very cheap

/**
 * Samples 4 colours from a cover image, one per quadrant (top-left, top-right,
 * bottom-left, bottom-right), so the gradient echoes the art's layout. Each
 * quadrant's average is weighted towards its more saturated pixels so the
 * result isn't muddy. Also picks black or white text for contrast.
 */
async function samplePalette(url: string): Promise<Palette> {
  const img = new Image();
  img.crossOrigin = "anonymous"; // Spotify's image CDN allows this
  img.src = url;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

  const half = SIZE / 2;
  const quadrant = (qx: number, qy: number) => {
    let r = 0, g = 0, b = 0, total = 0;
    for (let y = qy * half; y < (qy + 1) * half; y++) {
      for (let x = qx * half; x < (qx + 1) * half; x++) {
        const i = (y * SIZE + x) * 4;
        const [pr, pg, pb] = [data[i], data[i + 1], data[i + 2]];
        const sat = (Math.max(pr, pg, pb) - Math.min(pr, pg, pb)) / 255;
        const w = 0.15 + sat * sat * 3;
        r += pr * w; g += pg * w; b += pb * w; total += w;
      }
    }
    return [r / total, g / total, b / total];
  };

  const rgb = [quadrant(0, 0), quadrant(1, 0), quadrant(0, 1), quadrant(1, 1)];
  const colors = rgb.map(
    ([r, g, b]) => `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`,
  ) as Palette["colors"];

  // Relative luminance of the average colour decides the text colour.
  const lum =
    rgb.reduce((sum, [r, g, b]) => sum + (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, 0) / 4;
  return { colors, text: lum > 0.6 ? "#161616" : "#ffffff" };
}

export function useCoverPalette(cover?: string): Palette {
  const [palette, setPalette] = useState<Palette>(DEFAULT);

  useEffect(() => {
    if (!cover) return;
    let stale = false;
    samplePalette(cover)
      .then((p) => !stale && setPalette(p))
      .catch(() => {}); // keep the previous colours if the image can't be read
    return () => {
      stale = true;
    };
  }, [cover]);

  return palette;
}

/** Four blurred colour blobs drifting slowly behind the page. */
export default function MeshBackground({ colors }: { colors: Palette["colors"] }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden transition-colors duration-1000"
      style={{ backgroundColor: colors[0] }}
    >
      {colors.map((c, i) => (
        <div key={i} className={`mesh-blob mesh-blob-${i}`} style={{ backgroundColor: c }} />
      ))}
    </div>
  );
}
