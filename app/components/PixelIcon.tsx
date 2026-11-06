// Pixel-art icons drawn from text grids: "#" = filled pixel, "." = empty.
// Rendered as crisp SVG rects, coloured with currentColor.

// Right-pointing stepped triangle with a sharp tip, 11 rows tall.
const TRIANGLE = [
  "#.....",
  "##....",
  "###...",
  "####..",
  "#####.",
  "######",
  "#####.",
  "####..",
  "###...",
  "##....",
  "#.....",
];
const mirror = (rows: string[]) => rows.map((r) => [...r].reverse().join(""));
const BAR = "##";

export const ICONS = {
  play: TRIANGLE,
  pause: TRIANGLE.map(() => "###.###"),
  next: TRIANGLE.map((r) => r + "." + BAR),
  previous: mirror(TRIANGLE).map((r) => BAR + "." + r),
  home: [
    ".....#.....",
    "....###....",
    "...##.##...",
    "..##...##..",
    ".##.....##.",
    "##.......##",
    ".#.......#.",
    ".#..###..#.",
    ".#..#.#..#.",
    ".#..#.#..#.",
    ".####.####.",
  ],
  fullscreen: [
    "####...####",
    "#.........#",
    "#.........#",
    "#.........#",
    "...........",
    "...........",
    "#.........#",
    "#.........#",
    "#.........#",
    "####...####",
  ],
  pip: [
    "############",
    "#..........#",
    "#..........#",
    "#..........#",
    "#.....######",
    "#.....######",
    "#.....######",
    "#.....######",
    "############",
  ],
  menu: [
    "###########",
    "###########",
    "...........",
    "...........",
    "###########",
    "###########",
    "...........",
    "...........",
    "###########",
    "###########",
  ],
} satisfies Record<string, string[]>;

export type IconName = keyof typeof ICONS;

export default function PixelIcon({
  name,
  size = 32,
  className,
}: {
  name: IconName;
  /** Height in px; width follows the grid's aspect ratio. */
  size?: number;
  className?: string;
}) {
  const rows = ICONS[name];
  const h = rows.length;
  const w = rows[0].length;

  // Merge horizontal runs of "#" into single rects.
  const rects: { x: number; y: number; w: number }[] = [];
  rows.forEach((row, y) => {
    let start = -1;
    for (let x = 0; x <= row.length; x++) {
      const on = row[x] === "#";
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        rects.push({ x: start, y, w: x - start });
        start = -1;
      }
    }
  });

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      height={size}
      width={(size * w) / h}
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} />
      ))}
    </svg>
  );
}
