// promptActions.ts — Maps qualifier values to semantic categories
// and parses "May Be Missing" prompts into interactive segments.

// ── Qualifier → Category mapping ─────────────────────────────

const CATEGORY_MEMBERS: [string, string[]][] = [
  ["size", ["small", "medium", "large"]],
  ["severity", ["mild", "mod", "sev", "trace", "1+", "2+", "3+", "4+", "0.5+"]],
  ["location", [
    "internal", "external", "nasal", "temporal", "superior", "inferior",
    "central", "paracentral", "peripheral", "upper tarsal", "deep",
    "superficial", "sup", "inf", "upper", "lower",
  ]],
  ["tenderness", ["tender", "non tender"]],
  ["laterality", ["unilateral", "bilateral"]],
  ["morphology", ["pedunculated", "sessile", "flat", "elevated"]],
  ["stability", ["stable", "new", "growing", "stable by hx", "new by hx"]],
  ["inflammation", ["inflamed", "non inflamed"]],
  ["pupil", ["pupil clear", "pupil threatened"]],
  ["pattern", ["map", "dot", "fingerprint", "inferior", "diffuse", "focal", "multifocal"]],
  ["type", ["involutional", "spastic", "cicatricial", "mechanical", "metallic", "organic", "vegetable"]],
  ["blanching", ["blanches", "does not blanch"]],
  ["depth", ["superficial", "embedded", "stromal", "epi defect present"]],
  ["density", ["trace", "1+", "2+", "3+", "4+"]],
];

// Build reverse lookup: qualifier (lowercase) → category
const qualToCategory = new Map<string, string>();
for (const [cat, members] of CATEGORY_MEMBERS) {
  for (const q of members) qualToCategory.set(q.toLowerCase(), cat);
}

// Keywords in prompts that map to qualifier categories
// (searched case-insensitively in the prompt text)
const PROMPT_KEYWORDS: [string, string][] = [
  // Longest first to avoid partial matches
  ["corneal encroachment", "extent"],
  ["corneal contact", "corneal contact"],
  ["visual axis", "extent"],
  ["pupil status", "pupil"],
  ["orange pigment", "orange pigment"],
  ["rust ring", "rust ring"],
  ["Seidel", "Seidel"],
  ["stability", "stability"],
  ["inflammation", "inflammation"],
  ["morphology", "morphology"],
  ["tenderness", "tenderness"],
  ["blanching", "blanching"],
  ["laterality", "laterality"],
  ["elevation", "morphology"],
  ["severity", "severity"],
  ["location", "location"],
  ["density", "density"],
  ["pattern", "pattern"],
  ["borders", "borders"],
  ["number", "number"],
  ["depth", "depth"],
  ["pupil", "pupil"],
  ["grade", "severity"],
  ["type", "type"],
  ["size", "size"],
];

// ── Types ────────────────────────────────────────────────────

export type QualifierGroup = {
  category: string;
  options: string[];
};

export type PromptSegment =
  | { type: "text"; content: string }
  | { type: "action"; keyword: string; category: string; options: string[] };

// ── Group qualifiers by category ─────────────────────────────

export function groupQualifiers(qualifiers: string[]): QualifierGroup[] {
  const groups = new Map<string, string[]>();

  for (const q of qualifiers) {
    let cat = qualToCategory.get(q.toLowerCase());

    if (!cat) {
      const lower = q.toLowerCase();
      // present/absent pairs → use the feature name as category
      if (lower.includes("present") || lower.includes("absent")) {
        cat = lower.replace(/\s*(present|absent)$/i, "").trim() || "features";
      } else if (lower.includes("stain")) {
        cat = "staining";
      } else if (lower.includes("seidel")) {
        cat = "Seidel";
      } else if (lower.includes("touching k") || lower.includes("lash k")) {
        cat = "corneal contact";
      } else if (lower.includes("encroach") || lower.includes("hood")) {
        cat = "extent";
      } else if (lower.includes("eversion")) {
        cat = "lid position";
      } else if (lower.includes("angle")) {
        cat = "angle";
      } else if (lower.includes("pco")) {
        cat = "capsule";
      } else if (lower.includes("cl related") || lower.includes("suspected")) {
        cat = "etiology";
      } else if (lower.includes("recurrent") || lower.includes("hx")) {
        cat = "history";
      } else {
        cat = "other";
      }
    }

    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(q);
  }

  return Array.from(groups.entries()).map(([category, options]) => ({ category, options }));
}

// ── Parse prompt into interactive segments ────────────────────

// ── Default actions for prompts without qualifiers ───────────

/**
 * Generate fallback interactive options when a suggestion has no
 * qualifier-driven actions (e.g. symptom prompts, evert-lid prompts).
 */
export function getDefaultActions(
  prompt: string,
  type: "finding" | "symptom",
  name?: string,
): QualifierGroup[] {
  if (type === "symptom") {
    const label =
      name?.toLowerCase() ||
      prompt.replace(/^ask about\s*/i, "").trim().toLowerCase() ||
      "this";
    return [
      { category: "response", options: [`Pt admits ${label}`, `Pt denies ${label}`] },
    ];
  }

  const lower = prompt.toLowerCase();
  if (lower.includes("evert")) {
    return [{ category: "action", options: ["everted", "not everted"] }];
  }
  if (
    lower.includes("check") ||
    lower.includes("look") ||
    lower.includes("inspect")
  ) {
    return [{ category: "status", options: ["present", "absent"] }];
  }
  if (
    lower.includes("note") ||
    lower.includes("assess") ||
    lower.includes("evaluate")
  ) {
    return [{ category: "status", options: ["present", "absent", "normal"] }];
  }
  return [{ category: "status", options: ["present", "absent"] }];
}

// ── Parse prompt into interactive segments ────────────────────

export function parseInteractivePrompt(
  prompt: string,
  qualifiers?: string[],
): { segments: PromptSegment[]; extraGroups: QualifierGroup[] } {
  if (!qualifiers?.length) {
    return { segments: [{ type: "text", content: prompt }], extraGroups: [] };
  }

  const groups = groupQualifiers(qualifiers);
  const categoryToGroup = new Map(groups.map((g) => [g.category, g]));
  const matchedCategories = new Set<string>();

  // Find keywords in prompt text and replace with action segments
  type Match = { start: number; end: number; keyword: string; category: string };
  const matches: Match[] = [];
  const promptLower = prompt.toLowerCase();

  for (const [kw, cat] of PROMPT_KEYWORDS) {
    if (!categoryToGroup.has(cat)) continue;
    const idx = promptLower.indexOf(kw.toLowerCase());
    if (idx < 0) continue;
    // Avoid overlapping matches
    const overlaps = matches.some(
      (m) => idx < m.end && idx + kw.length > m.start,
    );
    if (overlaps) continue;
    matches.push({ start: idx, end: idx + kw.length, keyword: prompt.slice(idx, idx + kw.length), category: cat });
    matchedCategories.add(cat);
  }

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);

  // Build segments
  const segments: PromptSegment[] = [];
  let cursor = 0;

  for (const m of matches) {
    if (m.start > cursor) {
      segments.push({ type: "text", content: prompt.slice(cursor, m.start) });
    }
    const group = categoryToGroup.get(m.category)!;
    segments.push({
      type: "action",
      keyword: m.keyword,
      category: m.category,
      options: group.options,
    });
    cursor = m.end;
  }

  if (cursor < prompt.length) {
    segments.push({ type: "text", content: prompt.slice(cursor) });
  }

  // If no keywords matched at all, return plain text
  if (matches.length === 0) {
    segments.push({ type: "text", content: prompt });
  }

  // Groups not matched in prompt text → show as extra chips
  const extraGroups = groups.filter(
    (g) => !matchedCategories.has(g.category) && g.category !== "other",
  );

  return { segments, extraGroups };
}
