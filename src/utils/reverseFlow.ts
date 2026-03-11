// reverseFlow.ts — Reverse flow engine
// When a diagnosis is selected, identifies missing expected findings and symptoms.
// Enhanced with NLP: adds textbook-derived associations beyond the curated map.

import { diagnosisMap } from "../data/diagnosis_map";
import { diagnoses } from "../data/diagnoses";
import { type FindingEntry } from "../store/encounterStore";
import {
  getNlpAssociations,
  getNlpChainPredictions,
  type Suggestion,
} from "./nlpEngine";

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
  /** Source: "curated" from diagnosis_map, "nlp" from textbook data */
  source: "curated" | "nlp";
  /** NLP confidence score (only for nlp-sourced suggestions) */
  nlpConfidence?: number;
};

// ── Helpers ────────────────────────────────────────────────────────

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

// ── NLP condition filter ─────────────────────────────────────────

// Build lowercase set of known diagnosis labels for NLP cross-referencing
const diagLabelSet = new Set(diagnoses.map((d) => d.label.toLowerCase()));

// Common lay terms / synonyms that the NLP data may miscategorise as signs
const NLP_EXCLUDE_TERMS = new Set([
  "stye", "sty",
]);

/**
 * Returns true if an NLP-suggested term should be excluded because it is
 * a condition name (not an actionable clinical finding or symptom).
 */
function shouldExcludeNlpTerm(
  term: string,
  selectedDiagLabel: string,
): boolean {
  const lower = term.toLowerCase();
  const diagLower = selectedDiagLabel.toLowerCase();

  // Too similar to the selected diagnosis
  if (lower === diagLower) return true;
  if (lower.length >= 4 && diagLower.includes(lower)) return true;
  if (diagLower.length >= 4 && lower.includes(diagLower)) return true;

  // Exact match against a known diagnosis label
  if (diagLabelSet.has(lower)) return true;

  // Known unhelpful terms
  if (NLP_EXCLUDE_TERMS.has(lower)) return true;

  return false;
}

function getDiagnosisLabel(id: string): string {
  const dx = diagnoses.find((d) => d.id === id);
  return dx?.label ?? id;
}

function collectPresentFindings(
  findings: Record<string, FindingEntry[]>,
): Set<string> {
  const set = new Set<string>();
  for (const entries of Object.values(findings)) {
    for (const e of entries) {
      set.add(`${e.region}::${e.finding}`);
      // Also track by finding name alone for NLP matching
      set.add(`finding::${e.finding.toLowerCase()}`);
    }
  }
  return set;
}

// ── Main function ──────────────────────────────────────────────────

/**
 * Given selected diagnoses and current encounter state,
 * return suggestions for missing findings and symptoms.
 *
 * Enhanced: After curated suggestions from diagnosis_map,
 * adds NLP-derived associations from textbook co-occurrence data.
 * NLP suggestions appear with lower priority ("medium" or "low")
 * and are marked with source: "nlp" so the UI can distinguish them.
 */
export function getMissingSuggestions(
  selectedDiagnoses: string[],
  findings: Record<string, FindingEntry[]>,
  symptoms: string[],
): MissingSuggestion[] {
  const presentFindings = collectPresentFindings(findings);
  const symptomSet = new Set(symptoms.map((s) => s.toLowerCase()));

  const dedupMap = new Map<string, MissingSuggestion>();

  // ── Phase 1: Curated suggestions from diagnosis_map ──────────

  for (let diagIdx = 0; diagIdx < selectedDiagnoses.length; diagIdx++) {
    const diagId = selectedDiagnoses[diagIdx];
    const mapping = diagnosisMap[diagId];
    if (!mapping) continue;

    const diagLabel = getDiagnosisLabel(diagId);

    // Expected findings
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
        source: "curated",
      };

      if (
        !existing ||
        priorityOrder[suggestion.priority] < priorityOrder[existing.priority]
      ) {
        dedupMap.set(dedupKey, suggestion);
      }
    }

    // Expected symptoms
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
        source: "curated",
      };

      if (
        !existing ||
        priorityOrder[suggestion.priority] < priorityOrder[existing.priority]
      ) {
        dedupMap.set(dedupKey, suggestion);
      }
    }
  }

  // ── Phase 2: NLP-augmented suggestions ───────────────────────
  // Query the NLP engine with diagnosis labels to find additional
  // associated signs/symptoms from textbook co-occurrence data.

  for (const diagId of selectedDiagnoses) {
    const diagLabel = getDiagnosisLabel(diagId);

    // Get NLP associations for this diagnosis
    const nlpSignSymptoms = getNlpAssociations(diagLabel.toLowerCase(), {
      category: "sign_symptom",
      limit: 10,
      minStrength: 5, // Only strong associations
    });

    for (const nlpSugg of nlpSignSymptoms) {
      const termLower = nlpSugg.term.toLowerCase();

      // Skip unhelpful condition terms (synonyms, known diagnoses, etc.)
      if (shouldExcludeNlpTerm(nlpSugg.term, diagLabel)) continue;

      // Skip if already in encounter (by finding name)
      if (presentFindings.has(`finding::${termLower}`)) continue;
      if (symptomSet.has(termLower)) continue;

      // Skip if already covered by a curated suggestion
      const existingCurated = Array.from(dedupMap.values()).some(
        (s) =>
          s.source === "curated" &&
          ((s.finding && s.finding.toLowerCase() === termLower) ||
            (s.symptom && s.symptom.toLowerCase() === termLower)),
      );
      if (existingCurated) continue;

      const dedupKey = `nlp::${termLower}`;
      if (dedupMap.has(dedupKey)) continue;

      // Classify as finding or symptom based on common symptom words
      const isSymptom = isLikelySymptom(termLower);

      const suggestion: MissingSuggestion = {
        type: isSymptom ? "symptom" : "finding",
        diagnosisId: diagId,
        diagnosisLabel: diagLabel,
        ...(isSymptom
          ? { symptom: nlpSugg.term }
          : { finding: nlpSugg.term }),
        priority: nlpSugg.strength >= 10 ? "medium" : "low",
        prompt: isSymptom
          ? `Ask about ${nlpSugg.term.toLowerCase()}`
          : `Check for ${nlpSugg.term.toLowerCase()}`,
        source: "nlp",
        nlpConfidence: nlpSugg.strength,
      };

      dedupMap.set(dedupKey, suggestion);
    }
  }

  // ── Phase 3: Chain-boosted NLP suggestions ───────────────────
  // When multiple diagnoses are selected, find signs/symptoms
  // that co-occur with multiple of the selected conditions.

  if (selectedDiagnoses.length >= 2) {
    const diagLabels = selectedDiagnoses.map((id) =>
      getDiagnosisLabel(id).toLowerCase(),
    );
    const chainPreds = getNlpChainPredictions(diagLabels, { limit: 15 });

    for (const pred of chainPreds) {
      const termLower = pred.term.toLowerCase();

      // Skip condition terms that wouldn't be actionable suggestions
      const anyDiagLabel = selectedDiagnoses
        .map((id) => getDiagnosisLabel(id))
        .find((label) => shouldExcludeNlpTerm(pred.term, label));
      if (anyDiagLabel) continue;

      if (presentFindings.has(`finding::${termLower}`)) continue;
      if (symptomSet.has(termLower)) continue;

      const dedupKey = `nlp::${termLower}`;
      const existing = dedupMap.get(dedupKey);

      // Chain predictions get boosted priority if confidence is high
      const priority =
        pred.confidence >= 8
          ? "medium"
          : "low";

      const isSymptom = isLikelySymptom(termLower);

      const suggestion: MissingSuggestion = {
        type: isSymptom ? "symptom" : "finding",
        diagnosisId: selectedDiagnoses[0],
        diagnosisLabel: `Multiple (${pred.supportedBy.length} pairs)`,
        ...(isSymptom
          ? { symptom: pred.term }
          : { finding: pred.term }),
        priority,
        prompt: isSymptom
          ? `Ask about ${pred.term.toLowerCase()}`
          : `Check for ${pred.term.toLowerCase()}`,
        source: "nlp",
        nlpConfidence: pred.confidence,
      };

      if (
        !existing ||
        (existing.source === "nlp" &&
          (existing.nlpConfidence ?? 0) < pred.confidence)
      ) {
        dedupMap.set(dedupKey, suggestion);
      }
    }
  }

  // ── Sort and return ──────────────────────────────────────────

  const results = Array.from(dedupMap.values());

  results.sort((a, b) => {
    // Curated always before NLP at same priority
    if (a.source !== b.source) {
      return a.source === "curated" ? -1 : 1;
    }
    // Primary: priority
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    // Secondary: NLP confidence (higher first)
    if (a.source === "nlp" && b.source === "nlp") {
      return (b.nlpConfidence ?? 0) - (a.nlpConfidence ?? 0);
    }
    // Tertiary: diagnosis order
    const aIdx = selectedDiagnoses.indexOf(a.diagnosisId);
    const bIdx = selectedDiagnoses.indexOf(b.diagnosisId);
    return aIdx - bIdx;
  });

  return results;
}

// ── Symptom classification helper ────────────────────────────────

const SYMPTOM_KEYWORDS = new Set([
  "pain", "ache", "burning", "itching", "tearing", "discharge",
  "redness", "swelling", "photophobia", "diplopia", "blur",
  "blurred vision", "floaters", "flashes", "halos", "dryness",
  "irritation", "foreign body sensation", "headache", "nausea",
  "fatigue", "discomfort", "sensitivity", "scotoma", "metamorphopsia",
  "distortion", "epiphora", "lacrimation", "grittiness",
]);

function isLikelySymptom(term: string): boolean {
  if (SYMPTOM_KEYWORDS.has(term)) return true;
  // Check if any keyword is a substring
  for (const kw of SYMPTOM_KEYWORDS) {
    if (term.includes(kw)) return true;
  }
  return false;
}
