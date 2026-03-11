// clinicalInference.ts — Forward flow engine
// Given current encounter state (symptoms, findings), scores diagnoses
// and reorders findings/qualifiers by clinical relevance.
// Enhanced with NLP co-occurrence data from ophthalmology textbooks.

import { diagnosisMap, type DiagnosisMapping } from "../data/diagnosis_map";
import { diagnoses } from "../data/diagnoses";
import { type FindingEntry } from "../store/encounterStore";
import {
  getNlpEngine,
  getNlpChainPredictions,
  getNlpAssociations,
  extractEncounterTerms,
  type ChainSuggestion,
} from "./nlpEngine";

export type ScoredDiagnosis = {
  id: string;
  score: number;
  nlpConfidence: number; // NLP-derived confidence boost
  matchedFindings: string[]; // which findings triggered this
  matchedSymptoms: string[]; // which symptoms triggered this
  nlpSupportedBy: string[]; // NLP term pairs that support this
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

/** Get diagnosis label from ID. */
function getDiagnosisLabel(id: string): string {
  const dx = diagnoses.find((d) => d.id === id);
  return dx?.label ?? id.replace(/_/g, " ");
}

/** Fuzzy-match an NLP term to a diagnosis label/id. Returns confidence or 0. */
function matchNlpToDiagnosis(
  nlpTerm: string,
  diagId: string,
  diagLabel: string,
): number {
  const term = nlpTerm.toLowerCase();
  const label = diagLabel.toLowerCase();
  const id = diagId.toLowerCase().replace(/_/g, " ");

  if (term === label || term === id) return 1.0;
  if (label.includes(term) || term.includes(label)) return 0.8;
  if (id.includes(term) || term.includes(id)) return 0.7;
  return 0;
}

// ── Score diagnoses ────────────────────────────────────────────────

/**
 * Score all diagnoses based on current encounter findings and symptoms.
 * Returns sorted array, highest score first.
 *
 * Scoring:
 *  - Each matching `triggered_by` entry adds its weight (default 1).
 *  - Each matching `expected_symptoms` entry adds 0.5.
 *  - NLP chain predictions add a confidence boost (scaled by 0.3).
 *  - As more findings/symptoms are selected, NLP confidence grows,
 *    making the system increasingly confident in its suggestions.
 */
export function scoreDiagnoses(
  findings: Record<string, FindingEntry[]>,
  symptoms: string[],
): ScoredDiagnosis[] {
  const presentFindings = collectFindingPairs(findings);
  const symptomSet = new Set(symptoms.map((s) => s.toLowerCase()));

  // Collect all clinical terms from the encounter for NLP querying
  const encounterTerms: string[] = [];
  for (const entries of Object.values(findings)) {
    for (const e of entries) {
      encounterTerms.push(e.finding.toLowerCase());
    }
  }
  for (const s of symptoms) {
    encounterTerms.push(s.toLowerCase());
  }
  const uniqueTerms = [...new Set(encounterTerms)];

  // Get NLP chain predictions (conditions predicted by term co-occurrence)
  const nlpPredictions = uniqueTerms.length >= 1
    ? getNlpChainPredictions(uniqueTerms, { limit: 40 })
    : [];

  const results: ScoredDiagnosis[] = [];

  for (const [diagId, mapping] of Object.entries(diagnosisMap)) {
    let score = 0;
    let nlpConfidence = 0;
    const matchedFindings: string[] = [];
    const matchedSymptoms: string[] = [];
    const nlpSupportedBy: string[] = [];

    // Check triggered_by findings (existing logic)
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

    // Check expected_symptoms (existing logic)
    for (const es of mapping.expected_symptoms) {
      if (symptomSet.has(es.symptom.toLowerCase())) {
        score += 0.5;
        if (!matchedSymptoms.includes(es.symptom)) {
          matchedSymptoms.push(es.symptom);
        }
      }
    }

    // NLP boost: check if any chain predictions match this diagnosis
    const diagLabel = getDiagnosisLabel(diagId);
    for (const pred of nlpPredictions) {
      const matchScore = matchNlpToDiagnosis(pred.term, diagId, diagLabel);
      if (matchScore > 0) {
        nlpConfidence += pred.confidence * matchScore;
        nlpSupportedBy.push(...pred.supportedBy);
      }
    }

    // Also check single-term NLP associations for each encounter term
    // This catches associations even when there's only one finding selected
    if (uniqueTerms.length === 1 && score === 0) {
      const singleSuggestions = getNlpAssociations(uniqueTerms[0], {
        category: "condition",
        limit: 20,
      });
      for (const s of singleSuggestions) {
        const matchScore = matchNlpToDiagnosis(s.term, diagId, diagLabel);
        if (matchScore > 0) {
          nlpConfidence += s.strength * matchScore * 0.3;
          nlpSupportedBy.push(uniqueTerms[0]);
        }
      }
    }

    // Combined score: diagnosis_map score + scaled NLP confidence
    // NLP acts as a boost, not a replacement — scale by 0.3 so
    // curated diagnosis_map entries still dominate
    const combinedScore = score + nlpConfidence * 0.3;

    if (combinedScore > 0) {
      results.push({
        id: diagId,
        score: combinedScore,
        nlpConfidence,
        matchedFindings,
        matchedSymptoms,
        nlpSupportedBy: [...new Set(nlpSupportedBy)],
      });
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
 *
 * Enhanced with NLP: findings that co-occur with current
 * symptoms/findings in textbook data get boosted.
 * The more context entered, the smarter the ordering.
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

  // Boost findings expected by currently-scored diagnoses
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

  // NLP boost: query the association engine with current encounter terms
  const nlpBoostedFindings = new Map<string, number>();
  const engine = getNlpEngine();
  if (engine) {
    // Collect all current encounter term labels
    const encounterTerms: string[] = [];
    for (const entries of Object.values(currentFindings)) {
      for (const e of entries) {
        encounterTerms.push(e.finding.toLowerCase());
      }
    }
    for (const s of currentSymptoms) {
      encounterTerms.push(s.toLowerCase());
    }
    const uniqueTerms = [...new Set(encounterTerms)];

    if (uniqueTerms.length > 0) {
      // Get NLP predictions from current context
      const predictions = uniqueTerms.length >= 2
        ? engine.suggestFromChain(uniqueTerms, { limit: 30 })
        : engine.suggest(uniqueTerms[0], { limit: 30 }).map((s) => ({
            term: s.term,
            confidence: s.strength,
            supportedBy: [uniqueTerms[0]],
          }));

      // Match predicted terms against available finding labels
      for (const pred of predictions) {
        const predLower = pred.term.toLowerCase();
        for (const label of originalLabels) {
          const labelLower = label.toLowerCase();
          if (
            predLower === labelLower ||
            predLower.includes(labelLower) ||
            labelLower.includes(predLower)
          ) {
            const prev = nlpBoostedFindings.get(labelLower) ?? 0;
            nlpBoostedFindings.set(labelLower, prev + pred.confidence);
          }
        }
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

    // NLP co-occurrence boost (scaled to not overwhelm curated data)
    const nlpScore = nlpBoostedFindings.get(label.toLowerCase()) ?? 0;
    if (nlpScore > 0) {
      relevance += Math.min(nlpScore * 0.5, 4); // Cap at 4 points
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
