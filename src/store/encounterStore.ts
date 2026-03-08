import { create } from "zustand";
import { v4 as uuid } from "uuid";

export type Eye = "OD" | "OS" | "OU";

export type SymptomEntry = {
  id: string;
  symptom: string;
  laterality?: string;
  severity?: string;
  onset?: string;
  duration?: string;
  triggers: string[];
  relief: string[];
  associated: string[];
};

export type FindingEntry = {
  id: string;
  eye: Eye;
  region: string;
  finding: string;
  qualifiers: string[];
  freeText?: string;
  generatedText: string;
};

export type EncounterState = {
  chiefComplaint: string;
  symptoms: SymptomEntry[];
  historyBlocks: string[];
  findings: Record<string, FindingEntry[]>;
  selectedDiagnoses: string[];
  selectedPlanBlocks: Record<string, string[]>;
  activeModule: string;

  setChiefComplaint: (cc: string) => void;
  addSymptom: (symptom: string) => void;
  updateSymptom: (id: string, updates: Partial<SymptomEntry>) => void;
  removeSymptom: (id: string) => void;
  toggleHistoryBlock: (block: string) => void;
  addFinding: (eye: Eye, region: string, finding: string, qualifiers: string[], freeText?: string) => void;
  removeFinding: (key: string, findingId: string) => void;
  copyToFellowEye: (key: string, findingId: string) => void;
  addDiagnosis: (diagnosisId: string) => void;
  removeDiagnosis: (diagnosisId: string) => void;
  togglePlanBlock: (diagnosisId: string, block: string) => void;
  setActiveModule: (module: string) => void;
  clearEncounter: () => void;
};

function buildFindingText(eye: Eye, abbrev: string, finding: string, qualifiers: string[], freeText?: string): string {
  const parts = [finding, ...qualifiers];
  if (freeText) parts.push(freeText);
  return `${eye} ${abbrev}: ${parts.join(", ")}.`;
}

function findAbbrev(region: string): string {
  const map: Record<string, string> = {
    upper_lid: "LID", lower_lid: "LID",
    upper_lid_margin: "LID MGN", lower_lid_margin: "LID MGN",
    upper_lashes: "LASH", lower_lashes: "LASH",
    bulbar_conj_nasal: "CONJ", bulbar_conj_temporal: "CONJ",
    bulbar_conj_superior: "CONJ", bulbar_conj_inferior: "CONJ",
    palpebral_conj_upper: "PALP CONJ", palpebral_conj_lower: "PALP CONJ",
    caruncle: "CARUNCLE", plica: "PLICA",
    cornea_central: "K", cornea_superior: "K", cornea_inferior: "K",
    cornea_nasal: "K", cornea_temporal: "K", cornea_diffuse: "K",
    tear_film: "TF", anterior_chamber: "AC", iris: "IRIS",
    pupil: "PUPIL", lens: "LENS",
    vitreous: "VIT", optic_nerve: "ONH",
    macula: "MAC", fovea: "FOVEA",
    retinal_vessels: "VESSELS",
    temporal_retina: "RET", nasal_retina: "RET",
    superior_retina: "RET", inferior_retina: "RET",
    ST_midperiphery: "RET", SN_midperiphery: "RET",
    IT_midperiphery: "RET", IN_midperiphery: "RET",
    far_periphery: "RET",
    superior_arcade: "RET", inferior_arcade: "RET",
  };
  return map[region] || region.toUpperCase();
}

const initialState = {
  chiefComplaint: "",
  symptoms: [] as SymptomEntry[],
  historyBlocks: [] as string[],
  findings: {} as Record<string, FindingEntry[]>,
  selectedDiagnoses: [] as string[],
  selectedPlanBlocks: {} as Record<string, string[]>,
  activeModule: "Sx",
};

export const useEncounterStore = create<EncounterState>((set) => ({
  ...initialState,

  setChiefComplaint: (cc) => set({ chiefComplaint: cc }),

  addSymptom: (symptom) =>
    set((s) => ({
      symptoms: [...s.symptoms, { id: uuid(), symptom, triggers: [], relief: [], associated: [] }],
    })),

  updateSymptom: (id, updates) =>
    set((s) => ({
      symptoms: s.symptoms.map((sx) => (sx.id === id ? { ...sx, ...updates } : sx)),
    })),

  removeSymptom: (id) =>
    set((s) => ({ symptoms: s.symptoms.filter((sx) => sx.id !== id) })),

  toggleHistoryBlock: (block) =>
    set((s) => ({
      historyBlocks: s.historyBlocks.includes(block)
        ? s.historyBlocks.filter((b) => b !== block)
        : [...s.historyBlocks, block],
    })),

  addFinding: (eye, region, finding, qualifiers, freeText) =>
    set((s) => {
      const key = `${eye}_${region}`;
      const abbrev = findAbbrev(region);
      const entry: FindingEntry = {
        id: uuid(),
        eye,
        region,
        finding,
        qualifiers,
        freeText,
        generatedText: buildFindingText(eye, abbrev, finding, qualifiers, freeText),
      };
      return {
        findings: {
          ...s.findings,
          [key]: [...(s.findings[key] || []), entry],
        },
      };
    }),

  removeFinding: (key, findingId) =>
    set((s) => ({
      findings: {
        ...s.findings,
        [key]: (s.findings[key] || []).filter((f) => f.id !== findingId),
      },
    })),

  copyToFellowEye: (key, findingId) =>
    set((s) => {
      const finding = (s.findings[key] || []).find((f) => f.id === findingId);
      if (!finding) return s;
      const fellowEye: Eye = finding.eye === "OD" ? "OS" : "OD";
      const fellowKey = `${fellowEye}_${finding.region}`;
      const abbrev = findAbbrev(finding.region);
      const newEntry: FindingEntry = {
        ...finding,
        id: uuid(),
        eye: fellowEye,
        generatedText: buildFindingText(fellowEye, abbrev, finding.finding, finding.qualifiers, finding.freeText),
      };
      return {
        findings: {
          ...s.findings,
          [fellowKey]: [...(s.findings[fellowKey] || []), newEntry],
        },
      };
    }),

  addDiagnosis: (diagnosisId) =>
    set((s) => ({
      selectedDiagnoses: s.selectedDiagnoses.includes(diagnosisId)
        ? s.selectedDiagnoses
        : [...s.selectedDiagnoses, diagnosisId],
    })),

  removeDiagnosis: (diagnosisId) =>
    set((s) => ({
      selectedDiagnoses: s.selectedDiagnoses.filter((d) => d !== diagnosisId),
      selectedPlanBlocks: (() => {
        const next = { ...s.selectedPlanBlocks };
        delete next[diagnosisId];
        return next;
      })(),
    })),

  togglePlanBlock: (diagnosisId, block) =>
    set((s) => {
      const current = s.selectedPlanBlocks[diagnosisId] || [];
      const next = current.includes(block) ? current.filter((b) => b !== block) : [...current, block];
      return { selectedPlanBlocks: { ...s.selectedPlanBlocks, [diagnosisId]: next } };
    }),

  setActiveModule: (module) => set({ activeModule: module }),

  clearEncounter: () => set(initialState),
}));
