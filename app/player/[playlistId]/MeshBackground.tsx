"use client";

import { useEffect, useRef, useState } from "react";

type RGB = [number, number, number]; // 0–255
type Palette = { colors: [RGB, RGB, RGB, RGB]; text: string };

// Shown before a cover loads (and if one can't be read): soft greys.
const DEFAULT: Palette = {
  colors: [
    [96, 96, 96],
    [128, 128, 128],
    [156, 156, 156],
    [184, 184, 184],
  ],
  text: "#ffffff",
};

/* ------------------------------------------------------------------ */
/* Colour sampling                                                     */
/* ------------------------------------------------------------------ */

const SIZE = 32; // a 32×32 thumbnail is plenty for colour, and very cheap

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): RGB {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}

// Lightness given to the 4 colours, darkest → lightest, so neighbouring
// regions of the background always contrast clearly.
const LIGHTNESS = [0.28, 0.44, 0.6, 0.76];

/** Fully saturated version of a colour at a set lightness (greys stay grey). */
function vivid(c: RGB, lightness: number): RGB {
  const [h, s] = rgbToHsl(c);
  return hslToRgb([h, s < 0.08 ? 0 : Math.max(s, 0.92), lightness]);
}

const lum = ([r, g, b]: RGB) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/**
 * 4 dominant colours of a cover: k-means (k=4) over a 32×32 thumbnail,
 * weighted towards saturated pixels, then boosted to full vividness and
 * ordered dark → light so they form a heatmap-style ramp.
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

  const px: RGB[] = [];
  const weight: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const c: RGB = [data[i], data[i + 1], data[i + 2]];
    const sat = (Math.max(...c) - Math.min(...c)) / 255;
    px.push(c);
    weight.push(0.1 + sat * sat * 4);
  }

  // Seed centroids from the four quadrants' centres, then refine.
  const at = (x: number, y: number) => px[y * SIZE + x];
  const q = SIZE / 4;
  let cents: RGB[] = [at(q, q), at(3 * q, q), at(q, 3 * q), at(3 * q, 3 * q)].map(
    (c) => [...c] as RGB,
  );
  for (let iter = 0; iter < 8; iter++) {
    const sum = cents.map(() => [0, 0, 0, 0]);
    px.forEach((c, i) => {
      let best = 0, bestD = Infinity;
      cents.forEach((k, j) => {
        const d = (c[0] - k[0]) ** 2 + (c[1] - k[1]) ** 2 + (c[2] - k[2]) ** 2;
        if (d < bestD) { bestD = d; best = j; }
      });
      const w = weight[i];
      sum[best][0] += c[0] * w; sum[best][1] += c[1] * w; sum[best][2] += c[2] * w; sum[best][3] += w;
    });
    cents = cents.map((k, j) =>
      sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : k,
    );
  }

  const colors = cents
    .sort((a, b) => lum(a) - lum(b))
    .map((c, i) => vivid(c, LIGHTNESS[i])) as Palette["colors"];
  const avg = colors.reduce((s, c) => s + lum(c), 0) / 4;
  return { colors, text: avg > 0.55 ? "#161616" : "#ffffff" };
}

export function useCoverPalette(cover?: string): Palette {
  const [palette, setPalette] = useState<Palette>(DEFAULT);

  useEffect(() => {
    if (!cover) return;
    let stale = false;
    samplePalette(cover)
      .then((p) => !stale && setPalette(p))
      // Keep the previous colours if the image can't be read.
      .catch((e) => console.info("[mixtape player] couldn't sample cover colours:", e));
    return () => {
      stale = true;
    };
  }, [cover]);

  return palette;
}

/* ------------------------------------------------------------------ */
/* Animated background (WebGL)                                         */
/* ------------------------------------------------------------------ */

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

// Big soft round blobs of the 4 cover colours drifting on slow orbits, blended
// so each area takes the colour of its nearest blob (heatmap-like zones with
// smooth round edges), plus a gentle low-frequency warp so the edges ripple
// like liquid instead of staying perfectly circular.
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uC0, uC1, uC2, uC3;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // quintic: extra smooth
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

#define BLOB(x, y, r, c) { vec2 d = uv - vec2(x, y); float w = exp(-dot(d, d) / (r * r)); acc += c * w; sum += w; }

void main() {
  // Centred, aspect-correct coordinates (height spans -0.5..0.5).
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.16;

  // Slow liquid ripple.
  uv += 0.09 * (vec2(noise(uv * 1.6 + t * 0.7), noise(uv * 1.6 - t * 0.6 + 7.3)) - 0.5);

  vec3 acc = vec3(0.0);
  float sum = 0.0;
  BLOB(0.62 * sin(t * 0.71),       0.34 * cos(t * 0.93),       0.30, uC0)
  BLOB(0.70 * cos(t * 0.53 + 1.0), 0.30 * sin(t * 0.81 + 2.0), 0.27, uC1)
  BLOB(0.52 * sin(t * 0.62 + 3.0), 0.40 * sin(t * 0.44 + 1.0), 0.28, uC2)
  BLOB(0.66 * cos(t * 0.84 + 4.0), 0.36 * cos(t * 0.57 + 3.0), 0.25, uC3)
  BLOB(0.80 * sin(t * 0.33 + 5.0), 0.26 * cos(t * 0.72 + 5.0), 0.24, uC1)
  BLOB(0.42 * cos(t * 0.47 + 2.0), 0.38 * sin(t * 0.59 + 4.0), 0.22, uC3)
  BLOB(0.75 * sin(t * 0.39 + 6.0), 0.42 * cos(t * 0.36 + 6.0), 0.26, uC2)
  BLOB(0.35 * cos(t * 0.66 + 0.5), 0.30 * sin(t * 0.48 + 0.5), 0.24, uC0)

  // A dim base so far-from-everything corners fall back to the darkest colour.
  acc += uC0 * 1e-3;
  sum += 1e-3;
  gl_FragColor = vec4(acc / sum, 1.0);
}
`;

function createGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return null;
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "");
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // One triangle covering the whole screen.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = (n: string) => gl.getUniformLocation(prog, n);
  return { gl, uRes: u("uRes"), uTime: u("uTime"), uC: [u("uC0"), u("uC1"), u("uC2"), u("uC3")] };
}

// Render at reduced resolution: the field is soft, so this looks identical
// and keeps the GPU cool.
const RENDER_SCALE = 0.5;

/** Full-screen flowing heatmap of the cover's colours. */
export default function MeshBackground({ colors }: { colors: Palette["colors"] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const target = useRef(colors);

  useEffect(() => {
    target.current = colors;
  }, [colors]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    // Use the canvas's own window: in the picture-in-picture window this keeps
    // animating even while the main tab is hidden.
    const win = canvas.ownerDocument.defaultView ?? window;
    let ctx: ReturnType<typeof createGL> = null;
    try {
      ctx = createGL(canvas);
    } catch (e) {
      console.info("[mixtape player] shader failed:", e);
    }
    if (!ctx) return; // no WebGL: the CSS gradient underneath stays visible
    const { gl, uRes, uTime, uC } = ctx;

    const still = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const current = target.current.map((c) => [...c]);
    const start = win.performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const w = Math.max(1, Math.round(canvas.clientWidth * RENDER_SCALE));
      const h = Math.max(1, Math.round(canvas.clientHeight * RENDER_SCALE));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      // Ease towards the new song's colours instead of snapping.
      current.forEach((c, i) => {
        for (let k = 0; k < 3; k++) c[k] += (target.current[i][k] - c[k]) * 0.03;
        gl.uniform3f(uC[i], c[0] / 255, c[1] / 255, c[2] / 255);
      });
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, still ? 0 : (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = win.requestAnimationFrame(frame);
    };
    raf = win.requestAnimationFrame(frame);
    return () => win.cancelAnimationFrame(raf);
  }, []);

  const css = (c: RGB) => `rgb(${c.map(Math.round).join(" ")})`;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* Static fallback, covered by the shader canvas when WebGL works. */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(at 20% 20%, ${css(colors[3])}, transparent 60%),
            radial-gradient(at 80% 30%, ${css(colors[2])}, transparent 60%),
            radial-gradient(at 30% 80%, ${css(colors[1])}, transparent 60%),
            ${css(colors[0])}`,
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  );
}
