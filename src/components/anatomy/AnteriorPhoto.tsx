import { useState, useRef, useMemo, useCallback } from "react";
import { anteriorFindings, type FindingNode } from "../../data/anterior_findings";
import { useEncounterStore } from "../../store/encounterStore";
import { rankFindingsForRegion } from "../../utils/clinicalInference";
import RingSelector from "../menus/RingSelector";
import {
  IMG_W, IMG_H, AVG_PX_PER_MM,
  OD_GEO, OS_GEO,
  getDepthStack,
  mapClickToLocation,
  computeBrushBounds,
  resolveRegionForDepth,
  type EyeLocation,
  type DepthLayer,
} from "../../utils/eyeCoordinates";

/* ================================================================
   WORKFLOW
   ─────────────────────────────────────────────────────────────────
   1. Tap photo → auto-detect OD/OS from position, place XY marker
   2. Tap depth layer on cross-section → set Z
   3. Optionally draw extent with brush
   4. Context-specific finding buttons appear
   5. Tap finding → RingSelector radial qualifier menu
   ================================================================ */

type Step = "xy" | "z" | "extent" | "findings";

const BRUSH_SIZES = [
  { label: "Pt",  mm: 0,   strokeW: 3 },
  { label: "0.5", mm: 0.5, strokeW: 0.5 * AVG_PX_PER_MM },
  { label: "1",   mm: 1,   strokeW: 1 * AVG_PX_PER_MM },
  { label: "2",   mm: 2,   strokeW: 2 * AVG_PX_PER_MM },
  { label: "3",   mm: 3,   strokeW: 3 * AVG_PX_PER_MM },
];

/* ================================================================ */

export default function AnteriorPhoto() {
  const [step, setStep] = useState<Step>("xy");
  const [brushIdx, setBrushIdx] = useState(0);

  // XY state
  const [marker, setMarker] = useState<{ x: number; y: number } | null>(null);
  const [xyLocation, setXyLocation] = useState<EyeLocation | null>(null);

  // Z state
  const [depthId, setDepthId] = useState<string | null>(null);

  // Brush/extent state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<{ x: number; y: number }[]>([]);
  const [extentDesc, setExtentDesc] = useState("");

  const svgRef = useRef<SVGSVGElement>(null);

  // Store
  const findings = useEncounterStore((s) => s.findings);
  const addFinding = useEncounterStore((s) => s.addFinding);
  const removeFinding = useEncounterStore((s) => s.removeFinding);
  const copyToFellowEye = useEncounterStore((s) => s.copyToFellowEye);
  const symptoms = useEncounterStore((s) => s.symptoms);

  const brush = BRUSH_SIZES[brushIdx];
  const isPointMode = brush.mm === 0;

  // The auto-detected eye from the click location
  const detectedEye = xyLocation?.eye ?? null;

  /* ── Derived: depth stack for the current XY zone ────────────── */
  const depthStack: DepthLayer[] = useMemo(
    () => (xyLocation ? getDepthStack(xyLocation.zone) : []),
    [xyLocation],
  );

  /* ── Derived: which finding region to use ───────────────────── */
  const effectiveRegionId = useMemo(() => {
    if (!xyLocation) return null;
    if (!depthId) return xyLocation.regionId;
    return resolveRegionForDepth(depthId, xyLocation);
  }, [xyLocation, depthId]);

  const regionData = effectiveRegionId
    ? anteriorFindings.find((r) => r.regionId === effectiveRegionId)
    : null;

  const rankedFindings = useMemo(() => {
    if (!regionData || !effectiveRegionId) return null;
    const origLabels = regionData.findings.map((n) => n.label);
    const symLabels = symptoms.map((s) => s.symptom);
    const ranked = rankFindingsForRegion(effectiveRegionId, origLabels, symLabels, findings);
    const map = new Map<string, FindingNode>();
    for (const n of regionData.findings) map.set(n.label, n);
    return ranked.map((l) => map.get(l)).filter(Boolean) as FindingNode[];
  }, [regionData, effectiveRegionId, symptoms, findings]);

  /* ── SVG helpers ────────────────────────────────────────────── */
  const toSvg = useCallback((e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const s = pt.matrixTransform(ctm.inverse());
    return { x: s.x, y: s.y };
  }, []);

  /* ── Photo pointer handlers ─────────────────────────────────── */
  const onPhotoDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      const p = toSvg(e);

      if (step === "xy") {
        const loc = mapClickToLocation(p.x, p.y);
        if (!loc) return; // clicked outside any eye area

        if (isPointMode) {
          setMarker(p);
          setXyLocation(loc);
          setDrawPoints([]);
          setExtentDesc("");
          setStep("z");
        } else {
          setIsDrawing(true);
          setDrawPoints([p]);
          setMarker(null);
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        }
      } else if (step === "extent" && !isPointMode) {
        setIsDrawing(true);
        setDrawPoints([p]);
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      }
    },
    [toSvg, step, isPointMode],
  );

  const onPhotoMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) return;
      setDrawPoints((prev) => [...prev, toSvg(e)]);
    },
    [isDrawing, toSvg],
  );

  const onPhotoUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (drawPoints.length < 2) return;

    const bounds = computeBrushBounds(drawPoints, brush.strokeW);
    setExtentDesc(bounds.description);

    if (step === "xy") {
      const loc = mapClickToLocation(bounds.centerX, bounds.centerY);
      if (!loc) return;
      setXyLocation(loc);
      setMarker({ x: bounds.centerX, y: bounds.centerY });
      setStep("z");
    } else if (step === "extent") {
      setStep("findings");
    }
  }, [isDrawing, drawPoints, brush.strokeW, step]);

  /* ── Depth layer selection ──────────────────────────────────── */
  const onSelectDepth = useCallback(
    (id: string) => {
      if (step !== "z") return;
      setDepthId(id);
      if (drawPoints.length > 1) {
        setStep("findings");
      } else {
        setStep("extent");
      }
    },
    [step, drawPoints.length],
  );

  /* ── Skip extent ─────────────────────────────────────────────── */
  const skipExtent = useCallback(() => {
    setStep("findings");
  }, []);

  /* ── Finding selected → add to store ────────────────────────── */
  function handleComplete(finding: string, qualifiers: string[]) {
    if (!xyLocation || !effectiveRegionId || !detectedEye) return;
    const parts: string[] = [];
    parts.push(xyLocation.description);
    if (depthId) {
      const layer = depthStack.find((l) => l.id === depthId);
      if (layer) parts.push(layer.label.toLowerCase());
    }
    if (extentDesc) parts.push(extentDesc);
    addFinding(detectedEye, effectiveRegionId, finding, qualifiers, parts.join(", "));
    resetWorkflow();
  }

  /* ── Reset ──────────────────────────────────────────────────── */
  function resetWorkflow() {
    setStep("xy");
    setMarker(null);
    setXyLocation(null);
    setDepthId(null);
    setDrawPoints([]);
    setExtentDesc("");
    setIsDrawing(false);
  }

  /* ── Current findings list — show all anterior findings ──────── */
  const allFindings = useMemo(() => {
    const result: { entry: typeof findings[string][number]; key: string; eye: string }[] = [];
    for (const [key, entries] of Object.entries(findings)) {
      for (const e of entries) {
        if (anteriorFindings.some((r) => r.regionId === e.region)) {
          result.push({ entry: e, key, eye: key.split("_")[0] });
        }
      }
    }
    return result;
  }, [findings]);

  const odFindings = allFindings.filter((f) => f.eye === "OD");
  const osFindings = allFindings.filter((f) => f.eye === "OS");

  /* ── Step label ─────────────────────────────────────────────── */
  const stepLabel = {
    xy: isPointMode
      ? "Step 1 — Tap a location on either eye"
      : "Step 1 — Draw on either eye to mark the area",
    z: "Step 2 — Tap the depth layer",
    extent: "Step 3 — Draw extent (or skip)",
    findings: "Select finding",
  }[step];

  /* ── Bounding box from draw ─────────────────────────────────── */
  const drawBBox = useMemo(() => {
    if (drawPoints.length < 2) return null;
    const xs = drawPoints.map((p) => p.x);
    const ys = drawPoints.map((p) => p.y);
    const half = brush.strokeW / 2;
    return {
      x: Math.min(...xs) - half,
      y: Math.min(...ys) - half,
      w: Math.max(...xs) - Math.min(...xs) + brush.strokeW,
      h: Math.max(...ys) - Math.min(...ys) + brush.strokeW,
    };
  }, [drawPoints, brush.strokeW]);

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", minHeight: 0 }}>

      {/* ── Top bar: step indicator + brush ────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
        {/* Eye indicator (auto-detected) */}
        {detectedEye && (
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            fontSize: "0.75rem", fontWeight: 700,
            background: "var(--gradient-glow)", color: "white",
            boxShadow: "var(--shadow-sm)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {detectedEye}
          </div>
        )}

        {/* Step indicator */}
        <div style={{
          flex: 1, fontSize: "0.72rem", fontWeight: 600,
          color: step === "findings" ? "var(--emerald-500)" : "var(--navy-400)",
          letterSpacing: "-0.01em",
        }}>
          {stepLabel}
        </div>

        {/* Reset button */}
        {step !== "xy" && (
          <button type="button" onClick={resetWorkflow} style={{
            background: "none", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", padding: "4px 10px",
            fontSize: "0.7rem", fontWeight: 500, cursor: "pointer",
            color: "var(--text-secondary)", fontFamily: "inherit",
          }}>Reset</button>
        )}

        {/* Brush selector */}
        <div style={{
          display: "flex", alignItems: "center", gap: 3,
          background: "var(--slate-100)", borderRadius: "var(--radius-sm)", padding: "3px 5px",
        }}>
          {BRUSH_SIZES.map((b, i) => (
            <button
              key={b.label} type="button"
              onClick={() => setBrushIdx(i)}
              title={b.mm === 0 ? "Point tap" : `${b.mm}mm brush`}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                border: brushIdx === i ? "2px solid var(--navy-400)" : "1.5px solid var(--border)",
                background: brushIdx === i ? "var(--navy-50)" : "white",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {b.mm === 0 ? (
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--navy-500)" }} />
              ) : (
                <div style={{
                  width: Math.min(18, Math.max(7, b.mm * 5)),
                  height: Math.min(18, Math.max(7, b.mm * 5)),
                  borderRadius: "50%",
                  background: brushIdx === i ? "var(--navy-400)" : "var(--slate-400)",
                  opacity: 0.7,
                }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Photo + cross-section row ─────────────────────────── */}
      <div style={{ display: "flex", gap: 2, flex: 1, minHeight: 0 }}>

        {/* Eye photo SVG */}
        <div style={{ flex: 3, minHeight: 0, display: "flex", overflow: "hidden" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${IMG_W} ${IMG_H}`}
            preserveAspectRatio="xMidYMid slice"
            style={{
              width: "100%", height: "100%",
              borderRadius: "var(--radius-sm)",
              cursor: step === "xy"
                ? (isPointMode ? "crosshair" : "cell")
                : step === "extent" && !isPointMode
                  ? "cell"
                  : "default",
              touchAction: "none", userSelect: "none",
              opacity: (step !== "xy" && step !== "extent") ? 0.85 : 1,
              transition: "opacity 200ms ease",
            }}
            onPointerDown={(step === "xy" || step === "extent") ? onPhotoDown : undefined}
            onPointerMove={isDrawing ? onPhotoMove : undefined}
            onPointerUp={isDrawing ? onPhotoUp : undefined}
            onPointerCancel={isDrawing ? onPhotoUp : undefined}
          >
            {/* Photo background */}
            <image
              href="/eyes.png"
              x={0} y={0}
              width={IMG_W} height={IMG_H}
              preserveAspectRatio="xMidYMid meet"
            />

            {/* Eye labels */}
            <text x={OD_GEO.cx} y={55} textAnchor="middle"
              fill="rgba(255,255,255,0.7)" fontSize="36" fontWeight="700"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >OD</text>
            <text x={OS_GEO.cx} y={55} textAnchor="middle"
              fill="rgba(255,255,255,0.7)" fontSize="36" fontWeight="700"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >OS</text>

            {/* ── Marker ── */}
            {marker && (
              <g>
                <circle cx={marker.x} cy={marker.y} r={14} fill="none" stroke="#00e5ff" strokeWidth="3" />
                <circle cx={marker.x} cy={marker.y} r={4} fill="#00e5ff" />
                <line x1={marker.x - 22} y1={marker.y} x2={marker.x + 22} y2={marker.y} stroke="#00e5ff" strokeWidth="1.5" opacity="0.6" />
                <line x1={marker.x} y1={marker.y - 22} x2={marker.x} y2={marker.y + 22} stroke="#00e5ff" strokeWidth="1.5" opacity="0.6" />
              </g>
            )}

            {/* ── Brush stroke ── */}
            {drawPoints.length > 1 && (
              <polyline
                points={drawPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="rgba(0,229,255,0.5)"
                strokeWidth={brush.strokeW}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* ── Bounding box (after drawing) ── */}
            {!isDrawing && drawBBox && (
              <rect
                x={drawBBox.x} y={drawBBox.y}
                width={drawBBox.w} height={drawBBox.h}
                fill="none" stroke="#00e5ff" strokeWidth="2"
                strokeDasharray="8 6" opacity="0.6"
              />
            )}
          </svg>
        </div>

        {/* ── Cross-section (dynamic based on XY zone) ─────────── */}
        <div style={{
          flex: 1, minWidth: 85, maxWidth: 120,
          display: "flex", flexDirection: "column",
          background: "var(--slate-50)", borderRadius: "var(--radius-sm)",
          border: step === "z" ? "2px solid var(--navy-300)" : "1px solid var(--border)",
          overflow: "hidden",
          transition: "border-color 200ms ease",
        }}>
          <div style={{
            fontSize: "0.55rem", fontWeight: 700, color: "var(--text-secondary)",
            textTransform: "uppercase", letterSpacing: "0.06em",
            padding: "4px 6px 1px", textAlign: "center",
          }}>
            {depthStack.length === 0
              ? "Depth"
              : xyLocation && (xyLocation.zone === "upper_lid" || xyLocation.zone === "lower_lid")
                ? "External \u2193"
                : "Surface \u2193"}
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2px 3px", gap: 1, minHeight: 0 }}>
            {depthStack.length === 0 && (
              <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.6rem", color: "var(--slate-400)", textAlign: "center", padding: 8,
              }}>
                Tap eye first
              </div>
            )}
            {depthStack.map((layer, i) => {
              const isActive = step === "z";
              const isSel = depthId === layer.id;
              const showSep = layer.separator && i > 0;

              return (
                <div key={layer.id} style={{ display: "contents" }}>
                  {showSep && (
                    <div style={{
                      height: 1, background: "var(--slate-300)", margin: "1px 2px", flexShrink: 0,
                    }} />
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectDepth(layer.id)}
                    disabled={!isActive}
                    style={{
                      flex: layer.flex,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isSel
                        ? layer.color
                        : isActive
                          ? `${layer.color}88`
                          : `${layer.color}33`,
                      border: isSel
                        ? "2px solid var(--navy-500)"
                        : "1px solid rgba(0,0,0,0.06)",
                      borderRadius: 3,
                      cursor: isActive ? "pointer" : "default",
                      fontSize: "0.52rem",
                      fontWeight: isSel ? 700 : 500,
                      color: isSel ? "var(--navy-900)" : isActive ? "var(--text)" : "var(--text-secondary)",
                      fontFamily: "inherit",
                      transition: "all 120ms ease",
                      opacity: isActive || isSel ? 1 : 0.5,
                      padding: 0,
                      minHeight: 0,
                      overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                    }}
                  >
                    {layer.label}
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{
            fontSize: "0.55rem", fontWeight: 700, color: "var(--text-secondary)",
            textTransform: "uppercase", letterSpacing: "0.06em",
            padding: "1px 6px 4px", textAlign: "center",
          }}>
            {depthStack.length > 0
              ? (xyLocation && (xyLocation.zone === "upper_lid" || xyLocation.zone === "lower_lid")
                  ? "\u2191 Internal"
                  : "\u2191 Deep")
              : ""}
          </div>
        </div>
      </div>

      {/* ── Info bar — shows what's been set ───────────────────── */}
      {xyLocation && (
        <div
          style={{
            background: "var(--navy-50)", borderRadius: "var(--radius-sm)",
            padding: "6px 10px", flexShrink: 0,
            border: "1px solid var(--navy-100)",
            fontSize: "0.75rem",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", alignItems: "center" }}>
            <span style={{ fontWeight: 600, color: "var(--navy-700)" }}>
              {detectedEye} — {xyLocation.description}
            </span>
            <span className="info-chip" style={{ fontSize: "0.65rem" }}>
              {xyLocation.clockHour}h
            </span>
            {depthId && (() => {
              const dl = depthStack.find((l) => l.id === depthId);
              return dl ? (
                <span className="info-chip" style={{
                  fontSize: "0.65rem",
                  background: dl.color, borderColor: "var(--navy-200)",
                  fontWeight: 600,
                }}>
                  {dl.label}
                </span>
              ) : null;
            })()}
            {extentDesc && (
              <span className="info-chip" style={{ fontSize: "0.65rem" }}>
                {extentDesc}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── "Skip extent" prompt ───────────────────────────────── */}
      {step === "extent" && (
        <div style={{
          display: "flex", gap: 8, alignItems: "center", flexShrink: 0,
          padding: "4px 0",
        }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            Draw extent on eye, or:
          </span>
          <button
            type="button" onClick={skipExtent}
            className="btn btn-primary"
            style={{ padding: "6px 16px", fontSize: "0.78rem" }}
          >
            Skip → Select Finding
          </button>
        </div>
      )}

      {/* ── Finding buttons ───────────────────────────────────── */}
      {step === "findings" && regionData && (
        <div style={{ flexShrink: 0 }}>
          <div style={{
            fontSize: "0.68rem", fontWeight: 600, color: "var(--text-secondary)",
            textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4,
          }}>
            {regionData.label} — Findings
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(rankedFindings ?? regionData.findings).map((node) => (
              <RingSelector
                key={node.label}
                label={node.label}
                node={node}
                onComplete={handleComplete}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Current findings list (both eyes) ──────────────────── */}
      {(odFindings.length > 0 || osFindings.length > 0) && (
        <div style={{ flexShrink: 0 }}>
          <div style={{
            fontSize: "0.68rem", fontWeight: 600, color: "var(--text-secondary)",
            textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3,
          }}>
            AS Findings
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {[...odFindings, ...osFindings].map((f) => (
              <div
                key={f.entry.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "rgba(255,255,255,0.7)", backdropFilter: "blur(4px)",
                  borderRadius: 100, padding: "5px 12px", fontSize: "0.78rem",
                }}
              >
                <span style={{ color: "var(--text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.entry.generatedText}
                </span>
                <div style={{ display: "flex", gap: 3, flexShrink: 0, marginLeft: 6 }}>
                  <button type="button" onClick={() => copyToFellowEye(f.key, f.entry.id)} style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "var(--navy-50)", color: "var(--navy-500)",
                    border: "none", fontSize: "0.65rem", fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>Cp</button>
                  <button type="button" onClick={() => removeFinding(f.key, f.entry.id)} style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "#fef2f2", color: "#ef4444",
                    border: "none", fontSize: "0.8rem",
                    cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{"\u2715"}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
