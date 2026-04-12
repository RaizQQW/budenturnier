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

/** Card image dimensions (Scryfall "normal" size is 488×680, we display at half) */
const CARD_W = 220;
const CARD_H = Math.round(CARD_W * (680 / 488)); // ≈ 306
const CLOSE_DELAY_MS = 180;
const MARGIN = 8;

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return coarse;
}

export function CardPreview({
  name,
  typeLine,
  imageNormal,
  scryfallUri,
}: Props) {
  const coarse = useCoarsePointer();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
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
    if (coarse) return;
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setPanelStyle(null);
    }, CLOSE_DELAY_MS);
  }, [cancelClose, coarse]);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;

    if (coarse) {
      // Bottom-anchored sheet on touch devices
      const vw = window.innerWidth;
      const panelW = Math.min(400, vw - 2 * MARGIN);
      setPanelStyle({
        position: "fixed",
        left: MARGIN,
        right: MARGIN,
        bottom: MARGIN,
        top: "auto",
        width: "auto",
        maxWidth: panelW,
        marginLeft: "auto",
        marginRight: "auto",
        transform: "none",
        zIndex: 10001,
        maxHeight: "min(70vh, 520px)",
        overflowY: "auto",
        pointerEvents: "auto",
      });
      return;
    }

    // Desktop: card image floats to the right of the trigger, or left if no space
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const GAP = 10; // gap between trigger and card image

    // Prefer right side
    let left: number;
    if (rect.right + GAP + CARD_W + MARGIN <= vw) {
      left = rect.right + GAP;
    } else {
      // Flip to the left
      left = rect.left - CARD_W - GAP;
    }
    if (left < MARGIN) left = MARGIN;

    // Vertically: align card's vertical center with the trigger's vertical center,
    // clamped so it doesn't overflow viewport
    const triggerMidY = rect.top + rect.height / 2;
    let top = triggerMidY - CARD_H / 2;
    top = Math.max(MARGIN, Math.min(top, vh - CARD_H - MARGIN));

    setPanelStyle({
      position: "fixed",
      left,
      top,
      width: CARD_W,
      zIndex: 9999,
      pointerEvents: "auto",
    });
  }, [coarse]);

  useLayoutEffect(() => {
    if (!open || !mounted) return;
    updatePosition();
  }, [open, mounted, name, imageNormal, coarse, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const update = () => updatePosition();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setPanelStyle(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const panel =
    open && mounted && panelStyle ? (
      coarse ? (
        // Touch: full info sheet at bottom
        <div
          id={id}
          role="dialog"
          aria-modal
          aria-label={name}
          style={panelStyle}
          className="rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            {imageNormal ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageNormal}
                alt=""
                className="mx-auto w-full max-w-[168px] shrink-0 self-start rounded-md sm:mx-0"
                width={168}
                height={Math.round(168 * (680 / 488))}
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
      ) : imageNormal ? (
        // Desktop: card image only, floating next to the name
        <div
          id={id}
          role="tooltip"
          aria-label={name}
          style={panelStyle}
          className="overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/10"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageNormal}
            alt={name}
            width={CARD_W}
            height={CARD_H}
            className="block"
            style={{ width: CARD_W, height: CARD_H }}
          />
        </div>
      ) : null
    ) : null;

  const backdrop =
    open && mounted && coarse ? (
      <button
        type="button"
        aria-label="Close card preview"
        className="fixed inset-0 z-[9998] bg-black/40"
        onClick={() => {
          setOpen(false);
          setPanelStyle(null);
        }}
      />
    ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`text-left font-medium text-zinc-900 underline decoration-zinc-400 decoration-dotted underline-offset-2 dark:text-zinc-100 dark:decoration-zinc-500 ${
          coarse ? "cursor-pointer touch-manipulation" : "cursor-help"
        }`}
        aria-expanded={open}
        aria-controls={id}
        onMouseEnter={
          coarse
            ? undefined
            : () => {
                cancelClose();
                setOpen(true);
              }
        }
        onMouseLeave={coarse ? undefined : scheduleClose}
        onFocus={
          coarse
            ? undefined
            : () => {
                cancelClose();
                setOpen(true);
              }
        }
        onBlur={coarse ? undefined : scheduleClose}
        onClick={(e) => {
          e.stopPropagation();
          if (!coarse) return;
          e.preventDefault();
          setOpen((o) => {
            const next = !o;
            if (!next) setPanelStyle(null);
            return next;
          });
        }}
      >
        <span className="break-words leading-snug">{name}</span>
      </button>
      {mounted && backdrop ? createPortal(backdrop, document.body) : null}
      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
