import { useState, useCallback } from "react";
import { useEncounterStore } from "./store/encounterStore";
import SymptomEntry from "./components/entry/SymptomEntry";
import AnteriorPhoto from "./components/anatomy/AnteriorPhoto";
import PosteriorMap from "./components/anatomy/PosteriorMap";
import DiagnosisSearch from "./components/entry/DiagnosisSearch";
import PlanSelector from "./components/entry/PlanSelector";
import LiveNote from "./components/note/LiveNote";
import { diagnoses } from "./data/diagnoses";
import Chip from "./components/ui/Chip";
import MacWindow, { type WindowState } from "./components/ui/MacWindow";
import CalibrationOverlay from "./components/calibration/CalibrationOverlay";
import type { EyeGeometry } from "./utils/eyeCoordinates";

/* ---- Window definitions ---- */
type WinDef = {
  id: string;
  title: string;
  defaultState: WindowState;
  minW?: number;
  minH?: number;
  bodyClassName?: string;
};

function getDefaults(): Record<string, WindowState> {
  const vw = window.innerWidth;
  const gap = 16;
  const colW = Math.min(420, Math.floor((vw - gap * 4) / 3));
  const tallH = 480;
  const shortH = 320;

  // AS window: wide (~2:1) so dual-eye photo fills naturally and depth gauge matches height
  const asW = Math.min(Math.floor(vw * 0.55), vw - gap * 2);
  const asH = Math.round(asW / 2);

  // Stack other windows below/beside the AS window
  const row2Y = gap + asH + gap;

  return {
    sx:   { x: gap,              y: row2Y,              w: colW, h: shortH, collapsed: false, zIndex: 1 },
    dx:   { x: gap,              y: row2Y + shortH + gap, w: colW, h: shortH, collapsed: false, zIndex: 2 },
    as:   { x: gap,              y: gap,                w: asW,  h: asH,   collapsed: false, zIndex: 3 },
    ps:   { x: gap + colW + gap, y: row2Y,              w: colW, h: tallH,  collapsed: false, zIndex: 4 },
    plan: { x: gap + (colW + gap) * 2, y: row2Y,        w: colW, h: shortH, collapsed: false, zIndex: 5 },
    note: { x: asW + gap * 2,    y: gap,                w: vw - asW - gap * 3, h: asH, collapsed: false, zIndex: 6 },
  };
}

const WIN_DEFS: WinDef[] = [
  { id: "sx",   title: "Hx / Sx",           minW: 300, minH: 180 },
  { id: "as",   title: "Anterior Segment",   minW: 340, minH: 200, bodyClassName: "compact" },
  { id: "ps",   title: "Posterior Segment",   minW: 340, minH: 200, bodyClassName: "compact" },
  { id: "dx",   title: "Diagnoses",          minW: 280, minH: 160 },
  { id: "plan", title: "Plan",               minW: 280, minH: 160 },
  { id: "note", title: "Live Note",          minW: 280, minH: 200 },
];

function WindowContent({ id }: { id: string }) {
  switch (id) {
    case "sx":   return <SymptomEntry />;
    case "as":   return <AnteriorPhoto />;
    case "ps":   return <PosteriorMap />;
    case "dx":   return <DiagnosisSearch />;
    case "plan": return <PlanSelector />;
    case "note": return <LiveNote />;
    default:     return null;
  }
}

export default function App() {
  const { selectedDiagnoses, removeDiagnosis, setActiveModule } = useEncounterStore();

  const [windows, setWindows] = useState<Record<string, WindowState>>(getDefaults);
  const [topZ, setTopZ] = useState(WIN_DEFS.length + 1);
  const [showCalibration, setShowCalibration] = useState(false);

  const updateWindow = useCallback(
    (id: string, patch: Partial<WindowState>) => {
      setWindows((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...patch },
      }));
    },
    [],
  );

  const focusWindow = useCallback(
    (id: string) => {
      setTopZ((z) => {
        const next = z + 1;
        setWindows((prev) => ({
          ...prev,
          [id]: { ...prev[id], zIndex: next },
        }));
        return next;
      });
    },
    [],
  );

  /* ---- Reset layout ---- */
  const resetLayout = useCallback(() => {
    setWindows(getDefaults());
    setTopZ(WIN_DEFS.length + 1);
  }, []);

  /* ---- Tile windows evenly ---- */
  const tileWindows = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const barH = 44; // frosted bar height
    const gap = 10;
    const cols = vw > 1200 ? 3 : vw > 800 ? 2 : 1;
    const rows = Math.ceil(WIN_DEFS.length / cols);
    const cellW = Math.floor((vw - gap * (cols + 1)) / cols);
    const cellH = Math.floor((vh - barH - gap * (rows + 1)) / rows);

    const next: Record<string, WindowState> = {};
    WIN_DEFS.forEach((def, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      next[def.id] = {
        x: gap + col * (cellW + gap),
        y: barH + gap + row * (cellH + gap),
        w: cellW,
        h: cellH,
        collapsed: false,
        zIndex: i + 1,
      };
    });
    setWindows(next);
    setTopZ(WIN_DEFS.length + 1);
  }, []);

  /* ---- Cascade windows ---- */
  const cascadeWindows = useCallback(() => {
    const next: Record<string, WindowState> = {};
    const barH = 44;
    WIN_DEFS.forEach((def, i) => {
      next[def.id] = {
        x: 30 + i * 32,
        y: barH + 20 + i * 32,
        w: 420,
        h: 440,
        collapsed: false,
        zIndex: i + 1,
      };
    });
    setWindows(next);
    setTopZ(WIN_DEFS.length + 1);
  }, []);

  return (
    <div className="h-full flex flex-col wallpaper-section" style={{ overflow: "hidden" }}>
      {/* Frosted toolbar */}
      <div className="frosted-bar shrink-0" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.02em" }}>
            Optometry Chart
          </span>
          <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.15)" }} />
          {/* Quick-focus buttons for each window */}
          {WIN_DEFS.map((def) => (
            <button
              key={def.id}
              type="button"
              onClick={() => {
                // Un-collapse and bring to front
                updateWindow(def.id, { collapsed: false });
                focusWindow(def.id);
              }}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "var(--radius-sm)",
                color: "rgba(255,255,255,0.75)",
                padding: "5px 12px",
                fontSize: "0.78rem",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                minHeight: 32,
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.16)";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "rgba(255,255,255,0.75)";
              }}
            >
              {def.title}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={() => setShowCalibration(true)}
            style={{
              background: "rgba(255,200,0,0.15)",
              border: "1px solid rgba(255,200,0,0.3)",
              borderRadius: 6,
              color: "rgba(255,200,0,0.85)",
              padding: "4px 10px",
              fontSize: "0.72rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Calibrate
          </button>
          <button
            type="button"
            onClick={tileWindows}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: "rgba(255,255,255,0.6)",
              padding: "4px 10px",
              fontSize: "0.72rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Tile
          </button>
          <button
            type="button"
            onClick={cascadeWindows}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: "rgba(255,255,255,0.6)",
              padding: "4px 10px",
              fontSize: "0.72rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cascade
          </button>
          <button
            type="button"
            onClick={resetLayout}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: "rgba(255,255,255,0.6)",
              padding: "4px 10px",
              fontSize: "0.72rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Window canvas */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {WIN_DEFS.map((def) => (
          <MacWindow
            key={def.id}
            id={def.id}
            title={def.title}
            state={windows[def.id]}
            onUpdate={updateWindow}
            onFocus={focusWindow}
            minW={def.minW}
            minH={def.minH}
            bodyClassName={def.bodyClassName}
          >
            <WindowContent id={def.id} />
          </MacWindow>
        ))}
      </div>

      {/* Calibration overlay */}
      {showCalibration && (
        <CalibrationOverlay
          onClose={() => setShowCalibration(false)}
          onApply={(od: EyeGeometry, os: EyeGeometry) => {
            // Log to console so values can be copied
            console.log("Calibrated OD_GEO:", od);
            console.log("Calibrated OS_GEO:", os);
            setShowCalibration(false);
          }}
        />
      )}

      {/* Bottom Dx bar — frosted */}
      <div
        className="shrink-0"
        style={{
          background: "rgba(15,23,42,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          padding: "6px 16px",
        }}
      >
        <div className="flex items-center gap-2 overflow-x-auto">
          <span
            style={{
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.5)",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Dx:
          </span>
          {selectedDiagnoses.length === 0 && (
            <span
              style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.3)",
                fontStyle: "italic",
              }}
            >
              No diagnoses selected
            </span>
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
            onClick={() => {
              setActiveModule("Dx");
              updateWindow("dx", { collapsed: false });
              focusWindow("dx");
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--cyan-400)",
              fontSize: "0.85rem",
              fontWeight: 600,
              minHeight: 36,
              padding: "0 8px",
              cursor: "pointer",
              flexShrink: 0,
              fontFamily: "inherit",
            }}
          >
            + Add Dx
          </button>
        </div>
      </div>
    </div>
  );
}
