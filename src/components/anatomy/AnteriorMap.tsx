import { useState, useMemo } from "react";
import { anteriorFindings, type FindingNode } from "../../data/anterior_findings";
import { useEncounterStore, type Eye } from "../../store/encounterStore";
import { rankFindingsForRegion } from "../../utils/clinicalInference";
import RingSelector from "../menus/RingSelector";

type RegionDef = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

const regionLayout: RegionDef[] = [
  { id: "upper_lid", label: "Upper Lid", x: 80, y: 10, w: 140, h: 35 },
  { id: "lower_lid", label: "Lower Lid", x: 80, y: 275, w: 140, h: 35 },
  { id: "upper_lid_margin", label: "UL Margin", x: 80, y: 48, w: 140, h: 25 },
  { id: "lower_lid_margin", label: "LL Margin", x: 80, y: 248, w: 140, h: 25 },
  { id: "upper_lashes", label: "U Lash", x: 15, y: 30, w: 60, h: 25 },
  { id: "lower_lashes", label: "L Lash", x: 15, y: 265, w: 60, h: 25 },
  { id: "bulbar_conj_nasal", label: "Conj N", x: 15, y: 120, w: 60, h: 50 },
  { id: "bulbar_conj_temporal", label: "Conj T", x: 225, y: 120, w: 60, h: 50 },
  { id: "bulbar_conj_superior", label: "Conj S", x: 120, y: 78, w: 60, h: 35 },
  { id: "bulbar_conj_inferior", label: "Conj I", x: 120, y: 210, w: 60, h: 35 },
  { id: "palpebral_conj_upper", label: "Palp S", x: 225, y: 48, w: 60, h: 28 },
  { id: "palpebral_conj_lower", label: "Palp I", x: 225, y: 248, w: 60, h: 28 },
  { id: "caruncle", label: "Car", x: 15, y: 175, w: 55, h: 30 },
  { id: "plica", label: "Plica", x: 15, y: 88, w: 55, h: 28 },
  { id: "cornea_superior", label: "K sup", x: 120, y: 115, w: 60, h: 30 },
  { id: "cornea_central", label: "K ctr", x: 120, y: 148, w: 60, h: 30 },
  { id: "cornea_inferior", label: "K inf", x: 120, y: 180, w: 60, h: 30 },
  { id: "cornea_nasal", label: "K nas", x: 78, y: 148, w: 40, h: 30 },
  { id: "cornea_temporal", label: "K tmp", x: 182, y: 148, w: 40, h: 30 },
  { id: "tear_film", label: "TF", x: 225, y: 80, w: 60, h: 35 },
  { id: "anterior_chamber", label: "AC", x: 225, y: 175, w: 60, h: 35 },
  { id: "iris", label: "Iris", x: 78, y: 210, w: 40, h: 35 },
  { id: "pupil", label: "Pupil", x: 135, y: 155, w: 30, h: 20 },
  { id: "lens", label: "Lens", x: 182, y: 210, w: 40, h: 35 },
];

export default function AnteriorMap() {
  const [selectedEye, setSelectedEye] = useState<Eye>("OD");
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const findings = useEncounterStore((s) => s.findings);
  const addFinding = useEncounterStore((s) => s.addFinding);
  const removeFinding = useEncounterStore((s) => s.removeFinding);
  const copyToFellowEye = useEncounterStore((s) => s.copyToFellowEye);

  const symptoms = useEncounterStore((s) => s.symptoms);

  const regionData = activeRegion
    ? anteriorFindings.find((r) => r.regionId === activeRegion)
    : null;

  // Rank findings for the active region based on current clinical context
  const rankedFindings = useMemo(() => {
    if (!regionData || !activeRegion) return null;
    const originalLabels = regionData.findings.map((n) => n.label);
    const symptomLabels = symptoms.map((s) => s.symptom);
    const ranked = rankFindingsForRegion(activeRegion, originalLabels, symptomLabels, findings);
    // Reorder the FindingNode array to match ranked order
    const nodeMap = new Map<string, FindingNode>();
    for (const n of regionData.findings) nodeMap.set(n.label, n);
    return ranked.map((label) => nodeMap.get(label)).filter(Boolean) as FindingNode[];
  }, [regionData, activeRegion, symptoms, findings]);

  function hasFindings(regionId: string): boolean {
    const key = `${selectedEye}_${regionId}`;
    const ouKey = `OU_${regionId}`;
    return (findings[key]?.length || 0) > 0 || (findings[ouKey]?.length || 0) > 0;
  }

  function handleComplete(finding: string, qualifiers: string[]) {
    if (activeRegion) {
      addFinding(selectedEye, activeRegion, finding, qualifiers);
    }
  }

  const currentFindings = Object.entries(findings)
    .filter(([k]) => k.startsWith(`${selectedEye}_`) || k.startsWith("OU_"))
    .flatMap(([key, entries]) =>
      entries
        .filter((e) => anteriorFindings.some((r) => r.regionId === e.region))
        .map((e) => ({ ...e, key }))
    );

  return (
    <div className="space-y-4">
      {/* Eye toggle */}
      <div className="flex gap-2">
        {(["OD", "OS", "OU"] as Eye[]).map((eye) => (
          <button
            key={eye}
            type="button"
            onClick={() => setSelectedEye(eye)}
            className={`w-12 h-12 rounded-full text-sm font-bold transition-colors ${
              selectedEye === eye
                ? "bg-blue-600/80 text-white shadow-md"
                : "bg-white/70 text-gray-700 hover:bg-white/90"
            }`}
          >
            {eye}
          </button>
        ))}
        {activeRegion && (
          <button
            type="button"
            onClick={() => setActiveRegion(null)}
            className="ml-auto px-4 py-2 rounded-full bg-gray-200/70 text-gray-600 text-sm font-medium"
          >
            Close {regionData?.label}
          </button>
        )}
      </div>

      {/* SVG Map */}
      <div className="relative">
        <svg viewBox="0 0 300 320" className="w-full max-w-sm mx-auto">
          <ellipse cx="150" cy="160" rx="120" ry="100" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="2" />
          <ellipse cx="150" cy="160" rx="60" ry="55" fill="#dbeafe" stroke="#60a5fa" strokeWidth="1.5" />
          <circle cx="150" cy="160" r="18" fill="#1e40af" stroke="#1e3a8a" strokeWidth="1" />
          <circle cx="150" cy="160" r="8" fill="#0f172a" />

          {regionLayout.map((r) => (
            <g key={r.id} onClick={() => setActiveRegion(r.id)} className="cursor-pointer">
              <rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                rx={6}
                fill={
                  activeRegion === r.id
                    ? "rgba(37,99,235,0.25)"
                    : hasFindings(r.id)
                      ? "rgba(34,197,94,0.2)"
                      : "rgba(0,0,0,0)"
                }
                stroke={
                  activeRegion === r.id
                    ? "#2563eb"
                    : hasFindings(r.id)
                      ? "#22c55e"
                      : "rgba(0,0,0,0.1)"
                }
                strokeWidth={activeRegion === r.id || hasFindings(r.id) ? 2 : 1}
                strokeDasharray={activeRegion === r.id || hasFindings(r.id) ? "none" : "4 2"}
              />
              <text
                x={r.x + r.w / 2}
                y={r.y + r.h / 2 + 4}
                textAnchor="middle"
                className="text-[9px] fill-gray-600 pointer-events-none select-none"
                fontWeight={hasFindings(r.id) ? "bold" : "normal"}
              >
                {r.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Finding buttons — linear list of round buttons */}
      {activeRegion && regionData && (
        <div>
          <h4 className="text-xs text-gray-500 font-semibold uppercase mb-3">
            {regionData.label} — Findings
          </h4>
          <div className="flex flex-wrap gap-3 justify-start">
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
        <div className="space-y-1 mt-4">
          <h4 className="text-xs text-gray-500 font-semibold uppercase">AS Findings ({selectedEye})</h4>
          {currentFindings.map((f) => (
            <div key={f.id} className="flex items-center justify-between bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 text-sm">
              <span className="text-gray-800">{f.generatedText}</span>
              <div className="flex gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => copyToFellowEye(f.key, f.id)}
                  className="w-10 h-10 rounded-full bg-blue-50/80 text-blue-600 text-xs font-medium flex items-center justify-center"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => removeFinding(f.key, f.id)}
                  className="w-10 h-10 rounded-full bg-red-50/80 text-red-500 text-xs flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
