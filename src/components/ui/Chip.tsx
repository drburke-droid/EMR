type ChipProps = {
  label: string;
  selected?: boolean;
  onTap: () => void;
  onRemove?: () => void;
  variant?: "default" | "primary" | "danger";
};

export default function Chip({ label, selected, onTap, onRemove, variant = "default" }: ChipProps) {
  const base = "inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium select-none transition-colors min-h-[44px] cursor-pointer";
  const variants = {
    default: selected
      ? "bg-blue-600 text-white"
      : "bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300",
    primary: selected
      ? "bg-blue-600 text-white"
      : "bg-blue-50 text-blue-800 hover:bg-blue-100 active:bg-blue-200",
    danger: "bg-red-50 text-red-700 hover:bg-red-100",
  };

  return (
    <button type="button" className={`${base} ${variants[variant]}`} onClick={onTap}>
      {label}
      {onRemove && (
        <span
          className="ml-1 text-xs opacity-60 hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          ✕
        </span>
      )}
    </button>
  );
}
