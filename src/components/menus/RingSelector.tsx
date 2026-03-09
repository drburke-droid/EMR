import { useState, useId } from "react";
import { createPortal } from "react-dom";
import { type FindingNode } from "../../data/anterior_findings";
import {
  computeSegments,
  totalRadius,
  BUTTON_RADIUS,
  BUTTON_RADIUS_IDLE,
  type ArcSegment,
} from "../../utils/ringGeometry";
import { toggleWithAntithesis } from "../../utils/antithesis";

type RingLevel = {
  items: FindingNode[];
  selected: Set<number>; // multi-select indices
  segments: ArcSegment[];
};

type Props = {
  label: string;
  node: FindingNode;
  onComplete: (finding: string, qualifiers: string[]) => void;
};

export default function RingSelector({ label, node, onComplete }: Props) {
  const [active, setActive] = useState(false);
  const [rings, setRings] = useState<RingLevel[]>([]);
  const uid = useId();

  function handleOpen() {
    if (!node.children?.length) {
      onComplete(label, []);
      return;
    }
    const items = node.children;
    setRings([{
      items,
      selected: new Set(),
      segments: computeSegments(0, items.map((c) => c.label)),
    }]);
    setActive(true);
  }

  function handleSegmentTap(ringIndex: number, segIndex: number) {
    const ring = rings[ringIndex];
    const tappedNode = ring.items[segIndex];
    const allLabels = ring.items.map((n) => n.label);

    // Multi-select with antithesis exclusion
    const newSelected = toggleWithAntithesis(tappedNode.label, ring.selected, allLabels);

    const updated = [...rings.slice(0, ringIndex + 1)];
    updated[ringIndex] = { ...ring, selected: newSelected };

    // If exactly one newly-tapped item has children and was just selected, open next ring
    if (newSelected.has(segIndex) && tappedNode.children?.length) {
      // Remove any previous deeper rings, add new one
      updated.push({
        items: tappedNode.children,
        selected: new Set(),
        segments: computeSegments(updated.length, tappedNode.children.map((c) => c.label)),
      });
    }

    setRings(updated);
  }

  function handleDone() {
    const qualifiers: string[] = [];
    for (const ring of rings) {
      for (const idx of ring.selected) {
        qualifiers.push(ring.items[idx].label);
      }
    }
    onComplete(label, qualifiers);
    handleClose();
  }

  function handleClose() {
    setActive(false);
    setRings([]);
  }

  // Build breadcrumb
  const breadcrumb: string[] = [];
  for (const ring of rings) {
    for (const idx of ring.selected) {
      breadcrumb.push(ring.items[idx].label);
    }
  }

  const totalSelected = breadcrumb.length;

  // --- Collapsed idle button ---
  if (!active) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="group relative overflow-hidden
          rounded-full flex items-center justify-center text-center leading-tight
          transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          active:scale-90"
        style={{ width: BUTTON_RADIUS_IDLE * 2, height: BUTTON_RADIUS_IDLE * 2 }}
        title={label}
      >
        {/* Glass background */}
        <div className="absolute inset-0 rounded-full bg-white/[0.82] backdrop-blur-xl
          border border-white/70 shadow-[0_2px_16px_rgba(0,0,0,0.06)]
          group-hover:shadow-[0_4px_24px_rgba(59,130,246,0.15)]
          group-hover:border-blue-200/50
          transition-all duration-300" />
        {/* Shimmer on hover */}
        <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100
          bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/30
          transition-opacity duration-500" />
        <span className="relative z-10 text-[11px] font-semibold text-gray-700
          group-hover:text-blue-700 transition-colors duration-200 px-1">
          {label.length > 10 ? label.slice(0, 9) + "…" : label}
        </span>
      </button>
    );
  }

  // --- Expanded portal overlay ---
  const maxR = totalRadius(rings.length) + 24;
  const svgSize = maxR * 2;
  // Always center on screen
  const screenCx = window.innerWidth / 2;
  const screenCy = window.innerHeight / 2;

  return createPortal(
    <div className="fixed inset-0 z-50 ring-overlay-enter" onClick={handleClose}>
      {/* Frosted backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[8px] ring-backdrop-enter" />

      {/* SVG ring widget — always centered */}
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`${-maxR} ${-maxR} ${svgSize} ${svgSize}`}
        className="absolute overflow-visible ring-widget-enter"
        style={{
          left: screenCx - maxR,
          top: screenCy - maxR,
          filter: "drop-shadow(0 8px 40px rgba(0,0,0,0.15))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <defs>
          <filter id={`${uid}-glow`}>
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${uid}-sel-glow`}>
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feFlood floodColor="#3b82f6" floodOpacity="0.3" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id={`${uid}-cgrad`} cx="38%" cy="32%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>
          <radialGradient id={`${uid}-cgrad-hover`} cx="38%" cy="32%">
            <stop offset="0%" stopColor="#bfdbfe" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </radialGradient>

          {/* Arc text paths */}
          {rings.flatMap((ring) =>
            ring.segments.map((seg) => (
              <path key={seg.textArcId} id={seg.textArcId} d={seg.textArcPath} fill="none" />
            ))
          )}
        </defs>

        {/* Subtle concentric guide circles */}
        {rings.map((_, ringIdx) => (
          <circle
            key={`guide-${ringIdx}`}
            cx={0} cy={0}
            r={BUTTON_RADIUS + ringIdx * 34 + 17}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={0.5}
            className="ring-guide-enter"
            style={{ animationDelay: `${ringIdx * 60}ms` }}
          />
        ))}

        {/* Ring segments */}
        {rings.map((ring, ringIdx) => (
          <g
            key={`ring-${ringIdx}`}
            className="ring-level-enter"
            style={{ animationDelay: `${ringIdx * 100 + 50}ms` }}
          >
            {ring.segments.map((seg) => {
              // Skip spacer segments (used when 3 items → padded to 4)
              if (seg.isSpacer) return null;

              const isSelected = ring.selected.has(seg.index);
              const truncLen = ringIdx === 0 ? 14 : 16;
              const truncLabel = seg.label.length > truncLen
                ? seg.label.slice(0, truncLen - 1) + "…"
                : seg.label;
              const fontSize = ringIdx === 0 ? 7.5 : 7;

              return (
                <g
                  key={`seg-${ringIdx}-${seg.index}`}
                  onClick={(e) => { e.stopPropagation(); handleSegmentTap(ringIdx, seg.index); }}
                  className="cursor-pointer seg-hover-group"
                >
                  {/* Segment shape */}
                  <path
                    d={seg.path}
                    fill={
                      isSelected
                        ? "rgba(59, 130, 246, 0.78)"
                        : "rgba(255, 255, 255, 0.72)"
                    }
                    stroke={isSelected ? "rgba(96,165,250,0.8)" : "rgba(255,255,255,0.9)"}
                    strokeWidth={isSelected ? 1.5 : 0.5}
                    filter={isSelected ? `url(#${uid}-sel-glow)` : undefined}
                    className="seg-path"
                  />
                  {/* Hover fill */}
                  <path
                    d={seg.path}
                    fill="transparent"
                    className="seg-hover"
                  />
                  {/* Radial divider lines */}
                  <path
                    d={seg.path}
                    fill="none"
                    stroke="rgba(0,0,0,0.04)"
                    strokeWidth={0.5}
                  />

                  {/* Curved text along arc */}
                  <text
                    className={`pointer-events-none select-none ${
                      isSelected ? "fill-white" : "fill-gray-600"
                    }`}
                    fontSize={fontSize}
                    fontWeight={isSelected ? 600 : 500}
                    letterSpacing="0.3px"
                  >
                    <textPath
                      href={`#${seg.textArcId}`}
                      startOffset="50%"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {truncLabel}
                    </textPath>
                  </text>
                </g>
              );
            })}
          </g>
        ))}

        {/* Center button — 2x size */}
        <g
          onClick={(e) => { e.stopPropagation(); handleDone(); }}
          className="cursor-pointer center-btn-group"
        >
          {/* Outer glow ring */}
          <circle
            cx={0} cy={0} r={BUTTON_RADIUS + 3}
            fill="none"
            stroke="rgba(59,130,246,0.15)"
            strokeWidth={6}
            className="center-pulse"
          />
          {/* Main circle */}
          <circle
            cx={0} cy={0} r={BUTTON_RADIUS}
            fill={`url(#${uid}-cgrad)`}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={2}
            filter={`url(#${uid}-glow)`}
            className="center-circle"
          />
          {/* Glass highlight */}
          <ellipse
            cx={-8} cy={-14}
            rx={BUTTON_RADIUS * 0.55} ry={BUTTON_RADIUS * 0.3}
            fill="rgba(255,255,255,0.15)"
            className="pointer-events-none"
          />
        </g>

        {/* Center text */}
        <text
          x={0} y={totalSelected > 0 ? -10 : 0}
          textAnchor="middle" dominantBaseline="central"
          className="text-[14px] font-bold fill-white pointer-events-none select-none"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}
        >
          {label.length > 12 ? label.slice(0, 11) + "…" : label}
        </text>
        {totalSelected > 0 && (
          <>
            <text
              x={0} y={6}
              textAnchor="middle" dominantBaseline="central"
              className="text-[8px] fill-blue-200/90 pointer-events-none select-none
                font-medium tracking-[0.08em] uppercase"
            >
              tap to confirm
            </text>
            <text
              x={0} y={18}
              textAnchor="middle" dominantBaseline="central"
              className="text-[9px] fill-white/60 pointer-events-none select-none font-medium"
            >
              {totalSelected} selected
            </text>
          </>
        )}
      </svg>

      {/* Breadcrumb pill */}
      {breadcrumb.length > 0 && (
        <div
          className="absolute pointer-events-none breadcrumb-enter"
          style={{
            left: screenCx,
            top: screenCy - maxR - 32,
            transform: "translateX(-50%)",
          }}
        >
          <div className="text-[11px] text-white/90 font-medium
            bg-white/10 backdrop-blur-xl border border-white/20
            rounded-full px-5 py-2 tracking-wide shadow-xl">
            <span className="text-white/60">{label}</span>
            <span className="text-white/40 mx-1.5">›</span>
            {breadcrumb.map((b, i) => (
              <span key={i}>
                {i > 0 && <span className="text-white/40 mx-1">·</span>}
                <span className="text-white">{b}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Selection count badge */}
      {totalSelected > 0 && (
        <div
          className="absolute pointer-events-none breadcrumb-enter"
          style={{
            left: screenCx,
            top: screenCy + maxR + 16,
            transform: "translateX(-50%)",
          }}
        >
          <div className="text-[10px] text-white/70 font-medium
            bg-white/10 backdrop-blur-xl border border-white/15
            rounded-full px-4 py-1.5 tracking-wide">
            Tap background to cancel
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
