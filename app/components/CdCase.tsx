import Image from "next/image";

// case-v3.png is 885×786: a 96px hinge on the left, then the (near-square)
// 789×786 window, with the case's tray outlines drawn over it.
// The cover art and plastic sheen are right-aligned to fill that window exactly.
const CASE_W = 885;
const CASE_H = 786;
const HINGE_W = 96;
const SQUARE_LEFT = `${(HINGE_W / CASE_W) * 100}%`;
const SQUARE_W = `${((CASE_W - HINGE_W) / CASE_W) * 100}%`;

export default function CdCase({ cover, alt = "" }: { cover?: string; alt?: string }) {
  return (
    <div
      className="relative w-full drop-shadow-[0_8px_12px_rgba(0,0,0,0.55)]"
      style={{ aspectRatio: `${CASE_W} / ${CASE_H}` }}
    >
      {/* 1. Playlist cover from Spotify */}
      <div className="absolute inset-y-0 right-0" style={{ left: SQUARE_LEFT, width: SQUARE_W }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- Spotify CDN hosts vary
          <img src={cover} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-neutral-800" />
        )}
      </div>

      {/* 2. CD case (hinge + frame) on top of the cover */}
      <Image src="/case/case-v3.png" alt="" fill sizes="25vw" className="object-contain" />

      {/* 3. Plastic sheen: soft light, 70% opacity */}
      <Image
        src="/case/plastic.png"
        alt=""
        width={780}
        height={780}
        sizes="25vw"
        className="absolute inset-y-0 right-0 h-full object-fill opacity-70 mix-blend-soft-light"
        style={{ width: SQUARE_W }}
      />
    </div>
  );
}
