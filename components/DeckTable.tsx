"use client";

import { Fragment, useState } from "react";

import type { CardPreviewPayload, DeckWithCards } from "@/lib/types";

import { CardPreview } from "./CardPreview";
import { cardNameKey } from "@/lib/parseDecklist";

function DecklistBlock({
  title,
  lines,
  resolvedOracleIds,
  cardPreviewsByOracle,
}: {
  title: string;
  lines: DeckWithCards["lines"];
  resolvedOracleIds: DeckWithCards["resolvedOracleIds"];
  cardPreviewsByOracle: Record<string, CardPreviewPayload>;
}) {
  if (lines.length === 0) return null;
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h4>
      <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {lines.map((line, i) => {
          const oid = resolvedOracleIds[cardNameKey(line.name)];
          const meta = oid ? cardPreviewsByOracle[oid] : undefined;
          return (
            <li
              key={`${line.board}-${i}-${line.name}`}
              className="flex gap-2 text-sm tabular-nums text-zinc-800 dark:text-zinc-200"
            >
              <span className="w-6 shrink-0 text-right text-zinc-500">
                {line.qty}×
              </span>
              <span className="min-w-0">
                {meta ? (
                  <CardPreview
                    name={meta.name}
                    typeLine={meta.type_line}
                    imageNormal={meta.image_normal}
                    scryfallUri={meta.scryfall_uri}
                  />
                ) : (
                  <span className="font-medium">{line.name}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DeckTable({
  decks,
  cardPreviewsByOracle,
}: {
  decks: DeckWithCards[];
  cardPreviewsByOracle: Record<string, CardPreviewPayload>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900/80">
            <th className="px-3 py-2 font-medium">Rank</th>
            <th className="px-3 py-2 font-medium">Player</th>
            <th className="px-3 py-2 font-medium">Archetype</th>
            <th className="px-3 py-2 font-medium">Harmonized</th>
            <th className="px-3 py-2 font-medium text-right">Swiss pts</th>
            <th className="px-3 py-2 font-medium text-right">Bracket w.</th>
            <th className="px-3 py-2 font-medium text-right">Place +</th>
            <th className="px-3 py-2 font-medium text-right">Total</th>
            <th className="px-3 py-2 font-medium">List</th>
          </tr>
        </thead>
        <tbody>
          {decks.map((d) => {
            const hasList = d.lines.length > 0;
            const expanded = openId === d.playerId;
            return (
              <Fragment key={d.playerId}>
                <tr
                  className={`border-b border-zinc-100 dark:border-zinc-900 ${
                    hasList
                      ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                      : ""
                  }`}
                  onClick={() => {
                    if (!hasList) return;
                    setOpenId((id) => (id === d.playerId ? null : d.playerId));
                  }}
                  onKeyDown={(e) => {
                    if (!hasList) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpenId((id) => (id === d.playerId ? null : d.playerId));
                    }
                  }}
                  tabIndex={hasList ? 0 : undefined}
                  aria-expanded={hasList ? expanded : undefined}
                >
                  <td className="px-3 py-2 tabular-nums">{d.rank}</td>
                  <td className="px-3 py-2 font-medium">
                    <span className="inline-flex items-center gap-2">
                      {d.displayName}
                      {hasList ? (
                        <span className="text-xs font-normal text-zinc-400">
                          {expanded ? "▲" : "▼"}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {d.archetype ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {d.harmonizedArchetype ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {d.swissMatchPoints.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {d.bracketWeightedPoints.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {d.placementBonus.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {d.performanceScore.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {hasList ? (
                      <span className="text-green-600 dark:text-green-400">
                        Yes
                      </span>
                    ) : (
                      <span className="text-zinc-400">No</span>
                    )}
                  </td>
                </tr>
                {expanded && hasList ? (
                  <tr className="border-b border-zinc-200 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-950/80">
                    <td colSpan={9} className="px-4 py-4 align-top">
                      <div className="max-h-[min(70vh,560px)] overflow-y-auto pr-1">
                        <DecklistBlock
                          title="Mainboard"
                          lines={d.lines.filter((l) => l.board === "main")}
                          resolvedOracleIds={d.resolvedOracleIds}
                          cardPreviewsByOracle={cardPreviewsByOracle}
                        />
                        <DecklistBlock
                          title="Sideboard"
                          lines={d.lines.filter((l) => l.board === "side")}
                          resolvedOracleIds={d.resolvedOracleIds}
                          cardPreviewsByOracle={cardPreviewsByOracle}
                        />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {decks.some((d) => d.lines.length > 0) ? (
        <p className="border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800">
          Click a row with a decklist to expand. Click again to collapse.
          <span className="mt-1 block">
            <strong className="font-medium text-zinc-600 dark:text-zinc-400">
              Harmonized
            </strong>{" "}
            uses mainboard signatures from the card cache; optional{" "}
            <code className="rounded bg-zinc-100 px-0.5 dark:bg-zinc-800">
              harmonizedArchetype
            </code>{" "}
            in <code className="rounded bg-zinc-100 px-0.5 dark:bg-zinc-800">decks.json</code>{" "}
            overrides that guess. Otherwise manual tags are lightly normalized
            (e.g. Vampires → Rakdos Vampires).
          </span>
        </p>
      ) : null}
    </div>
  );
}
