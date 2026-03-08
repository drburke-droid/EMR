export type DiagnosisCategory =
  | "external_lid"
  | "conjunctiva"
  | "cornea_ocular_surface"
  | "ac_iris_lens"
  | "posterior_segment"
  | "binocular_vision_neuro";

export type Diagnosis = {
  id: string;
  label: string;
  category: DiagnosisCategory;
};

export const diagnoses: Diagnosis[] = [
  // External / Lid
  { id: "mgd", label: "MGD", category: "external_lid" },
  { id: "anterior_blepharitis", label: "Anterior blepharitis", category: "external_lid" },
  { id: "posterior_blepharitis", label: "Posterior blepharitis", category: "external_lid" },
  { id: "mixed_blepharitis", label: "Mixed blepharitis", category: "external_lid" },
  { id: "chalazion", label: "Chalazion", category: "external_lid" },
  { id: "internal_hordeolum", label: "Internal hordeolum", category: "external_lid" },
  { id: "external_hordeolum", label: "External hordeolum", category: "external_lid" },
  { id: "trichiasis", label: "Trichiasis", category: "external_lid" },
  { id: "entropion", label: "Entropion", category: "external_lid" },
  { id: "ectropion", label: "Ectropion", category: "external_lid" },
  { id: "dermatochalasis", label: "Dermatochalasis", category: "external_lid" },
  { id: "ptosis", label: "Ptosis", category: "external_lid" },
  { id: "psc_lid", label: "PSC", category: "external_lid" },
  { id: "papilloma", label: "Papilloma", category: "external_lid" },
  { id: "xanthelasma", label: "Xanthelasma", category: "external_lid" },

  // Conjunctiva
  { id: "allergic_conjunctivitis", label: "Allergic conjunctivitis", category: "conjunctiva" },
  { id: "viral_conjunctivitis", label: "Viral conjunctivitis", category: "conjunctiva" },
  { id: "bacterial_conjunctivitis", label: "Bacterial conjunctivitis", category: "conjunctiva" },
  { id: "episcleritis", label: "Episcleritis", category: "conjunctiva" },
  { id: "pinguecula", label: "Pinguecula", category: "conjunctiva" },
  { id: "pingueculitis", label: "Pingueculitis", category: "conjunctiva" },
  { id: "pterygium", label: "Pterygium", category: "conjunctiva" },
  { id: "conj_nevus", label: "Conj nevus", category: "conjunctiva" },
  { id: "pam", label: "PAM", category: "conjunctiva" },
  { id: "sch", label: "SCH", category: "conjunctiva" },
  { id: "conj_cyst", label: "Conj cyst", category: "conjunctiva" },
  { id: "gpc", label: "GPC", category: "conjunctiva" },
  { id: "dry_eye_conj_staining", label: "Dry eye related conjunctival staining", category: "conjunctiva" },

  // Cornea / ocular surface
  { id: "dry_eye_disease", label: "Dry eye disease", category: "cornea_ocular_surface" },
  { id: "exposure_keratopathy", label: "Exposure keratopathy", category: "cornea_ocular_surface" },
  { id: "spk", label: "SPK", category: "cornea_ocular_surface" },
  { id: "pee", label: "PEE", category: "cornea_ocular_surface" },
  { id: "rce", label: "RCE", category: "cornea_ocular_surface" },
  { id: "corneal_abrasion", label: "Corneal abrasion", category: "cornea_ocular_surface" },
  { id: "corneal_foreign_body", label: "Corneal foreign body", category: "cornea_ocular_surface" },
  { id: "corneal_ulcer", label: "Corneal ulcer", category: "cornea_ocular_surface" },
  { id: "sterile_infiltrate", label: "Sterile infiltrate", category: "cornea_ocular_surface" },
  { id: "infectious_keratitis", label: "Infectious keratitis suspect", category: "cornea_ocular_surface" },
  { id: "abmd", label: "ABMD", category: "cornea_ocular_surface" },
  { id: "kcn", label: "KCN", category: "cornea_ocular_surface" },
  { id: "corneal_edema", label: "Corneal edema", category: "cornea_ocular_surface" },
  { id: "fuchs", label: "Fuchs endothelial dystrophy", category: "cornea_ocular_surface" },
  { id: "cl_irritation", label: "Contact lens related irritation", category: "cornea_ocular_surface" },
  { id: "cl_overwear", label: "Contact lens overwear", category: "cornea_ocular_surface" },

  // AC / iris / lens
  { id: "anterior_uveitis", label: "Anterior uveitis", category: "ac_iris_lens" },
  { id: "narrow_angle", label: "Narrow angle suspect", category: "ac_iris_lens" },
  { id: "hyphema", label: "Hyphema", category: "ac_iris_lens" },
  { id: "iris_nevus", label: "Iris nevus", category: "ac_iris_lens" },
  { id: "pciol", label: "PCIOL", category: "ac_iris_lens" },
  { id: "cataract_ns", label: "Cataract NS", category: "ac_iris_lens" },
  { id: "cataract_csc", label: "Cataract CSC", category: "ac_iris_lens" },
  { id: "cataract_psc", label: "Cataract PSC", category: "ac_iris_lens" },
  { id: "pco", label: "PCO", category: "ac_iris_lens" },

  // Posterior segment
  { id: "pvd", label: "PVD", category: "posterior_segment" },
  { id: "vitreous_syneresis", label: "Vitreous syneresis", category: "posterior_segment" },
  { id: "vitreous_hemorrhage", label: "Vitreous hemorrhage", category: "posterior_segment" },
  { id: "disc_edema", label: "Disc edema", category: "posterior_segment" },
  { id: "optic_atrophy", label: "Optic atrophy", category: "posterior_segment" },
  { id: "glaucomatous_cupping", label: "Glaucomatous cupping suspect", category: "posterior_segment" },
  { id: "tilted_disc", label: "Tilted disc", category: "posterior_segment" },
  { id: "disc_drusen", label: "Disc drusen", category: "posterior_segment" },
  { id: "choroidal_nevus", label: "Choroidal nevus", category: "posterior_segment" },
  { id: "chrpe", label: "CHRPE", category: "posterior_segment" },
  { id: "retinal_hole", label: "Retinal hole", category: "posterior_segment" },
  { id: "retinal_tear", label: "Retinal tear", category: "posterior_segment" },
  { id: "lattice_degeneration", label: "Lattice degeneration", category: "posterior_segment" },
  { id: "wwp", label: "WWP", category: "posterior_segment" },
  { id: "pavingstone", label: "Pavingstone degeneration", category: "posterior_segment" },
  { id: "retinal_heme", label: "Retinal heme", category: "posterior_segment" },
  { id: "cws", label: "CWS", category: "posterior_segment" },
  { id: "background_dr", label: "Background diabetic retinopathy", category: "posterior_segment" },
  { id: "htn_retinopathy", label: "Hypertensive retinopathy", category: "posterior_segment" },
  { id: "erm", label: "ERM", category: "posterior_segment" },
  { id: "macular_hole", label: "Macular hole suspect", category: "posterior_segment" },
  { id: "dry_amd", label: "Dry AMD", category: "posterior_segment" },
  { id: "wet_amd", label: "Wet AMD suspect", category: "posterior_segment" },
  { id: "csr", label: "CSR", category: "posterior_segment" },
  { id: "macular_edema", label: "Macular edema", category: "posterior_segment" },
  { id: "rpe_mottling", label: "RPE mottling", category: "posterior_segment" },
  { id: "chorioretinal_scar", label: "Chorioretinal scar", category: "posterior_segment" },
  { id: "retinal_detachment", label: "Retinal detachment suspect", category: "posterior_segment" },

  // Binocular vision / neuro
  { id: "ci", label: "CI", category: "binocular_vision_neuro" },
  { id: "di", label: "DI", category: "binocular_vision_neuro" },
  { id: "basic_exophoria", label: "Basic exophoria", category: "binocular_vision_neuro" },
  { id: "basic_esophoria", label: "Basic esophoria", category: "binocular_vision_neuro" },
  { id: "intermittent_xt", label: "Intermittent XT", category: "binocular_vision_neuro" },
  { id: "intermittent_et", label: "Intermittent ET", category: "binocular_vision_neuro" },
  { id: "fd_exo", label: "Fixation disparity symptomatic exo", category: "binocular_vision_neuro" },
  { id: "fd_eso", label: "Fixation disparity symptomatic eso", category: "binocular_vision_neuro" },
  { id: "accommodative_insufficiency", label: "Accommodative insufficiency", category: "binocular_vision_neuro" },
  { id: "mtbi_visual", label: "mTBI related visual dysfunction", category: "binocular_vision_neuro" },
  { id: "asthenopia", label: "Asthenopia", category: "binocular_vision_neuro" },
  { id: "non_specific_bv", label: "Non-specific BV dysfunction", category: "binocular_vision_neuro" },
  { id: "rapd", label: "RAPD present", category: "binocular_vision_neuro" },
  { id: "eom_restriction", label: "EOM restriction", category: "binocular_vision_neuro" },
];

export const diagnosisCategoryLabels: Record<DiagnosisCategory, string> = {
  external_lid: "External / Lid",
  conjunctiva: "Conjunctiva",
  cornea_ocular_surface: "Cornea / Ocular Surface",
  ac_iris_lens: "AC / Iris / Lens",
  posterior_segment: "Posterior Segment",
  binocular_vision_neuro: "Binocular Vision / Neuro",
};
