import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";

export type WindowState = {
  x: number;
  y: number;
  w: number;
  h: number;
  collapsed: boolean;
  zIndex: number;
};

type Props = {
  id: string;
  title: string;
  state: WindowState;
  onUpdate: (id: string, patch: Partial<WindowState>) => void;
  onFocus: (id: string) => void;
  children: ReactNode;
  /** Minimum width in px */
  minW?: number;
  /** Minimum height in px */
  minH?: number;
  /** Extra class on the body div (e.g. "compact" for tight padding) */
  bodyClassName?: string;
};

const MIN_W_DEFAULT = 320;
const MIN_H_DEFAULT = 200;
const TITLEBAR_H = 36;

export default function MacWindow({
  id,
  title,
  state,
  onUpdate,
  onFocus,
  children,
  minW = MIN_W_DEFAULT,
  minH = MIN_H_DEFAULT,
  bodyClassName,
}: Props) {
  const dragging = useRef(false);
  const resizing = useRef(false);
  const origin = useRef({ px: 0, py: 0, x: 0, y: 0, w: 0, h: 0 });

  /* ---- Drag ---- */
  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      // Don't drag if clicking a button inside titlebar
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      dragging.current = true;
      origin.current = {
        px: e.clientX,
        py: e.clientY,
        x: state.x,
        y: state.y,
        w: state.w,
        h: state.h,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onFocus(id);
    },
    [id, state.x, state.y, state.w, state.h, onFocus],
  );

  const onDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - origin.current.px;
      const dy = e.clientY - origin.current.py;
      onUpdate(id, {
        x: origin.current.x + dx,
        y: origin.current.y + dy,
      });
    },
    [id, onUpdate],
  );

  const onDragEnd = useCallback(() => {
    dragging.current = false;
  }, []);

  /* ---- Resize ---- */
  const onResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizing.current = true;
      origin.current = {
        px: e.clientX,
        py: e.clientY,
        x: state.x,
        y: state.y,
        w: state.w,
        h: state.h,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onFocus(id);
    },
    [id, state.x, state.y, state.w, state.h, onFocus],
  );

  const onResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizing.current) return;
      const dx = e.clientX - origin.current.px;
      const dy = e.clientY - origin.current.py;
      onUpdate(id, {
        w: Math.max(minW, origin.current.w + dx),
        h: Math.max(minH, origin.current.h + dy),
      });
    },
    [id, minW, minH, onUpdate],
  );

  const onResizeEnd = useCallback(() => {
    resizing.current = false;
  }, []);

  /* ---- Collapse toggle ---- */
  const toggleCollapse = useCallback(() => {
    onUpdate(id, { collapsed: !state.collapsed });
    onFocus(id);
  }, [id, state.collapsed, onUpdate, onFocus]);

  /* ---- Double-click titlebar to collapse ---- */
  const onTitleDblClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      toggleCollapse();
    },
    [toggleCollapse],
  );

  return (
    <div
      className="mac-window"
      onPointerDown={() => onFocus(id)}
      style={{
        position: "absolute",
        left: state.x,
        top: state.y,
        width: state.w,
        height: state.collapsed ? TITLEBAR_H : state.h,
        zIndex: state.zIndex,
        display: "flex",
        flexDirection: "column",
        transition: state.collapsed
          ? "height 200ms cubic-bezier(0.16,1,0.3,1)"
          : "none",
        overflow: "hidden",
        userSelect: dragging.current || resizing.current ? "none" : "auto",
      }}
    >
      {/* Titlebar — drag handle */}
      <div
        className="mac-titlebar"
        style={{
          cursor: "grab",
          flexShrink: 0,
          touchAction: "none",
        }}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        onDoubleClick={onTitleDblClick}
      >
        <div className="titlebar-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </span>
        {/* Collapse / expand button */}
        <button
          type="button"
          onClick={toggleCollapse}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px 6px",
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            lineHeight: 1,
            fontFamily: "inherit",
            borderRadius: 4,
          }}
          title={state.collapsed ? "Expand" : "Collapse"}
        >
          {state.collapsed ? "\u25B3" : "\u25BD"}
        </button>
      </div>

      {/* Body */}
      {!state.collapsed && (
        <div
          className={`mac-body${bodyClassName ? ` ${bodyClassName}` : ""}`}
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            position: "relative",
          }}
        >
          {children}
        </div>
      )}

      {/* Resize handle (bottom-right corner) */}
      {!state.collapsed && (
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: 20,
            height: 20,
            cursor: "nwse-resize",
            touchAction: "none",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ opacity: 0.3 }}>
            <path d="M9 1L1 9M9 4L4 9M9 7L7 9" stroke="currentColor" strokeWidth="1.2" fill="none" />
          </svg>
        </div>
      )}
    </div>
  );
}
