// Geometry for concentric ring segments (annular sectors)

const DEG = Math.PI / 180;
const GAP_ANGLE = 1.5; // degrees gap between segments

// Center button is 2x bigger when expanded
export const BUTTON_RADIUS_IDLE = 32;
export const BUTTON_RADIUS = 64; // expanded center
export const RING_WIDTH = 34;

export function ringInnerRadius(ringIndex: number): number {
  return BUTTON_RADIUS + ringIndex * RING_WIDTH;
}

export function ringOuterRadius(ringIndex: number): number {
  return BUTTON_RADIUS + (ringIndex + 1) * RING_WIDTH;
}

export type ArcSegment = {
  index: number;
  label: string;
  startAngle: number;
  endAngle: number;
  innerR: number;
  outerR: number;
  path: string;
  textArcPath: string;
  textArcId: string;
  flipped: boolean;
  isSpacer?: boolean;
};

let arcIdCounter = 0;

export function computeSegments(
  ringIndex: number,
  labels: string[],
): ArcSegment[] {
  if (labels.length === 0) return [];

  // If exactly 3 items, add a spacer to make 4 — avoids segments too wide
  // to follow the top/bottom text orientation rules cleanly.
  const displayLabels = labels.length === 3 ? [...labels, ""] : labels;
  const n = displayLabels.length;

  const innerR = ringInnerRadius(ringIndex);
  const outerR = ringOuterRadius(ringIndex);
  const totalGap = n * GAP_ANGLE;
  const available = 360 - totalGap;
  const segAngle = available / n;

  // 2 segments: start at 0° (3 o'clock) so they sit top & bottom
  // 4+ segments: start at -90° (12 o'clock) for even distribution
  const startAngle = n === 2 ? 0 : -90;

  const segments: ArcSegment[] = [];
  let currentAngle = startAngle;

  for (let i = 0; i < n; i++) {
    const isSpacer = labels.length === 3 && i === n - 1;
    const start = currentAngle + GAP_ANGLE / 2;
    const end = start + segAngle;

    const path = arcPath(innerR, outerR, start, end);
    const midAngle = (start + end) / 2;

    // Flip boundary: the horizontal 9-to-3 line (0° and 180°).
    // Bottom half (normMid 0–180, i.e. positive-y): text on inner arc, reversed for L→R
    // Top half (normMid 180–360, i.e. negative-y): text on outer arc, normal for L→R
    const normMid = ((midAngle % 360) + 360) % 360;
    const flipped = normMid > 0 && normMid < 180; // bottom half

    const textArcId = `tarc-${arcIdCounter++}`;
    const midR = (innerR + outerR) / 2;
    const textArcPath = flipped
      ? arcOnlyPath(midR, end, start)   // reversed → reads L→R at bottom
      : arcOnlyPath(midR, start, end);  // normal  → reads L→R at top

    segments.push({
      index: isSpacer ? -1 : i, // spacer gets -1
      label: displayLabels[i],
      startAngle: start,
      endAngle: end,
      innerR,
      outerR,
      path,
      textArcPath,
      textArcId,
      flipped,
      isSpacer,
    });

    currentAngle = end + GAP_ANGLE / 2;
  }

  // For the 3→4 spacer case, fix indices so real items map to 0,1,2
  // (spacer already has index -1, real items keep their original indices)

  return segments;
}

function arcPath(innerR: number, outerR: number, startDeg: number, endDeg: number): string {
  const startRad = startDeg * DEG;
  const endRad = endDeg * DEG;
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  const outerStart = { x: outerR * Math.cos(startRad), y: outerR * Math.sin(startRad) };
  const outerEnd = { x: outerR * Math.cos(endRad), y: outerR * Math.sin(endRad) };
  const innerStart = { x: innerR * Math.cos(startRad), y: innerR * Math.sin(startRad) };
  const innerEnd = { x: innerR * Math.cos(endRad), y: innerR * Math.sin(endRad) };

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function arcOnlyPath(r: number, startDeg: number, endDeg: number): string {
  const startRad = startDeg * DEG;
  const endRad = endDeg * DEG;
  const angleDiff = endDeg - startDeg;
  const largeArc = Math.abs(angleDiff) > 180 ? 1 : 0;
  const sweep = angleDiff > 0 ? 1 : 0;

  const sx = r * Math.cos(startRad);
  const sy = r * Math.sin(startRad);
  const ex = r * Math.cos(endRad);
  const ey = r * Math.sin(endRad);

  return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} ${sweep} ${ex} ${ey}`;
}

export function totalRadius(ringCount: number): number {
  return BUTTON_RADIUS + ringCount * RING_WIDTH;
}
