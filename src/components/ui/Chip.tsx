type ChipProps = {
  label: string;
  selected?: boolean;
  onTap: () => void;
  onRemove?: () => void;
  variant?: "default" | "primary" | "danger";
  className?: string;
};

export default function Chip({ label, selected, onTap, onRemove, variant = "default", className }: ChipProps) {
  const base = "inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium select-none transition-all duration-150 min-h-[44px] cursor-pointer backdrop-blur-sm";
  const variants = {
    default: selected
      ? "bg-blue-600/80 text-white shadow-md"
      : "bg-white/70 text-gray-800 hover:bg-white/90 active:bg-blue-100/80",
    primary: selected
      ? "bg-blue-600/80 text-white shadow-md"
      : "bg-blue-50/70 text-blue-800 hover:bg-blue-100/80 active:bg-blue-200/80",
    danger: "bg-red-50/70 text-red-700 hover:bg-red-100/80",
  };

  return (
    <button type="button" className={`${base} ${variants[variant]} ${className ?? ""}`} onClick={onTap}>
      {label}
      {onRemove && (
        <span
          className="ml-1 w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] hover:bg-black/20"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          ✕
        </span>
      )}
    </button>
  );
}
