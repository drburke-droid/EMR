# CLAUDE.md — Optometry Touch Charting App

## Project Overview

A **bidirectional**, touch-optimized optometry charting system that generates structured clinical text for copy-paste into an existing EMR. Built as a React/Vite/TypeScript app optimized for tablet use.

**Core innovation:** The system flows in two directions simultaneously:

- **Forward (bottom-up):** Tap anatomy → select findings → system suggests matching diagnoses
- **Reverse (top-down):** Select or search a diagnosis first → system highlights expected findings and prompts for confirmatory/ruling-out symptoms

Both directions update the same live note in real time. The doctor can enter from either end at any time.

---

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS (utility classes only, no custom config needed for MVP)
- Zustand for global state (findings, diagnoses, plan blocks, note)
- React Router for module navigation
- No backend for MVP — all data is local JSON config files
- Output: structured text string, copy to clipboard

---

## What This App Is NOT

- Not an AI diagnostic tool
- Not a billing system
- Not a scheduler
- Not an EMR replacement
- No authentication required for MVP

---

## Repository Structure

```
/src
  /data
    symptoms.ts           # Chief complaint + qualifier trees
    anterior_findings.ts  # All AS finding trees by anatomy region
    posterior_findings.ts # All PS finding trees by anatomy region
    bv_findings.ts        # Binocular vision / neuro finding trees
    diagnoses.ts          # Full diagnosis list with metadata
    plan_blocks.ts        # Treatment plan blocks keyed to diagnoses
    diagnosis_map.ts      # THE CORE BIDIRECTIONAL MAP (see below)
  /components
    /anatomy
      AnteriorMap.tsx     # Interactive AS eye diagram (SVG)
      PosteriorMap.tsx    # Interactive fundus diagram (SVG)
      BVPanel.tsx         # BV structured entry panel
    /menus
      FindingMenu.tsx     # Contextual cascading menu component
      QualifierMenu.tsx   # Qualifier selection (depth 2+)
    /entry
      SymptomEntry.tsx    # Chief complaint + symptom qualifiers
      HistoryEntry.tsx    # History blocks selector
      DiagnosisSearch.tsx # Search + tap to select diagnosis (reverse flow trigger)
      PlanSelector.tsx    # Treatment plan block selector
    /note
      LiveNote.tsx        # Real-time note preview, always visible
      NoteOutput.tsx      # Final formatted output + copy button
    /ui
      Chip.tsx            # Tappable selection chip
      CascadeMenu.tsx     # Reusable cascading menu shell
      SidePanel.tsx       # Slide-in panel for reverse-flow suggestions
  /store
    encounterStore.ts     # Zustand store — all encounter state
  /utils
    noteBuilder.ts        # Converts store state → formatted note text
    reverseFlow.ts        # Diagnosis → expected findings/symptoms logic
  App.tsx
  main.tsx
```

---

## The Bidirectional Engine — `diagnosis_map.ts`

This is the most important data file. It maps every diagnosis to:

1. **Expected findings** — anatomy regions and finding types that support this diagnosis
2. **Confirmatory symptoms** — symptoms that increase confidence
3. **Ruling-out checks** — findings/symptoms whose presence would suggest a different diagnosis

### Structure

```typescript
export type DiagnosisMap = {
  [diagnosisId: string]: {
    label: string;
    category: string;
    // Forward flow: these findings should suggest this diagnosis
    triggered_by: {
      region: string;           // e.g. "lid_margin_lower"
      finding: string;          // e.g. "MGD"
      qualifiers?: string[];    // optional — only specific qualifiers trigger
    }[];
    // Reverse flow: when this diagnosis is selected, highlight these
    expected_findings: {
      region: string;
      finding: string;
      priority: "high" | "medium" | "low"; // high = must look, low = optional
      prompt?: string;          // human-readable prompt shown to doctor
    }[];
    // Reverse flow: symptoms to check
    expected_symptoms: {
      symptom: string;
      priority: "high" | "medium" | "low";
    }[];
    // Reverse flow: findings that would cast doubt
    differentials_if_present: {
      finding: string;
      suggests_instead: string; // diagnosisId
    }[];
  };
};
```

### Example entry

```typescript
"dry_eye_disease": {
  label: "Dry Eye Disease",
  category: "cornea_ocular_surface",
  triggered_by: [
    { region: "cornea_inferior", finding: "SPK" },
    { region: "cornea_inferior", finding: "PEE" },
    { region: "tear_film", finding: "reduced_TBUT" },
    { region: "tear_film", finding: "meniscus_low" },
    { region: "lid_margin", finding: "MGD" },
  ],
  expected_findings: [
    { region: "cornea_inferior", finding: "SPK", priority: "high", prompt: "Check for inferior SPK or PEE" },
    { region: "tear_film", finding: "reduced_TBUT", priority: "high", prompt: "Assess TBUT" },
    { region: "lid_margin", finding: "MGD", priority: "medium", prompt: "Evaluate meibomian glands" },
    { region: "bulbar_conjunctiva", finding: "staining", priority: "medium", prompt: "Check conjunctival staining" },
  ],
  expected_symptoms: [
    { symptom: "dryness", priority: "high" },
    { symptom: "FB_sensation", priority: "high" },
    { symptom: "irritation", priority: "medium" },
    { symptom: "computer_discomfort", priority: "low" },
  ],
  differentials_if_present: [
    { finding: "follicles_upper_tarsal", suggests_instead: "viral_conjunctivitis" },
    { finding: "corneal_ulcer", suggests_instead: "infectious_keratitis" },
  ]
}
```

---

## Data Files — Full Content Reference

All finding trees, diagnosis lists, and plan blocks are defined in the spec files:

- **optometry_finding_trees.txt** — canonical source for all anatomy regions, finding trees, qualifiers, diagnosis list, plan blocks, and output templates
- **optometry_touch_charting_spec.txt** — UI/UX flow, module structure, data object shapes, generated text examples

Load both files into context when building data files. Do not abbreviate the finding trees — every branch in the spec must be represented in the data.

---

## UI Layout

### Tablet layout (primary target, ≥768px)

```
┌─────────────────────────────────────────────────────┐
│  Module tabs: Hx | Sx | AS | PS | BV | Dx | Plan    │
├──────────────────────────┬──────────────────────────┤
│                          │                          │
│   Anatomy / Entry Panel  │    Live Note Preview     │
│   (left 60%)             │    (right 40%, sticky)   │
│                          │                          │
│   [SVG eye diagram]      │    Hx: ...               │
│   [Finding cascade menu] │    Sx: ...               │
│                          │    AS: ...               │
│                          │    PS: ...               │
│                          │    Assessment: ...       │
│                          │    Plan: ...             │
│                          │                          │
│                          │    [Copy to Clipboard]   │
├──────────────────────────┴──────────────────────────┤
│  Dx bar: [Selected diagnoses as chips] [+ Add Dx]   │
└─────────────────────────────────────────────────────┘
```

### Reverse flow panel (slides in from right or overlays)

When a diagnosis is selected or searched from the Dx bar:

- Side panel appears listing expected findings grouped by module (AS, PS, BV)
- Each expected finding shows priority (red = high, yellow = medium, gray = low)
- Tapping a finding in the panel navigates to that anatomy region and pre-opens the correct contextual menu
- Already-entered findings are shown as ✓ checked
- Missing high-priority findings are visually flagged

---

## Core State Shape (encounterStore.ts)

```typescript
type EncounterState = {
  // Entry
  chiefComplaint: string;
  symptoms: SymptomEntry[];
  historyBlocks: string[];

  // Findings keyed by "eye_region" e.g. "OS_cornea_inferior"
  findings: Record<string, FindingEntry[]>;

  // Diagnoses
  selectedDiagnoses: string[]; // diagnosisId[]

  // Plan
  selectedPlanBlocks: Record<string, string[]>; // diagnosisId → planBlock[]

  // Reverse flow state
  activeReverseDx: string | null; // diagnosisId being reverse-explored
  reverseSuggestions: ExpectedFinding[]; // populated from diagnosis_map

  // Actions
  addFinding: (eye: Eye, region: string, finding: FindingEntry) => void;
  removeFinding: (eye: Eye, region: string, findingId: string) => void;
  addDiagnosis: (diagnosisId: string) => void;
  removeDiagnosis: (diagnosisId: string) => void;
  setActiveReverseDx: (diagnosisId: string | null) => void;
  addPlanBlock: (diagnosisId: string, block: string) => void;
  clearEncounter: () => void;
};
```

---

## Finding Entry Shape

```typescript
type FindingEntry = {
  id: string;           // uuid
  eye: "OD" | "OS" | "OU";
  region: string;       // anatomy region id
  finding: string;      // finding id
  qualifiers: string[]; // ordered qualifier selections
  freeText?: string;    // optional for size, degree, custom
  generatedText: string; // auto-built from above
};
```

---

## Note Builder Logic (noteBuilder.ts)

Sections generated in order:

1. **Hx:** — chief complaint + history blocks
2. **Symptoms:** — symptom list with severity and triggers
3. **AS:** — anterior segment findings grouped by eye then region
4. **PS:** — posterior segment findings grouped by eye then region
5. **BV:** — binocular vision findings
6. **Assessment:** — selected diagnoses
7. **Plan:** — plan blocks by diagnosis, rendered as prose sentences

Output text format follows templates in `optometry_finding_trees.txt` section 11.

Finding text format: `[eye] [REGION ABBREV]: [finding] [qualifiers].`
Example: `OS K: SPK 1+ inf, interpalpebral.`
Example: `OU LID MGN: MGD mod c capped glands, inspissation, turbid meibum.`

---

## Anatomy Map SVGs

- **Anterior segment:** schematic front-view eye with tappable hit regions for each structure (lid, lashes, conjunctiva zones, cornea zones, AC, iris, lens)
- **Posterior segment:** schematic fundus view with tappable regions (disc, macula, vessel arcades, peripheral quadrants, midperiphery quadrants)
- Each tap region has a `region_id` that maps to finding trees in the data
- OD and OS are displayed side by side or toggled by tab

SVG hit regions must be:
- Generous in size for touch (minimum 44×44px effective tap target)
- Highlighted on tap (color fill change)
- Labeled with abbreviated structure name

---

## Anatomy Region IDs (canonical)

### Anterior Segment

```
upper_lid | lower_lid | upper_lid_margin | lower_lid_margin
upper_lashes | lower_lashes
bulbar_conj_nasal | bulbar_conj_temporal | bulbar_conj_superior | bulbar_conj_inferior
palpebral_conj_upper | palpebral_conj_lower
caruncle | plica
cornea_central | cornea_superior | cornea_inferior | cornea_nasal | cornea_temporal | cornea_diffuse
tear_film | anterior_chamber | iris | pupil | lens
```

### Posterior Segment

```
vitreous | optic_nerve | disc_rim | cup | ppa
macula | fovea
retinal_vessels | superior_arcade | inferior_arcade
temporal_retina | nasal_retina | superior_retina | inferior_retina
ST_midperiphery | SN_midperiphery | IT_midperiphery | IN_midperiphery
far_periphery
```

### Binocular Vision / Neuro

```
eoms | pupils | cover_test_distance | cover_test_near
distance_phoria | near_phoria | fixation_disparity
PFV | NFV | vergence_facility | NPC | stereo | accommodation
```

---

## Build Order

### Phase 1 — Core forward flow

- Data files: symptoms, anterior findings, posterior findings, diagnoses, plan blocks
- Zustand store skeleton
- Symptom + history entry module
- Anterior segment SVG map + contextual menus
- Posterior segment SVG map + contextual menus
- Basic note builder (AS + PS + Sx)
- Copy to clipboard

### Phase 2 — Diagnosis + plan

- Diagnosis selection panel (search + common list)
- Plan block selector
- Assessment + plan sections in note builder
- `diagnosis_map.ts` initial entries for top 20 diagnoses

### Phase 3 — Reverse flow

- Full `diagnosis_map.ts` for all MVP diagnoses
- Reverse flow engine (`reverseFlow.ts`)
- Reverse flow side panel UI
- Finding status tracking (entered / missing / not applicable)
- High-priority finding flags in anatomy map

### Phase 4 — BV + polish

- Binocular vision entry panel
- Copy fellow eye
- Provider favorites / recently used
- Imaging summary blocks
- Encounter clear / new patient

---

## Key Design Rules

- **Speed is the primary constraint.** Every finding must be reachable in ≤4 taps from anatomy tap.
- **Most common findings first** in every menu. "More…" expander for uncommon findings.
- **Never require typing** unless capturing exact measurements (size in DD, prism value, visual acuity).
- **Live note always visible.** Doctor should be able to see the note building in real time.
- **Both eyes.** Always show OD/OS toggle or side-by-side. "Copy to fellow eye" available on any finding.
- **Repeat entry allowed.** Multiple findings per region (e.g. two separate lesions in same quadrant).
- **Touch targets ≥ 44px.** No small UI elements.
- **No modals that block the anatomy map.** Use slide-in panels or bottom sheets.

---

## Diagnosis Categories (for grouping in UI)

```
external_lid | conjunctiva | cornea_ocular_surface
ac_iris_lens | posterior_segment | binocular_vision_neuro
```

---

## Output Example (from spec)

```
Hx: c/o eyestrain and HA worse c near and computer work. Hx strabismus as child, Rx updated < 12 mo.
Symptoms: HA 4/5, eyestrain 3/5, neck pain 4/5, worse c computer and reading.
AS: OU LID MGN: MGD mod c capped glands and turbid meibum. OU K: inf SPK 1+.
PS: OS RET: choroidal nevus flat ST midperiph approx 1.5 DD c drusen, no orange pigment, no SRF.
Assessment: MGD, dry eye disease, choroidal nevus.
Plan: warm compresses, lid hygiene, PFAT PRN. Baseline fundus photo, document lesion size and location, monitor annually, educate re retinal symptoms.
```

---

## Source Spec Files

The following files contain the complete authoritative finding trees, diagnosis lists, and plan blocks. Reference them constantly when building data files — do not abbreviate or guess.

- **optometry_finding_trees.txt** — complete finding trees, all anatomy, all branches, diagnosis list, plan blocks, output templates
- **optometry_touch_charting_spec.txt** — UI flow, data shapes, module descriptions, generated text examples

When in doubt about a finding branch or qualifier list, check the spec files. Do not invent structure.
