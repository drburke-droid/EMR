// reverseFlow.ts — Reverse flow engine
// When a diagnosis is selected, identifies missing expected findings and symptoms.

import { diagnosisMap } from "../data/diagnosis_map";
import { diagnoses } from "../data/diagnoses";
import { type FindingEntry } from "../store/encounterStore";

export type MissingSuggestion = {
  type: "finding" | "symptom";
  diagnosisId: string;
  diagnosisLabel: string;
  region?: string;
  finding?: string;
  qualifiers?: string[];
  symptom?: string;
  priority: "high" | "medium" | "low";
  prompt: string;
};

// ── Helpers ────────────────────────────────────────────────────────

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Look up a diagnosis label by id from the flat diagnoses list. */
function getDiagnosisLabel(id: string): string {
  const dx = diagnoses.find((d) => d.id === id);
  return dx?.label ?? id;
}

/** Collect all (region, finding) pairs present in the encounter. */
function collectPresentFindings(
  findings: Record<string, FindingEntry[]>,
): Set<string> {
  const set = new Set<string>();
  for (const entries of Object.values(findings)) {
    for (const e of entries) {
      set.add(`${e.region}::${e.finding}`);
    }
  }
  return set;
}

// ── Main function ──────────────────────────────────────────────────

/**
 * Given selected diagnoses and current encounter state,
 * return suggestions for missing findings and symptoms.
 * Only returns items NOT already present in the encounter.
 *
 * Logic:
 *  - For each selected diagnosis, look up expected_findings and expected_symptoms.
 *  - Check if each expected item is already present.
 *  - If not present, add to suggestions.
 *  - Deduplicate: same finding from multiple diagnoses keeps highest priority.
 *  - Sort by priority (high first), then by diagnosis order.
 */
export function getMissingSuggestions(
  selectedDiagnoses: string[],
  findings: Record<string, FindingEntry[]>,
  symptoms: string[],
): MissingSuggestion[] {
  const presentFindings = collectPresentFindings(findings);
  const symptomSet = new Set(symptoms.map((s) => s.toLowerCase()));

  // Use a map keyed by a dedup key to keep only highest-priority entry
  const dedupMap = new Map<string, MissingSuggestion>();

  for (let diagIdx = 0; diagIdx < selectedDiagnoses.length; diagIdx++) {
    const diagId = selectedDiagnoses[diagIdx];
    const mapping = diagnosisMap[diagId];
    if (!mapping) continue;

    const diagLabel = getDiagnosisLabel(diagId);

    // Check expected findings
    for (const ef of mapping.expected_findings) {
      const findingKey = `${ef.region}::${ef.finding}`;
      if (presentFindings.has(findingKey)) continue;

      const dedupKey = `finding::${findingKey}`;
      const existing = dedupMap.get(dedupKey);

      const suggestion: MissingSuggestion = {
        type: "finding",
        diagnosisId: diagId,
        diagnosisLabel: diagLabel,
        region: ef.region,
        finding: ef.finding,
        qualifiers: ef.qualifiers,
        priority: ef.priority,
        prompt: ef.prompt,
      };

      // Keep the highest priority (or first seen if same priority)
      if (
        !existing ||
        priorityOrder[suggestion.priority] < priorityOrder[existing.priority]
      ) {
        dedupMap.set(dedupKey, suggestion);
      }
    }

    // Check expected symptoms
    for (const es of mapping.expected_symptoms) {
      if (symptomSet.has(es.symptom.toLowerCase())) continue;

      const dedupKey = `symptom::${es.symptom.toLowerCase()}`;
      const existing = dedupMap.get(dedupKey);

      const suggestion: MissingSuggestion = {
        type: "symptom",
        diagnosisId: diagId,
        diagnosisLabel: diagLabel,
        symptom: es.symptom,
        priority: es.priority,
        prompt: `Ask about ${es.symptom.toLowerCase()}`,
      };

      if (
        !existing ||
        priorityOrder[suggestion.priority] < priorityOrder[existing.priority]
      ) {
        dedupMap.set(dedupKey, suggestion);
      }
    }
  }

  // Collect and sort: priority first, then by diagnosis order in selectedDiagnoses
  const results = Array.from(dedupMap.values());

  results.sort((a, b) => {
    // Primary: priority
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;

    // Secondary: diagnosis order (earlier-selected diagnoses first)
    const aIdx = selectedDiagnoses.indexOf(a.diagnosisId);
    const bIdx = selectedDiagnoses.indexOf(b.diagnosisId);
    return aIdx - bIdx;
  });

  return results;
}
