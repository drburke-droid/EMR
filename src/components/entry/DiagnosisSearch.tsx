import { useState } from "react";
import { diagnoses, diagnosisCategoryLabels, type DiagnosisCategory } from "../../data/diagnoses";
import { useEncounterStore } from "../../store/encounterStore";
import Chip from "../ui/Chip";

export default function DiagnosisSearch() {
  const [search, setSearch] = useState("");
  const { selectedDiagnoses, addDiagnosis, removeDiagnosis } = useEncounterStore();

  const filtered = search.trim()
    ? diagnoses.filter((d) => d.label.toLowerCase().includes(search.toLowerCase()))
    : diagnoses;

  const grouped = filtered.reduce<Record<DiagnosisCategory, typeof diagnoses>>((acc, d) => {
    (acc[d.category] ||= []).push(d);
    return acc;
  }, {} as Record<DiagnosisCategory, typeof diagnoses>);

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

      {/* Grouped list */}
      {(Object.entries(grouped) as [DiagnosisCategory, typeof diagnoses][]).map(([cat, dxList]) => (
        <div key={cat}>
          <h4 className="text-xs text-gray-500 font-semibold uppercase mb-1">
            {diagnosisCategoryLabels[cat]}
          </h4>
          <div className="flex flex-wrap gap-2">
            {dxList.map((dx) => (
              <Chip
                key={dx.id}
                label={dx.label}
                selected={selectedDiagnoses.includes(dx.id)}
                onTap={() =>
                  selectedDiagnoses.includes(dx.id) ? removeDiagnosis(dx.id) : addDiagnosis(dx.id)
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
