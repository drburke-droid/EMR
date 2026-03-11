// nlpEngine.ts — NLP-powered association engine singleton
// Wraps the OphthoAssociations class with lazy initialization.
// Provides helpers that bridge NLP term names → app region/finding IDs.

import type { FindingEntry } from "../store/encounterStore";

// ── Types ────────────────────────────────────────────────────

export type TermCategory = "sign_symptom" | "condition";

export interface Suggestion {
  term: string;
  category: TermCategory;
  strength: number;
}

export interface ChainSuggestion {
  term: string;
  confidence: number;
  supportedBy: string[];
}

interface RawTermEntry {
  cat: "s" | "c";
  freq: number;
  assoc: [string, number][];
  desc: string[];
}

interface RawData {
  terms: Record<string, RawTermEntry>;
  chains: Record<string, [string, number][]>;
}

// ── Engine class ─────────────────────────────────────────────

class OphthoAssociations {
  private terms: Record<string, RawTermEntry>;
  private chains: Record<string, [string, number][]>;
  private termList: string[];

  constructor(data: RawData) {
    this.terms = data.terms;
    this.chains = data.chains ?? {};
    this.termList = Object.keys(this.terms);
  }

  suggest(
    term: string,
    options: { limit?: number; category?: TermCategory; minStrength?: number } = {},
  ): Suggestion[] {
    const entry = this.terms[term.toLowerCase()];
    if (!entry) return [];

    let results: Suggestion[] = entry.assoc.map(([t, s]) => ({
      term: t,
      category: this.categoryOf(t),
      strength: s,
    }));

    if (options.category) {
      results = results.filter((r) => r.category === options.category);
    }
    if (options.minStrength) {
      results = results.filter((r) => r.strength >= options.minStrength);
    }

    return results.slice(0, options.limit ?? 15);
  }

  suggestFromChain(
    selectedTerms: string[],
    options: { limit?: number; excludeSelected?: boolean } = {},
  ): ChainSuggestion[] {
    const normalized = selectedTerms.map((t) => t.toLowerCase());
    const selectedSet = new Set(normalized);
    const excludeSelected = options.excludeSelected ?? true;

    const scores = new Map<string, { confidence: number; supporters: string[] }>();

    // Accumulate chain predictions from every pair
    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const t1 = normalized[i];
        const t2 = normalized[j];
        const key1 = `${t1} + ${t2}`;
        const key2 = `${t2} + ${t1}`;
        const preds = this.chains[key1] ?? this.chains[key2] ?? [];

        for (const [predTerm, conf] of preds) {
          if (excludeSelected && selectedSet.has(predTerm)) continue;
          const existing = scores.get(predTerm) ?? { confidence: 0, supporters: [] };
          existing.confidence += conf;
          existing.supporters.push(`${t1} + ${t2}`);
          scores.set(predTerm, existing);
        }
      }
    }

    // Fill in single-term associations for terms not yet covered
    for (const term of normalized) {
      const entry = this.terms[term];
      if (!entry) continue;
      for (const [assocTerm, strength] of entry.assoc) {
        if (excludeSelected && selectedSet.has(assocTerm)) continue;
        if (!scores.has(assocTerm)) {
          scores.set(assocTerm, { confidence: strength * 0.5, supporters: [term] });
        }
      }
    }

    const results: ChainSuggestion[] = Array.from(scores.entries())
      .map(([term, { confidence, supporters }]) => ({
        term,
        confidence: Math.round(confidence * 1000) / 1000,
        supportedBy: supporters,
      }))
      .sort((a, b) => b.confidence - a.confidence);

    return results.slice(0, options.limit ?? 20);
  }

  descriptors(term: string, limit = 10): string[] {
    const entry = this.terms[term.toLowerCase()];
    if (!entry) return [];
    return entry.desc.slice(0, limit);
  }

  search(query: string, limit = 20): { term: string; category: TermCategory; frequency: number }[] {
    const q = query.toLowerCase();
    return this.termList
      .filter((t) => t.includes(q))
      .sort((a, b) => this.terms[b].freq - this.terms[a].freq)
      .slice(0, limit)
      .map((t) => ({
        term: t,
        category: this.categoryOf(t),
        frequency: this.terms[t].freq,
      }));
  }

  categoryOf(term: string): TermCategory {
    const entry = this.terms[term.toLowerCase()];
    if (!entry) return "sign_symptom";
    return entry.cat === "c" ? "condition" : "sign_symptom";
  }

  hasTerm(term: string): boolean {
    return term.toLowerCase() in this.terms;
  }

  frequency(term: string): number {
    return this.terms[term.toLowerCase()]?.freq ?? 0;
  }
}

// ── Singleton ────────────────────────────────────────────────

let _engine: OphthoAssociations | null = null;
let _loading: Promise<void> | null = null;

export async function initNlpEngine(): Promise<void> {
  if (_engine) return;
  if (_loading) return _loading;
  _loading = (async () => {
    const data = await import("../data/ophtho_emr_data.json");
    _engine = new OphthoAssociations(data as unknown as RawData);
  })();
  return _loading;
}

export function getNlpEngine(): OphthoAssociations | null {
  return _engine;
}

// ── Bridge helpers ───────────────────────────────────────────
// Map between NLP term names (free text from textbooks) and
// the structured finding/region IDs used in the app.

/**
 * Extract all clinically meaningful terms from the encounter
 * for querying the NLP engine. Includes finding labels, symptoms,
 * and selected diagnosis labels.
 */
export function extractEncounterTerms(
  findings: Record<string, FindingEntry[]>,
  symptoms: string[],
  diagnosisLabels: string[],
): string[] {
  const terms: string[] = [];

  // Finding labels (the clinical term, not qualifiers)
  for (const entries of Object.values(findings)) {
    for (const e of entries) {
      terms.push(e.finding.toLowerCase());
    }
  }

  // Symptoms
  for (const s of symptoms) {
    terms.push(s.toLowerCase());
  }

  // Diagnosis labels (human-readable names)
  for (const label of diagnosisLabels) {
    terms.push(label.toLowerCase());
  }

  // Deduplicate
  return [...new Set(terms)];
}

/**
 * Given NLP suggestions, boost scoring for app diagnoses
 * by fuzzy-matching NLP condition terms to diagnosis IDs/labels.
 */
export function nlpBoostForDiagnosis(
  diagnosisId: string,
  diagnosisLabel: string,
  nlpSuggestions: ChainSuggestion[],
): number {
  const labelLower = diagnosisLabel.toLowerCase();
  const idLower = diagnosisId.toLowerCase().replace(/_/g, " ");

  for (const suggestion of nlpSuggestions) {
    if (suggestion.category === "condition") continue; // already filtered by caller
    const term = suggestion.term.toLowerCase();
    // Exact or substring match
    if (term === labelLower || term === idLower) {
      return suggestion.confidence;
    }
    // Partial match (e.g., "dry eye" matches "dry eye disease")
    if (labelLower.includes(term) || term.includes(labelLower)) {
      return suggestion.confidence * 0.8;
    }
    if (idLower.includes(term) || term.includes(idLower)) {
      return suggestion.confidence * 0.7;
    }
  }
  return 0;
}

/**
 * Get NLP-suggested descriptors for a finding term.
 * Useful for reordering qualifier menus.
 */
export function getNlpDescriptors(findingLabel: string): string[] {
  const engine = getNlpEngine();
  if (!engine) return [];
  return engine.descriptors(findingLabel);
}

/**
 * Get NLP-suggested associated signs/symptoms for a term.
 * Used to augment reverse flow suggestions.
 */
export function getNlpAssociations(
  term: string,
  options?: { limit?: number; category?: TermCategory; minStrength?: number },
): Suggestion[] {
  const engine = getNlpEngine();
  if (!engine) return [];
  return engine.suggest(term, options);
}

/**
 * Get chain-boosted predictions from multiple selected terms.
 * Core "differential narrowing" feature.
 */
export function getNlpChainPredictions(
  terms: string[],
  options?: { limit?: number },
): ChainSuggestion[] {
  const engine = getNlpEngine();
  if (!engine) return [];
  return engine.suggestFromChain(terms, options);
}

/**
 * Search NLP terms for type-ahead.
 */
export function searchNlpTerms(
  query: string,
  limit = 20,
): { term: string; category: TermCategory; frequency: number }[] {
  const engine = getNlpEngine();
  if (!engine) return [];
  return engine.search(query, limit);
}
