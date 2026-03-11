import { chiefComplaints, historyBlocks } from "../../data/symptoms";
import { useEncounterStore } from "../../store/encounterStore";
import Chip from "../ui/Chip";
import SymptomRingSelector from "./SymptomRingSelector";

export default function SymptomEntry() {
  const {
    symptoms, addSymptomWithData, updateSymptom, removeSymptom,
    historyBlocks: selectedHistory, toggleHistoryBlock,
  } = useEncounterStore();

  return (
    <div className="space-y-6">
      {/* Symptoms — first selected becomes chief complaint */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Symptoms
          {symptoms.length > 0 && (
            <span className="ml-2 text-xs font-normal text-blue-500 normal-case tracking-normal">
              CC: {symptoms[0].symptom}
            </span>
          )}
        </h3>
        <div className="flex flex-wrap gap-3 mb-3">
          {chiefComplaints.map((sx) => {
            const entry = symptoms.find((s) => s.symptom === sx);
            return (
              <SymptomRingSelector
                key={sx}
                symptom={sx}
                isSelected={!!entry}
                existingData={entry}
                onComplete={(data) => {
                  if (entry) {
                    updateSymptom(entry.id, data);
                  } else {
                    addSymptomWithData(sx, data);
                  }
                }}
                onRemove={entry ? () => removeSymptom(entry.id) : undefined}
              />
            );
          })}
        </div>

        {/* Selected symptom summaries */}
        {symptoms.length > 0 && (
          <div className="space-y-1 mt-2">
            {symptoms.map((sx) => (
              <div
                key={sx.id}
                className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100"
              >
                <span className="font-semibold text-gray-800">{sx.symptom}</span>
                {sx.quantify && <span className="ml-1 text-blue-600 font-medium">{sx.quantify}</span>}
                {sx.frequency && <span className="ml-1">{sx.frequency}</span>}
                {sx.onset && <span className="ml-1">{sx.onset}</span>}
                {sx.location.length > 0 && (
                  <span className="ml-1">{sx.location.join(", ")}</span>
                )}
                {sx.duration && <span className="ml-1">{sx.duration}</span>}
                {sx.aggravating.length > 0 && (
                  <span className="ml-1 text-red-600">worse c {sx.aggravating.join(", ")}</span>
                )}
                {sx.relief.length > 0 && (
                  <span className="ml-1 text-green-600">better c {sx.relief.join(", ")}</span>
                )}
                {sx.association.length > 0 && (
                  <span className="ml-1 text-amber-600">assoc {sx.association.join(", ")}</span>
                )}
              </div>
            ))}
          </div>
        )}
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
