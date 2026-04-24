import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { computeTournamentStats } from "@/lib/aggregate";
import { isValidSlug, loadTournamentIndex } from "@/lib/tournaments";
import { RoundResults } from "@/components/RoundResults";
import { ManaCurve } from "@/components/ManaCurve";
import { DeckTypeBreakdown } from "@/components/DeckTypeBreakdown";
import { FlatDecklistSection, GroupedDecklist } from "@/components/GroupedDecklist";
import { ScryfallFooter } from "@/components/ScryfallFooter";
import { CsvDownloadButton } from "@/components/CsvDownloadButton";
import { decklistRowsToCsv } from "@/lib/csvExport";

type Props = { params: Promise<{ slug: string; playerId: string }> };

export async function generateStaticParams() {
  const { tournaments } = loadTournamentIndex();
  const params: { slug: string; playerId: string }[] = [];
  for (const t of tournaments) {
    const stats = computeTournamentStats(t.slug);
    for (const d of stats.decksWithCards) {
      params.push({ slug: t.slug, playerId: d.playerId });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, playerId } = await params;
  if (!isValidSlug(slug)) return { title: "Player" };
  const stats = computeTournamentStats(slug);
  const deck = stats.decksWithCards.find((d) => d.playerId === playerId);
  if (!deck) return { title: "Player" };
  return {
    title: `${deck.displayName} · ${stats.meta.title} · Budenturnier`,
    description: `${deck.displayName} — ${deck.harmonizedArchetype ?? deck.archetype ?? "Unknown"} — rank ${deck.rank}`,
  };
}

function ordinalRank(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export default async function PlayerPage({ params }: Props) {
  const { slug, playerId } = await params;
  if (!isValidSlug(slug)) notFound();

  const stats = computeTournamentStats(slug);
  const deck = stats.decksWithCards.find((d) => d.playerId === playerId);
  if (!deck) notFound();

  const hasDeck = deck.lines.length > 0;
  const hasMatches = stats.matches.length > 0;
  const hasCmc = Object.keys(stats.cardCmcByOracle).length > 0;
  const hasOracleTypes = Object.keys(stats.cardTypesByOracle).length > 0;
  const decklistCsvFilename = `${slug}-${playerId}-decklist.csv`;
  const decklistCsv = decklistRowsToCsv(deck.lines);

  const archetype = deck.harmonizedArchetype ?? deck.archetype;
  const swissRecord = (() => {
    let w = 0, l = 0, d = 0;
    for (const m of stats.matches) {
      if (m.phase !== "swiss") continue;
      if (m.bye && m.playerA === deck.displayName) { w++; continue; }
      const isA = m.playerA === deck.displayName;
      const isB = m.playerB === deck.displayName;
      if (!isA && !isB) continue;
      const gFor = isA ? m.gamesA : m.gamesB;
      const gAgainst = isA ? m.gamesB : m.gamesA;
      if (gFor > gAgainst) w++;
      else if (gFor < gAgainst) l++;
      else d++;
    }
    return { w, l, d };
  })();

  return (
    <div className="min-h-full bg-zinc-50/50 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-10 sm:px-6">

        {/* Header */}
        <header className="rounded-xl border border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-white px-6 py-7 shadow-sm dark:border-zinc-800/80 dark:from-zinc-900/50 dark:to-zinc-950/80">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
            <Link href={`/t/${slug}`} className="hover:text-zinc-800 dark:hover:text-zinc-200">
              ← {stats.meta.title}
            </Link>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {deck.displayName}
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {archetype ?? "Unknown archetype"} · Finished {ordinalRank(deck.rank)}
          </p>

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500">Swiss record</span>
              <span className="tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                {swissRecord.w}–{swissRecord.l}{swissRecord.d > 0 ? `–${swissRecord.d}` : ""}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500">Swiss pts</span>
              <span className="tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                {deck.swissMatchPoints.toFixed(1)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500">Percentile</span>
              <span className="tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                {deck.percentileScore.toFixed(1)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500">Score</span>
              <span className="tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                {deck.performanceScore.toFixed(2)}
              </span>
            </div>
          </div>
        </header>

        {/* Round results */}
        {hasMatches && (
          <section className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-5 py-6 shadow-sm sm:px-7 dark:border-zinc-800/80 dark:bg-zinc-900/25">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Round results
            </h2>
            <RoundResults matches={stats.matches} playerName={deck.displayName} />
          </section>
        )}

        {/* Decklist */}
        {hasDeck && (
          <section className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-5 py-6 shadow-sm sm:px-7 dark:border-zinc-800/80 dark:bg-zinc-900/25">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Decklist
              </h2>
              <CsvDownloadButton
                filename={decklistCsvFilename}
                csv={decklistCsv}
                label="CSV · Decklist"
              />
            </div>

            {hasCmc && (
              <div className="mb-6 flex flex-col gap-6">
                <ManaCurve
                  lines={deck.lines}
                  resolvedOracleIds={deck.resolvedOracleIds}
                  oracleCmc={stats.cardCmcByOracle}
                  oracleTypes={stats.cardTypesByOracle}
                />
                <DeckTypeBreakdown
                  lines={deck.lines}
                  resolvedOracleIds={deck.resolvedOracleIds}
                  oracleTypes={stats.cardTypesByOracle}
                />
              </div>
            )}

            <div className="flex flex-col gap-8">
              {hasOracleTypes ? (
                <GroupedDecklist
                  lines={deck.lines}
                  resolvedOracleIds={deck.resolvedOracleIds}
                  cardPreviewsByOracle={stats.cardPreviewsByOracle}
                  oracleTypes={stats.cardTypesByOracle}
                />
              ) : (
                <FlatDecklistSection
                  title="Mainboard"
                  lines={deck.lines.filter((l) => l.board === "main")}
                  resolvedOracleIds={deck.resolvedOracleIds}
                  cardPreviewsByOracle={stats.cardPreviewsByOracle}
                />
              )}
              <FlatDecklistSection
                title="Sideboard"
                lines={deck.lines.filter((l) => l.board === "side")}
                resolvedOracleIds={deck.resolvedOracleIds}
                cardPreviewsByOracle={stats.cardPreviewsByOracle}
              />
            </div>
          </section>
        )}

        {/* Matchups */}
        {hasMatches && (
          <section className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-5 py-6 shadow-sm sm:px-7 dark:border-zinc-800/80 dark:bg-zinc-900/25">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Matchups
            </h2>
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[320px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-100/80 text-left dark:border-zinc-800 dark:bg-zinc-900">
                    <th className="px-3 py-2 font-medium">Round</th>
                    <th className="px-3 py-2 font-medium">Opponent</th>
                    <th className="px-3 py-2 font-medium">Archetype</th>
                    <th className="px-3 py-2 text-center font-medium">Result</th>
                    <th className="px-3 py-2 text-center font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.matches
                    .filter((m) => {
                      if (m.bye && m.playerA === deck.displayName) return true;
                      return m.playerA === deck.displayName || m.playerB === deck.displayName;
                    })
                    .sort((a, b) => {
                      const phaseOrder = { swiss: 0, bracket: 1 };
                      const po = phaseOrder[a.phase] - phaseOrder[b.phase];
                      if (po !== 0) return po;
                      return (a.swissRound ?? 99) - (b.swissRound ?? 99);
                    })
                    .map((m, i) => {
                      const isA = m.playerA === deck.displayName;
                      const isBye = m.bye;
                      const opponent = isBye ? null : isA ? m.playerB : m.playerA;
                      const gFor = isA ? m.gamesA : m.gamesB;
                      const gAgainst = isA ? m.gamesB : m.gamesA;
                      const result = isBye ? "BYE" : gFor > gAgainst ? "W" : gFor < gAgainst ? "L" : "D";
                      const resultColor =
                        result === "W" ? "text-green-700 dark:text-green-400 font-bold" :
                        result === "L" ? "text-red-600 dark:text-red-400 font-bold" :
                        result === "BYE" ? "text-zinc-400" :
                        "text-amber-600 dark:text-amber-400 font-bold";
                      const roundLabel =
                        m.phase === "bracket"
                          ? (m.bracketRound === "semis" ? "Semis" : m.bracketRound === "finals" ? "Finals" : "3rd place")
                          : `R${m.swissRound}`;
                      const oppDeck = opponent ? stats.decksWithCards.find((d) => d.displayName === opponent) : null;
                      const zebra = i % 2 === 1 ? "bg-zinc-50/50 dark:bg-zinc-900/30" : "";
                      return (
                        <tr key={i} className={`border-b border-zinc-100 dark:border-zinc-900 ${zebra}`}>
                          <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">{roundLabel}</td>
                          <td className="px-3 py-2 font-medium">
                            {opponent ? (
                              oppDeck ? (
                                <Link
                                  href={`/t/${slug}/player/${oppDeck.playerId}`}
                                  className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500 dark:decoration-zinc-600 dark:hover:decoration-zinc-400"
                                >
                                  {opponent}
                                </Link>
                              ) : (
                                opponent
                              )
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">
                            {oppDeck ? (oppDeck.harmonizedArchetype ?? oppDeck.archetype ?? "—") : "—"}
                          </td>
                          <td className={`px-3 py-2 text-center ${resultColor}`}>{result}</td>
                          <td className="px-3 py-2 text-center tabular-nums text-zinc-600 dark:text-zinc-400">
                            {isBye ? "—" : `${gFor}–${gAgainst}`}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <ScryfallFooter />
      </div>
    </div>
  );
}
