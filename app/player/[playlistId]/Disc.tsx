import Image from "next/image";

// cd.png's disc, 400px across: the hub (black ring and inward) is the inner 28.5%
// of the radius, the hole the inner 11.5%. The song cover fills the disc between
// the hole and the rim, with the hub and rim edge drawn back over it.
const HOLE = "11.5%";
const HUB = "28.5%";
const coverMask = `radial-gradient(circle closest-side, transparent ${HOLE}, #000 calc(${HOLE} + 0.5%))`;
const discMask = `radial-gradient(circle closest-side, #000 ${HUB}, transparent calc(${HUB} + 0.5%), transparent 98%, #000 98.5%)`;

export default function Disc({
  cover,
  spinning,
  className = "w-[min(72vw,26rem)]",
}: {
  cover?: string;
  spinning: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-square shrink-0 animate-[spin_12s_linear_infinite] drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)] ${className}`}
      style={{ animationPlayState: spinning ? "running" : "paused" }}
    >
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element -- Spotify CDN hosts vary
        <img
          src={cover}
          alt=""
          // Same CORS mode as the colour sampler, so the browser's cached copy is
          // readable there too (a non-CORS cached copy would block sampling).
          crossOrigin="anonymous"
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
        style={cover ? { maskImage: discMask, WebkitMaskImage: discMask } : undefined}
      />
    </div>
  );
}
