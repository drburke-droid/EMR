import { type EncounterState } from "../store/encounterStore";
import { diagnoses } from "../data/diagnoses";

export function buildNote(state: EncounterState): string {
  const sections: string[] = [];

  // Hx
  const hxParts: string[] = [];
  if (state.chiefComplaint) hxParts.push(`c/o ${state.chiefComplaint}`);
  if (state.historyBlocks.length > 0) {
    hxParts.push(state.historyBlocks.map((b) => `Hx ${b}`).join(", "));
  }
  if (hxParts.length > 0) sections.push(`Hx: ${hxParts.join(". ")}.`);

  // Symptoms
  if (state.symptoms.length > 0) {
    const sxParts = state.symptoms.map((sx) => {
      let text = sx.symptom;
      if (sx.severity) text += ` ${sx.severity}`;
      return text;
    });
    const triggers = state.symptoms.flatMap((sx) => sx.triggers);
    const relief = state.symptoms.flatMap((sx) => sx.relief);
    let sxLine = `Symptoms: ${sxParts.join(", ")}`;
    if (triggers.length > 0) sxLine += `, worse c ${[...new Set(triggers)].join(" and ")}`;
    if (relief.length > 0) sxLine += `, relieved c ${[...new Set(relief)].join(" and ")}`;
    sxLine += ".";
    sections.push(sxLine);
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
