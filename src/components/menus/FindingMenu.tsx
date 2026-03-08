import { useState } from "react";
import { type FindingNode } from "../../data/anterior_findings";
import { useEncounterStore, type Eye } from "../../store/encounterStore";

type Props = {
  regionId: string;
  findings: FindingNode[];
  eye: Eye;
  onClose: () => void;
};

export default function FindingMenu({ regionId, findings, eye, onClose }: Props) {
  const addFinding = useEncounterStore((s) => s.addFinding);
  const [path, setPath] = useState<{ label: string; children: FindingNode[] }[]>([]);
  const [selectedQualifiers, setSelectedQualifiers] = useState<string[]>([]);

  const currentItems = path.length === 0 ? findings : path[path.length - 1].children || [];
  const currentFinding = path.length > 0 ? path[0].label : null;

  function handleTap(node: FindingNode) {
    if (path.length === 0) {
      // First level — this is the finding
      if (node.label === "normal" || node.label === "other" || !node.children || node.children.length === 0) {
        addFinding(eye, regionId, node.label, []);
        onClose();
        return;
      }
      setPath([{ label: node.label, children: node.children }]);
      setSelectedQualifiers([]);
    } else {
      // Qualifier level — toggle selection
      if (node.children && node.children.length > 0) {
        setPath([...path, { label: node.label, children: node.children }]);
        setSelectedQualifiers([...selectedQualifiers, node.label]);
      } else {
        setSelectedQualifiers((prev) =>
          prev.includes(node.label) ? prev.filter((q) => q !== node.label) : [...prev, node.label]
        );
      }
    }
  }

  function handleDone() {
    if (currentFinding) {
      addFinding(eye, regionId, currentFinding, selectedQualifiers);
    }
    onClose();
  }

  function handleBack() {
    if (path.length <= 1) {
      setPath([]);
      setSelectedQualifiers([]);
    } else {
      const lastLabel = path[path.length - 1].label;
      setPath(path.slice(0, -1));
      setSelectedQualifiers(selectedQualifiers.filter((q) => q !== lastLabel));
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 max-h-[60vh] overflow-y-auto w-full max-w-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {path.length > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="text-blue-600 text-sm font-medium min-h-[44px] px-2"
            >
              Back
            </button>
          )}
          <span className="text-sm text-gray-500 font-medium">
            {path.map((p) => p.label).join(" > ") || "Select finding"}
          </span>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 text-lg min-h-[44px] px-2">
          ✕
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {currentItems.map((node) => {
          const isSelected = selectedQualifiers.includes(node.label);
          return (
            <button
              key={node.label}
              type="button"
              onClick={() => handleTap(node)}
              className={`px-3 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
                isSelected
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300"
              }`}
            >
              {node.label}
              {node.children && node.children.length > 0 && " ›"}
            </button>
          );
        })}
      </div>

      {path.length > 0 && (
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {selectedQualifiers.length > 0
              ? `Selected: ${selectedQualifiers.join(", ")}`
              : "Tap qualifiers or press Done"}
          </div>
          <button
            type="button"
            onClick={handleDone}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
