import { useState, useMemo } from "react";
import { useEncounterStore } from "../../store/encounterStore";
import { buildNote } from "../../utils/noteBuilder";
import { getMissingSuggestions, type MissingSuggestion } from "../../utils/reverseFlow";

export default function LiveNote() {
  const state = useEncounterStore();
  const [copied, setCopied] = useState(false);

  const noteText = buildNote(state);

  const suggestions = useMemo(() => {
    if (state.selectedDiagnoses.length === 0) return [];
    const symptomLabels = state.symptoms.map((s) => s.symptom);
    return getMissingSuggestions(state.selectedDiagnoses, state.findings, symptomLabels);
  }, [state.selectedDiagnoses, state.findings, state.symptoms]);

  function handleAddFinding(s: MissingSuggestion) {
    if (s.type !== "finding" || !s.region || !s.finding) return;
    state.addFinding("OD", s.region, s.finding, s.qualifiers ?? []);
  }

  function handleAddSymptom(s: MissingSuggestion) {
    if (s.type !== "symptom" || !s.symptom) return;
    state.addSymptom(s.symptom);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(noteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = noteText;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const priorityColor = {
    high: "bg-red-50/80 border-red-200 text-red-800",
    medium: "bg-amber-50/80 border-amber-200 text-amber-800",
    low: "bg-gray-50/80 border-gray-200 text-gray-600",
  };

  const priorityDot = {
    high: "bg-red-400",
    medium: "bg-amber-400",
    low: "bg-gray-300",
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Live Note</h3>
        <button
          type="button"
          onClick={() => state.clearEncounter()}
          className="text-xs text-red-500 font-medium min-h-[44px] px-2"
        >
          Clear All
        </button>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed overflow-y-auto min-h-[200px] font-mono">
        {noteText || <span className="text-gray-300 italic">Note will appear here as you chart...</span>}
      </div>

      {/* Reverse flow suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
            May be missing
          </h4>
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {suggestions.map((s, i) => (
              <button
                key={`${s.type}-${s.finding ?? s.symptom}-${i}`}
                type="button"
                onClick={() => s.type === "finding" ? handleAddFinding(s) : handleAddSymptom(s)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg border
                  text-xs font-medium transition-all duration-150
                  hover:shadow-sm active:scale-[0.98] ${priorityColor[s.priority]}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot[s.priority]}`} />
                <span className="flex-1">
                  {s.prompt}
                  <span className="text-[10px] opacity-60 ml-1.5">
                    ({s.diagnosisLabel})
                  </span>
                  {s.source === "nlp" && (
                    <span className="text-[9px] ml-1 px-1 py-0.5 rounded bg-indigo-100 text-indigo-500 font-semibold">
                      NLP
                    </span>
                  )}
                </span>
                <span className="text-[10px] opacity-50 shrink-0 uppercase">
                  + add
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleCopy}
        disabled={!noteText}
        className={`mt-3 w-full py-3 rounded-lg text-sm font-bold min-h-[44px] transition-colors ${
          copied
            ? "bg-green-600 text-white"
            : noteText
              ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        {copied ? "Copied!" : "Copy to Clipboard"}
      </button>
    </div>
  );
}
