// diagnosis_map.ts — Bidirectional mapping: findings/symptoms <-> diagnoses
// Forward: triggered_by maps clinical findings TO diagnoses
// Reverse: expected_findings / expected_symptoms maps diagnoses TO what to look for

export type TriggerFinding = {
  region: string;
  finding: string;
  weight?: number; // 1-3, higher = stronger association. Default 1.
};

export type ExpectedFinding = {
  region: string;
  finding: string;
  qualifiers?: string[];
  priority: "high" | "medium" | "low";
  prompt: string;
};

export type ExpectedSymptom = {
  symptom: string;
  priority: "high" | "medium" | "low";
};

export type DiagnosisMapping = {
  triggered_by: TriggerFinding[];
  expected_findings: ExpectedFinding[];
  expected_symptoms: ExpectedSymptom[];
};

export const diagnosisMap: Record<string, DiagnosisMapping> = {

  // ─────────────────────────────────────────────
  // EXTERNAL / LID
  // ─────────────────────────────────────────────

  mgd: {
    triggered_by: [
      { region: "lower_lid_margin", finding: "MGD", weight: 3 },
      { region: "upper_lid_margin", finding: "MGD", weight: 3 },
      { region: "lower_lid_margin", finding: "meibomian plugging", weight: 2 },
      { region: "upper_lid_margin", finding: "meibomian plugging", weight: 2 },
      { region: "lower_lid_margin", finding: "telangiectasia", weight: 2 },
      { region: "tear_film", finding: "oily layer poor", weight: 2 },
      { region: "tear_film", finding: "reduced TBUT", weight: 1 },
      { region: "tear_film", finding: "froth", weight: 1 },
      { region: "lower_lid_margin", finding: "foaming", weight: 1 },
    ],
    expected_findings: [
      { region: "lower_lid_margin", finding: "MGD", qualifiers: ["mild", "mod", "sev", "capped glands", "inspissation"], priority: "high", prompt: "Grade meibomian gland dysfunction on lid margins" },
      { region: "tear_film", finding: "reduced TBUT", qualifiers: ["mild", "mod", "sev"], priority: "high", prompt: "Assess tear break-up time" },
      { region: "tear_film", finding: "oily layer poor", priority: "medium", prompt: "Evaluate lipid layer quality" },
      { region: "cornea_inferior", finding: "SPK", qualifiers: ["trace", "1+", "2+"], priority: "medium", prompt: "Check inferior cornea for SPK from evaporative dry eye" },
      { region: "lower_lid_margin", finding: "foaming", priority: "low", prompt: "Note any foaming at lid margins" },
    ],
    expected_symptoms: [
      { symptom: "Dryness", priority: "high" },
      { symptom: "Irritation", priority: "high" },
      { symptom: "Computer discomfort", priority: "medium" },
      { symptom: "FB sensation", priority: "medium" },
    ],
  },

  anterior_blepharitis: {
    triggered_by: [
      { region: "upper_lashes", finding: "collarettes", weight: 3 },
      { region: "lower_lashes", finding: "collarettes", weight: 3 },
      { region: "upper_lid_margin", finding: "collarettes", weight: 3 },
      { region: "lower_lid_margin", finding: "collarettes", weight: 3 },
      { region: "upper_lid_margin", finding: "scurf", weight: 2 },
      { region: "lower_lid_margin", finding: "scurf", weight: 2 },
      { region: "upper_lashes", finding: "debris", weight: 2 },
      { region: "lower_lashes", finding: "debris", weight: 2 },
      { region: "upper_lid_margin", finding: "blepharitis", weight: 2 },
      { region: "lower_lid_margin", finding: "blepharitis", weight: 2 },
    ],
    expected_findings: [
      { region: "upper_lid_margin", finding: "collarettes", priority: "high", prompt: "Look for collarettes at lash bases (Demodex)" },
      { region: "lower_lid_margin", finding: "scurf", priority: "high", prompt: "Assess for scurf/flaking on lid margins" },
      { region: "upper_lashes", finding: "debris", priority: "medium", prompt: "Note lash debris" },
      { region: "lower_lashes", finding: "madarosis", qualifiers: ["focal"], priority: "low", prompt: "Check for lash loss areas" },
    ],
    expected_symptoms: [
      { symptom: "Irritation", priority: "high" },
      { symptom: "Itching", priority: "medium" },
      { symptom: "Red eye", priority: "medium" },
    ],
  },

  posterior_blepharitis: {
    triggered_by: [
      { region: "lower_lid_margin", finding: "MGD", weight: 3 },
      { region: "upper_lid_margin", finding: "MGD", weight: 3 },
      { region: "lower_lid_margin", finding: "telangiectasia", weight: 2 },
      { region: "upper_lid_margin", finding: "telangiectasia", weight: 2 },
      { region: "lower_lid_margin", finding: "meibomian plugging", weight: 2 },
      { region: "tear_film", finding: "oily layer poor", weight: 1 },
      { region: "tear_film", finding: "froth", weight: 1 },
    ],
    expected_findings: [
      { region: "lower_lid_margin", finding: "MGD", qualifiers: ["mod", "sev", "lid margin hyperemia"], priority: "high", prompt: "Grade MGD and lid margin hyperemia" },
      { region: "lower_lid_margin", finding: "telangiectasia", priority: "high", prompt: "Note telangiectasia on lid margins" },
      { region: "tear_film", finding: "reduced TBUT", priority: "medium", prompt: "Assess tear stability" },
      { region: "cornea_inferior", finding: "SPK", priority: "medium", prompt: "Check for inferior SPK" },
    ],
    expected_symptoms: [
      { symptom: "Irritation", priority: "high" },
      { symptom: "Dryness", priority: "medium" },
      { symptom: "Red eye", priority: "medium" },
    ],
  },

  mixed_blepharitis: {
    triggered_by: [
      { region: "lower_lid_margin", finding: "blepharitis", weight: 3 },
      { region: "upper_lid_margin", finding: "blepharitis", weight: 3 },
      { region: "lower_lid_margin", finding: "MGD", weight: 2 },
      { region: "upper_lid_margin", finding: "collarettes", weight: 2 },
      { region: "lower_lid_margin", finding: "scurf", weight: 2 },
      { region: "lower_lid_margin", finding: "telangiectasia", weight: 2 },
      { region: "upper_lashes", finding: "collarettes", weight: 2 },
      { region: "lower_lashes", finding: "debris", weight: 1 },
    ],
    expected_findings: [
      { region: "lower_lid_margin", finding: "MGD", qualifiers: ["mod", "sev"], priority: "high", prompt: "Grade posterior component — MGD" },
      { region: "upper_lid_margin", finding: "collarettes", priority: "high", prompt: "Grade anterior component — collarettes/scurf" },
      { region: "lower_lid_margin", finding: "telangiectasia", priority: "medium", prompt: "Note lid margin telangiectasia" },
      { region: "tear_film", finding: "reduced TBUT", priority: "medium", prompt: "Assess tear film stability" },
    ],
    expected_symptoms: [
      { symptom: "Irritation", priority: "high" },
      { symptom: "Dryness", priority: "medium" },
      { symptom: "Red eye", priority: "medium" },
      { symptom: "Itching", priority: "low" },
    ],
  },

  chalazion: {
    triggered_by: [
      { region: "upper_lid", finding: "chalazion", weight: 3 },
      { region: "lower_lid", finding: "chalazion", weight: 3 },
      { region: "upper_lid", finding: "edema", weight: 1 },
      { region: "lower_lid", finding: "edema", weight: 1 },
    ],
    expected_findings: [
      { region: "upper_lid", finding: "chalazion", qualifiers: ["internal", "external", "small", "medium", "large", "tender", "non tender"], priority: "high", prompt: "Characterize chalazion — size, location, tenderness" },
      { region: "upper_lid", finding: "edema", qualifiers: ["focal"], priority: "medium", prompt: "Note surrounding lid edema" },
      { region: "palpebral_conj_upper", finding: "hyperemia", priority: "medium", prompt: "Evert lid — check palpebral conjunctiva" },
    ],
    expected_symptoms: [
      { symptom: "Irritation", priority: "medium" },
      { symptom: "Pain", priority: "low" },
    ],
  },

  internal_hordeolum: {
    triggered_by: [
      { region: "upper_lid", finding: "hordeolum", weight: 3 },
      { region: "lower_lid", finding: "hordeolum", weight: 3 },
      { region: "upper_lid", finding: "edema", weight: 1 },
      { region: "lower_lid", finding: "edema", weight: 1 },
      { region: "upper_lid", finding: "erythema", weight: 1 },
    ],
    expected_findings: [
      { region: "upper_lid", finding: "hordeolum", qualifiers: ["internal", "tender", "with edema"], priority: "high", prompt: "Characterize hordeolum — internal, size, tenderness" },
      { region: "upper_lid", finding: "edema", qualifiers: ["focal", "tender", "warm"], priority: "high", prompt: "Note lid edema and warmth" },
      { region: "palpebral_conj_upper", finding: "hyperemia", priority: "medium", prompt: "Evert lid — look for pointing lesion on tarsal conj" },
    ],
    expected_symptoms: [
      { symptom: "Pain", priority: "high" },
      { symptom: "Red eye", priority: "medium" },
      { symptom: "Irritation", priority: "medium" },
    ],
  },

  external_hordeolum: {
    triggered_by: [
      { region: "upper_lid", finding: "hordeolum", weight: 3 },
      { region: "lower_lid", finding: "hordeolum", weight: 3 },
      { region: "upper_lid", finding: "edema", weight: 2 },
      { region: "upper_lid", finding: "erythema", weight: 2 },
    ],
    expected_findings: [
      { region: "upper_lid", finding: "hordeolum", qualifiers: ["external", "tender", "focal erythema"], priority: "high", prompt: "Characterize hordeolum — external at lash follicle, size, tenderness" },
      { region: "upper_lid", finding: "edema", qualifiers: ["focal", "tender"], priority: "high", prompt: "Note perilesional edema" },
      { region: "upper_lid", finding: "erythema", qualifiers: ["focal", "tender"], priority: "medium", prompt: "Note focal erythema at lash line" },
    ],
    expected_symptoms: [
      { symptom: "Pain", priority: "high" },
      { symptom: "Red eye", priority: "medium" },
      { symptom: "Irritation", priority: "medium" },
    ],
  },

  trichiasis: {
    triggered_by: [
      { region: "upper_lashes", finding: "trichiasis", weight: 3 },
      { region: "lower_lashes", finding: "trichiasis", weight: 3 },
      { region: "upper_lashes", finding: "misdirected lashes", weight: 2 },
      { region: "lower_lashes", finding: "misdirected lashes", weight: 2 },
      { region: "cornea_inferior", finding: "SPK", weight: 1 },
    ],
    expected_findings: [
      { region: "lower_lashes", finding: "trichiasis", qualifiers: ["single lash", "multiple lashes", "touching K"], priority: "high", prompt: "Identify misdirected lash(es) — number, corneal contact" },
      { region: "cornea_inferior", finding: "staining", priority: "high", prompt: "Check cornea for staining from lash contact" },
      { region: "cornea_inferior", finding: "SPK", priority: "medium", prompt: "Grade any SPK from trichiasis" },
    ],
    expected_symptoms: [
      { symptom: "FB sensation", priority: "high" },
      { symptom: "Irritation", priority: "high" },
      { symptom: "Tearing", priority: "medium" },
    ],
  },

  entropion: {
    triggered_by: [
      { region: "upper_lid", finding: "entropion", weight: 3 },
      { region: "lower_lid", finding: "entropion", weight: 3 },
      { region: "lower_lashes", finding: "trichiasis", weight: 2 },
      { region: "cornea_inferior", finding: "SPK", weight: 1 },
    ],
    expected_findings: [
      { region: "lower_lid", finding: "entropion", qualifiers: ["involutional", "spastic", "mild", "mod", "sev"], priority: "high", prompt: "Grade entropion — type and severity" },
      { region: "cornea_inferior", finding: "staining", priority: "high", prompt: "Check for corneal irritation from lid-lash contact" },
      { region: "lower_lashes", finding: "trichiasis", qualifiers: ["touching K"], priority: "medium", prompt: "Note any secondary trichiasis" },
    ],
    expected_symptoms: [
      { symptom: "Irritation", priority: "high" },
      { symptom: "FB sensation", priority: "high" },
      { symptom: "Tearing", priority: "medium" },
      { symptom: "Red eye", priority: "medium" },
    ],
  },

  ectropion: {
    triggered_by: [
      { region: "upper_lid", finding: "ectropion", weight: 3 },
      { region: "lower_lid", finding: "ectropion", weight: 3 },
      { region: "cornea_inferior", finding: "staining", weight: 1 },
      { region: "bulbar_conj_inferior", finding: "injection", weight: 1 },
    ],
    expected_findings: [
      { region: "lower_lid", finding: "ectropion", qualifiers: ["mild", "mod", "sev", "punctal eversion"], priority: "high", prompt: "Grade ectropion — severity, punctal eversion" },
      { region: "cornea_inferior", finding: "staining", qualifiers: ["exposure pattern"], priority: "medium", prompt: "Check for inferior exposure-related staining" },
      { region: "bulbar_conj_inferior", finding: "injection", priority: "medium", prompt: "Note conjunctival exposure changes" },
    ],
    expected_symptoms: [
      { symptom: "Tearing", priority: "high" },
      { symptom: "Irritation", priority: "medium" },
      { symptom: "Red eye", priority: "medium" },
    ],
  },

  dermatochalasis: {
    triggered_by: [
      { region: "upper_lid", finding: "dermatochalasis", weight: 3 },
      { region: "lower_lid", finding: "dermatochalasis", weight: 2 },
    ],
    expected_findings: [
      { region: "upper_lid", finding: "dermatochalasis", qualifiers: ["mild", "mod", "sev", "upper lid hooding", "visual axis encroachment present", "visual axis encroachment absent"], priority: "high", prompt: "Grade dermatochalasis — severity, visual axis involvement" },
      { region: "upper_lid", finding: "ptosis", priority: "medium", prompt: "Rule out concurrent ptosis" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "low" },
    ],
  },

  ptosis: {
    triggered_by: [
      { region: "upper_lid", finding: "ptosis", weight: 3 },
      { region: "lower_lid", finding: "ptosis", weight: 2 },
    ],
    expected_findings: [
      { region: "upper_lid", finding: "ptosis", qualifiers: ["mild", "mod", "sev", "unilateral", "bilateral", "pupil clear", "pupil threatened"], priority: "high", prompt: "Grade ptosis — measure MRD1, severity, pupil status" },
      { region: "upper_lid", finding: "dermatochalasis", priority: "medium", prompt: "Assess for concurrent dermatochalasis" },
      { region: "pupil", finding: "normal", priority: "medium", prompt: "Check pupil — rule out Horner or CN III if unilateral" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "low" },
      { symptom: "Headache", priority: "low" },
    ],
  },

  papilloma: {
    triggered_by: [
      { region: "upper_lid", finding: "papilloma", weight: 3 },
      { region: "lower_lid", finding: "papilloma", weight: 3 },
    ],
    expected_findings: [
      { region: "upper_lid", finding: "papilloma", qualifiers: ["small", "medium", "large", "pedunculated", "sessile", "stable", "new"], priority: "high", prompt: "Characterize papilloma — size, morphology, stability" },
      { region: "cornea_superior", finding: "staining", priority: "low", prompt: "Check if lesion contacts cornea" },
    ],
    expected_symptoms: [],
  },

  xanthelasma: {
    triggered_by: [
      { region: "upper_lid", finding: "xanthelasma", weight: 3 },
      { region: "lower_lid", finding: "xanthelasma", weight: 3 },
    ],
    expected_findings: [
      { region: "upper_lid", finding: "xanthelasma", priority: "high", prompt: "Document xanthelasma — location, size, bilateral?" },
      { region: "lower_lid", finding: "xanthelasma", priority: "medium", prompt: "Check lower lids for xanthelasma" },
    ],
    expected_symptoms: [],
  },

  // ─────────────────────────────────────────────
  // CONJUNCTIVA
  // ─────────────────────────────────────────────

  allergic_conjunctivitis: {
    triggered_by: [
      { region: "palpebral_conj_upper", finding: "papillae", weight: 3 },
      { region: "palpebral_conj_lower", finding: "papillae", weight: 3 },
      { region: "bulbar_conj_nasal", finding: "chemosis", weight: 2 },
      { region: "bulbar_conj_temporal", finding: "chemosis", weight: 2 },
      { region: "bulbar_conj_nasal", finding: "injection", weight: 1 },
      { region: "bulbar_conj_temporal", finding: "injection", weight: 1 },
      { region: "lower_lid", finding: "edema", weight: 1 },
    ],
    expected_findings: [
      { region: "palpebral_conj_lower", finding: "papillae", qualifiers: ["1+", "2+", "3+", "diffuse"], priority: "high", prompt: "Grade papillary reaction — evert lids" },
      { region: "bulbar_conj_nasal", finding: "injection", qualifiers: ["diffuse", "blanches"], priority: "high", prompt: "Grade conjunctival injection" },
      { region: "bulbar_conj_nasal", finding: "chemosis", priority: "medium", prompt: "Check for chemosis" },
      { region: "lower_lid", finding: "edema", qualifiers: ["mild", "diffuse"], priority: "low", prompt: "Note any lid edema" },
    ],
    expected_symptoms: [
      { symptom: "Itching", priority: "high" },
      { symptom: "Red eye", priority: "high" },
      { symptom: "Tearing", priority: "medium" },
      { symptom: "Irritation", priority: "medium" },
    ],
  },

  viral_conjunctivitis: {
    triggered_by: [
      { region: "palpebral_conj_lower", finding: "follicles", weight: 3 },
      { region: "palpebral_conj_upper", finding: "follicles", weight: 3 },
      { region: "bulbar_conj_nasal", finding: "injection", weight: 2 },
      { region: "bulbar_conj_temporal", finding: "injection", weight: 2 },
      { region: "bulbar_conj_inferior", finding: "injection", weight: 2 },
      { region: "bulbar_conj_inferior", finding: "follicles", weight: 2 },
    ],
    expected_findings: [
      { region: "palpebral_conj_lower", finding: "follicles", qualifiers: ["1+", "2+", "3+"], priority: "high", prompt: "Grade follicular response — evert lower lid" },
      { region: "bulbar_conj_nasal", finding: "injection", qualifiers: ["diffuse"], priority: "high", prompt: "Grade conjunctival injection" },
      { region: "cornea_diffuse", finding: "SPK", priority: "medium", prompt: "Check cornea for SEIs/SPK" },
      { region: "cornea_diffuse", finding: "infiltrate", qualifiers: ["small", "peripheral", "sterile appearing"], priority: "low", prompt: "Look for subepithelial infiltrates (SEIs)" },
    ],
    expected_symptoms: [
      { symptom: "Red eye", priority: "high" },
      { symptom: "Tearing", priority: "high" },
      { symptom: "Discharge", priority: "medium" },
      { symptom: "Irritation", priority: "medium" },
      { symptom: "Photophobia", priority: "low" },
    ],
  },

  bacterial_conjunctivitis: {
    triggered_by: [
      { region: "palpebral_conj_lower", finding: "papillae", weight: 3 },
      { region: "palpebral_conj_upper", finding: "papillae", weight: 3 },
      { region: "bulbar_conj_nasal", finding: "injection", weight: 2 },
      { region: "bulbar_conj_temporal", finding: "injection", weight: 2 },
      { region: "bulbar_conj_inferior", finding: "injection", weight: 2 },
    ],
    expected_findings: [
      { region: "palpebral_conj_lower", finding: "papillae", qualifiers: ["1+", "2+", "3+"], priority: "high", prompt: "Grade papillary reaction" },
      { region: "bulbar_conj_nasal", finding: "injection", qualifiers: ["diffuse"], priority: "high", prompt: "Grade conjunctival injection" },
      { region: "cornea_diffuse", finding: "SPK", priority: "medium", prompt: "Check cornea for staining" },
    ],
    expected_symptoms: [
      { symptom: "Red eye", priority: "high" },
      { symptom: "Discharge", priority: "high" },
      { symptom: "Irritation", priority: "medium" },
    ],
  },

  episcleritis: {
    triggered_by: [
      { region: "bulbar_conj_nasal", finding: "injection", weight: 3 },
      { region: "bulbar_conj_temporal", finding: "injection", weight: 3 },
      { region: "bulbar_conj_nasal", finding: "hyperemia", weight: 2 },
      { region: "bulbar_conj_temporal", finding: "hyperemia", weight: 2 },
    ],
    expected_findings: [
      { region: "bulbar_conj_temporal", finding: "injection", qualifiers: ["sectoral", "does not blanch"], priority: "high", prompt: "Characterize injection — sectoral, deep vessel involvement, blanching with phenylephrine?" },
      { region: "bulbar_conj_nasal", finding: "injection", qualifiers: ["sectoral"], priority: "medium", prompt: "Check nasal conjunctiva" },
      { region: "anterior_chamber", finding: "cell", priority: "medium", prompt: "Rule out AC reaction (would suggest scleritis/uveitis)" },
    ],
    expected_symptoms: [
      { symptom: "Red eye", priority: "high" },
      { symptom: "Pain", priority: "medium" },
      { symptom: "Irritation", priority: "medium" },
    ],
  },

  pinguecula: {
    triggered_by: [
      { region: "bulbar_conj_nasal", finding: "pinguecula", weight: 3 },
      { region: "bulbar_conj_temporal", finding: "pinguecula", weight: 3 },
    ],
    expected_findings: [
      { region: "bulbar_conj_nasal", finding: "pinguecula", qualifiers: ["nasal", "elevated", "non inflamed"], priority: "high", prompt: "Document pinguecula — location, elevation, inflammation" },
      { region: "bulbar_conj_temporal", finding: "pinguecula", qualifiers: ["temporal"], priority: "medium", prompt: "Check temporal conjunctiva for bilateral pinguecula" },
    ],
    expected_symptoms: [],
  },

  pingueculitis: {
    triggered_by: [
      { region: "bulbar_conj_nasal", finding: "pinguecula", weight: 3 },
      { region: "bulbar_conj_temporal", finding: "pinguecula", weight: 3 },
      { region: "bulbar_conj_nasal", finding: "injection", weight: 2 },
      { region: "bulbar_conj_temporal", finding: "injection", weight: 2 },
    ],
    expected_findings: [
      { region: "bulbar_conj_nasal", finding: "pinguecula", qualifiers: ["inflamed", "elevated"], priority: "high", prompt: "Document inflamed pinguecula" },
      { region: "bulbar_conj_nasal", finding: "injection", qualifiers: ["sectoral"], priority: "high", prompt: "Note surrounding injection" },
      { region: "cornea_nasal", finding: "dellen", priority: "low", prompt: "Check for adjacent dellen" },
    ],
    expected_symptoms: [
      { symptom: "Red eye", priority: "high" },
      { symptom: "Irritation", priority: "medium" },
      { symptom: "FB sensation", priority: "medium" },
    ],
  },

  pterygium: {
    triggered_by: [
      { region: "bulbar_conj_nasal", finding: "pterygium", weight: 3 },
      { region: "bulbar_conj_temporal", finding: "pterygium", weight: 3 },
      { region: "cornea_nasal", finding: "pannus", weight: 2 },
    ],
    expected_findings: [
      { region: "bulbar_conj_nasal", finding: "pterygium", qualifiers: ["nasal", "small", "medium", "large", "encroaching K", "inflamed", "non inflamed"], priority: "high", prompt: "Document pterygium — size, corneal encroachment, inflammation" },
      { region: "cornea_nasal", finding: "pannus", priority: "medium", prompt: "Measure corneal involvement" },
      { region: "cornea_nasal", finding: "staining", priority: "low", prompt: "Check for staining at pterygium head" },
    ],
    expected_symptoms: [
      { symptom: "Irritation", priority: "medium" },
      { symptom: "Red eye", priority: "medium" },
      { symptom: "Blur", priority: "low" },
    ],
  },

  conj_nevus: {
    triggered_by: [
      { region: "bulbar_conj_nasal", finding: "nevus", weight: 3 },
      { region: "bulbar_conj_temporal", finding: "nevus", weight: 3 },
      { region: "bulbar_conj_inferior", finding: "nevus", weight: 3 },
    ],
    expected_findings: [
      { region: "bulbar_conj_nasal", finding: "nevus", qualifiers: ["small", "medium", "flat", "cysts present", "stable by hx"], priority: "high", prompt: "Document nevus — size, cysts (benign indicator), pigmentation, stability" },
      { region: "bulbar_conj_temporal", finding: "nevus", priority: "medium", prompt: "Check for additional lesions" },
    ],
    expected_symptoms: [],
  },

  pam: {
    triggered_by: [
      { region: "bulbar_conj_nasal", finding: "PAM", weight: 3 },
      { region: "bulbar_conj_temporal", finding: "PAM", weight: 3 },
      { region: "bulbar_conj_inferior", finding: "PAM", weight: 3 },
      { region: "bulbar_conj_superior", finding: "PAM", weight: 3 },
    ],
    expected_findings: [
      { region: "bulbar_conj_nasal", finding: "PAM", qualifiers: ["focal", "multifocal", "flat", "irregular borders"], priority: "high", prompt: "Document PAM — extent, borders, corneal extension" },
      { region: "cornea_nasal", finding: "pannus", priority: "medium", prompt: "Check for corneal extension of pigment" },
    ],
    expected_symptoms: [],
  },

  sch: {
    triggered_by: [
      { region: "bulbar_conj_nasal", finding: "SCH", weight: 3 },
      { region: "bulbar_conj_temporal", finding: "SCH", weight: 3 },
      { region: "bulbar_conj_inferior", finding: "SCH", weight: 3 },
      { region: "bulbar_conj_superior", finding: "SCH", weight: 3 },
    ],
    expected_findings: [
      { region: "bulbar_conj_temporal", finding: "SCH", qualifiers: ["small", "medium", "large", "flat"], priority: "high", prompt: "Document SCH — size, location, flat vs bullous" },
      { region: "anterior_chamber", finding: "normal", priority: "medium", prompt: "Confirm no AC involvement (rule out trauma)" },
    ],
    expected_symptoms: [
      { symptom: "Red eye", priority: "high" },
    ],
  },

  conj_cyst: {
    triggered_by: [
      { region: "bulbar_conj_nasal", finding: "cyst", weight: 3 },
      { region: "bulbar_conj_temporal", finding: "cyst", weight: 3 },
      { region: "bulbar_conj_inferior", finding: "cyst", weight: 3 },
    ],
    expected_findings: [
      { region: "bulbar_conj_nasal", finding: "cyst", qualifiers: ["small", "medium", "clear", "translucent", "non tender"], priority: "high", prompt: "Document cyst — size, appearance, mobility" },
      { region: "bulbar_conj_temporal", finding: "cyst", priority: "medium", prompt: "Check for additional cysts" },
    ],
    expected_symptoms: [
      { symptom: "Irritation", priority: "low" },
    ],
  },

  gpc: {
    triggered_by: [
      { region: "palpebral_conj_upper", finding: "GPC", weight: 3 },
      { region: "palpebral_conj_lower", finding: "GPC", weight: 2 },
      { region: "palpebral_conj_upper", finding: "papillae", weight: 2 },
      { region: "bulbar_conj_superior", finding: "injection", weight: 1 },
    ],
    expected_findings: [
      { region: "palpebral_conj_upper", finding: "GPC", qualifiers: ["mild", "mod", "sev", "upper tarsal", "CL related suspected"], priority: "high", prompt: "Evert upper lid — grade GPC" },
      { region: "palpebral_conj_upper", finding: "papillae", qualifiers: ["2+", "3+"], priority: "high", prompt: "Grade papillary hypertrophy" },
      { region: "cornea_superior", finding: "SPK", priority: "medium", prompt: "Check superior cornea for SPK" },
    ],
    expected_symptoms: [
      { symptom: "Itching", priority: "high" },
      { symptom: "Irritation", priority: "high" },
      { symptom: "Blur", priority: "medium" },
    ],
  },

  dry_eye_conj_staining: {
    triggered_by: [
      { region: "bulbar_conj_nasal", finding: "staining", weight: 3 },
      { region: "bulbar_conj_temporal", finding: "staining", weight: 3 },
      { region: "tear_film", finding: "reduced TBUT", weight: 2 },
      { region: "tear_film", finding: "meniscus low", weight: 2 },
      { region: "cornea_inferior", finding: "SPK", weight: 1 },
    ],
    expected_findings: [
      { region: "bulbar_conj_nasal", finding: "staining", priority: "high", prompt: "Grade nasal conjunctival staining (lissamine green)" },
      { region: "bulbar_conj_temporal", finding: "staining", priority: "high", prompt: "Grade temporal conjunctival staining" },
      { region: "tear_film", finding: "reduced TBUT", priority: "medium", prompt: "Assess tear stability" },
      { region: "cornea_inferior", finding: "SPK", priority: "medium", prompt: "Check for concurrent corneal staining" },
    ],
    expected_symptoms: [
      { symptom: "Dryness", priority: "high" },
      { symptom: "Irritation", priority: "high" },
      { symptom: "FB sensation", priority: "medium" },
    ],
  },

  // ─────────────────────────────────────────────
  // CORNEA / OCULAR SURFACE
  // ─────────────────────────────────────────────

  dry_eye_disease: {
    triggered_by: [
      { region: "cornea_inferior", finding: "SPK", weight: 3 },
      { region: "tear_film", finding: "reduced TBUT", weight: 3 },
      { region: "tear_film", finding: "meniscus low", weight: 3 },
      { region: "lower_lid_margin", finding: "MGD", weight: 2 },
      { region: "cornea_diffuse", finding: "SPK", weight: 2 },
      { region: "cornea_inferior", finding: "staining", weight: 2 },
      { region: "tear_film", finding: "debris", weight: 1 },
      { region: "tear_film", finding: "oily layer poor", weight: 1 },
      { region: "tear_film", finding: "stringy mucus", weight: 1 },
    ],
    expected_findings: [
      { region: "cornea_inferior", finding: "SPK", qualifiers: ["trace", "1+", "2+", "3+", "inferior"], priority: "high", prompt: "Grade inferior corneal staining" },
      { region: "tear_film", finding: "reduced TBUT", qualifiers: ["mild", "mod", "sev"], priority: "high", prompt: "Measure TBUT" },
      { region: "tear_film", finding: "meniscus low", qualifiers: ["mild", "mod", "sev"], priority: "high", prompt: "Assess tear meniscus height" },
      { region: "lower_lid_margin", finding: "MGD", priority: "medium", prompt: "Check for concurrent MGD" },
    ],
    expected_symptoms: [
      { symptom: "Dryness", priority: "high" },
      { symptom: "FB sensation", priority: "high" },
      { symptom: "Irritation", priority: "high" },
      { symptom: "Computer discomfort", priority: "medium" },
      { symptom: "Blur", priority: "medium" },
      { symptom: "Tearing", priority: "medium" },
    ],
  },

  exposure_keratopathy: {
    triggered_by: [
      { region: "cornea_inferior", finding: "staining", weight: 3 },
      { region: "cornea_inferior", finding: "SPK", weight: 3 },
      { region: "lower_lid", finding: "retraction", weight: 2 },
      { region: "lower_lid", finding: "ectropion", weight: 2 },
      { region: "upper_lid", finding: "retraction", weight: 2 },
    ],
    expected_findings: [
      { region: "cornea_inferior", finding: "staining", qualifiers: ["exposure pattern", "inferior"], priority: "high", prompt: "Grade inferior exposure staining pattern" },
      { region: "cornea_inferior", finding: "SPK", qualifiers: ["inferior"], priority: "high", prompt: "Grade inferior SPK" },
      { region: "lower_lid", finding: "ectropion", priority: "medium", prompt: "Assess lid position — lagophthalmos, incomplete blink?" },
      { region: "tear_film", finding: "reduced TBUT", priority: "medium", prompt: "Assess tear stability" },
    ],
    expected_symptoms: [
      { symptom: "Irritation", priority: "high" },
      { symptom: "FB sensation", priority: "high" },
      { symptom: "Dryness", priority: "medium" },
      { symptom: "Red eye", priority: "medium" },
    ],
  },

  spk: {
    triggered_by: [
      { region: "cornea_inferior", finding: "SPK", weight: 3 },
      { region: "cornea_diffuse", finding: "SPK", weight: 3 },
      { region: "cornea_superior", finding: "SPK", weight: 3 },
      { region: "cornea_central", finding: "SPK", weight: 3 },
      { region: "cornea_nasal", finding: "SPK", weight: 2 },
      { region: "cornea_temporal", finding: "SPK", weight: 2 },
    ],
    expected_findings: [
      { region: "cornea_inferior", finding: "SPK", qualifiers: ["trace", "1+", "2+", "3+", "inferior", "diffuse"], priority: "high", prompt: "Grade SPK — location and density" },
      { region: "tear_film", finding: "reduced TBUT", priority: "medium", prompt: "Check tear film for underlying cause" },
      { region: "lower_lid_margin", finding: "MGD", priority: "medium", prompt: "Assess lid margins for contributing factors" },
    ],
    expected_symptoms: [
      { symptom: "Irritation", priority: "high" },
      { symptom: "FB sensation", priority: "medium" },
      { symptom: "Tearing", priority: "medium" },
    ],
  },

  pee: {
    triggered_by: [
      { region: "cornea_inferior", finding: "PEE", weight: 3 },
      { region: "cornea_diffuse", finding: "PEE", weight: 3 },
      { region: "cornea_central", finding: "PEE", weight: 3 },
      { region: "cornea_superior", finding: "PEE", weight: 2 },
    ],
    expected_findings: [
      { region: "cornea_inferior", finding: "PEE", qualifiers: ["trace", "1+", "2+", "inferior", "diffuse"], priority: "high", prompt: "Grade PEE — location and density" },
      { region: "tear_film", finding: "reduced TBUT", priority: "medium", prompt: "Assess tear film" },
      { region: "cornea_inferior", finding: "staining", priority: "medium", prompt: "Note staining pattern" },
    ],
    expected_symptoms: [
      { symptom: "Irritation", priority: "high" },
      { symptom: "FB sensation", priority: "medium" },
      { symptom: "Tearing", priority: "medium" },
    ],
  },

  rce: {
    triggered_by: [
      { region: "cornea_central", finding: "abrasion", weight: 3 },
      { region: "cornea_central", finding: "ABMD", weight: 2 },
      { region: "cornea_inferior", finding: "abrasion", weight: 2 },
      { region: "cornea_diffuse", finding: "PEE", weight: 1 },
      { region: "cornea_central", finding: "staining", weight: 1 },
    ],
    expected_findings: [
      { region: "cornea_central", finding: "abrasion", qualifiers: ["small", "medium", "staining positive"], priority: "high", prompt: "Document erosion — size, location, staining" },
      { region: "cornea_central", finding: "ABMD", qualifiers: ["map", "dot", "fingerprint", "recurrent erosion hx"], priority: "high", prompt: "Look for underlying ABMD" },
      { region: "cornea_diffuse", finding: "staining", priority: "medium", prompt: "Map staining extent" },
    ],
    expected_symptoms: [
      { symptom: "Pain", priority: "high" },
      { symptom: "Tearing", priority: "high" },
      { symptom: "FB sensation", priority: "high" },
      { symptom: "Blur", priority: "medium" },
      { symptom: "Photophobia", priority: "medium" },
    ],
  },

  corneal_abrasion: {
    triggered_by: [
      { region: "cornea_central", finding: "abrasion", weight: 3 },
      { region: "cornea_inferior", finding: "abrasion", weight: 3 },
      { region: "cornea_nasal", finding: "abrasion", weight: 3 },
      { region: "cornea_temporal", finding: "abrasion", weight: 3 },
      { region: "cornea_superior", finding: "abrasion", weight: 3 },
      { region: "cornea_diffuse", finding: "abrasion", weight: 3 },
    ],
    expected_findings: [
      { region: "cornea_central", finding: "abrasion", qualifiers: ["small", "medium", "large", "staining positive", "Seidel negative"], priority: "high", prompt: "Document abrasion — size, location, Seidel test" },
      { region: "anterior_chamber", finding: "cell", qualifiers: ["trace", "0.5+"], priority: "medium", prompt: "Check AC for traumatic reaction" },
      { region: "palpebral_conj_upper", finding: "FB", priority: "medium", prompt: "Evert upper lid — rule out retained FB" },
    ],
    expected_symptoms: [
      { symptom: "Pain", priority: "high" },
      { symptom: "Tearing", priority: "high" },
      { symptom: "FB sensation", priority: "high" },
      { symptom: "Photophobia", priority: "medium" },
      { symptom: "Red eye", priority: "medium" },
    ],
  },

  corneal_foreign_body: {
    triggered_by: [
      { region: "cornea_central", finding: "foreign body", weight: 3 },
      { region: "cornea_inferior", finding: "foreign body", weight: 3 },
      { region: "cornea_superior", finding: "foreign body", weight: 3 },
      { region: "cornea_nasal", finding: "foreign body", weight: 3 },
      { region: "cornea_temporal", finding: "foreign body", weight: 3 },
      { region: "cornea_diffuse", finding: "foreign body", weight: 3 },
    ],
    expected_findings: [
      { region: "cornea_central", finding: "foreign body", qualifiers: ["metallic", "organic", "superficial", "embedded", "rust ring present", "rust ring absent"], priority: "high", prompt: "Characterize FB — type, depth, rust ring" },
      { region: "cornea_central", finding: "infiltrate", qualifiers: ["small"], priority: "medium", prompt: "Check for surrounding infiltrate" },
      { region: "anterior_chamber", finding: "cell", priority: "medium", prompt: "Check AC for reaction" },
      { region: "palpebral_conj_upper", finding: "FB", priority: "medium", prompt: "Evert upper lid — rule out additional FB" },
    ],
    expected_symptoms: [
      { symptom: "FB sensation", priority: "high" },
      { symptom: "Pain", priority: "high" },
      { symptom: "Tearing", priority: "medium" },
      { symptom: "Red eye", priority: "medium" },
    ],
  },

  corneal_ulcer: {
    triggered_by: [
      { region: "cornea_central", finding: "ulcer", weight: 3 },
      { region: "cornea_diffuse", finding: "ulcer", weight: 3 },
      { region: "cornea_inferior", finding: "ulcer", weight: 3 },
      { region: "cornea_central", finding: "infiltrate", weight: 2 },
      { region: "anterior_chamber", finding: "cell", weight: 1 },
    ],
    expected_findings: [
      { region: "cornea_central", finding: "ulcer", qualifiers: ["small", "medium", "large", "central", "paracentral", "epi defect present", "stromal infiltrate present"], priority: "high", prompt: "Document ulcer — size, location, infiltrate, thinning" },
      { region: "anterior_chamber", finding: "cell", qualifiers: ["1+", "2+", "3+"], priority: "high", prompt: "Grade AC reaction" },
      { region: "anterior_chamber", finding: "hypopyon", priority: "medium", prompt: "Check for hypopyon" },
      { region: "bulbar_conj_nasal", finding: "injection", qualifiers: ["diffuse"], priority: "medium", prompt: "Grade injection" },
    ],
    expected_symptoms: [
      { symptom: "Pain", priority: "high" },
      { symptom: "Red eye", priority: "high" },
      { symptom: "Photophobia", priority: "high" },
      { symptom: "Discharge", priority: "medium" },
      { symptom: "Blur", priority: "medium" },
    ],
  },

  sterile_infiltrate: {
    triggered_by: [
      { region: "cornea_central", finding: "infiltrate", weight: 3 },
      { region: "cornea_inferior", finding: "infiltrate", weight: 3 },
      { region: "cornea_diffuse", finding: "infiltrate", weight: 3 },
      { region: "cornea_nasal", finding: "infiltrate", weight: 2 },
      { region: "cornea_temporal", finding: "infiltrate", weight: 2 },
    ],
    expected_findings: [
      { region: "cornea_inferior", finding: "infiltrate", qualifiers: ["small", "peripheral", "sterile appearing", "overlying stain absent"], priority: "high", prompt: "Document infiltrate — size, location, overlying epithelium" },
      { region: "anterior_chamber", finding: "cell", priority: "medium", prompt: "Check AC reaction (expect minimal in sterile)" },
      { region: "bulbar_conj_nasal", finding: "injection", priority: "medium", prompt: "Grade surrounding injection" },
    ],
    expected_symptoms: [
      { symptom: "Irritation", priority: "medium" },
      { symptom: "Red eye", priority: "medium" },
      { symptom: "Pain", priority: "low" },
    ],
  },

  infectious_keratitis: {
    triggered_by: [
      { region: "cornea_central", finding: "ulcer", weight: 3 },
      { region: "cornea_central", finding: "infiltrate", weight: 3 },
      { region: "cornea_diffuse", finding: "infiltrate", weight: 3 },
      { region: "anterior_chamber", finding: "cell", weight: 2 },
      { region: "anterior_chamber", finding: "hypopyon", weight: 2 },
    ],
    expected_findings: [
      { region: "cornea_central", finding: "ulcer", qualifiers: ["epi defect present", "stromal infiltrate present", "AC rxn present"], priority: "high", prompt: "Document ulcer with infiltrate — size, depth, culture if indicated" },
      { region: "cornea_central", finding: "infiltrate", qualifiers: ["infectious appearing", "overlying stain present"], priority: "high", prompt: "Grade infiltrate" },
      { region: "anterior_chamber", finding: "cell", qualifiers: ["2+", "3+", "4+"], priority: "high", prompt: "Grade AC reaction" },
      { region: "anterior_chamber", finding: "hypopyon", priority: "medium", prompt: "Check for hypopyon" },
    ],
    expected_symptoms: [
      { symptom: "Pain", priority: "high" },
      { symptom: "Red eye", priority: "high" },
      { symptom: "Photophobia", priority: "high" },
      { symptom: "Discharge", priority: "medium" },
      { symptom: "Blur", priority: "medium" },
    ],
  },

  abmd: {
    triggered_by: [
      { region: "cornea_central", finding: "ABMD", weight: 3 },
      { region: "cornea_inferior", finding: "ABMD", weight: 3 },
      { region: "cornea_diffuse", finding: "ABMD", weight: 3 },
      { region: "cornea_superior", finding: "ABMD", weight: 2 },
    ],
    expected_findings: [
      { region: "cornea_central", finding: "ABMD", qualifiers: ["map", "dot", "fingerprint", "mild", "mod"], priority: "high", prompt: "Characterize ABMD — map/dot/fingerprint patterns, location" },
      { region: "cornea_central", finding: "staining", priority: "medium", prompt: "Check for negative staining over map changes" },
      { region: "cornea_central", finding: "abrasion", priority: "low", prompt: "Look for any active erosion" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "medium" },
      { symptom: "Pain", priority: "low" },
      { symptom: "FB sensation", priority: "low" },
    ],
  },

  kcn: {
    triggered_by: [
      { region: "cornea_central", finding: "ectasia", weight: 3 },
      { region: "cornea_inferior", finding: "ectasia", weight: 3 },
      { region: "cornea_central", finding: "thinning", weight: 3 },
      { region: "cornea_inferior", finding: "thinning", weight: 3 },
      { region: "cornea_central", finding: "striae", weight: 2 },
      { region: "cornea_central", finding: "hydrops", weight: 2 },
    ],
    expected_findings: [
      { region: "cornea_central", finding: "ectasia", qualifiers: ["inferior steepening", "paracentral cone", "apical thinning", "Fleischer ring", "Vogt striae"], priority: "high", prompt: "Document cone — steepening, thinning, Fleischer ring, striae" },
      { region: "cornea_central", finding: "thinning", qualifiers: ["central", "focal"], priority: "high", prompt: "Assess stromal thinning" },
      { region: "cornea_central", finding: "striae", priority: "medium", prompt: "Look for Vogt striae" },
      { region: "cornea_central", finding: "scar", qualifiers: ["faint", "central"], priority: "medium", prompt: "Note any apical scarring" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "high" },
      { symptom: "Distortion", priority: "high" },
      { symptom: "Reduced night vision", priority: "medium" },
    ],
  },

  corneal_edema: {
    triggered_by: [
      { region: "cornea_central", finding: "edema", weight: 3 },
      { region: "cornea_diffuse", finding: "edema", weight: 3 },
      { region: "cornea_inferior", finding: "edema", weight: 2 },
    ],
    expected_findings: [
      { region: "cornea_central", finding: "edema", qualifiers: ["trace", "1+", "2+", "3+", "microcystic", "stromal", "Descemet folds present"], priority: "high", prompt: "Grade corneal edema — type, extent, Descemet folds" },
      { region: "cornea_central", finding: "guttata", priority: "medium", prompt: "Check for guttata (Fuchs)" },
      { region: "anterior_chamber", finding: "shallow", priority: "medium", prompt: "Assess AC depth" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "high" },
      { symptom: "Photophobia", priority: "medium" },
      { symptom: "Pain", priority: "medium" },
    ],
  },

  fuchs: {
    triggered_by: [
      { region: "cornea_central", finding: "guttata", weight: 3 },
      { region: "cornea_diffuse", finding: "guttata", weight: 3 },
      { region: "cornea_central", finding: "edema", weight: 2 },
      { region: "cornea_diffuse", finding: "edema", weight: 2 },
    ],
    expected_findings: [
      { region: "cornea_central", finding: "guttata", qualifiers: ["trace", "1+", "2+", "3+", "central", "diffuse"], priority: "high", prompt: "Grade guttata — density, distribution" },
      { region: "cornea_central", finding: "edema", qualifiers: ["microcystic", "stromal", "Descemet folds present"], priority: "high", prompt: "Assess for corneal edema/decompensation" },
      { region: "cornea_diffuse", finding: "edema", priority: "medium", prompt: "Note edema extent" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "high" },
      { symptom: "Photophobia", priority: "medium" },
    ],
  },

  cl_irritation: {
    triggered_by: [
      { region: "cornea_diffuse", finding: "SPK", weight: 2 },
      { region: "cornea_inferior", finding: "SPK", weight: 2 },
      { region: "bulbar_conj_nasal", finding: "injection", weight: 1 },
      { region: "bulbar_conj_temporal", finding: "injection", weight: 1 },
      { region: "cornea_superior", finding: "SPK", weight: 1 },
    ],
    expected_findings: [
      { region: "cornea_diffuse", finding: "SPK", qualifiers: ["trace", "1+", "2+"], priority: "high", prompt: "Grade corneal staining — pattern may indicate CL fit issue" },
      { region: "bulbar_conj_nasal", finding: "injection", qualifiers: ["trace", "1+"], priority: "medium", prompt: "Note injection" },
      { region: "palpebral_conj_upper", finding: "papillae", priority: "medium", prompt: "Check for GPC on eversion" },
    ],
    expected_symptoms: [
      { symptom: "Irritation", priority: "high" },
      { symptom: "Dryness", priority: "medium" },
      { symptom: "Red eye", priority: "medium" },
    ],
  },

  cl_overwear: {
    triggered_by: [
      { region: "cornea_diffuse", finding: "SPK", weight: 3 },
      { region: "cornea_superior", finding: "NV", weight: 3 },
      { region: "cornea_superior", finding: "pannus", weight: 2 },
      { region: "bulbar_conj_nasal", finding: "injection", weight: 2 },
      { region: "cornea_inferior", finding: "SPK", weight: 2 },
    ],
    expected_findings: [
      { region: "cornea_diffuse", finding: "SPK", qualifiers: ["2+", "3+", "diffuse"], priority: "high", prompt: "Grade corneal staining — diffuse pattern suggests overwear" },
      { region: "cornea_superior", finding: "NV", qualifiers: ["sup", "superficial"], priority: "high", prompt: "Check for superior corneal neovascularization" },
      { region: "cornea_superior", finding: "pannus", qualifiers: ["sup"], priority: "medium", prompt: "Assess for pannus" },
      { region: "bulbar_conj_nasal", finding: "injection", priority: "medium", prompt: "Grade injection" },
    ],
    expected_symptoms: [
      { symptom: "Irritation", priority: "high" },
      { symptom: "Red eye", priority: "high" },
      { symptom: "Dryness", priority: "medium" },
      { symptom: "Blur", priority: "medium" },
    ],
  },

  // ─────────────────────────────────────────────
  // AC / IRIS / LENS
  // ─────────────────────────────────────────────

  anterior_uveitis: {
    triggered_by: [
      { region: "anterior_chamber", finding: "cell", weight: 3 },
      { region: "anterior_chamber", finding: "flare", weight: 3 },
      { region: "iris", finding: "synechiae", weight: 2 },
      { region: "bulbar_conj_nasal", finding: "injection", weight: 1 },
      { region: "pupil", finding: "irregular", weight: 1 },
    ],
    expected_findings: [
      { region: "anterior_chamber", finding: "cell", qualifiers: ["0.5+", "1+", "2+", "3+", "4+"], priority: "high", prompt: "Grade AC cells" },
      { region: "anterior_chamber", finding: "flare", qualifiers: ["trace", "1+", "2+", "3+"], priority: "high", prompt: "Grade AC flare" },
      { region: "iris", finding: "synechiae", qualifiers: ["posterior", "focal"], priority: "medium", prompt: "Check for posterior synechiae" },
      { region: "bulbar_conj_nasal", finding: "injection", qualifiers: ["diffuse"], priority: "medium", prompt: "Note ciliary flush / limbal injection" },
    ],
    expected_symptoms: [
      { symptom: "Pain", priority: "high" },
      { symptom: "Photophobia", priority: "high" },
      { symptom: "Red eye", priority: "high" },
      { symptom: "Blur", priority: "medium" },
    ],
  },

  narrow_angle: {
    triggered_by: [
      { region: "anterior_chamber", finding: "shallow", weight: 3 },
      { region: "anterior_chamber", finding: "angle narrow by VH", weight: 3 },
    ],
    expected_findings: [
      { region: "anterior_chamber", finding: "shallow", qualifiers: ["mild", "mod", "marked", "angle concern noted"], priority: "high", prompt: "Grade AC depth — Van Herick estimation" },
      { region: "anterior_chamber", finding: "angle narrow by VH", priority: "high", prompt: "Document Van Herick grade" },
      { region: "iris", finding: "normal", priority: "medium", prompt: "Check iris configuration — plateau vs bombe" },
    ],
    expected_symptoms: [],
  },

  hyphema: {
    triggered_by: [
      { region: "anterior_chamber", finding: "hyphema", weight: 3 },
      { region: "anterior_chamber", finding: "cell", weight: 1 },
    ],
    expected_findings: [
      { region: "anterior_chamber", finding: "hyphema", qualifiers: ["microhyphema", "layered", "traumatic suspected"], priority: "high", prompt: "Grade hyphema — micro vs layered, percent fill, etiology" },
      { region: "iris", finding: "synechiae", priority: "medium", prompt: "Check for iris abnormality" },
      { region: "cornea_diffuse", finding: "edema", priority: "medium", prompt: "Check for corneal blood staining" },
    ],
    expected_symptoms: [
      { symptom: "Pain", priority: "high" },
      { symptom: "Blur", priority: "high" },
      { symptom: "Red eye", priority: "medium" },
      { symptom: "Photophobia", priority: "medium" },
    ],
  },

  iris_nevus: {
    triggered_by: [
      { region: "iris", finding: "nevus", weight: 3 },
    ],
    expected_findings: [
      { region: "iris", finding: "nevus", qualifiers: ["small", "medium", "flat", "elevated", "stable by hx"], priority: "high", prompt: "Document iris nevus — size, elevation, vascularity, stability" },
      { region: "pupil", finding: "normal", priority: "medium", prompt: "Check pupil shape and reactivity near nevus" },
    ],
    expected_symptoms: [],
  },

  pciol: {
    triggered_by: [
      { region: "lens", finding: "PCIOL", weight: 3 },
    ],
    expected_findings: [
      { region: "lens", finding: "PCIOL", qualifiers: ["centered", "decentered", "clear capsule", "PCO present"], priority: "high", prompt: "Document IOL — centration, capsule clarity" },
      { region: "anterior_chamber", finding: "deep", priority: "medium", prompt: "Note AC depth" },
    ],
    expected_symptoms: [],
  },

  cataract_ns: {
    triggered_by: [
      { region: "lens", finding: "NS", weight: 3 },
    ],
    expected_findings: [
      { region: "lens", finding: "NS", qualifiers: ["trace", "1+", "2+", "3+", "4+"], priority: "high", prompt: "Grade nuclear sclerosis" },
      { region: "lens", finding: "CSC", priority: "medium", prompt: "Check for concurrent cortical changes" },
      { region: "lens", finding: "PSC", priority: "medium", prompt: "Check for concurrent PSC" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "high" },
      { symptom: "Distance blur", priority: "medium" },
      { symptom: "Reduced night vision", priority: "medium" },
    ],
  },

  cataract_csc: {
    triggered_by: [
      { region: "lens", finding: "CSC", weight: 3 },
    ],
    expected_findings: [
      { region: "lens", finding: "CSC", qualifiers: ["trace", "1+", "2+", "3+", "4+"], priority: "high", prompt: "Grade cortical spoking" },
      { region: "lens", finding: "NS", priority: "medium", prompt: "Check for concurrent nuclear sclerosis" },
      { region: "lens", finding: "PSC", priority: "medium", prompt: "Check for concurrent PSC" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "medium" },
    ],
  },

  cataract_psc: {
    triggered_by: [
      { region: "lens", finding: "PSC", weight: 3 },
    ],
    expected_findings: [
      { region: "lens", finding: "PSC", qualifiers: ["trace", "1+", "2+", "3+", "central", "paracentral"], priority: "high", prompt: "Grade PSC — density, central involvement" },
      { region: "lens", finding: "NS", priority: "medium", prompt: "Check for concurrent NS" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "high" },
      { symptom: "Near blur", priority: "high" },
      { symptom: "Photophobia", priority: "medium" },
    ],
  },

  pco: {
    triggered_by: [
      { region: "lens", finding: "PCIOL", weight: 2 },
    ],
    expected_findings: [
      { region: "lens", finding: "PCIOL", qualifiers: ["PCO present"], priority: "high", prompt: "Grade PCO — density, visual significance" },
      { region: "fovea", finding: "normal reflex", priority: "medium", prompt: "Verify macula is healthy (VA not from posterior cause)" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "high" },
      { symptom: "Near blur", priority: "medium" },
    ],
  },

  // ─────────────────────────────────────────────
  // POSTERIOR SEGMENT
  // ─────────────────────────────────────────────

  pvd: {
    triggered_by: [
      { region: "vitreous", finding: "PVD", weight: 3 },
      { region: "vitreous", finding: "pigment cells", weight: 2 },
    ],
    expected_findings: [
      { region: "vitreous", finding: "PVD", qualifiers: ["acute symptomatic", "chronic", "Weiss ring present"], priority: "high", prompt: "Document PVD — acute vs chronic, Weiss ring" },
      { region: "vitreous", finding: "pigment cells", qualifiers: ["trace", "present", "Shafer positive"], priority: "high", prompt: "Check for pigment cells (Shafer sign) — if positive, rule out tear" },
      { region: "far_periphery", finding: "tear", priority: "high", prompt: "Dilated exam — rule out retinal tear" },
    ],
    expected_symptoms: [
      { symptom: "Floaters", priority: "high" },
      { symptom: "Flashes", priority: "high" },
    ],
  },

  vitreous_syneresis: {
    triggered_by: [
      { region: "vitreous", finding: "syneresis", weight: 3 },
      { region: "vitreous", finding: "PVD", weight: 1 },
    ],
    expected_findings: [
      { region: "vitreous", finding: "syneresis", priority: "high", prompt: "Document vitreous syneresis" },
      { region: "vitreous", finding: "PVD", priority: "medium", prompt: "Rule out concurrent PVD" },
    ],
    expected_symptoms: [
      { symptom: "Floaters", priority: "high" },
    ],
  },

  vitreous_hemorrhage: {
    triggered_by: [
      { region: "vitreous", finding: "vitreous heme", weight: 3 },
    ],
    expected_findings: [
      { region: "vitreous", finding: "vitreous heme", qualifiers: ["trace", "mild", "mod", "dense", "view reduced"], priority: "high", prompt: "Grade vitreous hemorrhage — density, view to fundus" },
      { region: "far_periphery", finding: "tear", priority: "high", prompt: "Rule out retinal tear/detachment if view permits" },
      { region: "optic_nerve", finding: "normal", priority: "medium", prompt: "Assess disc if visible" },
    ],
    expected_symptoms: [
      { symptom: "Floaters", priority: "high" },
      { symptom: "Blur", priority: "high" },
      { symptom: "Flashes", priority: "medium" },
    ],
  },

  disc_edema: {
    triggered_by: [
      { region: "optic_nerve", finding: "edema", weight: 3 },
      { region: "optic_nerve", finding: "elevated disc", weight: 3 },
      { region: "optic_nerve", finding: "heme", weight: 1 },
    ],
    expected_findings: [
      { region: "optic_nerve", finding: "edema", qualifiers: ["mild", "mod", "marked", "blurred margins", "elevation", "hyperemia"], priority: "high", prompt: "Grade disc edema — margins, elevation, color, SVP" },
      { region: "optic_nerve", finding: "heme", qualifiers: ["splinter"], priority: "medium", prompt: "Check for peripapillary hemorrhages" },
      { region: "macula", finding: "normal", priority: "medium", prompt: "Assess macula for edema/star figure" },
      { region: "retinal_vessels", finding: "tortuosity", priority: "medium", prompt: "Assess vessel changes" },
    ],
    expected_symptoms: [
      { symptom: "Headache", priority: "high" },
      { symptom: "Blur", priority: "medium" },
      { symptom: "Diplopia", priority: "low" },
    ],
  },

  optic_atrophy: {
    triggered_by: [
      { region: "optic_nerve", finding: "pallor", weight: 3 },
    ],
    expected_findings: [
      { region: "optic_nerve", finding: "pallor", qualifiers: ["temporal", "diffuse", "sectoral", "mild", "mod", "marked"], priority: "high", prompt: "Document disc pallor — location, severity" },
      { region: "optic_nerve", finding: "cupping", priority: "medium", prompt: "Assess cup-to-disc ratio" },
      { region: "pupil", finding: "normal", priority: "medium", prompt: "Check for RAPD" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "high" },
    ],
  },

  glaucomatous_cupping: {
    triggered_by: [
      { region: "optic_nerve", finding: "cupping", weight: 3 },
      { region: "optic_nerve", finding: "heme", weight: 1 },
    ],
    expected_findings: [
      { region: "optic_nerve", finding: "cupping", qualifiers: ["mod", "large", "asymmetric", "vertical enlargement", "thin inf rim", "thin sup rim", "notching present"], priority: "high", prompt: "Grade cupping — C/D ratio, NRR, notching, asymmetry" },
      { region: "optic_nerve", finding: "heme", qualifiers: ["splinter", "inferotemporal"], priority: "medium", prompt: "Check for disc hemorrhage" },
      { region: "optic_nerve", finding: "PPA", priority: "medium", prompt: "Note peripapillary atrophy" },
    ],
    expected_symptoms: [],
  },

  tilted_disc: {
    triggered_by: [
      { region: "optic_nerve", finding: "tilted disc", weight: 3 },
    ],
    expected_findings: [
      { region: "optic_nerve", finding: "tilted disc", qualifiers: ["myopic appearance", "oblique insertion", "PPA present", "stable"], priority: "high", prompt: "Document tilted disc — orientation, PPA" },
      { region: "optic_nerve", finding: "PPA", priority: "medium", prompt: "Document associated PPA" },
    ],
    expected_symptoms: [],
  },

  disc_drusen: {
    triggered_by: [
      { region: "optic_nerve", finding: "drusen", weight: 3 },
      { region: "optic_nerve", finding: "elevated disc", weight: 1 },
    ],
    expected_findings: [
      { region: "optic_nerve", finding: "drusen", qualifiers: ["buried", "visible", "elevated lumpy contour"], priority: "high", prompt: "Document disc drusen — buried vs visible, contour" },
      { region: "optic_nerve", finding: "elevated disc", priority: "medium", prompt: "Note disc elevation" },
    ],
    expected_symptoms: [],
  },

  choroidal_nevus: {
    triggered_by: [
      { region: "temporal_retina", finding: "pigmented lesion", weight: 3 },
      { region: "nasal_retina", finding: "pigmented lesion", weight: 3 },
      { region: "inferior_retina", finding: "pigmented lesion", weight: 3 },
      { region: "superior_retina", finding: "pigmented lesion", weight: 3 },
      { region: "IT_midperiphery", finding: "pigmented lesion", weight: 3 },
      { region: "macula", finding: "pigmented lesion" },
    ],
    expected_findings: [
      { region: "temporal_retina", finding: "pigmented lesion", qualifiers: ["flat", "small", "medium", "distinct margins", "drusen present", "SRF absent", "orange pigment absent"], priority: "high", prompt: "Document nevus — size, elevation, margins, drusen, SRF, orange pigment (TFSOM-UHHD)" },
      { region: "macula", finding: "SRF", priority: "medium", prompt: "Check for SRF near lesion" },
    ],
    expected_symptoms: [],
  },

  chrpe: {
    triggered_by: [
      { region: "temporal_retina", finding: "pigmented lesion", weight: 3 },
      { region: "nasal_retina", finding: "pigmented lesion", weight: 3 },
      { region: "inferior_retina", finding: "pigmented lesion", weight: 3 },
      { region: "far_periphery", finding: "pigmented lesion", weight: 3 },
    ],
    expected_findings: [
      { region: "temporal_retina", finding: "pigmented lesion", qualifiers: ["flat", "sharp borders", "lacunae present"], priority: "high", prompt: "Document CHRPE — flat, well-demarcated, lacunae, bear-track vs solitary" },
    ],
    expected_symptoms: [],
  },

  retinal_hole: {
    triggered_by: [
      { region: "far_periphery", finding: "hole", weight: 3 },
      { region: "IT_midperiphery", finding: "hole", weight: 3 },
      { region: "ST_midperiphery", finding: "hole", weight: 3 },
      { region: "temporal_retina", finding: "hole", weight: 3 },
    ],
    expected_findings: [
      { region: "far_periphery", finding: "hole", qualifiers: ["atrophic", "operculated", "small", "surrounding cuff absent", "surrounding cuff present"], priority: "high", prompt: "Document hole — type, size, cuff of SRF" },
      { region: "far_periphery", finding: "lattice", priority: "medium", prompt: "Check for surrounding lattice" },
      { region: "vitreous", finding: "pigment cells", priority: "medium", prompt: "Check for pigment in vitreous" },
    ],
    expected_symptoms: [
      { symptom: "Flashes", priority: "medium" },
      { symptom: "Floaters", priority: "medium" },
    ],
  },

  retinal_tear: {
    triggered_by: [
      { region: "far_periphery", finding: "tear", weight: 3 },
      { region: "IT_midperiphery", finding: "tear", weight: 3 },
      { region: "ST_midperiphery", finding: "tear", weight: 3 },
      { region: "temporal_retina", finding: "tear", weight: 3 },
      { region: "vitreous", finding: "pigment cells", weight: 2 },
      { region: "vitreous", finding: "vitreous heme", weight: 1 },
    ],
    expected_findings: [
      { region: "far_periphery", finding: "tear", qualifiers: ["horseshoe", "flap", "acute appearing", "heme present", "SRF absent", "SRF present"], priority: "high", prompt: "Document tear — type, size, location, SRF, heme" },
      { region: "vitreous", finding: "pigment cells", qualifiers: ["present", "Shafer positive"], priority: "high", prompt: "Check for pigment cells (Shafer sign)" },
      { region: "far_periphery", finding: "detachment", priority: "high", prompt: "Rule out associated detachment" },
    ],
    expected_symptoms: [
      { symptom: "Flashes", priority: "high" },
      { symptom: "Floaters", priority: "high" },
    ],
  },

  lattice_degeneration: {
    triggered_by: [
      { region: "far_periphery", finding: "lattice", weight: 3 },
      { region: "IT_midperiphery", finding: "lattice", weight: 3 },
      { region: "ST_midperiphery", finding: "lattice", weight: 3 },
      { region: "temporal_retina", finding: "lattice", weight: 2 },
    ],
    expected_findings: [
      { region: "far_periphery", finding: "lattice", qualifiers: ["small area", "broad area", "pigment present", "atrophic holes absent", "atrophic holes present"], priority: "high", prompt: "Document lattice — extent, pigment, atrophic holes" },
      { region: "far_periphery", finding: "hole", priority: "medium", prompt: "Check for holes within lattice" },
      { region: "far_periphery", finding: "tear", priority: "medium", prompt: "Rule out tears at margins" },
    ],
    expected_symptoms: [],
  },

  wwp: {
    triggered_by: [
      { region: "far_periphery", finding: "WWP", weight: 3 },
      { region: "IT_midperiphery", finding: "WWP", weight: 3 },
      { region: "ST_midperiphery", finding: "WWP", weight: 3 },
    ],
    expected_findings: [
      { region: "far_periphery", finding: "WWP", qualifiers: ["small", "broad"], priority: "high", prompt: "Document WWP — extent, location" },
      { region: "far_periphery", finding: "lattice", priority: "medium", prompt: "Check for associated lattice" },
    ],
    expected_symptoms: [],
  },

  pavingstone: {
    triggered_by: [
      { region: "far_periphery", finding: "pavingstone", weight: 3 },
      { region: "IT_midperiphery", finding: "pavingstone", weight: 3 },
      { region: "IN_midperiphery", finding: "pavingstone", weight: 3 },
      { region: "inferior_retina", finding: "pavingstone", weight: 3 },
    ],
    expected_findings: [
      { region: "far_periphery", finding: "pavingstone", qualifiers: ["single", "multiple", "benign appearance"], priority: "high", prompt: "Document pavingstone degeneration — number, location" },
      { region: "inferior_retina", finding: "pavingstone", priority: "medium", prompt: "Check inferior periphery" },
    ],
    expected_symptoms: [],
  },

  retinal_heme: {
    triggered_by: [
      { region: "macula", finding: "heme", weight: 3 },
      { region: "superior_arcade", finding: "heme", weight: 3 },
      { region: "inferior_arcade", finding: "heme", weight: 3 },
      { region: "temporal_retina", finding: "heme", weight: 2 },
      { region: "nasal_retina", finding: "heme", weight: 2 },
    ],
    expected_findings: [
      { region: "superior_arcade", finding: "heme", qualifiers: ["dot blot", "flame", "small", "medium", "localized"], priority: "high", prompt: "Document hemorrhage — type, size, location" },
      { region: "retinal_vessels", finding: "AV nicking", priority: "medium", prompt: "Check for HTN vessel signs" },
      { region: "macula", finding: "heme", priority: "medium", prompt: "Check macula for hemorrhage" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "medium" },
    ],
  },

  cws: {
    triggered_by: [
      { region: "superior_arcade", finding: "CWS", weight: 3 },
      { region: "inferior_arcade", finding: "CWS", weight: 3 },
      { region: "nasal_retina", finding: "CWS", weight: 3 },
      { region: "temporal_retina", finding: "CWS", weight: 2 },
    ],
    expected_findings: [
      { region: "superior_arcade", finding: "CWS", qualifiers: ["single", "multiple", "small"], priority: "high", prompt: "Document CWS — number, location, size" },
      { region: "inferior_arcade", finding: "CWS", priority: "medium", prompt: "Check all arcades" },
      { region: "retinal_vessels", finding: "AV nicking", priority: "medium", prompt: "Assess for HTN changes" },
    ],
    expected_symptoms: [],
  },

  background_dr: {
    triggered_by: [
      { region: "superior_arcade", finding: "microaneurysm", weight: 3 },
      { region: "inferior_arcade", finding: "microaneurysm", weight: 3 },
      { region: "macula", finding: "heme", weight: 2 },
      { region: "superior_arcade", finding: "heme", weight: 2 },
      { region: "inferior_arcade", finding: "heme", weight: 2 },
      { region: "temporal_retina", finding: "exudate", weight: 2 },
      { region: "macula", finding: "exudate" },
    ],
    expected_findings: [
      { region: "superior_arcade", finding: "microaneurysm", qualifiers: ["few", "multiple", "background DR context"], priority: "high", prompt: "Count/grade microaneurysms by quadrant" },
      { region: "superior_arcade", finding: "heme", qualifiers: ["dot blot"], priority: "high", prompt: "Document hemorrhages by quadrant" },
      { region: "temporal_retina", finding: "exudate", qualifiers: ["hard exudate", "focal"], priority: "medium", prompt: "Note exudates — circinate pattern, proximity to macula" },
      { region: "macula", finding: "edema", priority: "high", prompt: "Check for macular edema (CSME)" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "medium" },
    ],
  },

  htn_retinopathy: {
    triggered_by: [
      { region: "retinal_vessels", finding: "AV nicking", weight: 3 },
      { region: "retinal_vessels", finding: "copper wiring", weight: 3 },
      { region: "retinal_vessels", finding: "silver wiring", weight: 3 },
      { region: "retinal_vessels", finding: "attenuation", weight: 2 },
      { region: "superior_arcade", finding: "heme", weight: 1 },
    ],
    expected_findings: [
      { region: "retinal_vessels", finding: "AV nicking", qualifiers: ["mild", "mod", "sev"], priority: "high", prompt: "Grade AV nicking" },
      { region: "retinal_vessels", finding: "copper wiring", priority: "high", prompt: "Assess for copper/silver wiring" },
      { region: "superior_arcade", finding: "heme", qualifiers: ["flame"], priority: "medium", prompt: "Check for flame hemorrhages" },
      { region: "superior_arcade", finding: "CWS", priority: "medium", prompt: "Look for cotton wool spots" },
    ],
    expected_symptoms: [],
  },

  erm: {
    triggered_by: [
      { region: "macula", finding: "ERM", weight: 3 },
      { region: "macula", finding: "pucker", weight: 3 },
      { region: "fovea", finding: "diminished reflex", weight: 1 },
    ],
    expected_findings: [
      { region: "macula", finding: "ERM", qualifiers: ["trace", "mild", "mod", "sev", "foveal distortion absent", "foveal distortion present"], priority: "high", prompt: "Grade ERM — cellophane vs contraction, foveal distortion" },
      { region: "fovea", finding: "diminished reflex", priority: "medium", prompt: "Assess foveal reflex" },
      { region: "macula", finding: "edema", priority: "medium", prompt: "Check for macular edema/thickening" },
    ],
    expected_symptoms: [
      { symptom: "Distortion", priority: "high" },
      { symptom: "Blur", priority: "medium" },
    ],
  },

  macular_hole: {
    triggered_by: [
      { region: "macula", finding: "hole", weight: 3 },
      { region: "fovea", finding: "absent reflex", weight: 2 },
      { region: "fovea", finding: "diminished reflex", weight: 1 },
    ],
    expected_findings: [
      { region: "macula", finding: "hole", qualifiers: ["lamellar", "full thickness suspected", "small", "medium", "operculum present", "operculum absent"], priority: "high", prompt: "Characterize hole — lamellar vs full-thickness, size, operculum" },
      { region: "fovea", finding: "absent reflex", priority: "high", prompt: "Check foveal reflex" },
      { region: "macula", finding: "ERM", priority: "medium", prompt: "Check for associated ERM" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "high" },
      { symptom: "Distortion", priority: "high" },
    ],
  },

  dry_amd: {
    triggered_by: [
      { region: "macula", finding: "drusen", weight: 3 },
      { region: "macula", finding: "RPE change", weight: 3 },
      { region: "macula", finding: "atrophy", weight: 2 },
    ],
    expected_findings: [
      { region: "macula", finding: "drusen", qualifiers: ["few", "multiple", "small", "intermediate", "large", "hard", "soft", "subfoveal"], priority: "high", prompt: "Grade drusen — number, size, type, subfoveal involvement" },
      { region: "macula", finding: "RPE change", qualifiers: ["mottling", "clumping", "atrophy"], priority: "high", prompt: "Document RPE changes" },
      { region: "macula", finding: "atrophy", qualifiers: ["geographic", "central", "extrafoveal"], priority: "medium", prompt: "Check for geographic atrophy" },
      { region: "macula", finding: "SRF", priority: "medium", prompt: "Rule out SRF (would suggest wet conversion)" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "medium" },
      { symptom: "Distortion", priority: "medium" },
      { symptom: "Reduced night vision", priority: "low" },
    ],
  },

  wet_amd: {
    triggered_by: [
      { region: "macula", finding: "SRF", weight: 3 },
      { region: "macula", finding: "heme", weight: 3 },
      { region: "macula", finding: "CNV suspicious", weight: 3 },
      { region: "macula", finding: "edema", weight: 2 },
      { region: "macula", finding: "drusen", weight: 1 },
    ],
    expected_findings: [
      { region: "macula", finding: "SRF", qualifiers: ["subfoveal", "extrafoveal"], priority: "high", prompt: "Document SRF" },
      { region: "macula", finding: "heme", qualifiers: ["subretinal", "foveal involvement present", "foveal involvement absent"], priority: "high", prompt: "Check for subretinal hemorrhage" },
      { region: "macula", finding: "CNV suspicious", priority: "high", prompt: "Assess for CNV" },
      { region: "macula", finding: "edema", priority: "medium", prompt: "Check for macular edema" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "high" },
      { symptom: "Distortion", priority: "high" },
    ],
  },

  csr: {
    triggered_by: [
      { region: "macula", finding: "CSR", weight: 3 },
      { region: "macula", finding: "SRF", weight: 3 },
      { region: "fovea", finding: "diminished reflex", weight: 1 },
    ],
    expected_findings: [
      { region: "macula", finding: "CSR", qualifiers: ["acute", "chronic", "focal SRF", "RPE leak suspected"], priority: "high", prompt: "Document CSR — acute vs chronic, SRF extent" },
      { region: "macula", finding: "SRF", qualifiers: ["subfoveal", "extrafoveal"], priority: "high", prompt: "Grade SRF" },
      { region: "macula", finding: "RPE change", priority: "medium", prompt: "Check for RPE changes" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "high" },
      { symptom: "Distortion", priority: "high" },
    ],
  },

  macular_edema: {
    triggered_by: [
      { region: "macula", finding: "edema", weight: 3 },
      { region: "fovea", finding: "diminished reflex", weight: 2 },
      { region: "fovea", finding: "absent reflex", weight: 2 },
    ],
    expected_findings: [
      { region: "macula", finding: "edema", qualifiers: ["mild", "mod", "marked", "cystic change suspected", "foveal involvement present", "foveal involvement absent"], priority: "high", prompt: "Grade macular edema — severity, cystic, foveal involvement" },
      { region: "fovea", finding: "diminished reflex", priority: "high", prompt: "Assess foveal reflex" },
      { region: "macula", finding: "exudate" , priority: "medium", prompt: "Check for exudates" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "high" },
      { symptom: "Distortion", priority: "medium" },
    ],
  },

  rpe_mottling: {
    triggered_by: [
      { region: "macula", finding: "RPE change", weight: 3 },
      { region: "temporal_retina", finding: "RPE change", weight: 2 },
      { region: "nasal_retina", finding: "RPE change", weight: 2 },
    ],
    expected_findings: [
      { region: "macula", finding: "RPE change", qualifiers: ["mottling", "clumping", "focal", "diffuse"], priority: "high", prompt: "Document RPE changes — type, extent, macular involvement" },
      { region: "macula", finding: "drusen", priority: "medium", prompt: "Check for drusen (AMD association)" },
    ],
    expected_symptoms: [],
  },

  chorioretinal_scar: {
    triggered_by: [
      { region: "temporal_retina", finding: "scar", weight: 3 },
      { region: "nasal_retina", finding: "scar", weight: 3 },
      { region: "macula", finding: "scar", weight: 3 },
      { region: "far_periphery", finding: "scar", weight: 3 },
      { region: "IT_midperiphery", finding: "scar", weight: 3 },
    ],
    expected_findings: [
      { region: "temporal_retina", finding: "scar", qualifiers: ["chorioretinal", "flat", "pigmented border", "old inflammation"], priority: "high", prompt: "Document scar — size, pigmentation, etiology" },
      { region: "macula", finding: "scar", priority: "medium", prompt: "Note if macular involvement" },
    ],
    expected_symptoms: [],
  },

  retinal_detachment: {
    triggered_by: [
      { region: "far_periphery", finding: "detachment", weight: 3 },
      { region: "temporal_retina", finding: "detachment", weight: 3 },
      { region: "nasal_retina", finding: "detachment", weight: 3 },
      { region: "superior_retina", finding: "detachment", weight: 3 },
      { region: "inferior_retina", finding: "detachment", weight: 3 },
      { region: "vitreous", finding: "pigment cells", weight: 2 },
    ],
    expected_findings: [
      { region: "far_periphery", finding: "detachment", qualifiers: ["localized", "bullous", "macula on suspected", "macula off suspected"], priority: "high", prompt: "Document detachment — extent, macula status, associated breaks" },
      { region: "far_periphery", finding: "tear", priority: "high", prompt: "Identify causative break(s)" },
      { region: "vitreous", finding: "pigment cells", priority: "high", prompt: "Check for Shafer sign" },
      { region: "macula", finding: "normal", priority: "high", prompt: "Determine macula-on vs macula-off status" },
    ],
    expected_symptoms: [
      { symptom: "Floaters", priority: "high" },
      { symptom: "Flashes", priority: "high" },
      { symptom: "Blur", priority: "high" },
    ],
  },

  // ─────────────────────────────────────────────
  // BINOCULAR VISION / NEURO
  // ─────────────────────────────────────────────

  ci: {
    triggered_by: [
      { region: "pupil", finding: "normal", weight: 1 },
    ],
    expected_findings: [
      { region: "pupil", finding: "normal", priority: "medium", prompt: "Confirm normal pupils — rule out CN III" },
    ],
    expected_symptoms: [
      { symptom: "Eyestrain", priority: "high" },
      { symptom: "Diplopia", priority: "high" },
      { symptom: "Reading difficulty", priority: "high" },
      { symptom: "Headache", priority: "medium" },
      { symptom: "Blur", priority: "medium" },
    ],
  },

  di: {
    triggered_by: [
      { region: "pupil", finding: "normal", weight: 1 },
    ],
    expected_findings: [
      { region: "pupil", finding: "normal", priority: "medium", prompt: "Confirm normal pupils — rule out CN VI" },
    ],
    expected_symptoms: [
      { symptom: "Diplopia", priority: "high" },
      { symptom: "Distance blur", priority: "medium" },
      { symptom: "Eyestrain", priority: "medium" },
    ],
  },

  basic_exophoria: {
    triggered_by: [
      { region: "pupil", finding: "normal", weight: 1 },
    ],
    expected_findings: [
      { region: "pupil", finding: "normal", priority: "medium", prompt: "Confirm normal pupils" },
    ],
    expected_symptoms: [
      { symptom: "Eyestrain", priority: "high" },
      { symptom: "Headache", priority: "high" },
      { symptom: "Intermittent blur", priority: "medium" },
      { symptom: "Diplopia", priority: "medium" },
    ],
  },

  basic_esophoria: {
    triggered_by: [
      { region: "pupil", finding: "normal", weight: 1 },
    ],
    expected_findings: [
      { region: "pupil", finding: "normal", priority: "medium", prompt: "Confirm normal pupils" },
    ],
    expected_symptoms: [
      { symptom: "Eyestrain", priority: "high" },
      { symptom: "Headache", priority: "high" },
      { symptom: "Intermittent blur", priority: "medium" },
      { symptom: "Diplopia", priority: "medium" },
    ],
  },

  intermittent_xt: {
    triggered_by: [
      { region: "pupil", finding: "normal", weight: 1 },
    ],
    expected_findings: [
      { region: "pupil", finding: "normal", priority: "medium", prompt: "Confirm normal pupils" },
    ],
    expected_symptoms: [
      { symptom: "Diplopia", priority: "high" },
      { symptom: "Eyestrain", priority: "high" },
      { symptom: "Headache", priority: "medium" },
    ],
  },

  intermittent_et: {
    triggered_by: [
      { region: "pupil", finding: "normal", weight: 1 },
    ],
    expected_findings: [
      { region: "pupil", finding: "normal", priority: "medium", prompt: "Confirm normal pupils" },
    ],
    expected_symptoms: [
      { symptom: "Diplopia", priority: "high" },
      { symptom: "Eyestrain", priority: "high" },
      { symptom: "Headache", priority: "medium" },
    ],
  },

  fd_exo: {
    triggered_by: [
      { region: "pupil", finding: "normal", weight: 1 },
    ],
    expected_findings: [
      { region: "pupil", finding: "normal", priority: "medium", prompt: "Confirm normal pupils" },
    ],
    expected_symptoms: [
      { symptom: "Eyestrain", priority: "high" },
      { symptom: "Headache", priority: "high" },
      { symptom: "Reading difficulty", priority: "medium" },
    ],
  },

  fd_eso: {
    triggered_by: [
      { region: "pupil", finding: "normal", weight: 1 },
    ],
    expected_findings: [
      { region: "pupil", finding: "normal", priority: "medium", prompt: "Confirm normal pupils" },
    ],
    expected_symptoms: [
      { symptom: "Eyestrain", priority: "high" },
      { symptom: "Headache", priority: "high" },
      { symptom: "Reading difficulty", priority: "medium" },
    ],
  },

  accommodative_insufficiency: {
    triggered_by: [
      { region: "pupil", finding: "normal", weight: 1 },
    ],
    expected_findings: [
      { region: "pupil", finding: "normal", priority: "medium", prompt: "Confirm normal pupils" },
      { region: "lens", finding: "clear", priority: "medium", prompt: "Rule out lenticular cause" },
    ],
    expected_symptoms: [
      { symptom: "Near blur", priority: "high" },
      { symptom: "Reading difficulty", priority: "high" },
      { symptom: "Eyestrain", priority: "high" },
      { symptom: "Headache", priority: "medium" },
    ],
  },

  mtbi_visual: {
    triggered_by: [
      { region: "pupil", finding: "normal", weight: 1 },
    ],
    expected_findings: [
      { region: "pupil", finding: "normal", priority: "medium", prompt: "Assess pupil function — sluggish response common in mTBI" },
      { region: "optic_nerve", finding: "normal", priority: "medium", prompt: "Assess optic nerve" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "high" },
      { symptom: "Headache", priority: "high" },
      { symptom: "Motion sensitivity", priority: "high" },
      { symptom: "Dizziness", priority: "high" },
      { symptom: "Reading difficulty", priority: "high" },
      { symptom: "Eyestrain", priority: "medium" },
      { symptom: "Diplopia", priority: "medium" },
      { symptom: "Photophobia", priority: "medium" },
      { symptom: "Vertigo with gaze shift", priority: "medium" },
      { symptom: "Near blur", priority: "medium" },
    ],
  },

  asthenopia: {
    triggered_by: [
      { region: "pupil", finding: "normal", weight: 1 },
    ],
    expected_findings: [
      { region: "pupil", finding: "normal", priority: "low", prompt: "Confirm normal pupils" },
    ],
    expected_symptoms: [
      { symptom: "Eyestrain", priority: "high" },
      { symptom: "Headache", priority: "high" },
      { symptom: "Blur", priority: "medium" },
      { symptom: "Computer discomfort", priority: "medium" },
    ],
  },

  non_specific_bv: {
    triggered_by: [
      { region: "pupil", finding: "normal", weight: 1 },
    ],
    expected_findings: [
      { region: "pupil", finding: "normal", priority: "low", prompt: "Confirm normal pupils" },
    ],
    expected_symptoms: [
      { symptom: "Eyestrain", priority: "high" },
      { symptom: "Headache", priority: "medium" },
      { symptom: "Reading difficulty", priority: "medium" },
      { symptom: "Blur", priority: "medium" },
    ],
  },

  rapd: {
    triggered_by: [
      { region: "pupil", finding: "normal", weight: 1 },
      { region: "optic_nerve", finding: "pallor", weight: 2 },
      { region: "optic_nerve", finding: "edema", weight: 1 },
    ],
    expected_findings: [
      { region: "optic_nerve", finding: "pallor", priority: "high", prompt: "Assess optic nerve — RAPD suggests optic nerve or extensive retinal pathology" },
      { region: "optic_nerve", finding: "edema", priority: "high", prompt: "Check for disc edema" },
      { region: "macula", finding: "normal", priority: "medium", prompt: "Rule out extensive macular disease as cause" },
    ],
    expected_symptoms: [
      { symptom: "Blur", priority: "high" },
    ],
  },

  eom_restriction: {
    triggered_by: [
      { region: "pupil", finding: "normal", weight: 1 },
    ],
    expected_findings: [
      { region: "pupil", finding: "normal", priority: "medium", prompt: "Assess pupil — rule out CN III involvement" },
      { region: "upper_lid", finding: "ptosis", priority: "medium", prompt: "Check for lid ptosis (CN III)" },
    ],
    expected_symptoms: [
      { symptom: "Diplopia", priority: "high" },
      { symptom: "Blur", priority: "medium" },
      { symptom: "Headache", priority: "medium" },
    ],
  },

};
