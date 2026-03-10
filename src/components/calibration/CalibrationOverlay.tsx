/**
 * CalibrationOverlay — full-screen tool for aligning eye geometry
 * to the actual photograph.
 *
 * Flow per eye (OD first, then OS):
 *   1. Click pupil center
 *   2. Click pupil edge        → computes pupilR
 *   3. Click iris edge          → computes irisR
 *   4. Click limbus edge        → computes limbusR
 *   5. Click temporal canthus
 *   6. Click nasal canthus
 *   7. Click upper lid apex     → sets upperCtrlY
 *   8. Click lower lid apex     → sets lowerCtrlY
 *
 * Shows live overlay of circles + bezier lid curves as landmarks are placed.
 * Exports corrected constants for eyeCoordinates.ts.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  IMG_W,
  IMG_H,
  OD_GEO,
  OS_GEO,
  type EyeGeometry,
} from "../../utils/eyeCoordinates";

// ── Step definitions ──────────────────────────────────────────

type StepId =
  | "od_pupil_center"
  | "od_pupil_edge"
  | "od_iris_edge"
  | "od_limbus_edge"
  | "od_temporal_canthus"
  | "od_nasal_canthus"
  | "od_upper_lid_apex"
  | "od_lower_lid_apex"
  | "os_pupil_center"
  | "os_pupil_edge"
  | "os_iris_edge"
  | "os_limbus_edge"
  | "os_temporal_canthus"
  | "os_nasal_canthus"
  | "os_upper_lid_apex"
  | "os_lower_lid_apex"
  | "done";

const STEPS: { id: StepId; label: string; eye: "OD" | "OS" | null }[] = [
  { id: "od_pupil_center",     label: "OD: Click the CENTER of the pupil",            eye: "OD" },
  { id: "od_pupil_edge",       label: "OD: Click the EDGE of the pupil",              eye: "OD" },
  { id: "od_iris_edge",        label: "OD: Click the outer EDGE of the iris",         eye: "OD" },
  { id: "od_limbus_edge",      label: "OD: Click the LIMBUS (cornea-sclera border)",  eye: "OD" },
  { id: "od_temporal_canthus",  label: "OD: Click the TEMPORAL canthus (outer corner)", eye: "OD" },
  { id: "od_nasal_canthus",     label: "OD: Click the NASAL canthus (inner corner)",    eye: "OD" },
  { id: "od_upper_lid_apex",    label: "OD: Click the HIGHEST point of the upper lid margin", eye: "OD" },
  { id: "od_lower_lid_apex",    label: "OD: Click the LOWEST point of the lower lid margin",  eye: "OD" },
  { id: "os_pupil_center",     label: "OS: Click the CENTER of the pupil",            eye: "OS" },
  { id: "os_pupil_edge",       label: "OS: Click the EDGE of the pupil",              eye: "OS" },
  { id: "os_iris_edge",        label: "OS: Click the outer EDGE of the iris",         eye: "OS" },
  { id: "os_limbus_edge",      label: "OS: Click the LIMBUS (cornea-sclera border)",  eye: "OS" },
  { id: "os_temporal_canthus",  label: "OS: Click the TEMPORAL canthus (outer corner)", eye: "OS" },
  { id: "os_nasal_canthus",     label: "OS: Click the NASAL canthus (inner corner)",    eye: "OS" },
  { id: "os_upper_lid_apex",    label: "OS: Click the HIGHEST point of the upper lid margin", eye: "OS" },
  { id: "os_lower_lid_apex",    label: "OS: Click the LOWEST point of the lower lid margin",  eye: "OS" },
  { id: "done",                label: "Calibration complete!",                        eye: null },
];

// ── Landmark storage ──────────────────────────────────────────

type Point = { x: number; y: number };
type Landmarks = Record<string, Point>;

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ── Build geometry from landmarks ─────────────────────────────

function buildGeoFromLandmarks(
  prefix: "od" | "os",
  landmarks: Landmarks,
): Partial<EyeGeometry> | null {
  const center = landmarks[`${prefix}_pupil_center`];
  if (!center) return null;

  const geo: Partial<EyeGeometry> = {
    eye: prefix === "od" ? "OD" : "OS",
    cx: Math.round(center.x),
    cy: Math.round(center.y),
  };

  const pupilEdge = landmarks[`${prefix}_pupil_edge`];
  if (pupilEdge) geo.pupilR = Math.round(dist(center, pupilEdge));

  const irisEdge = landmarks[`${prefix}_iris_edge`];
  if (irisEdge) geo.irisR = Math.round(dist(center, irisEdge));

  const limbusEdge = landmarks[`${prefix}_limbus_edge`];
  if (limbusEdge) {
    const limbR = Math.round(dist(center, limbusEdge));
    geo.limbusR = limbR;
    geo.pxPerMm = limbR / 5.75;
  }

  const tc = landmarks[`${prefix}_temporal_canthus`];
  if (tc) geo.temporalCanthus = { x: Math.round(tc.x), y: Math.round(tc.y) };

  const nc = landmarks[`${prefix}_nasal_canthus`];
  if (nc) geo.nasalCanthus = { x: Math.round(nc.x), y: Math.round(nc.y) };

  const upperApex = landmarks[`${prefix}_upper_lid_apex`];
  if (upperApex) geo.upperCtrlY = Math.round(upperApex.y);

  const lowerApex = landmarks[`${prefix}_lower_lid_apex`];
  if (lowerApex) geo.lowerCtrlY = Math.round(lowerApex.y);

  return geo;
}

// ── Format geometry as code ───────────────────────────────────

function geoToCode(name: string, geo: EyeGeometry): string {
  return `export const ${name}: EyeGeometry = {
  eye: "${geo.eye}",
  cx: ${geo.cx}, cy: ${geo.cy},
  pupilR: ${geo.pupilR}, irisR: ${geo.irisR}, limbusR: ${geo.limbusR},
  pxPerMm: ${geo.limbusR} / 5.75,
  nasalCanthus: { x: ${geo.nasalCanthus.x}, y: ${geo.nasalCanthus.y} },
  temporalCanthus: { x: ${geo.temporalCanthus.x}, y: ${geo.temporalCanthus.y} },
  upperCtrlY: ${geo.upperCtrlY},
  lowerCtrlY: ${geo.lowerCtrlY},
};`;
}

// ── Component ─────────────────────────────────────────────────

type Props = {
  onClose: () => void;
  onApply: (od: EyeGeometry, os: EyeGeometry) => void;
};

export default function CalibrationOverlay({ onClose, onApply }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [landmarks, setLandmarks] = useState<Landmarks>({});
  const [cursor, setCursor] = useState<Point | null>(null);
  const [showExisting, setShowExisting] = useState(true);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);

  const currentStep = STEPS[stepIdx];
  const isDone = currentStep.id === "done";

  // Convert pointer event to SVG coordinates
  const toSvg = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): Point | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const svgPt = pt.matrixTransform(ctm.inverse());
      return { x: svgPt.x, y: svgPt.y };
    },
    [],
  );

  // Click-and-drag: pointerDown places landmark, drag adjusts, pointerUp confirms
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (isDone) return;
      const pt = toSvg(e);
      if (!pt) return;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setDragging(true);
      setLandmarks((prev) => ({ ...prev, [currentStep.id]: pt }));
    },
    [isDone, currentStep, toSvg],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const pt = toSvg(e);
      if (!pt) return;
      setCursor(pt);
      // If dragging, update the current landmark in real time
      if (dragging && !isDone) {
        setLandmarks((prev) => ({ ...prev, [currentStep.id]: pt }));
      }
    },
    [toSvg, dragging, isDone, currentStep],
  );

  const handlePointerUp = useCallback(
    () => {
      if (!dragging) return;
      setDragging(false);
      // Advance to next step on release
      if (!isDone) {
        setStepIdx((i) => i + 1);
      }
    },
    [dragging, isDone],
  );

  // Jump back to a step to re-do it, removing that landmark and all after it
  const jumpToStep = useCallback((idx: number) => {
    setStepIdx(idx);
    // Remove landmarks from this step onward so they disappear
    setLandmarks((prev) => {
      const next = { ...prev };
      for (let i = idx; i < STEPS.length - 1; i++) {
        delete next[STEPS[i].id];
      }
      return next;
    });
  }, []);

  // Build partial geometries from current landmarks
  const odGeo = buildGeoFromLandmarks("od", landmarks);
  const osGeo = buildGeoFromLandmarks("os", landmarks);

  // Export code
  const exportCode = useCallback(() => {
    if (!odGeo || !osGeo) return "";
    // Merge with defaults for any missing fields
    const fullOd: EyeGeometry = { ...OD_GEO, ...odGeo } as EyeGeometry;
    const fullOs: EyeGeometry = { ...OS_GEO, ...osGeo } as EyeGeometry;
    return `${geoToCode("OD_GEO", fullOd)}\n\n${geoToCode("OS_GEO", fullOs)}`;
  }, [odGeo, osGeo]);

  const handleCopy = useCallback(async () => {
    const code = exportCode();
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [exportCode]);

  const handleApply = useCallback(() => {
    if (!odGeo || !osGeo) return;
    const fullOd: EyeGeometry = { ...OD_GEO, ...odGeo } as EyeGeometry;
    const fullOs: EyeGeometry = { ...OS_GEO, ...osGeo } as EyeGeometry;
    onApply(fullOd, fullOs);
  }, [odGeo, osGeo, onApply]);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Render helpers ────────────────────────────────────────

  function renderCircle(
    center: Point | undefined,
    radius: number | undefined,
    color: string,
    label: string,
    dashed = false,
  ) {
    if (!center || !radius) return null;
    return (
      <circle
        cx={center.x}
        cy={center.y}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dashed ? "6 4" : undefined}
        opacity={0.9}
      >
        <title>{label}</title>
      </circle>
    );
  }

  function renderLidCurve(
    tc: Point | undefined,
    nc: Point | undefined,
    ctrlX: number | undefined,
    ctrlY: number | undefined,
    color: string,
    label: string,
  ) {
    if (!tc || !nc || ctrlX === undefined || ctrlY === undefined) return null;
    return (
      <path
        d={`M ${tc.x} ${tc.y} Q ${ctrlX} ${ctrlY} ${nc.x} ${nc.y}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        opacity={0.9}
      >
        <title>{label}</title>
      </path>
    );
  }

  function renderExistingGeo(geo: EyeGeometry, opacity: number) {
    const center = { x: geo.cx, y: geo.cy };
    return (
      <g opacity={opacity}>
        <circle cx={geo.cx} cy={geo.cy} r={geo.pupilR} fill="none" stroke="#ff4444" strokeWidth={1.5} strokeDasharray="4 3" />
        <circle cx={geo.cx} cy={geo.cy} r={geo.irisR} fill="none" stroke="#ff8844" strokeWidth={1.5} strokeDasharray="4 3" />
        <circle cx={geo.cx} cy={geo.cy} r={geo.limbusR} fill="none" stroke="#ffaa44" strokeWidth={1.5} strokeDasharray="4 3" />
        <circle cx={geo.cx} cy={geo.cy} r={4} fill="#ff4444" />
        <circle cx={geo.temporalCanthus.x} cy={geo.temporalCanthus.y} r={4} fill="#ff4444" />
        <circle cx={geo.nasalCanthus.x} cy={geo.nasalCanthus.y} r={4} fill="#ff4444" />
        <path
          d={`M ${geo.temporalCanthus.x} ${geo.temporalCanthus.y} Q ${geo.cx} ${geo.upperCtrlY} ${geo.nasalCanthus.x} ${geo.nasalCanthus.y}`}
          fill="none" stroke="#ff6666" strokeWidth={1.5} strokeDasharray="4 3"
        />
        <path
          d={`M ${geo.temporalCanthus.x} ${geo.temporalCanthus.y} Q ${geo.cx} ${geo.lowerCtrlY} ${geo.nasalCanthus.x} ${geo.nasalCanthus.y}`}
          fill="none" stroke="#ff6666" strokeWidth={1.5} strokeDasharray="4 3"
        />
        <text x={center.x} y={center.y - geo.limbusR - 12} textAnchor="middle" fill="#ff4444" fontSize={18} fontWeight={700}>
          {geo.eye} (current)
        </text>
      </g>
    );
  }

  function renderNewGeo(prefix: "od" | "os") {
    const geo = prefix === "od" ? odGeo : osGeo;
    if (!geo) return null;
    const center = landmarks[`${prefix}_pupil_center`];
    if (!center) return null;

    return (
      <g>
        {/* Pupil */}
        {renderCircle(center, geo.pupilR, "#00ffcc", "Pupil")}
        {/* Iris */}
        {renderCircle(center, geo.irisR, "#00ccff", "Iris")}
        {/* Limbus */}
        {renderCircle(center, geo.limbusR, "#88ff44", "Limbus")}
        {/* Center dot */}
        <circle cx={center.x} cy={center.y} r={4} fill="#00ffcc" />

        {/* Canthus dots */}
        {landmarks[`${prefix}_temporal_canthus`] && (
          <circle
            cx={landmarks[`${prefix}_temporal_canthus`].x}
            cy={landmarks[`${prefix}_temporal_canthus`].y}
            r={5}
            fill="#ffcc00"
          />
        )}
        {landmarks[`${prefix}_nasal_canthus`] && (
          <circle
            cx={landmarks[`${prefix}_nasal_canthus`].x}
            cy={landmarks[`${prefix}_nasal_canthus`].y}
            r={5}
            fill="#ffcc00"
          />
        )}

        {/* Upper lid */}
        {renderLidCurve(
          landmarks[`${prefix}_temporal_canthus`],
          landmarks[`${prefix}_nasal_canthus`],
          geo.cx,
          geo.upperCtrlY,
          "#ff44ff",
          "Upper lid",
        )}
        {/* Lower lid */}
        {renderLidCurve(
          landmarks[`${prefix}_temporal_canthus`],
          landmarks[`${prefix}_nasal_canthus`],
          geo.cx,
          geo.lowerCtrlY,
          "#ff44ff",
          "Lower lid",
        )}

        {/* Label */}
        <text
          x={center.x}
          y={center.y - (geo.limbusR || 120) - 12}
          textAnchor="middle"
          fill="#00ffcc"
          fontSize={18}
          fontWeight={700}
        >
          {geo.eye} (new)
        </text>
      </g>
    );
  }

  // Preview radius from center to cursor
  function renderPreviewRadius() {
    if (!cursor || isDone) return null;
    const step = currentStep.id;

    // For edge steps, show a dashed line from center to cursor
    const isRadiusStep = step.endsWith("_edge");
    if (!isRadiusStep) return null;

    const prefix = step.startsWith("od") ? "od" : "os";
    const center = landmarks[`${prefix}_pupil_center`];
    if (!center) return null;

    const r = dist(center, cursor);
    return (
      <g>
        <line
          x1={center.x} y1={center.y}
          x2={cursor.x} y2={cursor.y}
          stroke="#ffffff" strokeWidth={1} strokeDasharray="4 3" opacity={0.6}
        />
        <circle
          cx={center.x} cy={center.y} r={r}
          fill="none" stroke="#ffffff" strokeWidth={1} strokeDasharray="4 3" opacity={0.4}
        />
        <text
          x={cursor.x + 10} y={cursor.y - 10}
          fill="#ffffff" fontSize={14} opacity={0.8}
        >
          {Math.round(r)}px
        </text>
      </g>
    );
  }

  // All placed landmark dots
  function renderLandmarkDots() {
    return Object.entries(landmarks).map(([key, pt]) => (
      <circle
        key={key}
        cx={pt.x}
        cy={pt.y}
        r={3}
        fill="#ffffff"
        stroke="#000000"
        strokeWidth={1}
        opacity={0.7}
      />
    ));
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "rgba(15,23,42,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>
            Eye Calibration
          </span>
          <span style={{ color: "#888", fontSize: "0.8rem" }}>
            Step {Math.min(stepIdx + 1, STEPS.length - 1)} / {STEPS.length - 1}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#aaa", fontSize: "0.78rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showExisting}
              onChange={(e) => setShowExisting(e.target.checked)}
            />
            Show current geometry
          </label>
          {isDone && (
            <>
              <button onClick={handleCopy} style={btnStyle("#22c55e")}>
                {copied ? "Copied!" : "Copy Code"}
              </button>
              <button onClick={handleApply} style={btnStyle("#3b82f6")}>
                Apply & Close
              </button>
            </>
          )}
          <button onClick={onClose} style={btnStyle("#ef4444")}>
            Close
          </button>
        </div>
      </div>

      {/* Instruction banner */}
      <div
        style={{
          padding: "10px 16px",
          background: isDone ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: "#fff", fontSize: "1rem", fontWeight: 600 }}>
          {currentStep.label}
          {!isDone && (
            <span style={{ color: "#888", fontSize: "0.8rem", fontWeight: 400, marginLeft: 12 }}>
              (click &amp; drag to fine-tune, release to confirm)
            </span>
          )}
        </span>
        {stepIdx > 0 && !isDone && (
          <button
            onClick={() => jumpToStep(stepIdx - 1)}
            style={btnStyle("#666")}
          >
            Undo last
          </button>
        )}
      </div>

      {/* SVG canvas */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${IMG_W} ${IMG_H}`}
          style={{
            width: "100%",
            height: "100%",
            cursor: isDone ? "default" : "crosshair",
          }}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Photo */}
          <image
            href="/eyes.png"
            x={0}
            y={0}
            width={IMG_W}
            height={IMG_H}
            preserveAspectRatio="xMidYMid meet"
          />

          {/* Existing geometry overlay */}
          {showExisting && (
            <>
              {renderExistingGeo(OD_GEO, 0.5)}
              {renderExistingGeo(OS_GEO, 0.5)}
            </>
          )}

          {/* New calibrated geometry */}
          {renderNewGeo("od")}
          {renderNewGeo("os")}

          {/* All landmark dots */}
          {renderLandmarkDots()}

          {/* Preview radius for edge steps */}
          {renderPreviewRadius()}

          {/* Cursor crosshair */}
          {cursor && !isDone && (
            <g opacity={0.5}>
              <line x1={cursor.x - 20} y1={cursor.y} x2={cursor.x + 20} y2={cursor.y} stroke="#fff" strokeWidth={0.5} />
              <line x1={cursor.x} y1={cursor.y - 20} x2={cursor.x} y2={cursor.y + 20} stroke="#fff" strokeWidth={0.5} />
            </g>
          )}
        </svg>
      </div>

      {/* Step list sidebar (bottom) */}
      {isDone && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(15,23,42,0.95)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            maxHeight: 200,
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", gap: 24 }}>
            {/* Step list for re-clicking */}
            <div style={{ flex: 1 }}>
              <div style={{ color: "#888", fontSize: "0.75rem", marginBottom: 6, fontWeight: 600 }}>
                Click any step to redo:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {STEPS.slice(0, -1).map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => jumpToStep(i)}
                    style={{
                      background: landmarks[s.id] ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                      border: `1px solid ${landmarks[s.id] ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                      borderRadius: 4,
                      color: "#ccc",
                      padding: "3px 8px",
                      fontSize: "0.7rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {s.id.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Code preview */}
            <div style={{ flex: 1 }}>
              <div style={{ color: "#888", fontSize: "0.75rem", marginBottom: 6, fontWeight: 600 }}>
                Generated code:
              </div>
              <pre
                style={{
                  background: "#111",
                  color: "#0f0",
                  padding: 8,
                  borderRadius: 4,
                  fontSize: "0.65rem",
                  lineHeight: 1.4,
                  overflow: "auto",
                  maxHeight: 140,
                  margin: 0,
                }}
              >
                {exportCode()}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared button style ───────────────────────────────────────

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    border: "none",
    borderRadius: 6,
    color: "#fff",
    padding: "6px 14px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}
