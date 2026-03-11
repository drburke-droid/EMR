import { useState, useMemo, useCallback } from "react";
import { useEncounterStore } from "../../store/encounterStore";
import { buildNote } from "../../utils/noteBuilder";
import { getMissingSuggestions, type MissingSuggestion } from "../../utils/reverseFlow";
import {
  parseInteractivePrompt,
  getDefaultActions,
  type PromptSegment,
  type QualifierGroup,
} from "../../data/promptActions";

// ── Per-suggestion interactive state ──────────────────────────
type SuggestionInteraction = {
  /** Which category keyword is currently expanded (null = none) */
  expandedCategory: string | null;
  /** Qualifier selections keyed by category */
  selections: Record<string, string>;
};

// Status/action words that are NOT clinical qualifiers
const NON_QUALIFIER_TERMS = new Set([
  "present", "absent", "everted", "not everted", "normal",
]);

export default function LiveNote() {
  const state = useEncounterStore();
  const [copied, setCopied] = useState(false);
  /** Track interaction state per suggestion index */
  const [interactions, setInteractions] = useState<Record<number, SuggestionInteraction>>({});
  /** Dismissed suggestion indices */
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const noteText = buildNote(state);

  const suggestions = useMemo(() => {
    if (state.selectedDiagnoses.length === 0) return [];
    const symptomLabels = state.symptoms.map((s) => s.symptom);
    return getMissingSuggestions(state.selectedDiagnoses, state.findings, symptomLabels);
  }, [state.selectedDiagnoses, state.findings, state.symptoms]);

  // Reset interactions and dismissals when suggestions change
  useMemo(() => {
    setInteractions({});
    setDismissed(new Set());
  }, [suggestions]);

  const getInteraction = useCallback((idx: number): SuggestionInteraction => {
    return interactions[idx] ?? { expandedCategory: null, selections: {} };
  }, [interactions]);

  function toggleCategory(idx: number, category: string) {
    setInteractions((prev) => {
      const cur = prev[idx] ?? { expandedCategory: null, selections: {} };
      return {
        ...prev,
        [idx]: {
          ...cur,
          expandedCategory: cur.expandedCategory === category ? null : category,
        },
      };
    });
  }

  function selectOption(idx: number, category: string, option: string) {
    setInteractions((prev) => {
      const cur = prev[idx] ?? { expandedCategory: null, selections: {} };
      const currentVal = cur.selections[category];
      return {
        ...prev,
        [idx]: {
          ...cur,
          selections: {
            ...cur.selections,
            [category]: currentVal === option ? "" : option,
          },
          expandedCategory: null,
        },
      };
    });
  }

  /** Unified add handler — handles findings, symptoms, and dismissals */
  function handleAdd(s: MissingSuggestion, idx: number) {
    const inter = getInteraction(idx);
    const selectedVals = Object.values(inter.selections).filter(Boolean);

    // Check for negative/dismiss selections
    const hasNegative = selectedVals.some((v) => {
      const l = v.toLowerCase();
      return l.includes("denies") || l === "absent" || l.startsWith("not ");
    });

    if (hasNegative) {
      setDismissed((prev) => new Set(prev).add(idx));
      return;
    }

    if (s.type === "symptom") {
      if (s.symptom) state.addSymptom(s.symptom);
      return;
    }

    if (!s.region || !s.finding) return;
    // Only pass actual clinical qualifiers — filter out status/action words
    const qualifiers = selectedVals.filter(
      (v) => !NON_QUALIFIER_TERMS.has(v.toLowerCase()) && !v.toLowerCase().includes("admits"),
    );
    state.addFinding("OD", s.region, s.finding, qualifiers);
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

      {/* Reverse flow suggestions — interactive prompts */}
      {suggestions.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
            May be missing
          </h4>
          <div className="max-h-[260px] overflow-y-auto space-y-1">
            {suggestions.map((s, i) => {
              if (dismissed.has(i)) return null;

              const parsed = parseInteractivePrompt(s.prompt, s.qualifiers);
              const inter = getInteraction(i);
              const hasSelections = Object.values(inter.selections).some(Boolean);

              // Determine if qualifier parsing produced interactive elements
              const hasQualifierActions =
                parsed.segments.some((seg) => seg.type === "action") ||
                parsed.extraGroups.length > 0;

              // Fall back to default actions if no qualifier-driven interactivity
              const defaultGroups = hasQualifierActions
                ? []
                : getDefaultActions(s.prompt, s.type, s.symptom);
              const allExtraGroups = [...parsed.extraGroups, ...defaultGroups];

              return (
                <div
                  key={`${s.type}-${s.finding ?? s.symptom}-${i}`}
                  className={`w-full text-left px-3 py-2 rounded-lg border
                    text-xs font-medium transition-all duration-150
                    ${priorityColor[s.priority]}`}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot[s.priority]}`} />
                    <span className="flex-1 leading-relaxed">
                      <InteractivePrompt
                        segments={parsed.segments}
                        interaction={inter}
                        onToggle={(cat) => toggleCategory(i, cat)}
                      />
                      {/* Extra + default groups as inline chips */}
                      {allExtraGroups.map((g) => (
                        <ActionKeyword
                          key={g.category}
                          keyword={g.category}
                          selected={inter.selections[g.category]}
                          isExpanded={inter.expandedCategory === g.category}
                          onToggle={() => toggleCategory(i, g.category)}
                        />
                      ))}
                      <span className="text-[10px] opacity-60 ml-1.5">
                        ({s.diagnosisLabel})
                      </span>
                      {s.source === "nlp" && (
                        <span className="text-[9px] ml-1 px-1 py-0.5 rounded bg-indigo-100 text-indigo-500 font-semibold">
                          NLP
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAdd(s, i)}
                      className={`text-[10px] shrink-0 uppercase px-2 py-1 rounded font-bold transition-colors
                        ${hasSelections
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "opacity-50 hover:opacity-80"
                        }`}
                    >
                      + add
                    </button>
                  </div>

                  {/* Expanded option chips */}
                  {inter.expandedCategory && (
                    <OptionChips
                      inter={inter}
                      segments={parsed.segments}
                      extraGroups={allExtraGroups}
                      onSelect={(cat, opt) => selectOption(i, cat, opt)}
                    />
                  )}

                  {/* Selected qualifiers summary */}
                  {hasSelections && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(inter.selections)
                        .filter(([, v]) => v)
                        .map(([cat, val]) => (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-semibold"
                          >
                            {val}
                            <button
                              type="button"
                              onClick={() => selectOption(i, cat, val)}
                              className="ml-0.5 opacity-60 hover:opacity-100"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
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

// ── Sub-components ────────────────────────────────────────────

/** Renders a single keyword as a tappable underlined element */
function ActionKeyword({
  keyword,
  selected,
  isExpanded,
  onToggle,
}: {
  keyword: string;
  selected?: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`inline-flex items-center mx-0.5 px-1 py-0 rounded
        border-b-2 transition-colors cursor-pointer
        ${isExpanded
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : selected
            ? "border-blue-400 text-blue-700"
            : "border-dashed border-gray-400 hover:border-blue-400 hover:text-blue-600"
        }
        font-semibold text-xs`}
    >
      {selected || keyword}
      <span className="ml-0.5 text-[8px] opacity-50">▾</span>
    </button>
  );
}

/** Renders the prompt text with interactive keywords inline */
function InteractivePrompt({
  segments,
  interaction,
  onToggle,
}: {
  segments: PromptSegment[];
  interaction: SuggestionInteraction;
  onToggle: (category: string) => void;
}) {
  return (
    <>
      {segments.map((seg, j) => {
        if (seg.type === "text") {
          return <span key={j}>{seg.content}</span>;
        }
        return (
          <ActionKeyword
            key={j}
            keyword={seg.keyword}
            selected={interaction.selections[seg.category]}
            isExpanded={interaction.expandedCategory === seg.category}
            onToggle={() => onToggle(seg.category)}
          />
        );
      })}
    </>
  );
}

/** Shows option chips for the currently expanded category */
function OptionChips({
  inter,
  segments,
  extraGroups,
  onSelect,
}: {
  inter: SuggestionInteraction;
  segments: PromptSegment[];
  extraGroups: QualifierGroup[];
  onSelect: (category: string, option: string) => void;
}) {
  const cat = inter.expandedCategory;
  if (!cat) return null;

  // Find options from segments or extra groups
  let options: string[] = [];
  for (const seg of segments) {
    if (seg.type === "action" && seg.category === cat) {
      options = seg.options;
      break;
    }
  }
  if (options.length === 0) {
    const g = extraGroups.find((g) => g.category === cat);
    if (g) options = g.options;
  }
  if (options.length === 0) return null;

  const selected = inter.selections[cat];

  return (
    <div className="mt-1.5 flex flex-wrap gap-1 pl-4">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(cat, opt)}
          className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-colors min-h-[28px]
            ${selected === opt
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white border border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600"
            }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
