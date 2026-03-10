/**
 * Dual-eye coordinate mapping for the anterior segment photo.
 * Photo: 1920x1080, doctor's view — OD on left, OS on right.
 *
 * Click position auto-determines which eye is being examined.
 * Per-eye geometry defines the palpebral fissure, iris, pupil,
 * and concentric zones for mapping to finding-tree regions.
 */

// ── Image dimensions (SVG viewBox) ────────────────────────────
export const IMG_W = 1920;
export const IMG_H = 1080;

// ── Per-eye geometry ──────────────────────────────────────────

export type EyeGeometry = {
  eye: "OD" | "OS";
  cx: number;          // pupil/iris center X
  cy: number;          // pupil/iris center Y
  pupilR: number;      // pupil radius (px)
  irisR: number;       // iris outer radius (px)
  limbusR: number;     // limbus radius (px)
  pxPerMm: number;     // pixels per mm (limbusR / 5.75)
  // Palpebral fissure — quadratic bezier from temporal to nasal canthus
  nasalCanthus: { x: number; y: number };
  temporalCanthus: { x: number; y: number };
  upperCtrlY: number;  // bezier control Y for upper lid (control X = cx)
  lowerCtrlY: number;  // bezier control Y for lower lid (control X = cx)
};

export const OD_GEO: EyeGeometry = {
  eye: "OD",
  cx: 417, cy: 515,
  pupilR: 28, irisR: 106, limbusR: 117,
  pxPerMm: 117 / 5.75,
  nasalCanthus: { x: 624, y: 562 },
  temporalCanthus: { x: 217, y: 534 },
  upperCtrlY: 345,
  lowerCtrlY: 722,
};

export const OS_GEO: EyeGeometry = {
  eye: "OS",
  cx: 1528, cy: 516,
  pupilR: 27, irisR: 101, limbusR: 110,
  pxPerMm: 110 / 5.75,
  nasalCanthus: { x: 1333, y: 568 },
  temporalCanthus: { x: 1746, y: 544 },
  upperCtrlY: 337,
  lowerCtrlY: 714,
};

const NOSE_X = 978;

/** Average PX_PER_MM for brush stroke sizing */
export const AVG_PX_PER_MM = (OD_GEO.pxPerMm + OS_GEO.pxPerMm) / 2;

/** Determine which eye geometry to use based on click X */
export function getEyeGeo(x: number): EyeGeometry {
  return x < NOSE_X ? OD_GEO : OS_GEO;
}

// ── Zones ─────────────────────────────────────────────────────

export type AnatomicalZone =
  | "pupil"
  | "central_cornea"
  | "paracentral_cornea"
  | "peripheral_cornea"
  | "limbus"
  | "bulbar_conjunctiva"
  | "upper_lid"
  | "lower_lid";

export type ZoneGroup = "central" | "conjunctival" | "lid";

export function zoneGroup(zone: AnatomicalZone): ZoneGroup {
  if (zone === "upper_lid" || zone === "lower_lid") return "lid";
  if (zone === "bulbar_conjunctiva") return "conjunctival";
  return "central";
}

// ── Depth layers ──────────────────────────────────────────────

export type DepthLayer = {
  id: string;
  label: string;
  color: string;
  flex: number;
  separator?: boolean;
};

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

export const CONJ_DEPTHS: DepthLayer[] = [
  { id: "conjunctiva",  label: "Conjunctiva", color: "#f0c8c8", flex: 25 },
  { id: "episclera",    label: "Episclera",   color: "#e0b8a8", flex: 25 },
  { id: "sclera",       label: "Sclera",      color: "#d8d0c8", flex: 25 },
];

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

// ── Location type ─────────────────────────────────────────────

/** A single description option the user can choose from */
export type DescriptionOption = {
  label: string;       // e.g. "precise", "standard", "general"
  text: string;        // the actual description text
};

export type EyeLocation = {
  eye: "OD" | "OS";
  zone: AnatomicalZone;
  direction: string;
  distFromLimbusMm: number;
  distFromCenterMm: number;
  clockHour: number;
  regionId: string;
  description: string;
  /** Multiple description options from precise → general */
  descriptionOptions: DescriptionOption[];
};

export type BrushBounds = {
  widthMm: number;
  heightMm: number;
  centerX: number;
  centerY: number;
  description: string;
};

// ── Bezier helpers ────────────────────────────────────────────

/**
 * Given x, compute the Y of a quadratic bezier P0→P1→P2.
 * Solves the quadratic at^2 + bt + c = 0 for t, then evaluates y(t).
 */
function bezierYFromX(
  x: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
): number | null {
  const ax = p0.x - 2 * p1.x + p2.x;
  const bx = 2 * (p1.x - p0.x);
  const cx_ = p0.x - x;

  let t: number;
  if (Math.abs(ax) < 0.001) {
    if (Math.abs(bx) < 0.001) return null;
    t = -cx_ / bx;
  } else {
    const disc = bx * bx - 4 * ax * cx_;
    if (disc < 0) return null;
    const sqrtDisc = Math.sqrt(disc);
    const t1 = (-bx + sqrtDisc) / (2 * ax);
    const t2 = (-bx - sqrtDisc) / (2 * ax);
    if (t1 >= 0 && t1 <= 1) t = t1;
    else if (t2 >= 0 && t2 <= 1) t = t2;
    else return null;
  }

  if (t < 0 || t > 1) return null;
  return (1 - t) * (1 - t) * p0.y + 2 * t * (1 - t) * p1.y + t * t * p2.y;
}

/** Get upper lid Y at image x for a given eye geometry. */
function upperLidY(x: number, geo: EyeGeometry): number | null {
  return bezierYFromX(
    x,
    geo.temporalCanthus,
    { x: geo.cx, y: geo.upperCtrlY },
    geo.nasalCanthus,
  );
}

/** Get lower lid Y at image x for a given eye geometry. */
function lowerLidY(x: number, geo: EyeGeometry): number | null {
  return bezierYFromX(
    x,
    geo.temporalCanthus,
    { x: geo.cx, y: geo.lowerCtrlY },
    geo.nasalCanthus,
  );
}

// ── Lid zone detection ────────────────────────────────────────

function getLidZone(x: number, y: number, geo: EyeGeometry): "upper_lid" | "lower_lid" | null {
  const leftX = Math.min(geo.nasalCanthus.x, geo.temporalCanthus.x);
  const rightX = Math.max(geo.nasalCanthus.x, geo.temporalCanthus.x);

  // Outside the horizontal extent of the fissure — lid zone
  if (x < leftX || x > rightX) {
    return y < geo.cy ? "upper_lid" : "lower_lid";
  }

  const uY = upperLidY(x, geo);
  const lY = lowerLidY(x, geo);

  if (uY !== null && y < uY) return "upper_lid";
  if (lY !== null && y > lY) return "lower_lid";

  return null; // inside aperture
}

// ── Map click to location ─────────────────────────────────────

export function mapClickToLocation(x: number, y: number): EyeLocation | null {
  const geo = getEyeGeo(x);

  // Check if within a reasonable distance of the eye
  const maxR = Math.max(
    Math.abs(geo.nasalCanthus.x - geo.cx),
    Math.abs(geo.temporalCanthus.x - geo.cx),
  ) * 1.4;
  const fromCenter = Math.sqrt((x - geo.cx) ** 2 + (y - geo.cy) ** 2);
  if (fromCenter > maxR) return null;

  // Check lid zone
  const lid = getLidZone(x, y, geo);
  if (lid) {
    const lidOpts: DescriptionOption[] = [{ label: "standard", text: lid === "upper_lid" ? "upper lid" : "lower lid" }];
    return {
      eye: geo.eye,
      zone: lid,
      direction: lid === "upper_lid" ? "upper" : "lower",
      distFromLimbusMm: 0,
      distFromCenterMm: 0,
      clockHour: lid === "upper_lid" ? 12 : 6,
      regionId: lid === "upper_lid" ? "upper_lid" : "lower_lid",
      description: lidOpts[0].text,
      descriptionOptions: lidOpts,
    };
  }

  // Inside aperture — distance-based zones
  const dx = x - geo.cx;
  const dy = y - geo.cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const distMm = dist / geo.pxPerMm;
  const distFromLimbusMm = Math.round(((geo.limbusR - dist) / geo.pxPerMm) * 10) / 10;

  let angle = Math.atan2(-dy, dx);
  if (angle < 0) angle += 2 * Math.PI;

  let clockAngle = Math.PI / 2 - angle;
  if (clockAngle < 0) clockAngle += 2 * Math.PI;
  const clockHour = Math.round((clockAngle / (Math.PI / 6)) % 12) || 12;

  const direction = getDirection(angle, geo.eye);
  const zone = getZoneByDist(dist, geo);
  const regionId = mapToDefaultRegion(zone, direction);
  const descriptionOptions = buildDescriptionOptions(x, y, dist, zone, direction, geo);
  const description = descriptionOptions[0].text;

  return {
    eye: geo.eye,
    zone, direction, distFromLimbusMm,
    distFromCenterMm: Math.round(distMm * 10) / 10,
    clockHour, regionId, description, descriptionOptions,
  };
}

function getZoneByDist(dist: number, geo: EyeGeometry): AnatomicalZone {
  if (dist <= geo.pupilR) return "pupil";
  if (dist <= geo.pupilR + (geo.irisR - geo.pupilR) * 0.35) return "central_cornea";
  if (dist <= geo.irisR * 0.82) return "paracentral_cornea";
  if (dist <= geo.limbusR) return "peripheral_cornea";
  if (dist <= geo.limbusR + 12) return "limbus";
  return "bulbar_conjunctiva";
}

/**
 * Direction mapping — accounts for photo orientation:
 *   OD is on left side of image, so dx>0 points nasally (towards nose bridge)
 *   OS is on right side, so dx>0 points temporally (away from nose bridge)
 */
function getDirection(angle: number, eye: "OD" | "OS"): string {
  const deg = ((angle * 180) / Math.PI) % 360;
  let vert = "";
  let horiz = "";

  if (deg >= 30 && deg < 150) vert = "superior";
  else if (deg >= 210 && deg < 330) vert = "inferior";

  // In the photo: angle ~0 (right/east) = nasal for OD, temporal for OS
  if (deg < 30 || deg >= 330) horiz = eye === "OD" ? "nasal" : "temporal";
  else if (deg >= 150 && deg < 210) horiz = eye === "OD" ? "temporal" : "nasal";

  if (vert && horiz) return `${vert}-${horiz}`;
  if (vert) return vert;
  if (horiz) return horiz;
  return "central";
}

function mapToDefaultRegion(zone: AnatomicalZone, direction: string): string {
  if (zone === "pupil") return "cornea_central";
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

/** Euclidean distance */
function pxDist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

/**
 * Build multiple description options from precise → general.
 */
function buildDescriptionOptions(
  x: number, y: number, distFromCenter: number,
  zone: AnatomicalZone, direction: string, geo: EyeGeometry,
): DescriptionOption[] {
  const dir = direction === "central" ? "" : direction + " ";
  const opts: DescriptionOption[] = [];

  if (zone === "upper_lid") {
    opts.push({ label: "standard", text: "upper lid" });
    return opts;
  }
  if (zone === "lower_lid") {
    opts.push({ label: "standard", text: "lower lid" });
    return opts;
  }

  // Central / paracentral cornea
  if (zone === "pupil" || zone === "central_cornea") {
    const mm = distFromCenter / geo.pxPerMm;
    if (mm < 0.3) {
      opts.push({ label: "precise", text: "visual axis" });
      opts.push({ label: "standard", text: "central cornea" });
    } else {
      opts.push({ label: "precise", text: `${dir}central cornea, ${mm.toFixed(1)}mm from visual axis` });
      opts.push({ label: "standard", text: `${dir}central cornea` });
    }
    opts.push({ label: "general", text: "cornea" });
    return opts;
  }

  if (zone === "paracentral_cornea") {
    const mm = distFromCenter / geo.pxPerMm;
    opts.push({ label: "precise", text: `${dir}paracentral cornea, ${mm.toFixed(1)}mm from visual axis` });
    opts.push({ label: "standard", text: `${dir}paracentral cornea` });
    opts.push({ label: "general", text: "cornea" });
    return opts;
  }

  if (zone === "peripheral_cornea" || zone === "limbus") {
    const fromLimbusMm = Math.abs(geo.limbusR - distFromCenter) / geo.pxPerMm;
    if (zone === "limbus") {
      opts.push({ label: "precise", text: `${dir}limbus` });
      opts.push({ label: "general", text: "limbus" });
    } else {
      opts.push({ label: "precise", text: `${dir}peripheral cornea, ${fromLimbusMm.toFixed(1)}mm from limbus` });
      opts.push({ label: "standard", text: `${dir}peripheral cornea` });
      opts.push({ label: "general", text: "cornea" });
    }
    return opts;
  }

  if (zone === "bulbar_conjunctiva") {
    const fromLimbusMm = (distFromCenter - geo.limbusR) / geo.pxPerMm;
    const toNasal = pxDist(x, y, geo.nasalCanthus.x, geo.nasalCanthus.y) / geo.pxPerMm;
    const toTemporal = pxDist(x, y, geo.temporalCanthus.x, geo.temporalCanthus.y) / geo.pxPerMm;
    const nearestCanthusMm = Math.min(toNasal, toTemporal);
    const canthusSide = toNasal <= toTemporal ? "nasal canthus" : "temporal canthus";

    if (fromLimbusMm < nearestCanthusMm) {
      opts.push({ label: "precise", text: `${dir}bulbar conj, ${fromLimbusMm.toFixed(1)}mm from limbus` });
    } else {
      opts.push({ label: "precise", text: `${dir}bulbar conj, ${nearestCanthusMm.toFixed(1)}mm from ${canthusSide}` });
    }
    opts.push({ label: "standard", text: `${dir}bulbar conj` });
    opts.push({ label: "general", text: "bulbar conj" });
    return opts;
  }

  opts.push({ label: "standard", text: `${dir}${zone.replace(/_/g, " ")}` });
  return opts;
}

/** Legacy single-description helper — returns the most precise option */
function buildDescription(
  x: number, y: number, distFromCenter: number,
  zone: AnatomicalZone, direction: string, geo: EyeGeometry,
): string {
  const opts = buildDescriptionOptions(x, y, distFromCenter, zone, direction, geo);
  return opts[0].text;
}

// ── Resolve depth → finding-tree region ───────────────────────

export function resolveRegionForDepth(
  depthId: string,
  xyLocation: EyeLocation,
): string {
  const { zone, direction } = xyLocation;

  if (["tear_film"].includes(depthId)) return "tear_film";

  if (["epithelium", "bowmans", "stroma", "descemets", "endothelium"].includes(depthId)) {
    return corneaRegionFromDirection(direction);
  }

  if (depthId === "anterior_chamber") return "anterior_chamber";
  if (depthId === "iris") return "iris";
  if (depthId === "pupil") return "pupil";
  if (depthId === "anterior_lens" || depthId === "posterior_lens") return "lens";

  if (["conjunctiva", "episclera", "sclera"].includes(depthId)) {
    if (direction.includes("nasal")) return "bulbar_conj_nasal";
    if (direction.includes("temporal")) return "bulbar_conj_temporal";
    if (direction.includes("superior")) return "bulbar_conj_superior";
    return "bulbar_conj_inferior";
  }

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

// ── Brush bounds ──────────────────────────────────────────────

export function computeBrushBounds(
  points: { x: number; y: number }[],
  strokeW: number,
): BrushBounds {
  if (points.length === 0)
    return { widthMm: 0, heightMm: 0, centerX: IMG_W / 2, centerY: IMG_H / 2, description: "" };

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

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Use per-eye PX_PER_MM for the eye the brush is over
  const geo = getEyeGeo(centerX);
  const pxPerMm = geo.pxPerMm;

  const wMm = Math.round(((maxX - minX) / pxPerMm) * 10) / 10;
  const hMm = Math.round(((maxY - minY) / pxPerMm) * 10) / 10;

  return {
    widthMm: wMm, heightMm: hMm,
    centerX, centerY,
    description: `~${wMm.toFixed(1)}mm x ${hMm.toFixed(1)}mm`,
  };
}

// ── Recompute location from brush bounds ──────────────────────

/**
 * After drawing, recompute the EyeLocation from the brush bounding box.
 * If the drawn area is large enough to span multiple zones or directions,
 * the description generalises (e.g. "inferior cornea" → "cornea" or "diffuse cornea").
 */
export function recomputeLocationFromBounds(
  bounds: BrushBounds,
  originalLocation: EyeLocation,
): EyeLocation {
  const geo = getEyeGeo(bounds.centerX);

  // Recompute center-based location
  const centerLoc = mapClickToLocation(bounds.centerX, bounds.centerY);
  if (!centerLoc) return originalLocation;

  // Sample corners of the bounding box to detect if multiple zones/directions are covered
  const halfW = (bounds.widthMm * geo.pxPerMm) / 2;
  const halfH = (bounds.heightMm * geo.pxPerMm) / 2;
  const samplePoints = [
    { x: bounds.centerX - halfW, y: bounds.centerY - halfH },
    { x: bounds.centerX + halfW, y: bounds.centerY - halfH },
    { x: bounds.centerX - halfW, y: bounds.centerY + halfH },
    { x: bounds.centerX + halfW, y: bounds.centerY + halfH },
    { x: bounds.centerX, y: bounds.centerY },
  ];

  const zones = new Set<AnatomicalZone>();
  const directions = new Set<string>();
  for (const pt of samplePoints) {
    const loc = mapClickToLocation(pt.x, pt.y);
    if (loc) {
      zones.add(loc.zone);
      directions.add(loc.direction);
    }
  }

  // Determine if the area spans enough to warrant generalisation
  const corneaZones: AnatomicalZone[] = ["pupil", "central_cornea", "paracentral_cornea", "peripheral_cornea"];
  const touchesCornea = [...zones].some((z) => corneaZones.includes(z));
  const touchesConj = zones.has("bulbar_conjunctiva") || zones.has("limbus");
  const multipleDirections = directions.size > 1;
  const hasOppositeDirections = (directions.has("superior") && directions.has("inferior"))
    || (directions.has("nasal") && directions.has("temporal"))
    || (directions.has("superior-nasal") && directions.has("inferior-temporal"))
    || (directions.has("superior-temporal") && directions.has("inferior-nasal"));

  // Build description options for the drawn area
  const opts: DescriptionOption[] = [];

  // Always include the precise center-based description
  for (const o of centerLoc.descriptionOptions) {
    opts.push(o);
  }

  // If area is large / spans zones, add broader options
  if (hasOppositeDirections && touchesCornea && !touchesConj) {
    // Spans across center — diffuse cornea
    opts.push({ label: "diffuse", text: "diffuse cornea" });
  } else if (multipleDirections && touchesCornea && touchesConj) {
    opts.push({ label: "diffuse", text: "cornea and conj" });
  } else if (multipleDirections && touchesCornea) {
    // Spans multiple corneal directions but not fully opposing
    // Collect the unique directions for a compound description
    const dirList = [...directions].filter((d) => d !== "central");
    if (dirList.length > 2) {
      opts.push({ label: "diffuse", text: "diffuse cornea" });
    } else if (dirList.length === 2) {
      opts.push({ label: "broad", text: `${dirList.join(" to ")} cornea` });
    }
  }

  // Deduplicate options by text
  const seen = new Set<string>();
  const uniqueOpts = opts.filter((o) => {
    if (seen.has(o.text)) return false;
    seen.add(o.text);
    return true;
  });

  // Update regionId if the drawn area generalised beyond the original
  let regionId = centerLoc.regionId;
  if (hasOppositeDirections && touchesCornea) {
    regionId = "cornea_diffuse";
  }

  return {
    ...centerLoc,
    regionId,
    descriptionOptions: uniqueOpts,
    description: uniqueOpts[0].text,
  };
}
