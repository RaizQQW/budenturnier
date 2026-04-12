"use client";

import { useMemo, useState } from "react";

import type { CardAggregateRow } from "@/lib/types";

import { CardPreview } from "./CardPreview";

const MANA_COLORS = ["W", "U", "B", "R", "G"] as const;

function colorPips(colors: string[]) {
  const cls: Record<string, string> = {
    W: "text-amber-200",
    U: "text-blue-400",
    B: "text-violet-300",
    R: "text-red-400",
    G: "text-green-400",
  };
  if (!colors.length) return <span className="text-zinc-400">—</span>;
  return (
    <span className="flex gap-0.5 font-mono text-xs">
      {colors.map((c) => (
        <span key={c} className={cls[c] ?? ""} title={c}>
          {c}
        </span>
      ))}
    </span>
  );
}

function toggleColor(set: Set<string>, c: string) {
  const next = new Set(set);
  if (next.has(c)) next.delete(c);
  else next.add(c);
  return next;
}

function isLandCard(typeLine: string): boolean {
  return /\bLand\b/.test(typeLine);
}

export function CardsTable({ rows }: { rows: CardAggregateRow[] }) {
  const [nameQuery, setNameQuery] = useState("");
  const [typeQuery, setTypeQuery] = useState("");
  const [colorFilter, setColorFilter] = useState<Set<string>>(() => new Set());
  const [hideLands, setHideLands] = useState(true);

  const filtered = useMemo(() => {
    const nq = nameQuery.trim().toLowerCase();
    const tq = typeQuery.trim().toLowerCase();
    return rows.filter((r) => {
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
  }, [rows, nameQuery, typeQuery, colorFilter, hideLands]);

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
        No decklists resolved yet. Add <code>decklists/*.txt</code> and run{" "}
        <code>npm run cache:cards</code>.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
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
          Hide lands — on by default (type line contains “Land”)
        </label>
        <p className="text-xs text-zinc-500">
          Showing {filtered.length} of {rows.length} cards
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="max-h-[min(70vh,720px)] overflow-auto overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-50 shadow-sm dark:bg-zinc-900/95">
              <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
                <th className="px-3 py-2 font-medium">Card</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Colors</th>
                <th
                  className="px-3 py-2 text-right font-medium"
                  title="Decklists on file that run ≥1 copy"
                >
                  Decks
                </th>
                <th
                  className="px-3 py-2 text-right font-medium"
                  title="Meta presence among decklists on file"
                >
                  Play %
                </th>
                <th className="px-3 py-2 font-medium text-right">Σ score</th>
                <th className="px-3 py-2 font-medium text-right">Avg</th>
                <th
                  className="px-3 py-2 font-medium text-right"
                  title="Among decklists that play this card: how many finished in standings rank 4 or better (not ‘top 4 match wins’)."
                >
                  ≤4th
                  <span className="block text-[10px] font-normal normal-case text-zinc-500">
                    decks / decks
                  </span>
                </th>
                <th className="px-3 py-2 font-medium text-right">Best</th>
                <th
                  className="px-3 py-2 text-right font-medium"
                  title="Share of all copies that are in mainboards"
                >
                  Main %
                </th>
                <th
                  className="px-3 py-2 text-right font-medium"
                  title="Share of all copies that are in sideboards"
                >
                  Side %
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.oracle_id}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
                  <td className="px-3 py-2 align-top">
                    <CardPreview
                      name={r.name}
                      typeLine={r.type_line}
                      imageNormal={r.image_normal}
                      scryfallUri={r.scryfall_uri}
                    />
                  </td>
                  <td className="max-w-[200px] px-3 py-2 align-top text-xs text-zinc-600 dark:text-zinc-400">
                    {r.type_line || "—"}
                  </td>
                  <td className="px-3 py-2 align-top">{colorPips(r.colors)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.deckCount}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                    {(100 * r.playRate).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.sumPerformanceScore.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.avgPerformanceScore.toFixed(1)}
                  </td>
                  <td
                    className="px-3 py-2 text-right tabular-nums"
                    title={`${r.topCutDeckCount} of ${r.deckCount} decklists with this card finished rank ≤4`}
                  >
                    {r.deckCount > 0
                      ? `${r.topCutDeckCount} / ${r.deckCount}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.bestRank}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                    {(100 * r.mainCopyShare).toFixed(0)}%
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                    {(100 * r.sideboardCopyShare).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
