/**
 * Retina coordinate system for posterior segment photo.
 * Photo: 1920x1080, OD on left, OS on right — standard ophthalmic convention.
 *
 * Landmarks are calibrated by the user clicking on the retina photo.
 * The optic disc diameter (DD) is the fundamental unit of measurement.
 * Angular positions use clock hours (12 = superior, 3 = nasal for OD / temporal for OS).
 */

export const RETINA_W = 1920;
export const RETINA_H = 1080;

// ── Types ────────────────────────────────────────────────────

export type Point = { x: number; y: number };

export type RetinaEyeGeometry = {
  eye: "OD" | "OS";
  /** Center of the optic disc */
  discCenter: Point;
  /** Radius of the optic disc in pixels (= 0.5 DD) */
  discRadius: number;
  /** Fovea location */
  fovea: Point;
  /** Points along the superior vascular arcade */
  superiorArcade: Point[];
  /** Points along the inferior vascular arcade */
  inferiorArcade: Point[];
  /** Center of the visible fundus circle */
  fundusCenter: Point;
  /** Radius of the visible fundus circle in pixels */
  fundusRadius: number;
};

export type RetinaCalibration = {
  od: RetinaEyeGeometry;
  os: RetinaEyeGeometry;
};

// ── Derived measurements ─────────────────────────────────────

/** Get disc diameter in pixels */
export function discDiameterPx(geo: RetinaEyeGeometry): number {
  return geo.discRadius * 2;
}

/** Convert pixel distance to disc diameters */
export function pxToDD(px: number, geo: RetinaEyeGeometry): number {
  const dd = discDiameterPx(geo);
  if (dd === 0) return 0;
  return Math.round((px / dd) * 10) / 10;
}

/** Convert disc diameters to pixels */
export function ddToPx(dd: number, geo: RetinaEyeGeometry): number {
  return dd * discDiameterPx(geo);
}

/** Distance between two points in pixels */
export function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Clock hour from a reference point.
 * 12 = superior, 3 = nasal (OD) / temporal (OS), 6 = inferior, 9 = temporal (OD) / nasal (OS).
 * In fundus photos: superior is UP (negative Y), so angle math is straightforward.
 */
export function clockHourFrom(from: Point, to: Point, eye: "OD" | "OS"): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y; // positive = down = inferior

  // Angle from 12 o'clock (superior), clockwise
  // For OD: nasal is to the RIGHT in fundus photo (towards nose)
  // For OS: nasal is to the LEFT in fundus photo (towards nose)
  let angle = Math.atan2(dx, -dy); // 0 = up, positive CW
  if (eye === "OS") {
    // Mirror horizontal for OS — in photo, OS nasal is LEFT
    angle = Math.atan2(-dx, -dy);
  }
  if (angle < 0) angle += 2 * Math.PI;

  const hour = Math.round((angle / (Math.PI / 6)) % 12) || 12;
  return hour;
}

/** Posterior pole center (midpoint between disc and fovea) */
export function posteriorPoleCenter(geo: RetinaEyeGeometry): Point {
  return {
    x: (geo.discCenter.x + geo.fovea.x) / 2,
    y: (geo.discCenter.y + geo.fovea.y) / 2,
  };
}

/** Macula center = fovea, macula radius ≈ 1.5 DD from fovea */
export function maculaRadius(geo: RetinaEyeGeometry): number {
  return discDiameterPx(geo) * 1.5;
}

// ── Zone classification ──────────────────────────────────────

export type RetinalZone =
  | "optic_nerve"
  | "fovea"
  | "macula"
  | "posterior_pole"
  | "mid_periphery"
  | "far_periphery";

/**
 * Classify a point into a retinal zone.
 * - Within disc = optic_nerve
 * - Within ~0.25 DD of fovea = fovea
 * - Within ~1.5 DD of fovea = macula
 * - Within arcades = posterior_pole
 * - Beyond arcades but within ~70% of fundus = mid_periphery
 * - Beyond that = far_periphery
 */
export function classifyZone(p: Point, geo: RetinaEyeGeometry): RetinalZone {
  const dd = discDiameterPx(geo);

  // Optic nerve head
  if (dist(p, geo.discCenter) <= geo.discRadius) return "optic_nerve";

  // Fovea (central ~0.25 DD)
  if (dist(p, geo.fovea) <= dd * 0.25) return "fovea";

  // Macula (~1.5 DD from fovea)
  if (dist(p, geo.fovea) <= dd * 1.5) return "macula";

  // Posterior pole: within the arcade boundaries (~3 DD from posterior pole center)
  const ppCenter = posteriorPoleCenter(geo);
  if (dist(p, ppCenter) <= dd * 3) return "posterior_pole";

  // Mid periphery vs far periphery
  const fromFundusCenter = dist(p, geo.fundusCenter);
  if (fromFundusCenter <= geo.fundusRadius * 0.7) return "mid_periphery";

  return "far_periphery";
}

// ── Calibrated geometry — from PSCalibrationTool 2026-03-11 ──

export const DEFAULT_OD: RetinaEyeGeometry = {
  eye: "OD",
  discCenter: { x: 570.71, y: 518.97 },
  discRadius: 31.76,
  fovea: { x: 439.28, y: 524.65 },
  superiorArcade: [
    { x: 564.97, y: 483.61 },
    { x: 541.88, y: 428.46 },
    { x: 513.67, y: 389.98 },
    { x: 484.17, y: 364.33 },
    { x: 434.15, y: 355.35 },
    { x: 376.43, y: 368.18 },
    { x: 349.50, y: 369.46 },
  ],
  inferiorArcade: [
    { x: 576.51, y: 550.30 },
    { x: 566.25, y: 582.36 },
    { x: 530.34, y: 620.84 },
    { x: 507.25, y: 637.52 },
    { x: 452.10, y: 656.75 },
    { x: 417.47, y: 645.21 },
    { x: 393.11, y: 642.65 },
    { x: 364.89, y: 660.60 },
    { x: 321.28, y: 659.32 },
  ],
  fundusCenter: { x: 450.82, y: 525.93 },
  fundusRadius: 402.74,
};

export const DEFAULT_OS: RetinaEyeGeometry = {
  eye: "OS",
  discCenter: { x: 1343.49, y: 520.80 },
  discRadius: 30.78,
  fovea: { x: 1480.72, y: 523.37 },
  superiorArcade: [
    { x: 1348.62, y: 490.02 },
    { x: 1360.16, y: 464.37 },
    { x: 1370.42, y: 433.59 },
    { x: 1397.35, y: 400.24 },
    { x: 1420.44, y: 386.13 },
    { x: 1462.77, y: 365.61 },
    { x: 1485.85, y: 356.63 },
    { x: 1501.24, y: 352.79 },
    { x: 1539.72, y: 334.83 },
  ],
  inferiorArcade: [
    { x: 1342.20, y: 552.87 },
    { x: 1351.18, y: 573.39 },
    { x: 1360.16, y: 590.06 },
    { x: 1383.25, y: 615.71 },
    { x: 1419.16, y: 645.21 },
    { x: 1464.05, y: 642.65 },
    { x: 1499.96, y: 638.80 },
    { x: 1521.76, y: 634.95 },
    { x: 1547.41, y: 645.21 },
    { x: 1565.37, y: 650.34 },
  ],
  fundusCenter: { x: 1466.61, y: 527.21 },
  fundusRadius: 404.35,
};
