"use client";

import { useEffect, useMemo, useState } from "react";

import type { CardAggregateRow, CardTablePlayerOption } from "@/lib/types";

import { CardPreview } from "./CardPreview";

const MANA_COLORS = ["W", "U", "B", "R", "G"] as const;


function toggleColor(set: Set<string>, c: string) {
  const next = new Set(set);
  if (next.has(c)) next.delete(c);
  else next.add(c);
  return next;
}

function isLandCard(typeLine: string): boolean {
  return /\bLand\b/.test(typeLine);
}

type SortKey =
  | "adjustedAvg"
  | "decks"
  | "playRate"
  | "topCut"
  | "avgMain"
  | "avgSide"
  | "totalCopies"
  | "vsField";

function sortValue(
  r: CardAggregateRow,
  key: SortKey,
  vsField: number | null,
): number {
  switch (key) {
    case "adjustedAvg":
      return r.adjustedAvgPercentile;
    case "decks":
      return r.deckCount;
    case "playRate":
      return r.playRate;
    case "topCut":
      return r.topCutRate;
    case "avgMain":
      return r.avgMainCopies;
    case "avgSide":
      return r.avgSideCopies;
    case "totalCopies":
      return r.totalCopiesPlayed;
    case "vsField":
      return vsField ?? -9999;
  }
}

function Th({
  children,
  title,
  sortKey,
  currentSort,
  onSort,
  className = "",
  disabled,
}: {
  children: React.ReactNode;
  title?: string;
  sortKey: SortKey;
  currentSort: SortKey;
  onSort: (k: SortKey) => void;
  className?: string;
  disabled?: boolean;
}) {
  const active = currentSort === sortKey;
  if (disabled) {
    return (
      <th
        className={`px-3 py-2 font-medium text-zinc-500 dark:text-zinc-400 ${className}`}
        title={title}
      >
        {children}
      </th>
    );
  }
  return (
    <th
      className={`cursor-pointer select-none px-3 py-2 font-medium transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 ${active ? "text-zinc-900 dark:text-zinc-100" : ""} ${className}`}
      title={title}
      onClick={() => onSort(sortKey)}
    >
      {children}
      {active ? " ▼" : ""}
    </th>
  );
}

type Grade = "S" | "A" | "B" | "C" | "D" | "F";

/**
 * Assign grades relative to the full card pool so shrinkage toward the mean
 * (common in small tournaments) doesn't collapse everything to C.
 * Buckets (cumulative from top): S 5%, A 20%, B 45%, C 75%, D 90%, F rest.
 */
function buildGradeMap(allRows: CardAggregateRow[]): Map<string, Grade> {
  const sorted = [...allRows].sort(
    (a, b) => b.adjustedAvgPercentile - a.adjustedAvgPercentile,
  );
  const n = sorted.length;
  const thresholds: [Grade, number][] = [
    ["S", 0.05],
    ["A", 0.20],
    ["B", 0.45],
    ["C", 0.75],
    ["D", 0.90],
  ];
  const map = new Map<string, Grade>();
  for (let i = 0; i < sorted.length; i++) {
    const rank = i / n;
    const grade =
      thresholds.find(([, t]) => rank < t)?.[0] ?? "F";
    map.set(sorted[i]!.oracle_id, grade);
  }
  return map;
}

const GRADE_STYLES: Record<Grade, string> = {
  S: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  A: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  B: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  C: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  D: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
  F: "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400",
};

function GradeBadge({ grade, percentile }: { grade: Grade; percentile: number }) {
  return (
    <span
      className={`inline-block rounded px-1 py-0.5 text-[10px] font-bold leading-none ${GRADE_STYLES[grade]}`}
      title={`Grade ${grade} (relative rank) — adjusted avg percentile: ${percentile.toFixed(1)}`}
    >
      {grade}
    </span>
  );
}

function deckCopyLabel(q: { main: number; side: number } | undefined): string {
  if (!q) return "—";
  const { main, side } = q;
  if (side <= 0) return String(main);
  return `${main}+${side}`;
}

function ordinalRank(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function CardsTable({
  rows,
  playerOptions = [],
}: {
  rows: CardAggregateRow[];
  playerOptions?: CardTablePlayerOption[];
}) {
  const [nameQuery, setNameQuery] = useState("");
  const [typeQuery, setTypeQuery] = useState("");
  const [colorFilter, setColorFilter] = useState<Set<string>>(() => new Set());
  const [hideLands, setHideLands] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("adjustedAvg");
  const [focusPlayerId, setFocusPlayerId] = useState<string | null>(null);
  const [deckScopeOnly, setDeckScopeOnly] = useState(true);

  const focusDeck = useMemo(
    () => playerOptions.find((p) => p.playerId === focusPlayerId) ?? null,
    [focusPlayerId, playerOptions],
  );

  const gradeMap = useMemo(() => buildGradeMap(rows), [rows]);

  useEffect(() => {
    if (!focusPlayerId && sortKey === "vsField") setSortKey("adjustedAvg");
  }, [focusPlayerId, sortKey]);


  const filtered = useMemo(() => {
    const nq = nameQuery.trim().toLowerCase();
    const tq = typeQuery.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (hideLands && isLandCard(r.type_line)) return false;
      if (nq && !r.name.toLowerCase().includes(nq)) return false;
      if (tq && !r.type_line.toLowerCase().includes(tq)) return false;
      if (colorFilter.size > 0) {
        const cardColors = new Set(r.colors);
        const matches = [...colorFilter].some((c) => cardColors.has(c));
        if (!matches) return false;
      }
      return true;
    });
    if (focusDeck && deckScopeOnly) {
      list = list.filter((r) => Boolean(focusDeck.oracleQty[r.oracle_id]));
    }
    return list;
  }, [
    rows,
    nameQuery,
    typeQuery,
    colorFilter,
    hideLands,
    focusDeck,
    deckScopeOnly,
  ]);

  const sorted = useMemo(() => {
    const vf = (r: CardAggregateRow): number | null =>
      focusDeck?.oracleQty[r.oracle_id]
        ? focusDeck.percentileScore - r.avgPercentile
        : null;
    return [...filtered].sort((a, b) => {
      if (sortKey === "vsField") {
        const va = vf(a) ?? -1e9;
        const vb = vf(b) ?? -1e9;
        return vb - va;
      }
      return (
        sortValue(b, sortKey, vf(b)) - sortValue(a, sortKey, vf(a))
      );
    });
  }, [filtered, sortKey, focusDeck]);

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
        No card data available for this event yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        {playerOptions.length > 0 ? (
          <div className="flex flex-col gap-2 border-b border-zinc-200/80 pb-3 dark:border-zinc-800/80">
            <label className="flex max-w-md flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Compare to a player&apos;s deck
              <select
                value={focusPlayerId ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFocusPlayerId(v || null);
                  setDeckScopeOnly(true);
                }}
                className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="">— All players —</option>
                {playerOptions.map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    #{p.rank} {p.displayName}
                  </option>
                ))}
              </select>
            </label>
            {focusDeck ? (
              <>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Finished{" "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {ordinalRank(focusDeck.rank)}
                  </span>{" "}
                  · Field percentile{" "}
                  <span className="font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                    {focusDeck.percentileScore.toFixed(1)}
                  </span>
                  .{" "}
                  <span className="text-zinc-500 dark:text-zinc-500">
                    Run vs avg compares that number to the average for every
                    deck that also ran this card (green = you ran hotter than
                    that average).
                  </span>
                </p>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={deckScopeOnly}
                    onChange={(e) => setDeckScopeOnly(e.target.checked)}
                    className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 dark:border-zinc-600"
                  />
                  Only show cards in this deck
                </label>
              </>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Card name
            <input
              type="search"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Contains…"
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Type line
            <input
              type="search"
              value={typeQuery}
              onChange={(e) => setTypeQuery(e.target.value)}
              placeholder="Creature, Instant…"
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Color (any)
          </span>
          {MANA_COLORS.map((c) => {
            const on = colorFilter.has(c);
            const colorName: Record<string, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };
            return (
              <button
                key={c}
                type="button"
                onClick={() => setColorFilter((s) => toggleColor(s, c))}
                className={`h-8 min-w-8 rounded-md border px-2 text-xs font-semibold transition-colors ${
                  on
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
                aria-pressed={on}
                aria-label={colorName[c] ?? c}
              >
                {c}
              </button>
            );
          })}
          {colorFilter.size > 0 ? (
            <button
              type="button"
              className="text-xs text-blue-600 underline dark:text-blue-400"
              onClick={() => setColorFilter(new Set())}
            >
              Clear colors
            </button>
          ) : null}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={hideLands}
            onChange={(e) => setHideLands(e.target.checked)}
            className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 dark:border-zinc-600"
          />
          Hide lands
        </label>
        <p className="text-xs text-zinc-500">
          Showing {filtered.length} of {rows.length} cards
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="max-h-[min(70vh,720px)] overflow-y-auto">
          <table className="w-full min-w-0 table-fixed border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-100/90 shadow-sm dark:bg-zinc-900">
              <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
                <Th sortKey="adjustedAvg" currentSort={sortKey} onSort={setSortKey} className="w-10 whitespace-nowrap px-2 py-2 text-center text-xs sm:px-3 sm:text-sm" title="Performance grade relative to all cards in this event (S = top 5%, A = next 15%, B = next 25%, C = next 30%, D = next 15%, F = bottom 10%)">
                  Grade
                </Th>
                <th className="w-[36%] min-w-[7rem] px-2 py-2 text-xs font-medium sm:w-[26%] sm:px-3 sm:text-sm lg:w-[20%]">
                  Card
                </th>
                <th className="hidden w-[12%] min-w-0 px-2 py-2 text-xs font-medium min-[900px]:table-cell sm:px-3 sm:text-sm">
                  Type
                </th>
                <Th sortKey="decks" currentSort={sortKey} onSort={setSortKey} className="w-[4.5rem] whitespace-nowrap px-2 py-2 text-right text-xs sm:px-3 sm:text-sm" title="Decklists on file that run ≥1 copy">
                  Decks
                </Th>
                <Th sortKey="playRate" currentSort={sortKey} onSort={setSortKey} className="w-[4.5rem] whitespace-nowrap px-2 py-2 text-right text-xs sm:px-3 sm:text-sm" title="Meta presence among decklists on file">
                  Play %
                </Th>
                <Th
                  sortKey="totalCopies"
                  currentSort={sortKey}
                  onSort={setSortKey}
                  className="w-[4.5rem] whitespace-nowrap px-2 py-2 text-right text-xs sm:px-3 sm:text-sm"
                  title="Total main + side copies played across all decklists that run this card"
                >
                  Copies
                </Th>

                <Th sortKey="topCut" currentSort={sortKey} onSort={setSortKey} className="w-[4.5rem] whitespace-nowrap px-2 py-2 text-right text-xs sm:px-3 sm:text-sm" title="% of decks playing this card that finished rank ≤4">
                  Top-4
                </Th>
                <Th sortKey="avgMain" currentSort={sortKey} onSort={setSortKey} className="w-[4rem] whitespace-nowrap px-2 py-2 text-right text-xs sm:px-3 sm:text-sm" title="Average main-deck copies per deck that runs this card">
                  Main
                </Th>
                <Th sortKey="avgSide" currentSort={sortKey} onSort={setSortKey} className="w-[4rem] whitespace-nowrap px-2 py-2 text-right text-xs sm:px-3 sm:text-sm" title="Average sideboard copies per deck that runs this card">
                  Side
                </Th>
                {focusDeck ? (
                  <>
                    <th className="w-[4.5rem] whitespace-nowrap px-2 py-2 text-right text-xs font-medium text-zinc-700 sm:px-3 sm:text-sm dark:text-zinc-300">
                      Deck
                    </th>
                    <Th
                      sortKey="vsField"
                      currentSort={sortKey}
                      onSort={setSortKey}
                      className="w-[4.5rem] whitespace-nowrap px-2 py-2 text-right text-xs sm:px-3 sm:text-sm"
                      title="This player's field percentile minus average percentile of all decks that ran this card"
                    >
                      vs avg
                    </Th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={
                      /* Grade + Card + Type + Decks + Play% + Copies = 6 */
                      6 +
                      /* Top-4, Main, Side = 3 */
                      3 +
                      /* focus deck columns: Deck + vs avg = 2 */
                      (focusDeck ? 2 : 0)
                    }
                    className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    No cards match your filters.{" "}
                    <button
                      type="button"
                      className="text-blue-600 underline dark:text-blue-400"
                      onClick={() => {
                        setNameQuery("");
                        setTypeQuery("");
                        setColorFilter(new Set());
                      }}
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              )}
              {sorted.map((r, i) => {
                const inFocusDeck = Boolean(
                  focusDeck?.oracleQty[r.oracle_id],
                );
                const vs =
                  focusDeck && inFocusDeck
                    ? focusDeck.percentileScore - r.avgPercentile
                    : null;
                const dimmed =
                  focusDeck && !deckScopeOnly && !inFocusDeck ? "opacity-45" : "";
                return (
                <tr
                  key={r.oracle_id}
                  className={`border-b border-zinc-100 dark:border-zinc-900 ${
                    i % 2 === 1
                      ? "bg-zinc-50/50 dark:bg-zinc-900/30"
                      : ""
                  } ${dimmed} ${
                    focusDeck && inFocusDeck
                      ? "bg-amber-50/40 dark:bg-amber-950/15"
                      : ""
                  }`}
                >
                  <td className="px-2 py-2 text-center align-middle sm:px-3">
                    <GradeBadge
                      grade={gradeMap.get(r.oracle_id) ?? "C"}
                      percentile={r.adjustedAvgPercentile}
                    />
                  </td>
                  <td className="min-w-0 px-2 py-2 align-top sm:px-3">
                    <div className="min-w-0 break-words text-left leading-snug">
                      <CardPreview
                        name={r.name}
                        typeLine={r.type_line}
                        imageNormal={r.image_normal}
                        scryfallUri={r.scryfall_uri}
                      />
                    </div>
                  </td>
                  <td className="hidden min-w-0 px-2 py-2 align-top text-xs leading-snug text-zinc-600 min-[900px]:table-cell sm:px-3 dark:text-zinc-400">
                    <span className="line-clamp-2 break-words">{r.type_line || "—"}</span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums sm:px-3">
                    {r.deckCount}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-zinc-600 sm:px-3 dark:text-zinc-400">
                    {(100 * r.playRate).toFixed(1)}%
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-zinc-700 sm:px-3 dark:text-zinc-300">
                    {r.totalCopiesPlayed}
                  </td>


                  <td
                    className="whitespace-nowrap px-2 py-2 text-right tabular-nums sm:px-3"
                    title={`${r.topCutDeckCount} of ${r.deckCount} decklists with this card finished rank ≤4`}
                  >
                    {r.deckCount > 0 ? `${(100 * r.topCutRate).toFixed(0)}%` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums sm:px-3">
                    {r.avgMainCopies.toFixed(1)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-zinc-600 sm:px-3 dark:text-zinc-400">
                    {r.avgSideCopies.toFixed(1)}
                  </td>
                  {focusDeck ? (
                    <>
                      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums font-medium text-zinc-800 sm:px-3 dark:text-zinc-200">
                        {deckCopyLabel(focusDeck.oracleQty[r.oracle_id])}
                      </td>
                      <td
                        className={`whitespace-nowrap px-2 py-2 text-right tabular-nums sm:px-3 ${
                          vs == null
                            ? "text-zinc-400"
                            : vs > 2
                              ? "font-medium text-green-600 dark:text-green-400"
                              : vs < -2
                                ? "font-medium text-red-500 dark:text-red-400"
                                : "text-zinc-600 dark:text-zinc-400"
                        }`}
                        title={
                          vs != null
                            ? `Your run (${focusDeck.percentileScore.toFixed(1)} pctl) vs avg among decks with this card (${r.avgPercentile.toFixed(1)})`
                            : undefined
                        }
                      >
                        {vs != null ? (
                          <>
                            {vs > 0 ? "+" : ""}
                            {vs.toFixed(1)}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </>
                  ) : null}
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
