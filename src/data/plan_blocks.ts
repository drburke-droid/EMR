export const planBlocks: Record<string, string[]> = {
  mgd: [
    "warm compresses", "lid hygiene", "PFAT PRN", "omega 3 discussion",
    "environmental modification", "blink awareness", "screen break advice",
    "consider anti inflammatory drop if persistent", "monitor symptoms", "follow up PRN",
  ],
  anterior_blepharitis: [
    "lid hygiene", "hypochlor spray / wipe", "warm compresses", "PFAT PRN",
    "consider topical AB / steroid if inflamed", "review chronicity", "follow up PRN",
  ],
  posterior_blepharitis: [
    "lid hygiene", "hypochlor spray / wipe", "warm compresses", "PFAT PRN",
    "consider topical AB / steroid if inflamed", "review chronicity", "follow up PRN",
  ],
  mixed_blepharitis: [
    "lid hygiene", "hypochlor spray / wipe", "warm compresses", "PFAT PRN",
    "consider topical AB / steroid if inflamed", "review chronicity", "follow up PRN",
  ],
  chalazion: [
    "warm compresses", "lid massage", "monitor resolution",
    "RTC if enlarging / persistent", "consider referral if persistent",
  ],
  internal_hordeolum: [
    "warm compresses", "lid hygiene", "monitor closely",
    "consider topical AB if draining lid margin involvement",
    "consider oral AB if diffuse lid involvement", "RTC if worse", "refer if orbital signs",
  ],
  external_hordeolum: [
    "warm compresses", "lid hygiene", "monitor closely",
    "consider topical AB if draining lid margin involvement",
    "consider oral AB if diffuse lid involvement", "RTC if worse", "refer if orbital signs",
  ],
  psc_lid: [
    "monitor progression", "oral AB if clinically indicated",
    "urgent referral if orbital signs", "RTC if no improvement",
  ],
  dry_eye_disease: [
    "PFAT QID or PRN", "warm compresses", "lid hygiene", "humidity optimization",
    "blink modification", "screen break counselling", "consider gel / ointment HS",
    "consider anti inflammatory therapy if persistent", "monitor symptoms",
  ],
  corneal_abrasion: [
    "prophylactic AB if indicated", "PFAT", "pain management",
    "no CL wear", "RTC recheck", "urgent review if worse",
  ],
  corneal_foreign_body: [
    "remove FB if possible", "rust ring removal if needed", "topical AB",
    "PFAT", "no CL wear", "RTC recheck", "urgent review if worse",
  ],
  corneal_ulcer: [
    "urgent close follow up", "culture if indicated", "topical AB",
    "no CL wear", "pain / warning counselling", "refer if central / severe / non responsive",
  ],
  sterile_infiltrate: [
    "urgent close follow up", "culture if indicated", "topical AB",
    "no CL wear", "pain / warning counselling", "refer if central / severe / non responsive",
  ],
  infectious_keratitis: [
    "urgent close follow up", "culture if indicated", "topical AB",
    "no CL wear", "pain / warning counselling", "refer if central / severe / non responsive",
  ],
  abmd: [
    "lubrication", "ointment HS", "hypertonic ointment if indicated",
    "review recurrence", "consider referral if frequent",
  ],
  rce: [
    "lubrication", "ointment HS", "hypertonic ointment if indicated",
    "review recurrence", "consider referral if frequent",
  ],
  kcn: [
    "avoid eye rubbing", "baseline topo", "monitor progression",
    "consider CXL referral if progression suspected", "optical correction discussion",
  ],
  allergic_conjunctivitis: [
    "allergen avoidance", "cold compress", "topical anti allergy drop",
    "PFAT PRN", "avoid eye rubbing", "monitor symptoms",
  ],
  viral_conjunctivitis: [
    "supportive care", "cold compress", "PFAT",
    "hygiene counselling", "contagion counselling", "RTC if worse",
  ],
  bacterial_conjunctivitis: [
    "topical AB", "hygiene counselling", "monitor resolution", "RTC if worse",
  ],
  episcleritis: [
    "lubrication", "topical anti inflammatory if indicated",
    "monitor resolution", "RTC if pain worsens", "refer if scleritis concern",
  ],
  pinguecula: [
    "UV protection", "lubrication", "monitor inflammation",
    "topical anti inflammatory if indicated",
  ],
  pingueculitis: [
    "UV protection", "lubrication", "monitor inflammation",
    "topical anti inflammatory if indicated",
  ],
  pterygium: [
    "UV protection", "lubrication", "monitor inflammation",
    "topical anti inflammatory if indicated", "refer if visually significant / progressive",
  ],
  anterior_uveitis: [
    "cycloplegia if indicated", "topical steroid if managing",
    "urgent / semi urgent referral as appropriate", "monitor AC reaction", "warning counselling",
  ],
  narrow_angle: [
    "gonio / angle evaluation recommended", "educate angle closure symptoms",
    "refer for LPI assessment if indicated",
  ],
  cataract_ns: [
    "monitor", "update Rx if helpful", "glare counselling",
    "refer for cataract consult when functionally significant",
  ],
  cataract_csc: [
    "monitor", "update Rx if helpful", "glare counselling",
    "refer for cataract consult when functionally significant",
  ],
  cataract_psc: [
    "monitor", "update Rx if helpful", "glare counselling",
    "refer for cataract consult when functionally significant",
  ],
  pco: [
    "monitor", "refer for YAG consult if visually significant",
  ],
  pvd: [
    "retinal detachment precautions reviewed",
    "educate re new flashes / floaters / curtain / vision loss",
    "RTC urgently if symptoms worsen", "repeat DFE as indicated",
  ],
  choroidal_nevus: [
    "baseline photo", "document size and location", "monitor 6-12 mo",
    "educate re visual change / flashes / floaters", "compare to prior imaging",
    "refer if suspicious features",
  ],
  chrpe: [
    "baseline photo", "document size and location", "monitor routinely",
  ],
  retinal_hole: [
    "RD precautions reviewed", "urgent retinal referral if indicated",
    "document location and associated SRF", "repeat DFE as indicated",
  ],
  retinal_tear: [
    "RD precautions reviewed", "urgent retinal referral if indicated",
    "document location and associated SRF", "repeat DFE as indicated",
  ],
  lattice_degeneration: [
    "RD precautions reviewed", "document location",
    "monitor routinely or sooner if symptomatic",
  ],
  retinal_heme: [
    "review systemic risk factors", "BP / glucose follow up as appropriate",
    "document location and size", "monitor retinal findings",
  ],
  cws: [
    "review systemic risk factors", "BP / glucose follow up as appropriate",
    "document location and size", "monitor retinal findings",
  ],
  dry_amd: [
    "Amsler education", "monitor", "consider AREDS discussion if indicated",
    "baseline / serial imaging",
  ],
  wet_amd: [
    "urgent retinal referral", "document visual symptoms",
    "baseline imaging", "warning counselling",
  ],
  erm: [
    "monitor", "Amsler if indicated", "refer if visually significant distortion",
  ],
  csr: [
    "monitor / retinal referral based on severity", "review stress / steroid hx",
    "document SRF", "Amsler education",
  ],
  disc_edema: [
    "urgent assessment / referral", "document symptoms",
    "VF / pupils / OCT as available", "warning counselling",
  ],
  glaucomatous_cupping: [
    "baseline OCT ONH", "VF testing", "IOP / pachy / gonio as available",
    "monitor for progression",
  ],
  ci: [
    "discuss binocular vision contribution to symptoms",
    "discuss Rx optimization", "consider relieving prism / Neurolens if clinically indicated",
    "consider home convergence work if appropriate", "monitor symptom response",
    "coordinate c allied providers if relevant",
  ],
  di: [
    "discuss binocular vision contribution to symptoms",
    "discuss Rx optimization", "consider relieving prism / Neurolens if clinically indicated",
    "monitor symptom response", "coordinate c allied providers if relevant",
  ],
  asthenopia: [
    "discuss binocular vision contribution to symptoms",
    "discuss Rx optimization", "consider relieving prism / Neurolens if clinically indicated",
    "monitor symptom response",
  ],
  mtbi_visual: [
    "discuss visual contribution to symptoms",
    "consider symptomatic prism / Neurolens if clinically indicated",
    "consider rehab coordination", "monitor symptom change",
    "letter to allied providers if needed",
  ],
};
