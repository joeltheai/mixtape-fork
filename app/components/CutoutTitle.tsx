import Image from "next/image";

// Intrinsic widths of /public/letters/*.png (all are 400px tall).
const LETTER_WIDTHS: Record<string, number> = {
  "0": 350, "1": 312, "2": 292, "3": 456, "4": 366,
  "5": 211, "6": 272, "7": 280, "8": 273, "9": 266,
  A: 411, B: 211, C: 180, D: 368, E: 349, F: 259, G: 191,
  H: 464, I: 232, J: 443, K: 256, L: 377, M: 461, N: 523,
  O: 402, P: 289, Q: 388, R: 341, S: 300, T: 165, U: 303,
  V: 292, W: 501, X: 391, Y: 346, Z: 370,
};
const LETTER_HEIGHT = 400;

// Small, deterministic tilts/offsets so it reads like a ransom-note cutout.
const TILTS = [-6, 4, -3, 7, -5, 2, -8, 5, -2, 6, -4, 3];
const LIFTS = [0, -6, 4, -3, 6, -2, 3, -5];

// Spacing, as a fraction of letter height.
const LETTER_GAP = 0.06;
const WORD_GAP = 0.7;

export default function CutoutTitle({ text }: { text: string }) {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  let i = 0;

  // Size letters so the whole title fits on one line: total width is the sum of
  // each letter's aspect ratio plus the gaps, all measured in letter-heights.
  const letters = words.join("");
  const letterUnits = [...letters].reduce(
    (sum, ch) => sum + (LETTER_WIDTHS[ch] ?? 0) / LETTER_HEIGHT,
    0,
  );
  const letterGapCount = words.reduce((n, w) => n + Math.max(w.length - 1, 0), 0);
  const totalUnits =
    letterUnits +
    letterGapCount * LETTER_GAP +
    (words.length - 1) * WORD_GAP;

  return (
    <h1
      aria-label={text}
      className="flex flex-nowrap items-center justify-center"
      style={
        {
          "--h": `min(calc(75vw / ${totalUnits.toFixed(3)}), 5.5rem)`,
          gap: `calc(var(--h) * ${WORD_GAP})`,
        } as React.CSSProperties
      }
    >
      {words.map((word, w) => (
        <span
          key={w}
          aria-hidden
          className="flex shrink-0 items-center"
          style={{ gap: `calc(var(--h) * ${LETTER_GAP})` }}
        >
          {[...word].map((ch, c) => {
            const width = LETTER_WIDTHS[ch];
            if (!width) return null;
            const n = i++;
            return (
              <Image
                key={c}
                src={`/letters/${ch}.png`}
                alt=""
                width={width}
                height={LETTER_HEIGHT}
                priority
                className="h-(--h) w-auto drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)] transition-transform duration-200 hover:scale-110"
                style={{
                  rotate: `${TILTS[n % TILTS.length]}deg`,
                  translate: `0 ${LIFTS[n % LIFTS.length]}px`,
                }}
              />
            );
          })}
        </span>
      ))}
    </h1>
  );
}
