export const chiefComplaints = [
  "Blur", "Near blur", "Distance blur", "Intermittent blur",
  "Diplopia", "Eyestrain", "Headache", "Neck pain",
  "Photophobia", "Red eye", "Dryness", "Irritation",
  "Pain", "FB sensation", "Tearing", "Discharge",
  "Itching", "Floaters", "Flashes", "Distortion",
  "Reduced night vision", "Motion sensitivity",
  "Reading difficulty", "Computer discomfort",
  "Dizziness", "Vertigo with gaze shift",
];

/** Short button labels — fits on round 64px buttons without truncation. */
export const symptomAbbrev: Record<string, string> = {
  "Blur": "Blur",
  "Near blur": "Nr Blur",
  "Distance blur": "Dist Blur",
  "Intermittent blur": "Int Blur",
  "Diplopia": "Diplopia",
  "Eyestrain": "Strain",
  "Headache": "HA",
  "Neck pain": "Neck",
  "Photophobia": "Photoph",
  "Red eye": "Red Eye",
  "Dryness": "Dry",
  "Irritation": "Irrit",
  "Pain": "Pain",
  "FB sensation": "FB Sens",
  "Tearing": "Tearing",
  "Discharge": "D/C",
  "Itching": "Itch",
  "Floaters": "Floaters",
  "Flashes": "Flashes",
  "Distortion": "Distort",
  "Reduced night vision": "Nyctal",
  "Motion sensitivity": "Motion",
  "Reading difficulty": "Read Diff",
  "Computer discomfort": "Screen",
  "Dizziness": "Dizzy",
  "Vertigo with gaze shift": "Vertigo",
};

export const symptomQualifiers = {
  laterality: ["OD", "OS", "OU"],
  severity: ["0/5", "1/5", "2/5", "3/5", "4/5", "5/5"],
  onset: [
    "acute", "subacute", "chronic", "sudden", "gradual",
    "intermittent", "episodic", "stable", "progressive",
  ],
  duration: ["hours", "days", "weeks", "months", "years", "constant", "intermittent"],
  triggers: [
    "reading", "computer", "near work", "distance viewing", "driving",
    "fatigue", "end of day", "contact lens wear", "bright light",
    "eye movement", "blinking", "waking", "screen use", "looking down",
    "head movement",
  ],
  relief: [
    "rest", "blinking", "closing eye", "artificial tears", "warm compress",
    "removing CL", "steroid drop", "NSAID", "dark room", "sleep",
    "glasses off", "glasses on",
  ],
  associated: [
    "HA", "eyestrain", "neck pain", "photophobia", "nausea",
    "motion sensitivity", "dryness", "redness", "itching", "discharge",
    "pain with eye movement", "floaters", "flashes", "diplopia",
    "ghosting", "glare", "halos",
  ],
};

export const historyBlocks = [
  "recent Rx change", "contact lens wearer", "post concussion",
  "hx strabismus", "hx amblyopia", "hx patching", "hx VT",
  "hx ocular trauma", "hx ocular surgery", "hx RD", "hx retinal tear",
  "hx migraine", "hx dry eye", "hx allergies", "hx diabetes", "hx HTN",
  "family hx glaucoma", "family hx AMD", "family hx RD", "family hx keratoconus",
];
