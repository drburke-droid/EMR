/**
 * Maps pixel coordinates on the anterior segment photo SVG
 * to anatomical locations and existing finding-tree region IDs.
 */

// SVG geometry constants (match the eye photo viewBox 0 0 500 400)
export const CX = 250;
export const CY = 200;
export const PUPIL_R = 35;
export const IRIS_R = 95;
export const LIMBUS_R = 100;
export const SCLERA_R = 170;

// Real corneal radius ~5.75mm  →  LIMBUS_R px = 5.75mm
export const PX_PER_MM = LIMBUS_R / 5.75; // ≈17.4

export type AnatomicalZone =
  | "pupil"
  | "central_cornea"
  | "paracentral_cornea"
  | "peripheral_cornea"
  | "limbus"
  | "bulbar_conjunctiva"
  | "iris"
  | "lid";

export type EyeLocation = {
  zone: AnatomicalZone;
  direction: string;          // e.g. "superior-nasal"
  distFromLimbusMm: number;   // positive = inside cornea
  distFromCenterMm: number;
  clockHour: number;
  regionId: string;           // maps to anterior_findings region IDs
  description: string;
};

export type BrushBounds = {
  widthMm: number;
  heightMm: number;
  centerX: number;
  centerY: number;
  description: string;
};

export type CorneaLayer =
  | "epithelium"
  | "bowmans"
  | "anterior_stroma"
  | "mid_stroma"
  | "posterior_stroma"
  | "descemets"
  | "endothelium";

export const CORNEA_LAYERS: { id: CorneaLayer; label: string; color: string; thickness: number }[] = [
  { id: "epithelium",       label: "Epithelium",         color: "#c4a8d4", thickness: 22 },
  { id: "bowmans",          label: "Bowman's",           color: "#d4c878", thickness: 14 },
  { id: "anterior_stroma",  label: "Stroma (ant)",       color: "#88b8d8", thickness: 28 },
  { id: "mid_stroma",       label: "Stroma (mid)",       color: "#78a8c8", thickness: 28 },
  { id: "posterior_stroma", label: "Stroma (post)",      color: "#6898b8", thickness: 28 },
  { id: "descemets",        label: "Descemet's",         color: "#d8a858", thickness: 14 },
  { id: "endothelium",      label: "Endothelium",        color: "#68b888", thickness: 22 },
];

/* ── Click → Location mapping ──────────────────────────────────── */

export function mapClickToLocation(x: number, y: number, eye: "OD" | "OS"): EyeLocation {
  const dx = x - CX;
  const dy = y - CY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const distMm = dist / PX_PER_MM;
  const distFromLimbusMm = Math.round(((LIMBUS_R - dist) / PX_PER_MM) * 10) / 10;

  // Angle: 0 = right, counter-clockwise. SVG y is inverted so negate dy.
  let angle = Math.atan2(-dy, dx);
  if (angle < 0) angle += 2 * Math.PI;

  // Clock hour: 12 = top (π/2), 3 = right (0), 6 = bottom (3π/2), 9 = left (π)
  let clockAngle = Math.PI / 2 - angle;
  if (clockAngle < 0) clockAngle += 2 * Math.PI;
  const clockHour = Math.round((clockAngle / (Math.PI / 6)) % 12) || 12;

  const direction = getDirection(angle, eye);
  const zone = getZone(dist);
  const regionId = mapToRegionId(zone, direction);
  const description = buildDescription(zone, direction, distFromLimbusMm);

  return {
    zone,
    direction,
    distFromLimbusMm,
    distFromCenterMm: Math.round(distMm * 10) / 10,
    clockHour,
    regionId,
    description,
  };
}

function getZone(dist: number): AnatomicalZone {
  if (dist <= PUPIL_R) return "pupil";
  if (dist <= PUPIL_R + (IRIS_R - PUPIL_R) * 0.35) return "central_cornea";
  if (dist <= IRIS_R * 0.82) return "paracentral_cornea";
  if (dist <= LIMBUS_R) return "peripheral_cornea";
  if (dist <= LIMBUS_R + 12) return "limbus";
  return "bulbar_conjunctiva";
}

function getDirection(angle: number, eye: "OD" | "OS"): string {
  const deg = ((angle * 180) / Math.PI) % 360;
  let vert = "";
  let horiz = "";

  if (deg >= 30 && deg < 150) vert = "superior";
  else if (deg >= 210 && deg < 330) vert = "inferior";

  if (deg < 30 || deg >= 330) horiz = eye === "OD" ? "temporal" : "nasal";
  else if (deg >= 150 && deg < 210) horiz = eye === "OD" ? "nasal" : "temporal";

  if (vert && horiz) return `${vert}-${horiz}`;
  if (vert) return vert;
  if (horiz) return horiz;
  return "central";
}

function mapToRegionId(zone: AnatomicalZone, direction: string): string {
  if (zone === "pupil") return "pupil";
  if (zone === "iris") return "iris";

  if (zone === "bulbar_conjunctiva" || zone === "limbus") {
    if (direction.includes("nasal")) return "bulbar_conj_nasal";
    if (direction.includes("temporal")) return "bulbar_conj_temporal";
    if (direction.includes("superior")) return "bulbar_conj_superior";
    return "bulbar_conj_inferior";
  }

  // Corneal zones
  if (zone === "central_cornea") return "cornea_central";
  if (direction.includes("superior")) return "cornea_superior";
  if (direction.includes("inferior")) return "cornea_inferior";
  if (direction.includes("nasal")) return "cornea_nasal";
  if (direction.includes("temporal")) return "cornea_temporal";
  return "cornea_central";
}

function buildDescription(zone: AnatomicalZone, direction: string, distFromLimbus: number): string {
  const dir = direction === "central" ? "" : direction.replace("-", "-") + " ";

  if (zone === "pupil") return "pupil";
  if (zone === "limbus") return `${dir}limbus`;
  if (zone === "bulbar_conjunctiva") return `${dir}bulbar conjunctiva`;

  const zonePretty = zone.replace(/_/g, " ");
  if (distFromLimbus > 0) {
    return `${dir}${zonePretty}, ${distFromLimbus.toFixed(1)}mm from limbus`;
  }
  return `${dir}${zonePretty}, at limbus`;
}

/* ── Brush bounds ──────────────────────────────────────────────── */

export function computeBrushBounds(points: { x: number; y: number }[]): BrushBounds {
  if (points.length === 0) return { widthMm: 0, heightMm: 0, centerX: CX, centerY: CY, description: "" };

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const wMm = Math.round(((maxX - minX) / PX_PER_MM) * 10) / 10;
  const hMm = Math.round(((maxY - minY) / PX_PER_MM) * 10) / 10;

  return {
    widthMm: wMm,
    heightMm: hMm,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    description: `~${wMm.toFixed(1)}mm × ${hMm.toFixed(1)}mm`,
  };
}
