// clinicalInference.ts — Forward flow engine
// Given current encounter state (symptoms, findings), scores diagnoses
// and reorders findings/qualifiers by clinical relevance.

import { diagnosisMap, type DiagnosisMapping } from "../data/diagnosis_map";
import { type FindingEntry } from "../store/encounterStore";

export type ScoredDiagnosis = {
  id: string;
  score: number;
  matchedFindings: string[]; // which findings triggered this
  matchedSymptoms: string[]; // which symptoms triggered this
};

// ── Helpers ────────────────────────────────────────────────────────

/** Collect every (region, finding) pair present in the encounter. */
function collectFindingPairs(
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

/** Build a composite key for a trigger finding. */
function triggerKey(region: string, finding: string): string {
  return `${region}::${finding}`;
}

// ── Score diagnoses ────────────────────────────────────────────────

/**
 * Score all diagnoses based on current encounter findings and symptoms.
 * Returns sorted array, highest score first.
 *
 * Scoring:
 *  - Each matching `triggered_by` entry adds its weight (default 1).
 *  - Each matching `expected_symptoms` entry adds 0.5.
 *  - Diagnoses with score 0 are filtered out.
 */
export function scoreDiagnoses(
  findings: Record<string, FindingEntry[]>,
  symptoms: string[],
): ScoredDiagnosis[] {
  const presentFindings = collectFindingPairs(findings);
  const symptomSet = new Set(symptoms.map((s) => s.toLowerCase()));

  const results: ScoredDiagnosis[] = [];

  for (const [diagId, mapping] of Object.entries(diagnosisMap)) {
    let score = 0;
    const matchedFindings: string[] = [];
    const matchedSymptoms: string[] = [];

    // Check triggered_by findings
    for (const trigger of mapping.triggered_by) {
      const key = triggerKey(trigger.region, trigger.finding);
      if (presentFindings.has(key)) {
        score += trigger.weight ?? 1;
        const label = `${trigger.region}/${trigger.finding}`;
        if (!matchedFindings.includes(label)) {
          matchedFindings.push(label);
        }
      }
    }

    // Check expected_symptoms
    for (const es of mapping.expected_symptoms) {
      if (symptomSet.has(es.symptom.toLowerCase())) {
        score += 0.5;
        if (!matchedSymptoms.includes(es.symptom)) {
          matchedSymptoms.push(es.symptom);
        }
      }
    }

    if (score > 0) {
      results.push({ id: diagId, score, matchedFindings, matchedSymptoms });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

// ── Rank findings for a region ─────────────────────────────────────

/**
 * Symptom-to-finding boost map.
 * When a symptom is selected, findings listed here get a relevance boost.
 */
const symptomFindingBoosts: Record<string, string[]> = {
  dryness: ["SPK", "reduced TBUT", "MGD", "oily layer poor", "LWE", "lid wiper epitheliopathy"],
  irritation: ["SPK", "blepharitis", "MGD", "collarettes", "scurf", "telangiectasia"],
  itching: ["papillae", "follicles", "chemosis", "hyperemia"],
  "red eye": ["hyperemia", "injection", "chemosis", "SCH", "ciliary flush"],
  "fb sensation": ["SPK", "foreign body", "corneal abrasion", "trichiasis", "concretion"],
  tearing: ["SPK", "reduced TBUT", "punctal stenosis", "entropion", "trichiasis"],
  pain: ["ulcer", "infiltrate", "ciliary flush", "cell", "flare", "abrasion"],
  photophobia: ["cell", "flare", "ciliary flush", "SPK", "ulcer"],
  discharge: ["papillae", "follicles", "mucopurulent", "purulent"],
  floaters: ["PVD", "syneresis", "cells", "heme", "Weiss ring"],
  flashes: ["PVD", "tear", "hole", "lattice", "detachment"],
  blur: ["edema", "haze", "cataract", "ERM", "macular edema"],
  "computer discomfort": ["SPK", "reduced TBUT", "MGD", "oily layer poor"],
};

/**
 * Given a region and the current encounter context,
 * return finding labels reordered by clinical relevance.
 * Findings that match more diagnosis triggers are ranked higher.
 * Original order is preserved as tiebreaker.
 */
export function rankFindingsForRegion(
  regionId: string,
  originalLabels: string[],
  currentSymptoms: string[],
  currentFindings: Record<string, FindingEntry[]>,
): string[] {
  // Count how many diagnoses each finding would help trigger for this region
  const diagnosisHitCount = new Map<string, number>();

  for (const mapping of Object.values(diagnosisMap)) {
    for (const trigger of mapping.triggered_by) {
      if (trigger.region === regionId) {
        const prev = diagnosisHitCount.get(trigger.finding) ?? 0;
        diagnosisHitCount.set(trigger.finding, prev + (trigger.weight ?? 1));
      }
    }
  }

  // Build a set of boosted finding names based on current symptoms
  const boostedFindings = new Set<string>();
  for (const symptom of currentSymptoms) {
    const boosts = symptomFindingBoosts[symptom.toLowerCase()];
    if (boosts) {
      for (const b of boosts) {
        boostedFindings.add(b.toLowerCase());
      }
    }
  }

  // Also boost findings that are expected by currently-scored diagnoses
  const scored = scoreDiagnoses(currentFindings, currentSymptoms);
  const topDiagIds = scored.slice(0, 5).map((s) => s.id);
  const expectedForTopDiags = new Set<string>();
  for (const diagId of topDiagIds) {
    const mapping = diagnosisMap[diagId];
    if (!mapping) continue;
    for (const ef of mapping.expected_findings) {
      if (ef.region === regionId) {
        expectedForTopDiags.add(ef.finding.toLowerCase());
      }
    }
  }

  // Score each label
  const scored_labels = originalLabels.map((label, idx) => {
    let relevance = 0;

    // Points from diagnosis trigger count
    relevance += diagnosisHitCount.get(label) ?? 0;

    // Boost from symptom alignment
    if (boostedFindings.has(label.toLowerCase())) {
      relevance += 2;
    }

    // Boost from expected findings of top-scored diagnoses
    if (expectedForTopDiags.has(label.toLowerCase())) {
      relevance += 3;
    }

    return { label, relevance, originalIndex: idx };
  });

  // Sort: higher relevance first, original order as tiebreaker
  scored_labels.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    return a.originalIndex - b.originalIndex;
  });

  return scored_labels.map((s) => s.label);
}
