import { useState, useRef, useMemo, useCallback } from "react";
import { anteriorFindings, type FindingNode } from "../../data/anterior_findings";
import { useEncounterStore, type Eye } from "../../store/encounterStore";
import { rankFindingsForRegion } from "../../utils/clinicalInference";
import RingSelector from "../menus/RingSelector";
import {
  CX, CY, PUPIL_R, IRIS_R, LIMBUS_R, SCLERA_R, PX_PER_MM,
  DEPTH_LAYERS,
  mapClickToLocation,
  computeBrushBounds,
  resolveRegionForDepth,
  type EyeLocation,
} from "../../utils/eyeCoordinates";

/* ================================================================
   WORKFLOW
   ─────────────────────────────────────────────────────────────────
   1. Tap eye photo → place XY marker  (or draw with brush → XY from center)
   2. Tap depth layer on cross-section → set Z
   3. Optionally draw extent with brush (if not already drawn)
   4. Context-specific finding buttons appear
   5. Tap finding → RingSelector radial qualifier menu
   ================================================================ */

type Step = "xy" | "z" | "extent" | "findings";

const BRUSH_SIZES = [
  { label: "Pt",  mm: 0,   strokeW: 3 },
  { label: "0.5", mm: 0.5, strokeW: 0.5 * PX_PER_MM },
  { label: "1",   mm: 1,   strokeW: 1 * PX_PER_MM },
  { label: "2",   mm: 2,   strokeW: 2 * PX_PER_MM },
  { label: "3",   mm: 3,   strokeW: 3 * PX_PER_MM },
];

/* ================================================================ */

export default function AnteriorPhoto() {
  const [selectedEye, setSelectedEye] = useState<Eye>("OD");
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

  /* ── Derived: which finding region to use ───────────────────── */
  const effectiveRegionId = useMemo(() => {
    if (!xyLocation) return null;
    if (!depthId) return xyLocation.regionId;
    return resolveRegionForDepth(depthId, xyLocation.regionId);
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
      // Only accept primary button
      if (e.button !== 0) return;
      const p = toSvg(e);
      const loc = mapClickToLocation(p.x, p.y, selectedEye);

      if (step === "xy") {
        if (isPointMode) {
          // Point tap → set XY, advance to Z
          setMarker(p);
          setXyLocation(loc);
          setDrawPoints([]);
          setExtentDesc("");
          setStep("z");
        } else {
          // Brush draw → start drawing (will set XY from center when done)
          setIsDrawing(true);
          setDrawPoints([p]);
          setMarker(null);
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        }
      } else if (step === "extent" && !isPointMode) {
        // Drawing extent after Z is set
        setIsDrawing(true);
        setDrawPoints([p]);
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      }
    },
    [toSvg, selectedEye, step, isPointMode],
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
      // Brush was used to define XY — derive location from center
      const loc = mapClickToLocation(bounds.centerX, bounds.centerY, selectedEye);
      setXyLocation(loc);
      setMarker({ x: bounds.centerX, y: bounds.centerY });
      setStep("z");
    } else if (step === "extent") {
      setStep("findings");
    }
  }, [isDrawing, drawPoints, brush.strokeW, step, selectedEye]);

  /* ── Depth layer selection ──────────────────────────────────── */
  const onSelectDepth = useCallback(
    (id: string) => {
      if (step !== "z") return;
      setDepthId(id);
      // If we already have extent from brush (drawn during XY step), go to findings
      if (drawPoints.length > 1) {
        setStep("findings");
      } else {
        setStep("extent");
      }
    },
    [step, drawPoints.length],
  );

  /* ── Skip extent → go straight to findings ──────────────────── */
  const skipExtent = useCallback(() => {
    setStep("findings");
  }, []);

  /* ── Finding selected → add to store ────────────────────────── */
  function handleComplete(finding: string, qualifiers: string[]) {
    if (!xyLocation || !effectiveRegionId) return;
    const parts: string[] = [];
    parts.push(xyLocation.description);
    if (depthId) {
      const layer = DEPTH_LAYERS.find((l) => l.id === depthId);
      if (layer) parts.push(layer.label.toLowerCase());
    }
    if (extentDesc) parts.push(extentDesc);
    addFinding(selectedEye, effectiveRegionId, finding, qualifiers, parts.join(", "));
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

  /* ── Current findings list ──────────────────────────────────── */
  const currentFindings = Object.entries(findings)
    .filter(([k]) => k.startsWith(`${selectedEye}_`) || k.startsWith("OU_"))
    .flatMap(([key, entries]) =>
      entries
        .filter((e) => anteriorFindings.some((r) => r.regionId === e.region))
        .map((e) => ({ ...e, key })),
    );

  /* ── Step label ─────────────────────────────────────────────── */
  const stepLabel = {
    xy: isPointMode
      ? "Step 1 — Tap a location on the eye"
      : "Step 1 — Draw on the eye to mark the area",
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
    <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%", minHeight: 0 }}>

      {/* ── Top bar: eye + step indicator + brush ──────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
        {/* Eye toggle */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["OD", "OS", "OU"] as Eye[]).map((eye) => (
            <button
              key={eye} type="button"
              onClick={() => { setSelectedEye(eye); resetWorkflow(); }}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                fontSize: "0.75rem", fontWeight: 700, border: "none", cursor: "pointer",
                fontFamily: "inherit",
                background: selectedEye === eye ? "var(--gradient-glow)" : "var(--slate-100)",
                color: selectedEye === eye ? "white" : "var(--slate-600)",
                boxShadow: selectedEye === eye ? "var(--shadow-sm)" : "none",
              }}
            >{eye}</button>
          ))}
        </div>

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
      <div style={{ display: "flex", gap: 6, flex: 1, minHeight: 0 }}>

        {/* Eye photo SVG */}
        <div style={{ flex: 3, minHeight: 0, display: "flex" }}>
          <svg
            ref={svgRef}
            viewBox="0 0 500 400"
            style={{
              width: "100%", height: "100%",
              borderRadius: "var(--radius-sm)",
              cursor: step === "xy"
                ? (isPointMode ? "crosshair" : "cell")
                : step === "extent" && !isPointMode
                  ? "cell"
                  : "default",
              touchAction: "none", userSelect: "none",
              background: "#1a1410",
              opacity: (step !== "xy" && step !== "extent") ? 0.85 : 1,
              transition: "opacity 200ms ease",
            }}
            onPointerDown={(step === "xy" || step === "extent") ? onPhotoDown : undefined}
            onPointerMove={isDrawing ? onPhotoMove : undefined}
            onPointerUp={isDrawing ? onPhotoUp : undefined}
            onPointerCancel={isDrawing ? onPhotoUp : undefined}
          >
            <defs>
              <radialGradient id="scleraG" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#f2ece8" />
                <stop offset="70%" stopColor="#ebe2da" />
                <stop offset="100%" stopColor="#ddd2c8" />
              </radialGradient>
              <radialGradient id="irisG" cx="50%" cy="48%">
                <stop offset="0%" stopColor="#6b4f1a" />
                <stop offset="30%" stopColor="#8b6c20" />
                <stop offset="50%" stopColor="#7a5c18" />
                <stop offset="75%" stopColor="#5a4010" />
                <stop offset="100%" stopColor="#3a2808" />
              </radialGradient>
              <radialGradient id="sheenG" cx="42%" cy="38%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <clipPath id="aperture">
                <path d="M 40,200 Q 250,55 460,200 Q 250,345 40,200 Z" />
              </clipPath>
            </defs>

            {/* Periorbital skin */}
            <rect width="500" height="400" fill="#c8a888" />
            <path d="M 0,0 L 500,0 L 500,200 Q 250,40 0,200 Z" fill="#cbb098" />
            <path d="M 0,200 Q 250,360 500,200 L 500,400 L 0,400 Z" fill="#c4a890" />

            <g clipPath="url(#aperture)">
              {/* Sclera */}
              <ellipse cx={CX} cy={CY} rx={SCLERA_R + 30} ry={SCLERA_R} fill="url(#scleraG)" />
              {/* Vessels */}
              <g opacity="0.22" fill="none" strokeLinecap="round">
                <path d="M 85,175 Q 110,178 130,185 Q 145,190 155,195" stroke="#c44" strokeWidth="0.8" />
                <path d="M 80,195 Q 105,192 125,196" stroke="#b44" strokeWidth="0.6" />
                <path d="M 90,210 Q 115,208 135,205 Q 148,202 155,200" stroke="#c44" strokeWidth="0.7" />
                <path d="M 410,170 Q 390,175 370,182 Q 355,188 345,195" stroke="#c44" strokeWidth="0.8" />
                <path d="M 415,190 Q 395,188 375,192 Q 360,196 350,198" stroke="#b44" strokeWidth="0.6" />
                <path d="M 405,215 Q 385,212 365,208 Q 350,205 345,202" stroke="#c44" strokeWidth="0.7" />
                <path d="M 250,90 Q 240,105 238,120" stroke="#b33" strokeWidth="0.5" />
                <path d="M 265,92 Q 268,108 270,118" stroke="#b33" strokeWidth="0.4" />
                <path d="M 245,305 Q 242,290 240,280" stroke="#b33" strokeWidth="0.5" />
              </g>
              {/* Limbus ring */}
              <circle cx={CX} cy={CY} r={LIMBUS_R} fill="none" stroke="rgba(60,40,20,0.25)" strokeWidth="3" />
              {/* Iris */}
              <circle cx={CX} cy={CY} r={IRIS_R} fill="url(#irisG)" />
              {/* Iris fibers */}
              <g opacity="0.3" stroke="#a08040" strokeWidth="0.6" fill="none">
                {Array.from({ length: 72 }, (_, i) => {
                  const a = (i * 5 * Math.PI) / 180;
                  const r1 = PUPIL_R + 3;
                  const r2 = IRIS_R - 2;
                  const w = i % 3 === 0 ? 4 : i % 3 === 1 ? -3 : 2;
                  const mx = CX + ((r1 + r2) / 2) * Math.cos(a) + w * Math.sin(a);
                  const my = CY + ((r1 + r2) / 2) * Math.sin(a) + w * Math.cos(a);
                  return (
                    <path key={i}
                      d={`M ${CX + r1 * Math.cos(a)} ${CY + r1 * Math.sin(a)} Q ${mx} ${my} ${CX + r2 * Math.cos(a)} ${CY + r2 * Math.sin(a)}`}
                    />
                  );
                })}
              </g>
              {/* Collarette */}
              <circle cx={CX} cy={CY} r={(PUPIL_R + IRIS_R) * 0.42} fill="none" stroke="rgba(180,150,80,0.3)" strokeWidth="2.5" />
              {/* Pupillary margin */}
              <circle cx={CX} cy={CY} r={PUPIL_R + 1.5} fill="none" stroke="rgba(50,30,10,0.5)" strokeWidth="2" />
              {/* Pupil */}
              <circle cx={CX} cy={CY} r={PUPIL_R} fill="#0a0a0a" />
              {/* Light reflex */}
              <ellipse cx={CX - 18} cy={CY - 20} rx="8" ry="6" fill="white" opacity="0.85" />
              <ellipse cx={CX - 16} cy={CY - 18} rx="4" ry="3" fill="white" opacity="0.95" />
              {/* Corneal sheen */}
              <circle cx={CX} cy={CY} r={LIMBUS_R} fill="url(#sheenG)" />
            </g>

            {/* Lid margins */}
            <path d="M 40,200 Q 250,55 460,200" fill="none" stroke="#5a3a20" strokeWidth="2.5" />
            <path d="M 40,200 Q 250,345 460,200" fill="none" stroke="#5a3a20" strokeWidth="2" />
            {/* Upper lashes */}
            <g stroke="#3a2010" strokeWidth="1" strokeLinecap="round" opacity="0.7">
              {Array.from({ length: 28 }, (_, i) => {
                const t = 0.08 + (i / 28) * 0.84;
                const bx = 40 + t * 420;
                const by = 200 + (1 - 4 * (t - 0.5) ** 2) * -145;
                const len = 10 + Math.sin(i * 1.3) * 4;
                const ang = -Math.PI / 2 + (t - 0.5) * 0.8;
                return <line key={i} x1={bx} y1={by} x2={bx + len * Math.cos(ang)} y2={by + len * Math.sin(ang)} />;
              })}
            </g>
            {/* Lower lashes */}
            <g stroke="#3a2010" strokeWidth="0.8" strokeLinecap="round" opacity="0.5">
              {Array.from({ length: 20 }, (_, i) => {
                const t = 0.12 + (i / 20) * 0.76;
                const bx = 40 + t * 420;
                const by = 200 + (1 - 4 * (t - 0.5) ** 2) * 145;
                const len = 6 + Math.sin(i * 1.7) * 2;
                const ang = Math.PI / 2 + (t - 0.5) * 0.5;
                return <line key={i} x1={bx} y1={by} x2={bx + len * Math.cos(ang)} y2={by + len * Math.sin(ang)} />;
              })}
            </g>

            {/* ── Marker ── */}
            {marker && (
              <g>
                <circle cx={marker.x} cy={marker.y} r={7} fill="none" stroke="#00e5ff" strokeWidth="2" />
                <circle cx={marker.x} cy={marker.y} r={2} fill="#00e5ff" />
                <line x1={marker.x - 11} y1={marker.y} x2={marker.x + 11} y2={marker.y} stroke="#00e5ff" strokeWidth="0.8" opacity="0.6" />
                <line x1={marker.x} y1={marker.y - 11} x2={marker.x} y2={marker.y + 11} stroke="#00e5ff" strokeWidth="0.8" opacity="0.6" />
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
                fill="none" stroke="#00e5ff" strokeWidth="1"
                strokeDasharray="4 3" opacity="0.6"
              />
            )}
          </svg>
        </div>

        {/* ── Cross-section ───────────────────────────────────── */}
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
            Surface ↓
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2px 3px", gap: 1, minHeight: 0 }}>
            {DEPTH_LAYERS.map((layer, i) => {
              const isActive = step === "z";
              const isSel = depthId === layer.id;
              // Show group separators
              const prevGroup = i > 0 ? DEPTH_LAYERS[i - 1].group : null;
              const showSep = prevGroup !== null && prevGroup !== layer.group;

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
            ↑ Deep
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
              {selectedEye} — {xyLocation.description}
            </span>
            <span className="info-chip" style={{ fontSize: "0.65rem" }}>
              {xyLocation.clockHour}h
            </span>
            {depthId && (() => {
              const dl = DEPTH_LAYERS.find((l) => l.id === depthId);
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

      {/* ── "Skip extent" / "Draw extent" prompt ──────────────── */}
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

      {/* ── Current findings list ─────────────────────────────── */}
      {currentFindings.length > 0 && (
        <div style={{ flexShrink: 0 }}>
          <div style={{
            fontSize: "0.68rem", fontWeight: 600, color: "var(--text-secondary)",
            textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3,
          }}>
            AS Findings ({selectedEye})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {currentFindings.map((f) => (
              <div
                key={f.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "rgba(255,255,255,0.7)", backdropFilter: "blur(4px)",
                  borderRadius: 100, padding: "5px 12px", fontSize: "0.78rem",
                }}
              >
                <span style={{ color: "var(--text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.generatedText}
                </span>
                <div style={{ display: "flex", gap: 3, flexShrink: 0, marginLeft: 6 }}>
                  <button type="button" onClick={() => copyToFellowEye(f.key, f.id)} style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "var(--navy-50)", color: "var(--navy-500)",
                    border: "none", fontSize: "0.65rem", fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>Cp</button>
                  <button type="button" onClick={() => removeFinding(f.key, f.id)} style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "#fef2f2", color: "#ef4444",
                    border: "none", fontSize: "0.8rem",
                    cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
