/**
 * PSCalibrationTool — full-screen tool for marking retinal landmarks
 * on the posterior segment fundus photo.
 *
 * Per eye (OD then OS):
 *   1. Click optic disc center
 *   2. Click optic disc edge → establishes DD scale
 *   3. Click fovea
 *   4. Trace superior arcade (multi-click, press Next)
 *   5. Trace inferior arcade (multi-click, press Next)
 *   6. Click fundus circle center
 *   7. Click fundus circle edge → visible fundus boundary
 *
 * Shows live overlay with disc circle, fovea marker, arcade paths,
 * macula ring, zone boundaries, DD scale, and clock hour grid.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  RETINA_W,
  RETINA_H,
  DEFAULT_OD,
  DEFAULT_OS,
  dist,
  discDiameterPx,
  pxToDD,
  maculaRadius,
  posteriorPoleCenter,
  clockHourFrom,
  classifyZone,
  type Point,
  type RetinaEyeGeometry,
} from "../../utils/retinaCoordinates";

// ── Step definitions ──────────────────────────────────────────

type StepMode = "single" | "multi";

type StepDef = {
  id: string;
  label: string;
  eye: "OD" | "OS" | null;
  mode: StepMode;
};

const STEPS: StepDef[] = [
  { id: "od_disc_center",     label: "OD: Click the CENTER of the optic disc",           eye: "OD", mode: "single" },
  { id: "od_disc_edge",       label: "OD: Click the EDGE of the optic disc rim",         eye: "OD", mode: "single" },
  { id: "od_fovea",           label: "OD: Click the FOVEA (dark center of macula)",       eye: "OD", mode: "single" },
  { id: "od_sup_arcade",      label: "OD: Trace the SUPERIOR ARCADE — click points along the vessel arch, then press Next", eye: "OD", mode: "multi" },
  { id: "od_inf_arcade",      label: "OD: Trace the INFERIOR ARCADE — click points along the vessel arch, then press Next", eye: "OD", mode: "multi" },
  { id: "od_fundus_center",   label: "OD: Click the CENTER of the visible fundus circle", eye: "OD", mode: "single" },
  { id: "od_fundus_edge",     label: "OD: Click the EDGE of the visible fundus circle",   eye: "OD", mode: "single" },

  { id: "os_disc_center",     label: "OS: Click the CENTER of the optic disc",           eye: "OS", mode: "single" },
  { id: "os_disc_edge",       label: "OS: Click the EDGE of the optic disc rim",         eye: "OS", mode: "single" },
  { id: "os_fovea",           label: "OS: Click the FOVEA (dark center of macula)",       eye: "OS", mode: "single" },
  { id: "os_sup_arcade",      label: "OS: Trace the SUPERIOR ARCADE — click points along the vessel arch, then press Next", eye: "OS", mode: "multi" },
  { id: "os_inf_arcade",      label: "OS: Trace the INFERIOR ARCADE — click points along the vessel arch, then press Next", eye: "OS", mode: "multi" },
  { id: "os_fundus_center",   label: "OS: Click the CENTER of the visible fundus circle", eye: "OS", mode: "single" },
  { id: "os_fundus_edge",     label: "OS: Click the EDGE of the visible fundus circle",   eye: "OS", mode: "single" },

  { id: "done",               label: "Calibration complete!",                             eye: null, mode: "single" },
];

// ── Types ─────────────────────────────────────────────────────

type Landmarks = Record<string, Point>;
type MultiPaths = Record<string, Point[]>;

type Props = {
  onClose: () => void;
  onApply: (od: RetinaEyeGeometry, os: RetinaEyeGeometry) => void;
};

// ── Component ─────────────────────────────────────────────────

export default function PSCalibrationTool({ onClose, onApply }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [landmarks, setLandmarks] = useState<Landmarks>({});
  const [paths, setPaths] = useState<MultiPaths>({});
  const [cursor, setCursor] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<string>("");

  const currentStep = STEPS[stepIdx];
  const isDone = currentStep.id === "done";
  const isMulti = currentStep.mode === "multi";

  // Build geometry from landmarks
  const odGeo = useMemo(() => buildGeo("od", landmarks, paths), [landmarks, paths]);
  const osGeo = useMemo(() => buildGeo("os", landmarks, paths), [landmarks, paths]);

  // SVG coordinate conversion
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

  // ── Pointer handlers ─────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (isDone) return;
      const pt = toSvg(e);
      if (!pt) return;
      (e.target as Element).setPointerCapture?.(e.pointerId);

      if (isMulti) {
        // Multi-click mode: add point to path
        setPaths((prev) => ({
          ...prev,
          [currentStep.id]: [...(prev[currentStep.id] ?? []), pt],
        }));
      } else {
        setDragging(true);
        setLandmarks((prev) => ({ ...prev, [currentStep.id]: pt }));
      }
    },
    [isDone, isMulti, currentStep, toSvg],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const pt = toSvg(e);
      if (!pt) return;
      setCursor(pt);

      // Dragging single-click landmark
      if (dragging && !isDone && !isMulti) {
        setLandmarks((prev) => ({ ...prev, [currentStep.id]: pt }));
      }

      // Show hover info (DD from disc, clock hour)
      const geo = pt.x < RETINA_W / 2 ? odGeo : osGeo;
      if (geo && geo.discRadius > 0) {
        const d = dist(pt, geo.discCenter);
        const dd = pxToDD(d, geo);
        const ch = clockHourFrom(geo.discCenter, pt, geo.eye);
        const zone = classifyZone(pt, geo);
        setHoverInfo(`${dd} DD from disc · ${ch} o'clock · ${zone.replace(/_/g, " ")}`);
      } else {
        setHoverInfo("");
      }
    },
    [toSvg, dragging, isDone, isMulti, currentStep, odGeo, osGeo],
  );

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (!isDone && !isMulti) {
      setStepIdx((i) => i + 1);
    }
  }, [dragging, isDone, isMulti]);

  // Advance past multi-click step
  const advanceMulti = useCallback(() => {
    setStepIdx((i) => i + 1);
  }, []);

  // Undo last point in multi-click
  const undoLastPoint = useCallback(() => {
    if (!isMulti) return;
    setPaths((prev) => {
      const arr = prev[currentStep.id] ?? [];
      if (arr.length === 0) return prev;
      return { ...prev, [currentStep.id]: arr.slice(0, -1) };
    });
  }, [isMulti, currentStep]);

  // Jump back to redo a step
  const jumpToStep = useCallback((idx: number) => {
    setStepIdx(idx);
    // Remove landmarks/paths from this step onward
    setLandmarks((prev) => {
      const next = { ...prev };
      for (let i = idx; i < STEPS.length - 1; i++) {
        delete next[STEPS[i].id];
      }
      return next;
    });
    setPaths((prev) => {
      const next = { ...prev };
      for (let i = idx; i < STEPS.length - 1; i++) {
        delete next[STEPS[i].id];
      }
      return next;
    });
  }, []);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Export / Apply
  const exportCode = useCallback(() => {
    if (!odGeo || !osGeo) return "";
    return `// Posterior Segment Calibration — ${new Date().toISOString().slice(0, 10)}
export const PS_OD: RetinaEyeGeometry = ${JSON.stringify(odGeo, null, 2)};

export const PS_OS: RetinaEyeGeometry = ${JSON.stringify(osGeo, null, 2)};`;
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
    onApply(odGeo, osGeo);
  }, [odGeo, osGeo, onApply]);

  // ── Render helpers ────────────────────────────────────────

  function renderGeoOverlay(geo: RetinaEyeGeometry | null, prefix: "od" | "os") {
    if (!geo || geo.discRadius === 0) return null;
    const dd = discDiameterPx(geo);
    const macR = maculaRadius(geo);
    const ppCenter = posteriorPoleCenter(geo);

    return (
      <g>
        {/* Fundus circle */}
        {geo.fundusRadius > 0 && (
          <circle
            cx={geo.fundusCenter.x} cy={geo.fundusCenter.y} r={geo.fundusRadius}
            fill="none" stroke="#ffffff30" strokeWidth={2} strokeDasharray="8 4"
          />
        )}

        {/* Far periphery ring (~70% of fundus) */}
        {geo.fundusRadius > 0 && (
          <circle
            cx={geo.fundusCenter.x} cy={geo.fundusCenter.y} r={geo.fundusRadius * 0.7}
            fill="none" stroke="#ff880040" strokeWidth={1.5} strokeDasharray="6 4"
          />
        )}

        {/* Posterior pole (~3 DD from pp center) */}
        <circle
          cx={ppCenter.x} cy={ppCenter.y} r={dd * 3}
          fill="none" stroke="#00ff8840" strokeWidth={1.5} strokeDasharray="6 4"
        />

        {/* Macula ring */}
        <circle
          cx={geo.fovea.x} cy={geo.fovea.y} r={macR}
          fill="none" stroke="#ffcc00" strokeWidth={1.5} strokeDasharray="4 3"
        />

        {/* Optic disc */}
        <circle
          cx={geo.discCenter.x} cy={geo.discCenter.y} r={geo.discRadius}
          fill="none" stroke="#00ffcc" strokeWidth={2}
        />

        {/* Disc center dot */}
        <circle cx={geo.discCenter.x} cy={geo.discCenter.y} r={3} fill="#00ffcc" />

        {/* Fovea marker */}
        <circle cx={geo.fovea.x} cy={geo.fovea.y} r={4} fill="#ffcc00" />
        <line
          x1={geo.fovea.x - 8} y1={geo.fovea.y} x2={geo.fovea.x + 8} y2={geo.fovea.y}
          stroke="#ffcc00" strokeWidth={1.5}
        />
        <line
          x1={geo.fovea.x} y1={geo.fovea.y - 8} x2={geo.fovea.x} y2={geo.fovea.y + 8}
          stroke="#ffcc00" strokeWidth={1.5}
        />

        {/* Superior arcade path */}
        {geo.superiorArcade.length >= 2 && (
          <polyline
            points={geo.superiorArcade.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none" stroke="#ff4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          />
        )}
        {geo.superiorArcade.map((p, i) => (
          <circle key={`sa${i}`} cx={p.x} cy={p.y} r={3} fill="#ff4444" />
        ))}

        {/* Inferior arcade path */}
        {geo.inferiorArcade.length >= 2 && (
          <polyline
            points={geo.inferiorArcade.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none" stroke="#4488ff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          />
        )}
        {geo.inferiorArcade.map((p, i) => (
          <circle key={`ia${i}`} cx={p.x} cy={p.y} r={3} fill="#4488ff" />
        ))}

        {/* Clock hour grid */}
        {renderClockHours(geo)}

        {/* DD scale bar */}
        {renderDDScale(geo)}

        {/* Labels */}
        <text
          x={geo.discCenter.x} y={geo.discCenter.y - geo.discRadius - 10}
          textAnchor="middle" fill="#00ffcc" fontSize={14} fontWeight={700}
        >
          {geo.eye} Disc
        </text>
        <text
          x={geo.fovea.x} y={geo.fovea.y - 12}
          textAnchor="middle" fill="#ffcc00" fontSize={12} fontWeight={600}
        >
          Fovea
        </text>
      </g>
    );
  }

  function renderClockHours(geo: RetinaEyeGeometry) {
    const dd = discDiameterPx(geo);
    const radius = dd * 4; // clock hour ring at ~4 DD
    const hours = [];
    for (let h = 1; h <= 12; h++) {
      // Angle: 12=top, clockwise
      const angle = ((h * 30 - 90) * Math.PI) / 180;
      // For OS, mirror horizontally
      const sign = geo.eye === "OS" ? -1 : 1;
      const x = geo.discCenter.x + sign * Math.cos(angle) * radius;
      // In image coords: negative Y is up
      const y = geo.discCenter.y - Math.sin(-angle) * radius;

      // For OD: 12 o'clock is straight up, 3 is to the right (nasal)
      // For OS: 12 o'clock is straight up, 3 is to the left (nasal)
      // Standard fundus clock: 12=superior, going CW
      const a = ((h - 3) * 30 * Math.PI) / 180;
      const cx = geo.discCenter.x + Math.cos(a) * radius;
      const cy = geo.discCenter.y + Math.sin(a) * radius;

      hours.push(
        <g key={h}>
          <line
            x1={geo.discCenter.x + Math.cos(a) * (radius - 8)}
            y1={geo.discCenter.y + Math.sin(a) * (radius - 8)}
            x2={cx}
            y2={cy}
            stroke="#ffffff30" strokeWidth={1}
          />
          <text
            x={geo.discCenter.x + Math.cos(a) * (radius + 14)}
            y={geo.discCenter.y + Math.sin(a) * (radius + 14) + 4}
            textAnchor="middle" fill="#ffffff50" fontSize={11} fontWeight={600}
          >
            {h}
          </text>
        </g>,
      );
    }
    return <g>{hours}</g>;
  }

  function renderDDScale(geo: RetinaEyeGeometry) {
    const dd = discDiameterPx(geo);
    const x0 = geo.discCenter.x - dd * 2;
    const y0 = geo.discCenter.y + geo.discRadius + 30;
    return (
      <g>
        {/* 1 DD reference bar */}
        <line x1={x0} y1={y0} x2={x0 + dd} y2={y0} stroke="#00ffcc" strokeWidth={2} />
        <line x1={x0} y1={y0 - 4} x2={x0} y2={y0 + 4} stroke="#00ffcc" strokeWidth={2} />
        <line x1={x0 + dd} y1={y0 - 4} x2={x0 + dd} y2={y0 + 4} stroke="#00ffcc" strokeWidth={2} />
        <text x={x0 + dd / 2} y={y0 + 16} textAnchor="middle" fill="#00ffcc" fontSize={11} fontWeight={600}>
          1 DD = {Math.round(dd)}px
        </text>
      </g>
    );
  }

  // Preview for current step
  function renderPreview() {
    if (isDone || !cursor) return null;
    const step = currentStep.id;

    // For disc edge: show radius from disc center
    if (step.endsWith("_disc_edge")) {
      const prefix = step.startsWith("od") ? "od" : "os";
      const center = landmarks[`${prefix}_disc_center`];
      if (!center) return null;
      const r = dist(center, cursor);
      return (
        <g>
          <circle cx={center.x} cy={center.y} r={r} fill="none" stroke="#00ffcc80" strokeWidth={1.5} strokeDasharray="4 3" />
          <line x1={center.x} y1={center.y} x2={cursor.x} y2={cursor.y} stroke="#ffffff60" strokeWidth={1} strokeDasharray="3 3" />
          <text x={cursor.x + 12} y={cursor.y - 8} fill="#fff" fontSize={13} opacity={0.8}>
            r={Math.round(r)}px
          </text>
        </g>
      );
    }

    // For fundus edge: show circle from fundus center
    if (step.endsWith("_fundus_edge")) {
      const prefix = step.startsWith("od") ? "od" : "os";
      const center = landmarks[`${prefix}_fundus_center`];
      if (!center) return null;
      const r = dist(center, cursor);
      return (
        <g>
          <circle cx={center.x} cy={center.y} r={r} fill="none" stroke="#ffffff40" strokeWidth={1.5} strokeDasharray="6 4" />
          <text x={cursor.x + 12} y={cursor.y - 8} fill="#fff" fontSize={13} opacity={0.8}>
            r={Math.round(r)}px
          </text>
        </g>
      );
    }

    return null;
  }

  // Active multi-click path preview
  function renderActivePath() {
    if (!isMulti) return null;
    const pts = paths[currentStep.id] ?? [];
    if (pts.length === 0) return null;

    const color = currentStep.id.includes("sup") ? "#ff4444" : "#4488ff";
    return (
      <g>
        {pts.length >= 2 && (
          <polyline
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            opacity={0.9}
          />
        )}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={color} stroke="#fff" strokeWidth={1} />
        ))}
        {/* Line from last point to cursor */}
        {cursor && pts.length > 0 && (
          <line
            x1={pts[pts.length - 1].x} y1={pts[pts.length - 1].y}
            x2={cursor.x} y2={cursor.y}
            stroke={color} strokeWidth={1} strokeDasharray="4 3" opacity={0.5}
          />
        )}
      </g>
    );
  }

  // Landmark dots
  function renderLandmarkDots() {
    return Object.entries(landmarks).map(([key, pt]) => (
      <circle key={key} cx={pt.x} cy={pt.y} r={3} fill="#fff" stroke="#000" strokeWidth={1} opacity={0.7} />
    ));
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "#0a0a0a", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px", background: "rgba(15,23,42,0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.1)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>
            PS Retina Calibration
          </span>
          <span style={{ color: "#888", fontSize: "0.8rem" }}>
            Step {Math.min(stepIdx + 1, STEPS.length - 1)} / {STEPS.length - 1}
          </span>
          {hoverInfo && (
            <span style={{ color: "#00ffcc", fontSize: "0.8rem", fontFamily: "monospace" }}>
              {hoverInfo}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          <button onClick={onClose} style={btnStyle("#ef4444")}>Close</button>
        </div>
      </div>

      {/* Instruction banner */}
      <div style={{
        padding: "10px 16px",
        background: isDone ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ color: "#fff", fontSize: "1rem", fontWeight: 600 }}>
          {currentStep.label}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {isMulti && (
            <>
              <button onClick={undoLastPoint} style={btnStyle("#666")}>
                Undo point ({(paths[currentStep.id] ?? []).length})
              </button>
              <button
                onClick={advanceMulti}
                style={btnStyle((paths[currentStep.id] ?? []).length >= 2 ? "#22c55e" : "#444")}
              >
                Next →
              </button>
            </>
          )}
          {stepIdx > 0 && !isDone && !isMulti && (
            <button onClick={() => jumpToStep(stepIdx - 1)} style={btnStyle("#666")}>
              Undo last
            </button>
          )}
        </div>
      </div>

      {/* SVG canvas */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${RETINA_W} ${RETINA_H}`}
          style={{ width: "100%", height: "100%", cursor: isDone ? "default" : "crosshair" }}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Retina photo */}
          <image href="/retinas.jpg" x={0} y={0} width={RETINA_W} height={RETINA_H} />

          {/* Calibrated overlays */}
          {renderGeoOverlay(odGeo, "od")}
          {renderGeoOverlay(osGeo, "os")}

          {/* Landmark dots */}
          {renderLandmarkDots()}

          {/* Active multi-click path */}
          {renderActivePath()}

          {/* Preview for current step */}
          {renderPreview()}

          {/* Cursor crosshair */}
          {cursor && !isDone && (
            <g opacity={0.4}>
              <line x1={cursor.x - 24} y1={cursor.y} x2={cursor.x + 24} y2={cursor.y} stroke="#fff" strokeWidth={0.5} />
              <line x1={cursor.x} y1={cursor.y - 24} x2={cursor.x} y2={cursor.y + 24} stroke="#fff" strokeWidth={0.5} />
            </g>
          )}

          {/* Midline separator */}
          <line x1={RETINA_W / 2} y1={0} x2={RETINA_W / 2} y2={RETINA_H} stroke="#ffffff15" strokeWidth={1} strokeDasharray="8 8" />
          <text x={RETINA_W * 0.25} y={30} textAnchor="middle" fill="#ffffff40" fontSize={18} fontWeight={700}>OD</text>
          <text x={RETINA_W * 0.75} y={30} textAnchor="middle" fill="#ffffff40" fontSize={18} fontWeight={700}>OS</text>
        </svg>
      </div>

      {/* Bottom panel — step list + code when done */}
      {isDone && (
        <div style={{
          padding: "12px 16px", background: "rgba(15,23,42,0.95)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          maxHeight: 220, overflowY: "auto", flexShrink: 0,
        }}>
          <div style={{ display: "flex", gap: 24 }}>
            {/* Step re-do buttons */}
            <div style={{ flex: 1 }}>
              <div style={{ color: "#888", fontSize: "0.75rem", marginBottom: 6, fontWeight: 600 }}>
                Click any step to redo:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {STEPS.slice(0, -1).map((s, i) => {
                  const done = s.mode === "multi"
                    ? (paths[s.id]?.length ?? 0) >= 2
                    : !!landmarks[s.id];
                  return (
                    <button
                      key={s.id}
                      onClick={() => jumpToStep(i)}
                      style={{
                        background: done ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                        border: `1px solid ${done ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                        borderRadius: 4, color: "#ccc", padding: "3px 8px",
                        fontSize: "0.7rem", cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {s.id.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>

              {/* Measurement summary */}
              {odGeo && odGeo.discRadius > 0 && (
                <div style={{ marginTop: 12, color: "#aaa", fontSize: "0.78rem", lineHeight: 1.8 }}>
                  <strong style={{ color: "#00ffcc" }}>OD:</strong>{" "}
                  1 DD = {Math.round(discDiameterPx(odGeo))}px ·
                  Disc→Fovea = {pxToDD(dist(odGeo.discCenter, odGeo.fovea), odGeo)} DD ·
                  Macula ∅ = {pxToDD(maculaRadius(odGeo) * 2, odGeo)} DD
                  <br />
                  <strong style={{ color: "#00ffcc" }}>OS:</strong>{" "}
                  {osGeo && osGeo.discRadius > 0 ? (
                    <>
                      1 DD = {Math.round(discDiameterPx(osGeo))}px ·
                      Disc→Fovea = {pxToDD(dist(osGeo.discCenter, osGeo.fovea), osGeo)} DD ·
                      Macula ∅ = {pxToDD(maculaRadius(osGeo) * 2, osGeo)} DD
                    </>
                  ) : "not calibrated"}
                </div>
              )}
            </div>

            {/* Code preview */}
            <div style={{ flex: 1 }}>
              <div style={{ color: "#888", fontSize: "0.75rem", marginBottom: 6, fontWeight: 600 }}>
                Generated code:
              </div>
              <pre style={{
                background: "#111", color: "#0f0", padding: 8, borderRadius: 4,
                fontSize: "0.6rem", lineHeight: 1.4, overflow: "auto", maxHeight: 160, margin: 0,
              }}>
                {exportCode()}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Build geometry from landmarks ─────────────────────────────

function buildGeo(
  prefix: "od" | "os",
  landmarks: Landmarks,
  paths: MultiPaths,
): RetinaEyeGeometry | null {
  const discCenter = landmarks[`${prefix}_disc_center`];
  if (!discCenter) return null;

  const discEdge = landmarks[`${prefix}_disc_edge`];
  const fovea = landmarks[`${prefix}_fovea`];
  const fundusCenter = landmarks[`${prefix}_fundus_center`];
  const fundusEdge = landmarks[`${prefix}_fundus_edge`];

  const defaults = prefix === "od" ? DEFAULT_OD : DEFAULT_OS;

  return {
    eye: prefix === "od" ? "OD" : "OS",
    discCenter,
    discRadius: discEdge ? dist(discCenter, discEdge) : defaults.discRadius,
    fovea: fovea ?? defaults.fovea,
    superiorArcade: paths[`${prefix}_sup_arcade`] ?? [],
    inferiorArcade: paths[`${prefix}_inf_arcade`] ?? [],
    fundusCenter: fundusCenter ?? defaults.fundusCenter,
    fundusRadius: fundusCenter && fundusEdge ? dist(fundusCenter, fundusEdge) : defaults.fundusRadius,
  };
}

// ── Button style helper ───────────────────────────────────────

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg, border: "none", borderRadius: 6, color: "#fff",
    padding: "6px 14px", fontSize: "0.8rem", fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  };
}
