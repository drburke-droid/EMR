import { useState, useRef, useMemo, useCallback } from "react";
import { anteriorFindings, type FindingNode } from "../../data/anterior_findings";
import { useEncounterStore, type Eye } from "../../store/encounterStore";
import { rankFindingsForRegion } from "../../utils/clinicalInference";
import RingSelector from "../menus/RingSelector";
import {
  CX, CY, PUPIL_R, IRIS_R, LIMBUS_R, SCLERA_R, PX_PER_MM,
  CORNEA_LAYERS,
  mapClickToLocation,
  computeBrushBounds,
  type EyeLocation,
  type CorneaLayer,
} from "../../utils/eyeCoordinates";

/* ================================================================
   BRUSH SIZES — diameter in mm  (0 = point click)
   ================================================================ */
const BRUSH_SIZES = [
  { label: "Pt",   mm: 0,   px: 3 },
  { label: "0.5",  mm: 0.5, px: 0.5 * PX_PER_MM },
  { label: "1",    mm: 1,   px: 1   * PX_PER_MM },
  { label: "2",    mm: 2,   px: 2   * PX_PER_MM },
  { label: "3",    mm: 3,   px: 3   * PX_PER_MM },
];

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function AnteriorPhoto() {
  const [selectedEye, setSelectedEye] = useState<Eye>("OD");
  const [brushIdx, setBrushIdx] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<{ x: number; y: number }[]>([]);
  const [markers, setMarkers] = useState<{ x: number; y: number; loc: EyeLocation }[]>([]);
  const [clickLocation, setClickLocation] = useState<EyeLocation | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<CorneaLayer | null>(null);
  const [brushBoundsDesc, setBrushBoundsDesc] = useState("");

  const svgRef = useRef<SVGSVGElement>(null);

  const findings = useEncounterStore((s) => s.findings);
  const addFinding = useEncounterStore((s) => s.addFinding);
  const removeFinding = useEncounterStore((s) => s.removeFinding);
  const copyToFellowEye = useEncounterStore((s) => s.copyToFellowEye);
  const symptoms = useEncounterStore((s) => s.symptoms);

  const brush = BRUSH_SIZES[brushIdx];
  const isPointMode = brush.mm === 0;

  /* ---- SVG coordinate helpers ---- */
  const toSvg = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  /* ---- Pointer handlers ---- */
  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const p = toSvg(e);
      const loc = mapClickToLocation(p.x, p.y, selectedEye);

      if (isPointMode) {
        // Point click — place marker
        setMarkers((prev) => [...prev, { x: p.x, y: p.y, loc }]);
        setClickLocation(loc);
        setDrawPoints([]);
        setBrushBoundsDesc("");
      } else {
        // Brush mode — start drawing
        setIsDrawing(true);
        setDrawPoints([p]);
        setClickLocation(loc);
        (e.target as Element).setPointerCapture(e.pointerId);
      }
    },
    [toSvg, selectedEye, isPointMode],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isDrawing) return;
      const p = toSvg(e);
      setDrawPoints((prev) => [...prev, p]);
    },
    [isDrawing, toSvg],
  );

  const onPointerUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    // Compute bounds
    const bounds = computeBrushBounds(drawPoints);
    setBrushBoundsDesc(bounds.description);
    // Map center of drawn area to location
    const loc = mapClickToLocation(bounds.centerX, bounds.centerY, selectedEye);
    setClickLocation(loc);
  }, [isDrawing, drawPoints, selectedEye]);

  /* ---- Region data for findings menu ---- */
  const regionId = clickLocation?.regionId ?? null;
  const regionData = regionId
    ? anteriorFindings.find((r) => r.regionId === regionId)
    : null;

  const rankedFindings = useMemo(() => {
    if (!regionData || !regionId) return null;
    const originalLabels = regionData.findings.map((n) => n.label);
    const symptomLabels = symptoms.map((s) => s.symptom);
    const ranked = rankFindingsForRegion(regionId, originalLabels, symptomLabels, findings);
    const nodeMap = new Map<string, FindingNode>();
    for (const n of regionData.findings) nodeMap.set(n.label, n);
    return ranked.map((label) => nodeMap.get(label)).filter(Boolean) as FindingNode[];
  }, [regionData, regionId, symptoms, findings]);

  /* ---- Build freeText with location metadata ---- */
  function handleComplete(finding: string, qualifiers: string[]) {
    if (!clickLocation) return;
    const parts: string[] = [];
    parts.push(clickLocation.description);
    if (selectedLayer) {
      const layer = CORNEA_LAYERS.find((l) => l.id === selectedLayer);
      if (layer) parts.push(layer.label.toLowerCase());
    }
    if (brushBoundsDesc) parts.push(brushBoundsDesc);
    const freeText = parts.join(", ");
    addFinding(selectedEye, clickLocation.regionId, finding, qualifiers, freeText);
    // Clear markers/drawing after adding
    clearSelection();
  }

  function clearSelection() {
    setMarkers([]);
    setDrawPoints([]);
    setClickLocation(null);
    setSelectedLayer(null);
    setBrushBoundsDesc("");
  }

  /* ---- Current findings list ---- */
  const currentFindings = Object.entries(findings)
    .filter(([k]) => k.startsWith(`${selectedEye}_`) || k.startsWith("OU_"))
    .flatMap(([key, entries]) =>
      entries
        .filter((e) => anteriorFindings.some((r) => r.regionId === e.region))
        .map((e) => ({ ...e, key })),
    );

  /* ---- Is the click in a corneal zone? ---- */
  const isCorneal = clickLocation &&
    ["central_cornea", "paracentral_cornea", "peripheral_cornea", "limbus"].includes(clickLocation.zone);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%", minHeight: 0 }}>
      {/* Top bar: eye toggle + brush selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["OD", "OS", "OU"] as Eye[]).map((eye) => (
            <button
              key={eye}
              type="button"
              onClick={() => setSelectedEye(eye)}
              style={{
                width: 40, height: 40, borderRadius: "50%",
                fontSize: "0.8rem", fontWeight: 700, border: "none", cursor: "pointer",
                fontFamily: "inherit",
                background: selectedEye === eye ? "var(--gradient-glow)" : "var(--slate-100)",
                color: selectedEye === eye ? "white" : "var(--slate-600)",
                boxShadow: selectedEye === eye ? "var(--shadow-md)" : "none",
                transition: "all 150ms ease",
              }}
            >
              {eye}
            </button>
          ))}
        </div>

        {/* Brush size selector */}
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "var(--slate-100)", borderRadius: "var(--radius-sm)", padding: "4px 6px",
        }}>
          <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", fontWeight: 600, marginRight: 2 }}>BRUSH</span>
          {BRUSH_SIZES.map((b, i) => (
            <button
              key={b.label}
              type="button"
              onClick={() => setBrushIdx(i)}
              title={b.mm === 0 ? "Point click" : `${b.mm}mm brush`}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                border: brushIdx === i ? "2px solid var(--navy-400)" : "1.5px solid var(--border)",
                background: brushIdx === i ? "var(--navy-50)" : "white",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 150ms ease",
              }}
            >
              {b.mm === 0 ? (
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--navy-500)" }} />
              ) : (
                <div style={{
                  width: Math.min(22, Math.max(8, b.mm * 6)),
                  height: Math.min(22, Math.max(8, b.mm * 6)),
                  borderRadius: "50%",
                  background: brushIdx === i ? "var(--navy-400)" : "var(--slate-400)",
                  opacity: 0.7,
                }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Photo + cross-section row */}
      <div style={{ display: "flex", gap: 8, flex: 1, minHeight: 0 }}>
        {/* Eye photo */}
        <div style={{ flex: 3, position: "relative", minHeight: 0, display: "flex", flexDirection: "column" }}>
          <svg
            ref={svgRef}
            viewBox="0 0 500 400"
            style={{
              width: "100%", height: "100%", borderRadius: "var(--radius-sm)",
              cursor: isPointMode ? "crosshair" : "cell",
              touchAction: "none", userSelect: "none",
              background: "#1a1410",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <defs>
              {/* Sclera gradient */}
              <radialGradient id="scleraGrad" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#f2ece8" />
                <stop offset="70%" stopColor="#ebe2da" />
                <stop offset="100%" stopColor="#ddd2c8" />
              </radialGradient>
              {/* Iris gradient — hazel/brown */}
              <radialGradient id="irisGrad" cx="50%" cy="48%">
                <stop offset="0%" stopColor="#6b4f1a" />
                <stop offset="30%" stopColor="#8b6c20" />
                <stop offset="50%" stopColor="#7a5c18" />
                <stop offset="75%" stopColor="#5a4010" />
                <stop offset="100%" stopColor="#3a2808" />
              </radialGradient>
              {/* Corneal sheen highlight */}
              <radialGradient id="corneaSheen" cx="42%" cy="38%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              {/* Limbus shadow ring */}
              <radialGradient id="limbusShadow" cx="50%" cy="50%">
                <stop offset="88%" stopColor="rgba(0,0,0,0)" />
                <stop offset="94%" stopColor="rgba(0,0,0,0.15)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
              {/* Eyelid aperture clip */}
              <clipPath id="eyeClip">
                <path d="M 40,200 Q 250,55 460,200 Q 250,345 40,200 Z" />
              </clipPath>
              {/* Iris fiber pattern */}
              <filter id="irisNoise">
                <feTurbulence type="fractalNoise" baseFrequency="0.08 0.3" numOctaves="4" seed="3" />
                <feColorMatrix type="saturate" values="0.1" />
                <feBlend in="SourceGraphic" mode="overlay" />
              </filter>
            </defs>

            {/* Background (periorbital skin) */}
            <rect width="500" height="400" fill="#c8a888" rx="0" />
            {/* Upper eyelid skin */}
            <path d="M 0,0 L 500,0 L 500,200 Q 250,40 0,200 Z" fill="#cbb098" />
            {/* Lower eyelid skin */}
            <path d="M 0,200 Q 250,360 500,200 L 500,400 L 0,400 Z" fill="#c4a890" />

            {/* Visible eye — clipped by aperture */}
            <g clipPath="url(#eyeClip)">
              {/* Sclera */}
              <ellipse cx={CX} cy={CY} rx={SCLERA_R + 30} ry={SCLERA_R} fill="url(#scleraGrad)" />

              {/* Scleral blood vessels */}
              <g opacity="0.25" fill="none" strokeLinecap="round">
                <path d="M 85,175 Q 110,178 130,185 Q 145,190 155,195" stroke="#c44" strokeWidth="0.8" />
                <path d="M 80,195 Q 105,192 125,196" stroke="#b44" strokeWidth="0.6" />
                <path d="M 90,210 Q 115,208 135,205 Q 148,202 155,200" stroke="#c44" strokeWidth="0.7" />
                <path d="M 410,170 Q 390,175 370,182 Q 355,188 345,195" stroke="#c44" strokeWidth="0.8" />
                <path d="M 415,190 Q 395,188 375,192 Q 360,196 350,198" stroke="#b44" strokeWidth="0.6" />
                <path d="M 405,215 Q 385,212 365,208 Q 350,205 345,202" stroke="#c44" strokeWidth="0.7" />
                <path d="M 250,90 Q 240,105 238,120" stroke="#b33" strokeWidth="0.5" />
                <path d="M 265,92 Q 268,108 270,118" stroke="#b33" strokeWidth="0.4" />
                <path d="M 245,305 Q 242,290 240,280" stroke="#b33" strokeWidth="0.5" />
                <path d="M 260,308 Q 262,292 263,282" stroke="#b33" strokeWidth="0.4" />
              </g>

              {/* Limbus — subtle dark ring */}
              <circle cx={CX} cy={CY} r={LIMBUS_R} fill="none" stroke="rgba(60,40,20,0.25)" strokeWidth="3" />

              {/* Iris */}
              <circle cx={CX} cy={CY} r={IRIS_R} fill="url(#irisGrad)" />

              {/* Iris radial fibers */}
              <g opacity="0.3" stroke="#a08040" strokeWidth="0.6" fill="none">
                {Array.from({ length: 72 }, (_, i) => {
                  const a = (i * 5 * Math.PI) / 180;
                  const r1 = PUPIL_R + 3;
                  const r2 = IRIS_R - 2;
                  const wobble = (i % 3 === 0 ? 4 : i % 3 === 1 ? -3 : 2);
                  const mx = CX + (r1 + r2) / 2 * Math.cos(a) + wobble * Math.sin(a);
                  const my = CY + (r1 + r2) / 2 * Math.sin(a) + wobble * Math.cos(a);
                  return (
                    <path
                      key={i}
                      d={`M ${CX + r1 * Math.cos(a)} ${CY + r1 * Math.sin(a)} Q ${mx} ${my} ${CX + r2 * Math.cos(a)} ${CY + r2 * Math.sin(a)}`}
                    />
                  );
                })}
              </g>

              {/* Collarette ring */}
              <circle cx={CX} cy={CY} r={(PUPIL_R + IRIS_R) * 0.42} fill="none" stroke="rgba(180,150,80,0.3)" strokeWidth="2.5" />

              {/* Pupillary margin */}
              <circle cx={CX} cy={CY} r={PUPIL_R + 1.5} fill="none" stroke="rgba(50,30,10,0.5)" strokeWidth="2" />

              {/* Pupil */}
              <circle cx={CX} cy={CY} r={PUPIL_R} fill="#0a0a0a" />

              {/* Corneal light reflex */}
              <ellipse cx={CX - 18} cy={CY - 20} rx="8" ry="6" fill="white" opacity="0.85" />
              <ellipse cx={CX - 16} cy={CY - 18} rx="4" ry="3" fill="white" opacity="0.95" />

              {/* Corneal sheen */}
              <circle cx={CX} cy={CY} r={LIMBUS_R} fill="url(#corneaSheen)" />

              {/* Limbus depth shadow */}
              <circle cx={CX} cy={CY} r={LIMBUS_R + 8} fill="url(#limbusShadow)" />
            </g>

            {/* Eyelid margins (lash lines) */}
            <path d="M 40,200 Q 250,55 460,200" fill="none" stroke="#5a3a20" strokeWidth="2.5" />
            <path d="M 40,200 Q 250,345 460,200" fill="none" stroke="#5a3a20" strokeWidth="2" />

            {/* Upper lashes */}
            <g stroke="#3a2010" strokeWidth="1" strokeLinecap="round" opacity="0.7">
              {Array.from({ length: 28 }, (_, i) => {
                const t = 0.08 + (i / 28) * 0.84;
                const bx = 40 + t * 420;
                const by = 200 + (1 - 4 * (t - 0.5) ** 2) * (-145);
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

            {/* Placed markers */}
            {markers.map((m, i) => (
              <g key={i}>
                <circle cx={m.x} cy={m.y} r={6} fill="none" stroke="#00e5ff" strokeWidth="2" opacity="0.9" />
                <circle cx={m.x} cy={m.y} r={2} fill="#00e5ff" />
                <line x1={m.x - 9} y1={m.y} x2={m.x + 9} y2={m.y} stroke="#00e5ff" strokeWidth="1" opacity="0.6" />
                <line x1={m.x} y1={m.y - 9} x2={m.x} y2={m.y + 9} stroke="#00e5ff" strokeWidth="1" opacity="0.6" />
              </g>
            ))}

            {/* Brush stroke */}
            {drawPoints.length > 1 && (
              <polyline
                points={drawPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="rgba(0,229,255,0.6)"
                strokeWidth={brush.px}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Brush bounding box (after drawing complete) */}
            {!isDrawing && drawPoints.length > 1 && (() => {
              const xs = drawPoints.map((p) => p.x);
              const ys = drawPoints.map((p) => p.y);
              const minX = Math.min(...xs) - brush.px / 2;
              const minY = Math.min(...ys) - brush.px / 2;
              const maxX = Math.max(...xs) + brush.px / 2;
              const maxY = Math.max(...ys) + brush.px / 2;
              return (
                <rect
                  x={minX} y={minY}
                  width={maxX - minX} height={maxY - minY}
                  fill="none" stroke="#00e5ff" strokeWidth="1"
                  strokeDasharray="4 3" opacity="0.7"
                />
              );
            })()}
          </svg>
        </div>

        {/* Cross-section diagram */}
        <div style={{
          flex: 1, minWidth: 80, display: "flex", flexDirection: "column",
          background: "var(--slate-50)", borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)", overflow: "hidden",
        }}>
          <div style={{
            fontSize: "0.6rem", fontWeight: 700, color: "var(--text-secondary)",
            textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "6px 8px 2px", textAlign: "center",
          }}>
            Anterior ↓
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2px 4px", gap: 1 }}>
            {CORNEA_LAYERS.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => setSelectedLayer(selectedLayer === layer.id ? null : layer.id)}
                disabled={!isCorneal}
                style={{
                  flex: layer.thickness,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: selectedLayer === layer.id
                    ? layer.color
                    : isCorneal
                      ? `${layer.color}66`
                      : `${layer.color}22`,
                  border: selectedLayer === layer.id
                    ? "2px solid var(--navy-400)"
                    : "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 4,
                  cursor: isCorneal ? "pointer" : "default",
                  fontSize: "0.55rem",
                  fontWeight: selectedLayer === layer.id ? 700 : 500,
                  color: selectedLayer === layer.id ? "var(--navy-900)" : "var(--text-secondary)",
                  fontFamily: "inherit",
                  transition: "all 150ms ease",
                  opacity: isCorneal ? 1 : 0.4,
                  padding: 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  minHeight: 0,
                }}
              >
                {layer.label}
              </button>
            ))}
          </div>
          <div style={{
            fontSize: "0.6rem", fontWeight: 700, color: "var(--text-secondary)",
            textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "2px 8px 6px", textAlign: "center",
          }}>
            ↑ Posterior
          </div>
        </div>
      </div>

      {/* Location info bar */}
      {clickLocation && (
        <div
          className="animate-in"
          style={{
            background: "var(--navy-50)", borderRadius: "var(--radius-sm)",
            padding: "8px 12px", flexShrink: 0,
            border: "1px solid var(--navy-100)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--navy-700)" }}>
              {selectedEye} — {clickLocation.description}
            </span>
            {clickLocation.clockHour && (
              <span className="info-chip" style={{ fontSize: "0.7rem" }}>
                {clickLocation.clockHour} o'clock
              </span>
            )}
            {selectedLayer && (
              <span className="info-chip" style={{
                fontSize: "0.7rem",
                background: CORNEA_LAYERS.find((l) => l.id === selectedLayer)?.color ?? "white",
                borderColor: "var(--navy-200)",
              }}>
                {CORNEA_LAYERS.find((l) => l.id === selectedLayer)?.label}
              </span>
            )}
            {brushBoundsDesc && (
              <span className="info-chip" style={{ fontSize: "0.7rem" }}>
                {brushBoundsDesc}
              </span>
            )}
            <button
              type="button"
              onClick={clearSelection}
              style={{
                marginLeft: "auto", background: "none", border: "none",
                color: "var(--text-secondary)", fontSize: "0.75rem", cursor: "pointer",
                fontFamily: "inherit", fontWeight: 500,
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Finding buttons — appear after location is set */}
      {clickLocation && regionData && (
        <div style={{ flexShrink: 0 }}>
          <div style={{
            fontSize: "0.7rem", fontWeight: 600, color: "var(--text-secondary)",
            textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6,
          }}>
            {regionData.label} — Findings
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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

      {/* Current findings list */}
      {currentFindings.length > 0 && (
        <div style={{ flexShrink: 0 }}>
          <div style={{
            fontSize: "0.7rem", fontWeight: 600, color: "var(--text-secondary)",
            textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4,
          }}>
            AS Findings ({selectedEye})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {currentFindings.map((f) => (
              <div
                key={f.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "rgba(255,255,255,0.7)", backdropFilter: "blur(4px)",
                  borderRadius: 100, padding: "6px 14px", fontSize: "0.82rem",
                }}
              >
                <span style={{ color: "var(--text)" }}>{f.generatedText}</span>
                <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                  <button
                    type="button"
                    onClick={() => copyToFellowEye(f.key, f.id)}
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "var(--navy-50)", color: "var(--navy-500)",
                      border: "none", fontSize: "0.7rem", fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFinding(f.key, f.id)}
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "#fef2f2", color: "#ef4444",
                      border: "none", fontSize: "0.85rem",
                      cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
