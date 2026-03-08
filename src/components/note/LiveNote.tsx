import { useState } from "react";
import { useEncounterStore } from "../../store/encounterStore";
import { buildNote } from "../../utils/noteBuilder";

export default function LiveNote() {
  const state = useEncounterStore();
  const [copied, setCopied] = useState(false);

  const noteText = buildNote(state);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(noteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = noteText;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Live Note</h3>
        <button
          type="button"
          onClick={() => state.clearEncounter()}
          className="text-xs text-red-500 font-medium min-h-[44px] px-2"
        >
          Clear All
        </button>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed overflow-y-auto min-h-[200px] font-mono">
        {noteText || <span className="text-gray-300 italic">Note will appear here as you chart...</span>}
      </div>

      <button
        type="button"
        onClick={handleCopy}
        disabled={!noteText}
        className={`mt-3 w-full py-3 rounded-lg text-sm font-bold min-h-[44px] transition-colors ${
          copied
            ? "bg-green-600 text-white"
            : noteText
              ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        {copied ? "Copied!" : "Copy to Clipboard"}
      </button>
    </div>
  );
}
