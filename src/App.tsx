import { useEncounterStore } from "./store/encounterStore";
import SymptomEntry from "./components/entry/SymptomEntry";
import AnteriorMap from "./components/anatomy/AnteriorMap";
import PosteriorMap from "./components/anatomy/PosteriorMap";
import DiagnosisSearch from "./components/entry/DiagnosisSearch";
import PlanSelector from "./components/entry/PlanSelector";
import LiveNote from "./components/note/LiveNote";
import { diagnoses } from "./data/diagnoses";
import Chip from "./components/ui/Chip";

const modules = [
  { id: "Sx", label: "Hx / Sx" },
  { id: "AS", label: "AS" },
  { id: "PS", label: "PS" },
  { id: "Dx", label: "Dx" },
  { id: "Plan", label: "Plan" },
];

function ModuleContent({ module }: { module: string }) {
  switch (module) {
    case "Sx":
      return <SymptomEntry />;
    case "AS":
      return <AnteriorMap />;
    case "PS":
      return <PosteriorMap />;
    case "Dx":
      return <DiagnosisSearch />;
    case "Plan":
      return <PlanSelector />;
    default:
      return null;
  }
}

export default function App() {
  const { activeModule, setActiveModule, selectedDiagnoses, removeDiagnosis } = useEncounterStore();

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Optometry Chart</h1>
        </div>
        {/* Module tabs */}
        <div className="flex gap-1 mt-2 overflow-x-auto">
          {modules.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveModule(m.id)}
              className={`px-4 py-2 rounded-t-lg text-sm font-semibold min-h-[44px] whitespace-nowrap transition-colors ${
                activeModule === m.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel — entry area */}
        <div className="flex-[3] overflow-y-auto p-4 md:p-6">
          <ModuleContent module={activeModule} />
        </div>

        {/* Right panel — live note (hidden on small screens via md breakpoint) */}
        <div className="hidden md:flex flex-[2] border-l border-gray-200 bg-white p-4 overflow-y-auto">
          <div className="w-full">
            <LiveNote />
          </div>
        </div>
      </div>

      {/* Bottom Dx bar */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-gray-400 font-semibold shrink-0">Dx:</span>
          {selectedDiagnoses.length === 0 && (
            <span className="text-xs text-gray-300 italic">No diagnoses selected</span>
          )}
          {selectedDiagnoses.map((id) => {
            const dx = diagnoses.find((d) => d.id === id);
            return dx ? (
              <Chip
                key={id}
                label={dx.label}
                selected
                onTap={() => {}}
                onRemove={() => removeDiagnosis(id)}
              />
            ) : null;
          })}
          <button
            type="button"
            onClick={() => setActiveModule("Dx")}
            className="text-blue-600 text-sm font-medium min-h-[44px] px-2 shrink-0"
          >
            + Add Dx
          </button>
        </div>
      </div>

      {/* Mobile note toggle (shown below md) */}
      <div className="md:hidden shrink-0 bg-white border-t border-gray-200 p-4">
        <LiveNote />
      </div>
    </div>
  );
}
