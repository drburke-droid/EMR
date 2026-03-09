import { useState, useMemo } from "react";
import { posteriorFindings, type FindingNode } from "../../data/posterior_findings";
import { useEncounterStore, type Eye } from "../../store/encounterStore";
import { rankFindingsForRegion } from "../../utils/clinicalInference";
import RingSelector from "../menus/RingSelector";

type RegionDef = { id: string; label: string; cx: number; cy: number; r: number };

const regionLayout: RegionDef[] = [
  { id: "optic_nerve", label: "ONH", cx: 110, cy: 150, r: 28 },
  { id: "macula", label: "MAC", cx: 200, cy: 150, r: 25 },
  { id: "fovea", label: "Fov", cx: 200, cy: 150, r: 10 },
  { id: "superior_arcade", label: "Sup Arc", cx: 155, cy: 80, r: 22 },
  { id: "inferior_arcade", label: "Inf Arc", cx: 155, cy: 220, r: 22 },
  { id: "retinal_vessels", label: "Vessels", cx: 155, cy: 150, r: 18 },
  { id: "ST_midperiphery", label: "ST", cx: 230, cy: 65, r: 25 },
  { id: "SN_midperiphery", label: "SN", cx: 70, cy: 65, r: 25 },
  { id: "IT_midperiphery", label: "IT", cx: 230, cy: 235, r: 25 },
  { id: "IN_midperiphery", label: "IN", cx: 70, cy: 235, r: 25 },
  { id: "temporal_retina", label: "Temp", cx: 270, cy: 150, r: 22 },
  { id: "nasal_retina", label: "Nasal", cx: 30, cy: 150, r: 22 },
  { id: "superior_retina", label: "Sup", cx: 150, cy: 25, r: 22 },
  { id: "inferior_retina", label: "Inf", cx: 150, cy: 275, r: 22 },
  { id: "far_periphery", label: "Far Per", cx: 150, cy: 150, r: 0 },
  { id: "vitreous", label: "VIT", cx: 30, cy: 25, r: 22 },
];

export default function PosteriorMap() {
  const [selectedEye, setSelectedEye] = useState<Eye>("OD");
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const findings = useEncounterStore((s) => s.findings);
  const symptoms = useEncounterStore((s) => s.symptoms);
  const addFinding = useEncounterStore((s) => s.addFinding);
  const removeFinding = useEncounterStore((s) => s.removeFinding);
  const copyToFellowEye = useEncounterStore((s) => s.copyToFellowEye);

  const regionData = activeRegion
    ? posteriorFindings.find((r) => r.regionId === activeRegion)
    : null;

  const rankedFindings = useMemo(() => {
    if (!regionData || !activeRegion) return null;
    const originalLabels = regionData.findings.map((n) => n.label);
    const symptomLabels = symptoms.map((s) => s.symptom);
    const ranked = rankFindingsForRegion(activeRegion, originalLabels, symptomLabels, findings);
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
        .filter((e) => posteriorFindings.some((r) => r.regionId === e.region))
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

      {/* Fundus SVG */}
      <div className="relative">
        <svg viewBox="0 0 300 300" className="w-full max-w-sm mx-auto">
          <circle cx="150" cy="150" r="145" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="150" cy="150" r="100" fill="none" stroke="#fbbf2440" strokeWidth="1" strokeDasharray="4 3" />
          <circle cx="110" cy="150" r="28" fill="#fed7aa" stroke="#f97316" strokeWidth="1.5" />
          <circle cx="200" cy="150" r="25" fill="#fde68a" stroke="#eab308" strokeWidth="1" />
          <circle cx="200" cy="150" r="10" fill="#fbbf24" />
          <path d="M 110 122 Q 155 50 230 100" fill="none" stroke="#ef444480" strokeWidth="1.5" />
          <path d="M 110 178 Q 155 250 230 200" fill="none" stroke="#3b82f680" strokeWidth="1.5" />

          {regionLayout.filter((r) => r.r > 0).map((r) => (
            <g key={r.id} onClick={() => setActiveRegion(r.id)} className="cursor-pointer">
              <circle
                cx={r.cx}
                cy={r.cy}
                r={r.r}
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
                      : "rgba(0,0,0,0.15)"
                }
                strokeWidth={activeRegion === r.id || hasFindings(r.id) ? 2 : 1}
                strokeDasharray={activeRegion === r.id || hasFindings(r.id) ? "none" : "3 2"}
              />
              <text
                x={r.cx}
                y={r.cy + 4}
                textAnchor="middle"
                className="text-[9px] fill-gray-700 pointer-events-none select-none"
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

      {/* Findings list */}
      {currentFindings.length > 0 && (
        <div className="space-y-1 mt-4">
          <h4 className="text-xs text-gray-500 font-semibold uppercase">PS Findings ({selectedEye})</h4>
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
