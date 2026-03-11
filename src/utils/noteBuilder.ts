import { type EncounterState } from "../store/encounterStore";
import { diagnoses } from "../data/diagnoses";

/** Join a list with commas and "and" only before the last item. */
function oxfordJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function buildNote(state: EncounterState): string {
  const sections: string[] = [];

  // Hx — chief complaint derived from first symptom
  const hxParts: string[] = [];
  const cc = state.chiefComplaint || state.symptoms[0]?.symptom;
  if (cc) hxParts.push(`c/o ${cc}`);
  if (state.historyBlocks.length > 0) {
    hxParts.push(state.historyBlocks.map((b) => `Hx ${b}`).join(", "));
  }
  if (hxParts.length > 0) sections.push(`Hx: ${hxParts.join(". ")}.`);

  // Symptoms (FOLDARQ format)
  if (state.symptoms.length > 0) {
    const sxTexts = state.symptoms.map((sx) => {
      const parts: string[] = [sx.symptom];
      if (sx.quantify) parts.push(sx.quantify);
      if (sx.frequency) parts.push(sx.frequency);
      if (sx.onset) parts.push(sx.onset + " onset");
      if (sx.location.length > 0) parts.push(sx.location.join(", "));
      if (sx.duration) parts.push(sx.duration + " duration");

      let text = parts.join(" ");
      if (sx.aggravating.length > 0) text += `, worse c ${oxfordJoin(sx.aggravating)}`;
      if (sx.relief.length > 0) text += `, better c ${oxfordJoin(sx.relief)}`;
      if (sx.association.length > 0) text += `, assoc ${oxfordJoin(sx.association)}`;
      return text;
    });
    sections.push(`Symptoms: ${sxTexts.join(". ")}.`);
  }

  // Findings — group by AS / PS
  const asRegions = new Set([
    "upper_lid", "lower_lid", "upper_lid_margin", "lower_lid_margin",
    "upper_lashes", "lower_lashes",
    "bulbar_conj_nasal", "bulbar_conj_temporal", "bulbar_conj_superior", "bulbar_conj_inferior",
    "palpebral_conj_upper", "palpebral_conj_lower",
    "caruncle", "plica",
    "cornea_central", "cornea_superior", "cornea_inferior", "cornea_nasal", "cornea_temporal", "cornea_diffuse",
    "tear_film", "anterior_chamber", "iris", "pupil", "lens",
  ]);

  const asFindings: string[] = [];
  const psFindings: string[] = [];

  for (const [, entries] of Object.entries(state.findings)) {
    for (const entry of entries) {
      if (entry.finding === "normal") continue;
      if (asRegions.has(entry.region)) {
        asFindings.push(entry.generatedText);
      } else {
        psFindings.push(entry.generatedText);
      }
    }
  }

  if (asFindings.length > 0) sections.push(`AS: ${asFindings.join(" ")}`);
  if (psFindings.length > 0) sections.push(`PS: ${psFindings.join(" ")}`);

  // Assessment
  if (state.selectedDiagnoses.length > 0) {
    const dxLabels = state.selectedDiagnoses.map(
      (id) => diagnoses.find((d) => d.id === id)?.label || id
    );
    sections.push(`Assessment: ${dxLabels.join(", ")}.`);
  }

  // Plan
  const planParts: string[] = [];
  for (const dxId of state.selectedDiagnoses) {
    const blocks = state.selectedPlanBlocks[dxId];
    if (blocks && blocks.length > 0) {
      planParts.push(blocks.join(", "));
    }
  }
  if (planParts.length > 0) sections.push(`Plan: ${planParts.join(". ")}.`);

  return sections.join("\n");
}
