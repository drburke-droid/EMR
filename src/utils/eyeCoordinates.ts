/**
 * Maps pixel coordinates on the anterior segment photo SVG
 * to anatomical locations, zone-aware depth stacks, and finding-tree region IDs.
 */

// SVG geometry (viewBox 0 0 500 400)
export const CX = 250;
export const CY = 200;
export const PUPIL_R = 35;
export const IRIS_R = 95;
export const LIMBUS_R = 100;
export const SCLERA_R = 170;
export const PX_PER_MM = LIMBUS_R / 5.75; // ≈17.4

/* ── Zones ─────────────────────────────────────────────────── */

export type AnatomicalZone =
  | "pupil"
  | "central_cornea"
  | "paracentral_cornea"
  | "peripheral_cornea"
  | "limbus"
  | "bulbar_conjunctiva"
  | "upper_lid"
  | "lower_lid";

/** Broad grouping used to pick the depth stack */
export type ZoneGroup = "central" | "conjunctival" | "lid";

export function zoneGroup(zone: AnatomicalZone): ZoneGroup {
  if (zone === "upper_lid" || zone === "lower_lid") return "lid";
  if (zone === "bulbar_conjunctiva") return "conjunctival";
  // pupil, all cornea zones, limbus — all overlying central optics
  return "central";
}

/* ── Depth layers — three context-aware stacks ─────────────── */

export type DepthLayer = {
  id: string;
  label: string;
  color: string;
  flex: number;
  separator?: boolean; // render a group separator above this layer
};

/** Central stack: clicked over cornea / pupil / iris area */
export const CENTRAL_DEPTHS: DepthLayer[] = [
  { id: "tear_film",        label: "Tear Film",     color: "#7cc4e8", flex: 6 },
  { id: "epithelium",       label: "Epithelium",    color: "#c4a8d4", flex: 12 },
  { id: "bowmans",          label: "Bowman's",      color: "#d4c878", flex: 6 },
  { id: "stroma",           label: "Stroma",        color: "#88b8d8", flex: 22 },
  { id: "descemets",        label: "Descemet's",    color: "#d8a858", flex: 6 },
  { id: "endothelium",      label: "Endothelium",   color: "#68b888", flex: 10 },
  { id: "anterior_chamber", label: "Ant. Chamber",  color: "#a8d8f0", flex: 16, separator: true },
  { id: "iris",             label: "Iris",          color: "#c8a870", flex: 10, separator: true },
  { id: "pupil",            label: "Pupil",         color: "#444444", flex: 8 },
  { id: "anterior_lens",    label: "Ant. Lens",     color: "#d8d0c0", flex: 10, separator: true },
  { id: "posterior_lens",   label: "Post. Lens",    color: "#c8c0b0", flex: 10 },
];

/** Conjunctival stack: clicked over bulbar conj */
export const CONJ_DEPTHS: DepthLayer[] = [
  { id: "conjunctiva",  label: "Conjunctiva", color: "#f0c8c8", flex: 25 },
  { id: "episclera",    label: "Episclera",   color: "#e0b8a8", flex: 25 },
  { id: "sclera",       label: "Sclera",      color: "#d8d0c8", flex: 25 },
];

/** Lid stack: clicked over upper or lower lid */
export const LID_DEPTHS: DepthLayer[] = [
  { id: "skin",           label: "Skin",         color: "#dcc0a8", flex: 25 },
  { id: "tarsus_gland",   label: "Tarsus / Gland", color: "#e8c890", flex: 25 },
  { id: "palpebral_conj", label: "Palp. Conj",   color: "#d8a8b8", flex: 25 },
];

export function getDepthStack(zone: AnatomicalZone): DepthLayer[] {
  const g = zoneGroup(zone);
  if (g === "lid") return LID_DEPTHS;
  if (g === "conjunctival") return CONJ_DEPTHS;
  return CENTRAL_DEPTHS;
}

/* ── Location ──────────────────────────────────────────────── */

export type EyeLocation = {
  zone: AnatomicalZone;
  direction: string;
  distFromLimbusMm: number;
  distFromCenterMm: number;
  clockHour: number;
  regionId: string;      // default region before depth override
  description: string;
};

export type BrushBounds = {
  widthMm: number;
  heightMm: number;
  centerX: number;
  centerY: number;
  description: string;
};

/* ── Eyelid aperture math ──────────────────────────────────── */

/**
 * The aperture is two quadratic beziers:
 *   Upper: (40,200) → ctrl (250,55) → (460,200)
 *   Lower: (460,200) → ctrl (250,345) → (40,200)
 *
 * Both have linear x(t), so we can solve for t from x.
 */
function apertureUpperY(x: number): number {
  const t = (x - 40) / 420;
  return 200 - 290 * t + 290 * t * t;
}

function apertureLowerY(x: number): number {
  const t = (460 - x) / 420;
  return 200 + 290 * t - 290 * t * t;
}

function lidZone(x: number, y: number): "upper_lid" | "lower_lid" | null {
  if (x < 40 || x > 460) return y < CY ? "upper_lid" : "lower_lid";
  if (y < apertureUpperY(x)) return "upper_lid";
  if (y > apertureLowerY(x)) return "lower_lid";
  return null; // inside aperture
}

/* ── mapClickToLocation ────────────────────────────────────── */

export function mapClickToLocation(x: number, y: number, eye: "OD" | "OS"): EyeLocation {
  // Check lid first
  const lid = lidZone(x, y);
  if (lid) {
    const isUpper = lid === "upper_lid";
    return {
      zone: lid,
      direction: isUpper ? "upper" : "lower",
      distFromLimbusMm: 0,
      distFromCenterMm: 0,
      clockHour: isUpper ? 12 : 6,
      regionId: isUpper ? "upper_lid" : "lower_lid",
      description: isUpper ? "upper lid" : "lower lid",
    };
  }

  // Inside aperture — distance-based zones
  const dx = x - CX;
  const dy = y - CY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const distMm = dist / PX_PER_MM;
  const distFromLimbusMm = Math.round(((LIMBUS_R - dist) / PX_PER_MM) * 10) / 10;

  let angle = Math.atan2(-dy, dx);
  if (angle < 0) angle += 2 * Math.PI;

  let clockAngle = Math.PI / 2 - angle;
  if (clockAngle < 0) clockAngle += 2 * Math.PI;
  const clockHour = Math.round((clockAngle / (Math.PI / 6)) % 12) || 12;

  const direction = getDirection(angle, eye);
  const zone = getZoneByDist(dist);
  const regionId = mapToDefaultRegion(zone, direction);
  const description = buildDescription(zone, direction, distFromLimbusMm);

  return {
    zone, direction, distFromLimbusMm,
    distFromCenterMm: Math.round(distMm * 10) / 10,
    clockHour, regionId, description,
  };
}

function getZoneByDist(dist: number): AnatomicalZone {
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

function mapToDefaultRegion(zone: AnatomicalZone, direction: string): string {
  if (zone === "pupil") return "cornea_central"; // default for XY only — depth overrides
  if (zone === "upper_lid") return "upper_lid";
  if (zone === "lower_lid") return "lower_lid";

  if (zone === "bulbar_conjunctiva" || zone === "limbus") {
    if (direction.includes("nasal")) return "bulbar_conj_nasal";
    if (direction.includes("temporal")) return "bulbar_conj_temporal";
    if (direction.includes("superior")) return "bulbar_conj_superior";
    return "bulbar_conj_inferior";
  }

  if (zone === "central_cornea") return "cornea_central";
  if (direction.includes("superior")) return "cornea_superior";
  if (direction.includes("inferior")) return "cornea_inferior";
  if (direction.includes("nasal")) return "cornea_nasal";
  if (direction.includes("temporal")) return "cornea_temporal";
  return "cornea_central";
}

function buildDescription(zone: AnatomicalZone, direction: string, distFromLimbus: number): string {
  const dir = direction === "central" ? "" : direction + " ";
  if (zone === "upper_lid") return "upper lid";
  if (zone === "lower_lid") return "lower lid";
  if (zone === "pupil") return `${dir}central (over pupil)`;
  if (zone === "limbus") return `${dir}limbus`;
  if (zone === "bulbar_conjunctiva") return `${dir}bulbar conjunctiva`;

  const zonePretty = zone.replace(/_/g, " ");
  if (distFromLimbus > 0) return `${dir}${zonePretty}, ${distFromLimbus.toFixed(1)}mm from limbus`;
  return `${dir}${zonePretty}, at limbus`;
}

/* ── Resolve depth → finding-tree region ───────────────────── */

/**
 * Given the depth layer chosen and the XY location context,
 * return the correct finding-tree regionId.
 *
 * Key logic:
 *   - Corneal layer depths (epithelium..endothelium) → cornea_* region from XY
 *     even if the user clicked over the pupil or iris (cornea overlies them)
 *   - AC / iris / pupil / lens depths → their own region
 *   - Conj depths → bulbar_conj_* from XY
 *   - Lid depths → lid/margin/palpebral_conj based on upper vs lower
 */
export function resolveRegionForDepth(
  depthId: string,
  xyLocation: EyeLocation,
): string {
  const { zone, direction } = xyLocation;

  // ── Central stack ──────────────────────────────────────
  // Corneal layers → always cornea region (XY position on cornea)
  if (["tear_film"].includes(depthId)) return "tear_film";

  if (["epithelium", "bowmans", "stroma", "descemets", "endothelium"].includes(depthId)) {
    // Even if user clicked over pupil/iris, the cornea overlies it
    return corneaRegionFromDirection(direction);
  }

  if (depthId === "anterior_chamber") return "anterior_chamber";
  if (depthId === "iris") return "iris";
  if (depthId === "pupil") return "pupil";
  if (depthId === "anterior_lens" || depthId === "posterior_lens") return "lens";

  // ── Conjunctival stack ─────────────────────────────────
  if (["conjunctiva", "episclera", "sclera"].includes(depthId)) {
    // Use the XY-derived conj region
    if (direction.includes("nasal")) return "bulbar_conj_nasal";
    if (direction.includes("temporal")) return "bulbar_conj_temporal";
    if (direction.includes("superior")) return "bulbar_conj_superior";
    return "bulbar_conj_inferior";
  }

  // ── Lid stack ──────────────────────────────────────────
  const isUpper = zone === "upper_lid";
  if (depthId === "skin") return isUpper ? "upper_lid" : "lower_lid";
  if (depthId === "tarsus_gland") return isUpper ? "upper_lid_margin" : "lower_lid_margin";
  if (depthId === "palpebral_conj") return isUpper ? "palpebral_conj_upper" : "palpebral_conj_lower";

  return xyLocation.regionId;
}

function corneaRegionFromDirection(direction: string): string {
  if (direction === "central") return "cornea_central";
  if (direction.includes("superior") && !direction.includes("nasal") && !direction.includes("temporal"))
    return "cornea_superior";
  if (direction.includes("inferior") && !direction.includes("nasal") && !direction.includes("temporal"))
    return "cornea_inferior";
  if (direction.includes("nasal")) return "cornea_nasal";
  if (direction.includes("temporal")) return "cornea_temporal";
  return "cornea_central";
}

/* ── Brush bounds ──────────────────────────────────────────── */

export function computeBrushBounds(points: { x: number; y: number }[], strokeW: number): BrushBounds {
  if (points.length === 0)
    return { widthMm: 0, heightMm: 0, centerX: CX, centerY: CY, description: "" };

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const half = strokeW / 2;
  minX -= half; minY -= half;
  maxX += half; maxY += half;

  const wMm = Math.round(((maxX - minX) / PX_PER_MM) * 10) / 10;
  const hMm = Math.round(((maxY - minY) / PX_PER_MM) * 10) / 10;

  return {
    widthMm: wMm, heightMm: hMm,
    centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2,
    description: `~${wMm.toFixed(1)}mm × ${hMm.toFixed(1)}mm`,
  };
}
