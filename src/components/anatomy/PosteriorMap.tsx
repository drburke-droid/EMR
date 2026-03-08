import { useState } from "react";
import { posteriorFindings } from "../../data/posterior_findings";
import { useEncounterStore, type Eye } from "../../store/encounterStore";
import FindingMenu from "../menus/FindingMenu";

type RegionDef = { id: string; label: string; cx: number; cy: number; r: number };

const regionLayout: RegionDef[] = [
  // Central structures
  { id: "optic_nerve", label: "ONH", cx: 110, cy: 150, r: 28 },
  { id: "macula", label: "MAC", cx: 200, cy: 150, r: 25 },
  { id: "fovea", label: "Fov", cx: 200, cy: 150, r: 10 },
  // Arcades
  { id: "superior_arcade", label: "Sup Arc", cx: 155, cy: 80, r: 22 },
  { id: "inferior_arcade", label: "Inf Arc", cx: 155, cy: 220, r: 22 },
  { id: "retinal_vessels", label: "Vessels", cx: 155, cy: 150, r: 18 },
  // Midperiphery
  { id: "ST_midperiphery", label: "ST", cx: 230, cy: 65, r: 25 },
  { id: "SN_midperiphery", label: "SN", cx: 70, cy: 65, r: 25 },
  { id: "IT_midperiphery", label: "IT", cx: 230, cy: 235, r: 25 },
  { id: "IN_midperiphery", label: "IN", cx: 70, cy: 235, r: 25 },
  // Peripheral
  { id: "temporal_retina", label: "Temp", cx: 270, cy: 150, r: 22 },
  { id: "nasal_retina", label: "Nasal", cx: 30, cy: 150, r: 22 },
  { id: "superior_retina", label: "Sup", cx: 150, cy: 25, r: 22 },
  { id: "inferior_retina", label: "Inf", cx: 150, cy: 275, r: 22 },
  { id: "far_periphery", label: "Far Per", cx: 150, cy: 150, r: 0 }, // No circle, text-only
  // Vitreous
  { id: "vitreous", label: "VIT", cx: 30, cy: 25, r: 22 },
];

export default function PosteriorMap() {
  const [selectedEye, setSelectedEye] = useState<Eye>("OD");
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const findings = useEncounterStore((s) => s.findings);
  const removeFinding = useEncounterStore((s) => s.removeFinding);
  const copyToFellowEye = useEncounterStore((s) => s.copyToFellowEye);

  const regionData = activeRegion
    ? posteriorFindings.find((r) => r.regionId === activeRegion)
    : null;

  function hasFindings(regionId: string): boolean {
    const key = `${selectedEye}_${regionId}`;
    const ouKey = `OU_${regionId}`;
    return (findings[key]?.length || 0) > 0 || (findings[ouKey]?.length || 0) > 0;
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
            className={`px-4 py-2 rounded-lg text-sm font-bold min-h-[44px] transition-colors ${
              selectedEye === eye
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {eye}
          </button>
        ))}
      </div>

      {/* Fundus SVG */}
      <div className="relative">
        <svg viewBox="0 0 300 300" className="w-full max-w-sm mx-auto">
          {/* Fundus background */}
          <circle cx="150" cy="150" r="145" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="150" cy="150" r="100" fill="none" stroke="#fbbf2440" strokeWidth="1" strokeDasharray="4 3" />

          {/* Optic nerve */}
          <circle cx="110" cy="150" r="28" fill="#fed7aa" stroke="#f97316" strokeWidth="1.5" />
          {/* Macula */}
          <circle cx="200" cy="150" r="25" fill="#fde68a" stroke="#eab308" strokeWidth="1" />
          <circle cx="200" cy="150" r="10" fill="#fbbf24" />

          {/* Arcade arcs */}
          <path d="M 110 122 Q 155 50 230 100" fill="none" stroke="#ef444480" strokeWidth="1.5" />
          <path d="M 110 178 Q 155 250 230 200" fill="none" stroke="#3b82f680" strokeWidth="1.5" />

          {/* Tap regions */}
          {regionLayout.filter((r) => r.r > 0).map((r) => (
            <g key={r.id} onClick={() => setActiveRegion(r.id)} className="cursor-pointer">
              <circle
                cx={r.cx}
                cy={r.cy}
                r={r.r}
                fill={activeRegion === r.id ? "rgba(37,99,235,0.25)" : hasFindings(r.id) ? "rgba(34,197,94,0.2)" : "rgba(0,0,0,0)"}
                stroke={hasFindings(r.id) ? "#22c55e" : activeRegion === r.id ? "#2563eb" : "rgba(0,0,0,0.15)"}
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

      {/* Finding menu */}
      {activeRegion && regionData && (
        <FindingMenu
          regionId={activeRegion}
          findings={regionData.findings}
          eye={selectedEye}
          onClose={() => setActiveRegion(null)}
        />
      )}

      {/* Findings list */}
      {currentFindings.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs text-gray-500 font-semibold uppercase">PS Findings ({selectedEye})</h4>
          {currentFindings.map((f) => (
            <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-800">{f.generatedText}</span>
              <div className="flex gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => copyToFellowEye(f.key, f.id)}
                  className="text-blue-600 text-xs min-h-[44px] px-2"
                  title="Copy to fellow eye"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => removeFinding(f.key, f.id)}
                  className="text-red-500 text-xs min-h-[44px] px-2"
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
