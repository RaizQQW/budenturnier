"use client";

import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type Props = {
  name: string;
  typeLine: string;
  imageNormal?: string;
  scryfallUri?: string;
};

/** Wide enough for image + text in a row. */
const PANEL_W = 400;
const CLOSE_DELAY_MS = 220;

export function CardPreview({
  name,
  typeLine,
  imageNormal,
  scryfallUri,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setPanelStyle(null);
    }, CLOSE_DELAY_MS);
  }, [cancelClose]);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const margin = 8;
    /** Horizontal layout keeps the panel fairly short. */
    const estH = 280;
    let left = rect.left;
    /** Prefer above the trigger so vertical lists stay hoverable downward. */
    let top = rect.top - margin;
    let transform = "translateY(-100%)";

    if (left + PANEL_W > window.innerWidth - margin) {
      left = window.innerWidth - PANEL_W - margin;
    }
    if (left < margin) left = margin;

    const spaceAbove = rect.top - margin;
    if (spaceAbove < estH + margin || spaceAbove < margin + 40) {
      top = rect.bottom + margin;
      transform = "";
    }

    setPanelStyle({
      position: "fixed",
      left,
      top,
      transform,
      width: PANEL_W,
      zIndex: 9999,
      maxHeight: `min(85vh, ${window.innerHeight - 2 * margin}px)`,
      overflowY: "auto",
      pointerEvents: "auto",
    });
  }, []);

  useLayoutEffect(() => {
    if (!open || !mounted) return;
    updatePosition();
  }, [open, mounted, name, imageNormal, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => {
      updatePosition();
    };
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePosition]);

  const panel =
    open && mounted && panelStyle ? (
      <div
        ref={panelRef}
        id={id}
        role="tooltip"
        style={panelStyle}
        className="rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <div className="flex flex-row gap-3">
          {imageNormal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageNormal}
              alt=""
              className="w-[168px] shrink-0 self-start rounded-md"
              width={168}
              height={235}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold leading-snug">{name}</div>
            <div className="mt-1 text-xs leading-snug text-zinc-600 dark:text-zinc-400">
              {typeLine}
            </div>
            {scryfallUri ? (
              <a
                href={scryfallUri}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs text-blue-600 underline dark:text-blue-400"
              >
                Open on Scryfall
              </a>
            ) : null}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="cursor-help border-b border-dotted border-zinc-400 text-left font-medium text-zinc-900 hover:text-zinc-600 dark:border-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
        aria-expanded={open}
        aria-controls={id}
        onMouseEnter={() => {
          cancelClose();
          setOpen(true);
        }}
        onMouseLeave={scheduleClose}
        onFocus={() => {
          cancelClose();
          setOpen(true);
        }}
        onBlur={scheduleClose}
      >
        {name}
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
