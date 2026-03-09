// Pairs of labels that are mutually exclusive — selecting one deselects the other.
// These are common clinical antitheses in optometry finding qualifiers.

const ANTITHESIS_PAIRS: [string, string][] = [
  // Size / extent
  ["focal", "diffuse"],
  ["small", "large"],
  ["localized", "diffuse"],
  // Severity opposites
  ["mild", "sev"],
  ["mild", "severe"],
  ["mild", "marked"],
  // Tenderness
  ["tender", "non tender"],
  // Temperature
  ["warm", "non warm"],
  // Persistence
  ["transient", "persistent"],
  // Inflammation
  ["inflamed", "non inflamed"],
  // Presence / absence pairs
  ["present", "absent"],
  ["staining absent", "staining present"],
  ["erythema present", "erythema absent"],
  ["cysts present", "cysts absent"],
  ["drusen present", "drusen absent"],
  ["orange pigment present", "orange pigment absent"],
  ["SRF present", "SRF absent"],
  ["SRF absent", "SRF present"],
  ["lacunae present", "lacunae absent"],
  ["pigment absent", "pigment present"],
  ["with SRF absent", "with SRF present"],
  ["atrophic holes absent", "atrophic holes present"],
  ["foveal involvement absent", "foveal involvement present"],
  ["macular involvement absent", "macular involvement present"],
  ["heme absent", "heme present"],
  ["Paton lines absent", "Paton lines present"],
  ["SVP absent", "SVP present"],
  ["snowballs absent", "snowballs present"],
  ["Descemet folds absent", "Descemet folds present"],
  ["notching absent", "notching present"],
  ["foveal distortion absent", "foveal distortion present"],
  ["operculum absent", "operculum present"],
  ["surrounding cuff absent", "surrounding cuff present"],
  ["overlying stain absent", "overlying stain present"],
  ["K staining present", "K staining absent"],
  ["rust ring absent", "rust ring present"],
  ["focal thinning absent", "focal thinning present"],
  ["ulcerative changes absent", "ulcerative changes present"],
  ["visual axis encroachment absent", "visual axis encroachment present"],
  ["extension onto K absent", "extension onto K present"],
  ["Seidel negative", "Seidel positive"],
  // Direction
  ["touching K", "not touching K"],
  ["lash K touch", "no lash K touch"],
  ["expressible", "non expressible"],
  ["draining", "non draining"],
  // Elevation
  ["flat", "elevated"],
  // Stability
  ["stable by hx", "new by hx"],
  ["stable", "new"],
  // Margins
  ["distinct margins", "indistinct margins"],
  // Type
  ["anterior", "posterior"],
  ["internal", "external"],
  // With / without
  ["with edema", "without edema"],
  ["with injection", "without injection"],
  ["blanches", "does not blanch"],
  // Pupil
  ["pupil clear", "pupil threatened"],
  ["fatigable", "non fatigable"],
  // Side
  ["nasal", "temporal"],
  ["superior", "inferior"],
  ["upper", "lower"],
  // Depth
  ["superficial", "deep"],
  ["superficial", "embedded"],
  // Removed
  ["removed", "not removed"],
  // Speed
  ["acute", "chronic"],
  // Reactivity
  ["greater in dark", "greater in light"],
  // Vergence
  ["greater at near", "greater at distance"],
  // BV
  ["symptomatic", "asymptomatic"],
  ["comitant", "incomitant"],
  // Vessels
  ["arterial", "venous"],
];

// Build a lookup map: label → set of labels it conflicts with
const conflictMap = new Map<string, Set<string>>();

for (const [a, b] of ANTITHESIS_PAIRS) {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (!conflictMap.has(la)) conflictMap.set(la, new Set());
  if (!conflictMap.has(lb)) conflictMap.set(lb, new Set());
  conflictMap.get(la)!.add(lb);
  conflictMap.get(lb)!.add(la);
}

/**
 * Given a newly selected label and the current set of selected labels,
 * returns the new selection with any antithetical labels removed.
 */
export function toggleWithAntithesis(
  label: string,
  currentSelected: Set<number>,
  allLabels: string[],
): Set<number> {
  const idx = allLabels.indexOf(label);
  if (idx < 0) return currentSelected;

  const next = new Set(currentSelected);

  if (next.has(idx)) {
    // Deselect
    next.delete(idx);
    return next;
  }

  // Select — and remove any antithetical labels
  next.add(idx);
  const conflicts = conflictMap.get(label.toLowerCase());
  if (conflicts) {
    for (const selIdx of [...next]) {
      if (selIdx === idx) continue;
      if (conflicts.has(allLabels[selIdx].toLowerCase())) {
        next.delete(selIdx);
      }
    }
  }

  return next;
}
