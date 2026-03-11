import { useState, useMemo } from "react";
import { diagnoses, diagnosisCategoryLabels, type DiagnosisCategory } from "../../data/diagnoses";
import { useEncounterStore } from "../../store/encounterStore";
import { scoreDiagnoses } from "../../utils/clinicalInference";
import Chip from "../ui/Chip";

export default function DiagnosisSearch() {
  const [search, setSearch] = useState("");
  const { selectedDiagnoses, addDiagnosis, removeDiagnosis } = useEncounterStore();
  const findings = useEncounterStore((s) => s.findings);
  const symptoms = useEncounterStore((s) => s.symptoms);

  // Score diagnoses based on current findings and symptoms
  const scored = useMemo(() => {
    const symptomLabels = symptoms.map((s) => s.symptom);
    return scoreDiagnoses(findings, symptomLabels);
  }, [findings, symptoms]);

  const suggestedIds = scored.map((s) => s.id);
  const scoreMap = new Map(scored.map((s) => [s.id, s]));

  const filtered = search.trim()
    ? diagnoses.filter((d) => d.label.toLowerCase().includes(search.toLowerCase()))
    : diagnoses;

  const grouped = filtered.reduce<Record<DiagnosisCategory, typeof diagnoses>>((acc, d) => {
    (acc[d.category] ||= []).push(d);
    return acc;
  }, {} as Record<DiagnosisCategory, typeof diagnoses>);

  // Suggested diagnoses (scored > 0, not yet selected)
  const suggested = scored
    .filter((s) => !selectedDiagnoses.includes(s.id))
    .slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Search diagnoses..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
      />

      {/* Selected */}
      {selectedDiagnoses.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs text-gray-500 font-semibold uppercase">Selected</h4>
          <div className="flex flex-wrap gap-2">
            {selectedDiagnoses.map((id) => {
              const dx = diagnoses.find((d) => d.id === id);
              return dx ? (
                <Chip
                  key={id}
                  label={dx.label}
                  selected
                  onTap={() => removeDiagnosis(id)}
                  onRemove={() => removeDiagnosis(id)}
                />
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Suggested — forward flow inference */}
      {suggested.length > 0 && !search.trim() && (
        <div className="space-y-1">
          <h4 className="text-xs text-amber-600 font-semibold uppercase">Suggested</h4>
          <div className="flex flex-wrap gap-2">
            {suggested.map((s) => {
              const dx = diagnoses.find((d) => d.id === s.id);
              if (!dx) return null;
              const matchParts = [
                ...s.matchedFindings.map((f) => f.split("/")[1]),
                ...s.matchedSymptoms,
              ].slice(0, 3);
              if (s.nlpConfidence > 0 && matchParts.length === 0) {
                matchParts.push("NLP");
              }
              const matchInfo = matchParts.join(", ");
              return (
                <Chip
                  key={dx.id}
                  label={`${dx.label}${matchInfo ? ` (${matchInfo})` : ""}`}
                  selected={false}
                  onTap={() => addDiagnosis(dx.id)}
                  className="border-amber-300/60 bg-amber-50/60"
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Grouped list */}
      {(Object.entries(grouped) as [DiagnosisCategory, typeof diagnoses][]).map(([cat, dxList]) => {
        // Sort: suggested diagnoses float to top within each category
        const sorted = [...dxList].sort((a, b) => {
          const aScore = scoreMap.get(a.id)?.score ?? 0;
          const bScore = scoreMap.get(b.id)?.score ?? 0;
          return bScore - aScore;
        });

        return (
          <div key={cat}>
            <h4 className="text-xs text-gray-500 font-semibold uppercase mb-1">
              {diagnosisCategoryLabels[cat]}
            </h4>
            <div className="flex flex-wrap gap-2">
              {sorted.map((dx) => {
                const isSuggested = suggestedIds.includes(dx.id) && !selectedDiagnoses.includes(dx.id);
                return (
                  <Chip
                    key={dx.id}
                    label={dx.label}
                    selected={selectedDiagnoses.includes(dx.id)}
                    onTap={() =>
                      selectedDiagnoses.includes(dx.id) ? removeDiagnosis(dx.id) : addDiagnosis(dx.id)
                    }
                    className={isSuggested ? "ring-1 ring-amber-400/50" : undefined}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
