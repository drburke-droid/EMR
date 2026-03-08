import { useState } from "react";
import { chiefComplaints, symptomQualifiers, historyBlocks } from "../../data/symptoms";
import { useEncounterStore } from "../../store/encounterStore";
import Chip from "../ui/Chip";

export default function SymptomEntry() {
  const {
    chiefComplaint, setChiefComplaint,
    symptoms, addSymptom, updateSymptom, removeSymptom,
    historyBlocks: selectedHistory, toggleHistoryBlock,
  } = useEncounterStore();

  const [expandedSx, setExpandedSx] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Chief Complaint */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Chief Complaint</h3>
        <div className="flex flex-wrap gap-2">
          {chiefComplaints.map((cc) => (
            <Chip
              key={cc}
              label={cc}
              selected={chiefComplaint === cc}
              onTap={() => setChiefComplaint(chiefComplaint === cc ? "" : cc)}
            />
          ))}
        </div>
      </section>

      {/* Symptoms */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Symptoms</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {chiefComplaints.map((sx) => {
            const exists = symptoms.find((s) => s.symptom === sx);
            return (
              <Chip
                key={sx}
                label={sx}
                selected={!!exists}
                onTap={() => {
                  if (exists) {
                    removeSymptom(exists.id);
                  } else {
                    addSymptom(sx);
                  }
                }}
              />
            );
          })}
        </div>

        {/* Symptom qualifier editing */}
        {symptoms.map((sx) => (
          <div
            key={sx.id}
            className="bg-gray-50 rounded-lg p-3 mb-2 border border-gray-200"
          >
            <button
              type="button"
              className="w-full flex items-center justify-between min-h-[44px]"
              onClick={() => setExpandedSx(expandedSx === sx.id ? null : sx.id)}
            >
              <span className="font-medium text-gray-800">{sx.symptom}</span>
              <div className="flex items-center gap-2">
                {sx.severity && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{sx.severity}</span>}
                <span className="text-gray-400">{expandedSx === sx.id ? "▲" : "▼"}</span>
              </div>
            </button>

            {expandedSx === sx.id && (
              <div className="mt-3 space-y-3">
                {/* Severity */}
                <div>
                  <label className="text-xs text-gray-500 font-medium">Severity</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {symptomQualifiers.severity.map((sev) => (
                      <Chip
                        key={sev}
                        label={sev}
                        selected={sx.severity === sev}
                        onTap={() => updateSymptom(sx.id, { severity: sx.severity === sev ? undefined : sev })}
                      />
                    ))}
                  </div>
                </div>
                {/* Onset */}
                <div>
                  <label className="text-xs text-gray-500 font-medium">Onset</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {symptomQualifiers.onset.map((o) => (
                      <Chip
                        key={o}
                        label={o}
                        selected={sx.onset === o}
                        onTap={() => updateSymptom(sx.id, { onset: sx.onset === o ? undefined : o })}
                      />
                    ))}
                  </div>
                </div>
                {/* Triggers */}
                <div>
                  <label className="text-xs text-gray-500 font-medium">Triggers</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {symptomQualifiers.triggers.map((t) => (
                      <Chip
                        key={t}
                        label={t}
                        selected={sx.triggers.includes(t)}
                        onTap={() =>
                          updateSymptom(sx.id, {
                            triggers: sx.triggers.includes(t)
                              ? sx.triggers.filter((x) => x !== t)
                              : [...sx.triggers, t],
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
                {/* Relief */}
                <div>
                  <label className="text-xs text-gray-500 font-medium">Relief</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {symptomQualifiers.relief.map((r) => (
                      <Chip
                        key={r}
                        label={r}
                        selected={sx.relief.includes(r)}
                        onTap={() =>
                          updateSymptom(sx.id, {
                            relief: sx.relief.includes(r)
                              ? sx.relief.filter((x) => x !== r)
                              : [...sx.relief, r],
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeSymptom(sx.id)}
                  className="text-red-600 text-sm font-medium min-h-[44px]"
                >
                  Remove symptom
                </button>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* History */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">History</h3>
        <div className="flex flex-wrap gap-2">
          {historyBlocks.map((hb) => (
            <Chip
              key={hb}
              label={hb}
              selected={selectedHistory.includes(hb)}
              onTap={() => toggleHistoryBlock(hb)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
