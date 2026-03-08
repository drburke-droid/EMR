import { diagnoses } from "../../data/diagnoses";
import { planBlocks } from "../../data/plan_blocks";
import { useEncounterStore } from "../../store/encounterStore";
import Chip from "../ui/Chip";

export default function PlanSelector() {
  const { selectedDiagnoses, selectedPlanBlocks, togglePlanBlock } = useEncounterStore();

  if (selectedDiagnoses.length === 0) {
    return (
      <p className="text-gray-400 text-sm italic">Select diagnoses first to see plan options.</p>
    );
  }

  return (
    <div className="space-y-5">
      {selectedDiagnoses.map((dxId) => {
        const dx = diagnoses.find((d) => d.id === dxId);
        const blocks = planBlocks[dxId] || [];
        const selected = selectedPlanBlocks[dxId] || [];

        if (blocks.length === 0) return null;

        return (
          <div key={dxId}>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">{dx?.label || dxId}</h4>
            <div className="flex flex-wrap gap-2">
              {blocks.map((block) => (
                <Chip
                  key={block}
                  label={block}
                  selected={selected.includes(block)}
                  onTap={() => togglePlanBlock(dxId, block)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
