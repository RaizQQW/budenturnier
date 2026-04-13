"use client";

import Link from "next/link";
import { Fragment, useState } from "react";

import type { MatchRow } from "@/lib/aggregate";
import type { CardPreviewPayload, DeckWithCards } from "@/lib/types";

import { ManaCurve } from "./ManaCurve";
import { DeckTypeBreakdown } from "./DeckTypeBreakdown";
import { FlatDecklistSection, GroupedDecklist } from "./GroupedDecklist";
import { RoundResults } from "./RoundResults";

export function DeckTable({
  decks,
  cardPreviewsByOracle,
  matches = [],
  cardCmcByOracle = {},
  cardTypesByOracle = {},
  slug,
}: {
  decks: DeckWithCards[];
  cardPreviewsByOracle: Record<string, CardPreviewPayload>;
  matches?: MatchRow[];
  cardCmcByOracle?: Record<string, number>;
  cardTypesByOracle?: Record<string, string>;
  slug?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const showGroup = decks.some(
    (d) =>
      d.groupedArchetype != null &&
      d.groupedArchetype !== (d.harmonizedArchetype ?? d.archetype),
  );

  const hasMatches = matches.length > 0;

  // Rank, Player, [Group,] Archetype, Swiss pts
  const colCount = 4 + (showGroup ? 1 : 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-100/80 text-left dark:border-zinc-800 dark:bg-zinc-900">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Player</th>
            {showGroup && <th className="px-3 py-2 font-medium">Group</th>}
            <th className="px-3 py-2 font-medium">Archetype</th>
            <th className="px-3 py-2 text-right font-medium" title="Swiss match points">
              Swiss pts
            </th>
          </tr>
        </thead>
        <tbody>
          {decks.map((d, rowIndex) => {
            const hasList = d.lines.length > 0;
            const expanded = openId === d.playerId;
            const zebra =
              rowIndex % 2 === 1
                ? "bg-zinc-50/50 dark:bg-zinc-900/30"
                : "";
            return (
              <Fragment key={d.playerId}>
                <tr
                  className={`border-b border-zinc-100 dark:border-zinc-900 ${zebra} ${
                    hasList
                      ? "cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-zinc-900/60"
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
                  <td className="px-3 py-2 tabular-nums text-zinc-500 dark:text-zinc-400">
                    {d.rank}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    <span className="inline-flex items-center gap-2">
                      {slug ? (
                        <Link
                          href={`/t/${slug}/player/${d.playerId}`}
                          className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500 dark:decoration-zinc-600 dark:hover:decoration-zinc-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {d.displayName}
                        </Link>
                      ) : (
                        d.displayName
                      )}
                      {hasList ? (
                        <span className="text-xs font-normal text-zinc-400">
                          {expanded ? "▲" : "▼"}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  {showGroup && (
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">
                      {d.groupedArchetype ?? "—"}
                    </td>
                  )}
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {d.harmonizedArchetype ?? d.archetype ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {Math.round(d.swissMatchPoints)}
                  </td>
                </tr>
                {expanded && hasList ? (
                  <tr className="border-b border-zinc-200 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-950/80">
                    <td colSpan={colCount} className="px-4 py-4 align-top">
                      {hasMatches && (
                        <div className="mb-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Round results
                          </p>
                          <RoundResults matches={matches} playerName={d.displayName} />
                        </div>
                      )}
                      {Object.keys(cardCmcByOracle).length > 0 && (
                        <div className="mb-4 flex flex-col gap-4">
                          <ManaCurve
                            lines={d.lines}
                            resolvedOracleIds={d.resolvedOracleIds}
                            oracleCmc={cardCmcByOracle}
                            oracleTypes={cardTypesByOracle}
                          />
                          <DeckTypeBreakdown
                            lines={d.lines}
                            resolvedOracleIds={d.resolvedOracleIds}
                            oracleTypes={cardTypesByOracle}
                          />
                        </div>
                      )}
                      <div className="max-h-[min(70vh,560px)] overflow-y-auto pr-1">
                        <div className="flex flex-col gap-6">
                          {Object.keys(cardTypesByOracle).length > 0 ? (
                            <GroupedDecklist
                              lines={d.lines}
                              resolvedOracleIds={d.resolvedOracleIds}
                              cardPreviewsByOracle={cardPreviewsByOracle}
                              oracleTypes={cardTypesByOracle}
                            />
                          ) : (
                            <FlatDecklistSection
                              title="Mainboard"
                              lines={d.lines.filter((l) => l.board === "main")}
                              resolvedOracleIds={d.resolvedOracleIds}
                              cardPreviewsByOracle={cardPreviewsByOracle}
                            />
                          )}
                          <FlatDecklistSection
                            title="Sideboard"
                            lines={d.lines.filter((l) => l.board === "side")}
                            resolvedOracleIds={d.resolvedOracleIds}
                            cardPreviewsByOracle={cardPreviewsByOracle}
                          />
                        </div>
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
          Click a row to expand its decklist and round results. Archetype is
          auto-detected from mainboard signatures where a list is available.
        </p>
      ) : null}
    </div>
  );
}
