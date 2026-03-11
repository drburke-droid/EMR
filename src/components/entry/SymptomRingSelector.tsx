import { useState, useId } from "react";
import { createPortal } from "react-dom";
import {
  computeSegments,
  totalRadius,
  BUTTON_RADIUS_IDLE,
  type ArcSegment,
} from "../../utils/ringGeometry";
import { toggleWithAntithesis } from "../../utils/antithesis";
import {
  getFOLDARQConfig,
  FOLDARQ_KEYS,
  FOLDARQ_LABELS,
  FOLDARQ_COLORS,
  MULTI_SELECT_RINGS,
} from "../../data/symptomFOLDARQ";
import { symptomAbbrev } from "../../data/symptoms";
import { getNlpAssociations } from "../../utils/nlpEngine";
import type { SymptomEntry } from "../../store/encounterStore";

// FOLDARQ geometry — slightly compact to fit 7 rings on tablet
const CENTER_R = 52;
const RING_W = 30;

type RingState = {
  options: string[];
  selected: Set<number>;
  segments: ArcSegment[];
  multiSelect: boolean;
};

type Props = {
  symptom: string;
  isSelected: boolean;
  existingData?: SymptomEntry;
  onComplete: (data: Omit<SymptomEntry, "id" | "symptom">) => void;
  onRemove?: () => void;
};

export default function SymptomRingSelector({
  symptom,
  isSelected,
  existingData,
  onComplete,
  onRemove,
}: Props) {
  const [active, setActive] = useState(false);
  const [rings, setRings] = useState<RingState[]>([]);
  const [reliefSplit, setReliefSplit] = useState(0);
  const uid = useId();

  // ── Build all 7 FOLDARQ rings ──────────────────────────────

  function buildRings() {
    const config = getFOLDARQConfig(symptom);

    // Augment association ring with NLP suggestions
    let assocOptions = [...config.association];
    const nlp = getNlpAssociations(
      config.nlpTerm ?? symptom.toLowerCase(),
      { category: "sign_symptom", limit: 15 },
    );
    const existing = new Set(assocOptions.map((o) => o.toLowerCase()));
    for (const s of nlp) {
      if (!existing.has(s.term.toLowerCase()) && assocOptions.length < 14) {
        assocOptions.push(s.term);
      }
    }

    // Combine relief + aggravating for R ring
    const rOptions = [...config.relief, ...config.aggravating];
    setReliefSplit(config.relief.length);

    const allOptions = [
      config.frequency,   // 0 F
      config.onset,       // 1 O
      config.location,    // 2 L
      config.duration,    // 3 D
      assocOptions,       // 4 A
      rOptions,           // 5 R
      config.quantify,    // 6 Q
    ];

    const states: RingState[] = allOptions.map((opts, ringIdx) => {
      const selected = new Set<number>();

      // Pre-populate from existing data
      if (existingData) {
        const vals = ringValues(ringIdx, existingData, config.relief.length);
        for (const v of vals) {
          const idx = opts.indexOf(v);
          if (idx >= 0) selected.add(idx);
        }
      }

      return {
        options: opts,
        selected,
        segments: computeSegments(ringIdx, opts, CENTER_R, RING_W),
        multiSelect: MULTI_SELECT_RINGS.has(ringIdx),
      };
    });

    setRings(states);
  }

  // ── Tap handling ───────────────────────────────────────────

  function handleOpen() {
    buildRings();
    setActive(true);
  }

  function handleSegmentTap(ringIdx: number, segIdx: number) {
    const ring = rings[ringIdx];

    let next: Set<number>;
    if (ring.multiSelect) {
      // Location ring uses antithesis; others just toggle
      if (ringIdx === 2) {
        next = toggleWithAntithesis(ring.options[segIdx], ring.selected, ring.options);
      } else {
        next = new Set(ring.selected);
        if (next.has(segIdx)) next.delete(segIdx);
        else next.add(segIdx);
      }
    } else {
      // Single select: toggle off if same, else switch
      next = ring.selected.has(segIdx) ? new Set() : new Set([segIdx]);
    }

    const updated = [...rings];
    updated[ringIdx] = { ...ring, selected: next };
    setRings(updated);
  }

  // ── Confirm ────────────────────────────────────────────────

  function handleDone() {
    const data: Omit<SymptomEntry, "id" | "symptom"> = {
      frequency: undefined,
      onset: undefined,
      location: [],
      duration: undefined,
      association: [],
      relief: [],
      aggravating: [],
      quantify: undefined,
    };

    for (let i = 0; i < rings.length; i++) {
      const labels = [...rings[i].selected].sort((a, b) => a - b).map((idx) => rings[i].options[idx]);

      switch (i) {
        case 0: data.frequency = labels[0]; break;
        case 1: data.onset = labels[0]; break;
        case 2: data.location = labels; break;
        case 3: data.duration = labels[0]; break;
        case 4: data.association = labels; break;
        case 5:
          for (const idx of rings[i].selected) {
            if (idx < reliefSplit) data.relief.push(rings[i].options[idx]);
            else data.aggravating.push(rings[i].options[idx]);
          }
          break;
        case 6: data.quantify = labels[0]; break;
      }
    }

    onComplete(data);
    handleClose();
  }

  function handleClose() {
    setActive(false);
    setRings([]);
  }

  // ── Idle button ────────────────────────────────────────────

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
        title={symptom}
      >
        <div
          className={`absolute inset-0 rounded-full backdrop-blur-xl
          border transition-all duration-300 ${
            isSelected
              ? "bg-blue-500/90 border-blue-400/70 shadow-[0_2px_16px_rgba(59,130,246,0.3)]"
              : "bg-white/[0.82] border-white/70 shadow-[0_2px_16px_rgba(0,0,0,0.06)] group-hover:shadow-[0_4px_24px_rgba(59,130,246,0.15)] group-hover:border-blue-200/50"
          }`}
        />
        <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100
          bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/30
          transition-opacity duration-500" />
        <span
          className={`relative z-10 text-[11px] font-semibold
          transition-colors duration-200 px-1 ${
            isSelected ? "text-white" : "text-gray-700 group-hover:text-blue-700"
          }`}
        >
          {symptomAbbrev[symptom] ?? symptom}
        </span>
        {isSelected && existingData?.quantify && (
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2
            bg-white text-blue-600 text-[8px] font-bold
            rounded-full px-1.5 shadow-sm border border-blue-200/50">
            {existingData.quantify}
          </div>
        )}
      </button>
    );
  }

  // ── Expanded portal overlay ────────────────────────────────

  const maxR = totalRadius(rings.length, CENTER_R, RING_W) + 24;
  const svgSize = maxR * 2;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  const totalSel = rings.reduce((s, r) => s + r.selected.size, 0);

  // Breadcrumb
  const crumbs: string[] = [];
  for (const ring of rings) {
    for (const idx of ring.selected) crumbs.push(ring.options[idx]);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 ring-overlay-enter" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[10px] ring-backdrop-enter" />

      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`${-maxR} ${-maxR} ${svgSize} ${svgSize}`}
        className="absolute overflow-visible ring-widget-enter"
        style={{
          left: cx - maxR,
          top: cy - maxR,
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

          {/* Arc text paths for every segment */}
          {rings.flatMap((ring) =>
            ring.segments.map((seg) => (
              <path key={seg.textArcId} id={seg.textArcId} d={seg.textArcPath} fill="none" />
            )),
          )}
        </defs>

        {/* Guide circles */}
        {rings.map((_, i) => (
          <circle
            key={`g-${i}`}
            cx={0} cy={0}
            r={CENTER_R + i * RING_W + RING_W / 2}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={0.75}
            className="ring-guide-enter"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}

        {/* FOLDARQ letter badges between rings */}
        {FOLDARQ_KEYS.map((key, i) => {
          const r = CENTER_R + i * RING_W + RING_W / 2;
          // Position at roughly -60° (1 o'clock) to avoid segment text overlap
          const angle = (-75 * Math.PI) / 180;
          const bx = r * Math.cos(angle);
          const by = r * Math.sin(angle);
          return (
            <g key={`fl-${i}`} className="pointer-events-none">
              <circle cx={bx} cy={by} r={8} fill={FOLDARQ_COLORS[i]} opacity={1} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
              <text
                x={bx} y={by}
                textAnchor="middle" dominantBaseline="central"
                className="text-[8px] fill-white font-extrabold select-none"
              >
                {key}
              </text>
            </g>
          );
        })}

        {/* Ring segments */}
        {rings.map((ring, ringIdx) => (
          <g
            key={`r-${ringIdx}`}
            className="ring-level-enter"
            style={{ animationDelay: `${ringIdx * 70 + 50}ms` }}
          >
            {ring.segments.map((seg) => {
              if (seg.isSpacer) return null;
              const isSel = ring.selected.has(seg.index);
              const isAgg = ringIdx === 5 && seg.index >= reliefSplit;

              const truncLen = ringIdx <= 1 ? 12 : 15;
              const trunc =
                seg.label.length > truncLen
                  ? seg.label.slice(0, truncLen - 1) + "\u2026"
                  : seg.label;
              const fs = ringIdx <= 1 ? 7.5 : 8;

              const fill = isSel
                ? isAgg
                  ? "rgba(220,38,38,0.92)"
                  : "rgba(37,99,235,0.92)"
                : isAgg
                  ? "rgba(254,226,210,0.88)"
                  : "rgba(255,255,255,0.88)";

              const stroke = isSel
                ? isAgg
                  ? "rgba(220,38,38,0.9)"
                  : "rgba(59,130,246,0.9)"
                : "rgba(200,200,210,0.7)";

              return (
                <g
                  key={`s-${ringIdx}-${seg.index}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSegmentTap(ringIdx, seg.index);
                  }}
                  className="cursor-pointer seg-hover-group"
                >
                  <path
                    d={seg.path}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSel ? 1.5 : 0.5}
                    filter={isSel ? `url(#${uid}-sel-glow)` : undefined}
                    className="seg-path"
                  />
                  <path d={seg.path} fill="transparent" className="seg-hover" />
                  <path d={seg.path} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={0.75} />

                  <text
                    className={`pointer-events-none select-none ${
                      isSel ? "fill-white" : isAgg ? "fill-red-900" : "fill-gray-900"
                    }`}
                    fontSize={fs}
                    fontWeight={isSel ? 700 : 600}
                    letterSpacing="0.2px"
                    style={!isSel ? { textShadow: "0 0 3px rgba(255,255,255,0.8)" } : undefined}
                  >
                    <textPath
                      href={`#${seg.textArcId}`}
                      startOffset="50%"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {trunc}
                    </textPath>
                  </text>
                </g>
              );
            })}
          </g>
        ))}

        {/* Center button */}
        <g
          onClick={(e) => {
            e.stopPropagation();
            handleDone();
          }}
          className="cursor-pointer center-btn-group"
        >
          <circle cx={0} cy={0} r={CENTER_R + 3}
            fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth={6}
            className="center-pulse" />
          <circle cx={0} cy={0} r={CENTER_R}
            fill={`url(#${uid}-cgrad)`}
            stroke="rgba(255,255,255,0.25)" strokeWidth={2}
            filter={`url(#${uid}-glow)`}
            className="center-circle" />
          <ellipse cx={-6} cy={-10}
            rx={CENTER_R * 0.55} ry={CENTER_R * 0.3}
            fill="rgba(255,255,255,0.15)"
            className="pointer-events-none" />
        </g>

        {/* Center text */}
        <text
          x={0} y={totalSel > 0 ? -10 : 0}
          textAnchor="middle" dominantBaseline="central"
          className="text-[14px] font-extrabold fill-white pointer-events-none select-none"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
        >
          {symptomAbbrev[symptom] ?? symptom}
        </text>
        {totalSel > 0 && (
          <>
            <text
              x={0} y={5}
              textAnchor="middle" dominantBaseline="central"
              className="text-[8px] fill-blue-100 pointer-events-none select-none
                font-bold tracking-[0.08em] uppercase"
            >
              tap to confirm
            </text>
            <text
              x={0} y={17}
              textAnchor="middle" dominantBaseline="central"
              className="text-[9px] fill-white/80 pointer-events-none select-none font-semibold"
            >
              {totalSel} selected
            </text>
          </>
        )}

        {/* Remove button (separate from center click) */}
        {isSelected && onRemove && (
          <g
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
              handleClose();
            }}
            className="cursor-pointer"
          >
            <rect x={-18} y={26} width={36} height={14} rx={7} fill="rgba(239,68,68,0.35)" />
            <text
              x={0} y={33}
              textAnchor="middle" dominantBaseline="central"
              className="text-[7px] fill-red-200 font-medium pointer-events-none select-none"
            >
              remove
            </text>
          </g>
        )}
      </svg>

      {/* Breadcrumb pill */}
      {crumbs.length > 0 && (
        <div
          className="absolute pointer-events-none breadcrumb-enter"
          style={{ left: cx, top: cy - maxR - 32, transform: "translateX(-50%)" }}
        >
          <div className="text-[11px] text-white/90 font-medium
            bg-white/10 backdrop-blur-xl border border-white/20
            rounded-full px-5 py-2 tracking-wide shadow-xl max-w-[80vw] truncate">
            <span className="text-white/60">{symptom}</span>
            <span className="text-white/40 mx-1.5">&rsaquo;</span>
            {crumbs.slice(0, 6).map((b, i) => (
              <span key={i}>
                {i > 0 && <span className="text-white/40 mx-1">&middot;</span>}
                <span className="text-white">{b}</span>
              </span>
            ))}
            {crumbs.length > 6 && (
              <span className="text-white/40 ml-1">+{crumbs.length - 6} more</span>
            )}
          </div>
        </div>
      )}

      {/* Cancel hint */}
      <div
        className="absolute pointer-events-none breadcrumb-enter"
        style={{ left: cx, top: cy + maxR + 16, transform: "translateX(-50%)" }}
      >
        <div className="text-[10px] text-white/70 font-medium
          bg-white/10 backdrop-blur-xl border border-white/15
          rounded-full px-4 py-1.5 tracking-wide">
          Tap background to cancel
        </div>
      </div>

      {/* FOLDARQ legend */}
      <div
        className="absolute pointer-events-none breadcrumb-enter"
        style={{ left: cx, top: cy + maxR + 40, transform: "translateX(-50%)" }}
      >
        <div className="flex gap-2 text-[9px] font-medium flex-wrap justify-center">
          {FOLDARQ_KEYS.map((key, i) => (
            <span key={key} className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-full flex items-center justify-center text-[6px] text-white font-bold"
                style={{ background: FOLDARQ_COLORS[i], opacity: 0.8 }}
              >
                {key}
              </span>
              <span className="text-white/50">{FOLDARQ_LABELS[i]}</span>
            </span>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Helpers ──────────────────────────────────────────────────

/** Extract current values from an existing SymptomEntry for a given ring index. */
function ringValues(
  ringIdx: number,
  entry: SymptomEntry,
  reliefLen: number,
): string[] {
  switch (ringIdx) {
    case 0: return entry.frequency ? [entry.frequency] : [];
    case 1: return entry.onset ? [entry.onset] : [];
    case 2: return entry.location;
    case 3: return entry.duration ? [entry.duration] : [];
    case 4: return entry.association;
    case 5: return [...entry.relief, ...entry.aggravating];
    case 6: return entry.quantify ? [entry.quantify] : [];
    default: return [];
  }
}
