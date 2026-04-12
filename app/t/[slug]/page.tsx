import Link from "next/link";
import { notFound } from "next/navigation";

import { CardsTable } from "@/components/CardsTable";
import { DeckTable } from "@/components/DeckTable";
import { MetagameMatrix } from "@/components/MetagameMatrix";
import { ScryfallFooter } from "@/components/ScryfallFooter";
import { CardPerformanceClusterTable } from "@/components/CardPerformanceClusterTable";
import { SuperArchetypePlayRates } from "@/components/SuperArchetypePlayRates";
import { StandingsTable } from "@/components/StandingsTable";
import { Disclosure } from "@/components/Disclosure";
import { TournamentCsvExports } from "@/components/TournamentCsvExports";
import { TournamentSection } from "@/components/TournamentSection";
import { computeTournamentStats } from "@/lib/aggregate";
import {
  cardPerformanceClustersToCsv,
  cardRowsToCsv,
  metagameMatrixToCsv,
  superArchetypePlayRatesToCsv,
} from "@/lib/csvExport";
import { isValidSlug, loadTournamentIndex } from "@/lib/tournaments";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { tournaments } = loadTournamentIndex();
  return tournaments.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidSlug(slug)) return { title: "Tournament" };
  const stats = computeTournamentStats(slug);
  return {
    title: `${stats.meta.title} · Budenturnier`,
    description: `${stats.meta.format} — card performance`,
  };
}

export default async function TournamentPage({ params }: Props) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const stats = computeTournamentStats(slug);

  const csvBundles: { label: string; filename: string; csv: string }[] = [
    { label: "Cards", filename: "cards.csv", csv: cardRowsToCsv(stats.cardRows) },
  ];
  if (stats.groupedPlayRates.length > 0) {
    csvBundles.push({
      label: "Play rates (grouped)",
      filename: "play-rate-grouped.csv",
      csv: superArchetypePlayRatesToCsv(stats.groupedPlayRates),
    });
  }
  if (stats.superArchetypePlayRates.length > 0) {
    csvBundles.push({
      label: "Play rates (all)",
      filename: "play-rate-all.csv",
      csv: superArchetypePlayRatesToCsv(stats.superArchetypePlayRates),
    });
  }
  if (stats.metagameGrouped) {
    csvBundles.push({
      label: "Matrix (grouped)",
      filename: "metagame-matrix-grouped.csv",
      csv: metagameMatrixToCsv(stats.metagameGrouped),
    });
  }
  if (stats.metagame) {
    csvBundles.push({
      label: "Matrix (all)",
      filename: "metagame-matrix.csv",
      csv: metagameMatrixToCsv(stats.metagame),
    });
  }
  if (stats.cardPerformanceClusters.length > 0) {
    csvBundles.push({
      label: "Card clusters",
      filename: "card-performance-clusters.csv",
      csv: cardPerformanceClustersToCsv(
        stats.cardPerformanceClusters,
        Object.fromEntries(stats.cardRows.map((r) => [r.oracle_id, r.name])),
      ),
    });
  }

  const hasMetagame =
    stats.groupedPlayRates.length > 0 ||
    stats.superArchetypePlayRates.length > 0 ||
    stats.metagame != null;
  const hasCardPackages = stats.cardPerformanceClusters.length > 0;

  const navLinks: { href: string; label: string }[] = [
    { href: "#cards", label: "Cards" },
    ...(hasMetagame ? [{ href: "#metagame", label: "Metagame" }] : []),
    { href: "#decklists", label: "Decklists" },
    ...(hasCardPackages ? [{ href: "#card-packages", label: "Card packages" }] : []),
    { href: "#standings", label: "Standings" },
  ];

  return (
    <div className="min-h-full bg-zinc-50/50 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-10 sm:px-6">
      <header className="rounded-xl border border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-white px-6 py-7 shadow-sm dark:border-zinc-800/80 dark:from-zinc-900/50 dark:to-zinc-950/80">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-800 dark:hover:text-zinc-200">
            ← All events
          </Link>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {stats.meta.title}
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          {stats.meta.formatUrl ? (
            <a
              href={stats.meta.formatUrl}
              className="underline hover:text-zinc-800 dark:hover:text-zinc-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              {stats.meta.format}
            </a>
          ) : (
            stats.meta.format
          )}{" "}
          · {stats.meta.date}
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Decklists on file: {stats.decklistCoverage.withList} /{" "}
          {stats.decklistCoverage.total} players
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Final standings, decklists, and stats from this event — browse cards,
          matchups, and how each deck performed.
        </p>
        <nav className="mt-5 flex flex-wrap gap-x-1 gap-y-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      <TournamentSection
        id="cards"
        title="Cards"
        aside={<TournamentCsvExports slug={slug} bundles={csvBundles} />}
        description={
          <>
            Cards from decks that performed well. Sort any column — switch to
            raw match points with the Percentile scoring toggle.{" "}
            <Link
              href="/methodology#card-evaluation"
              className="underline hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              How is this calculated?
            </Link>
          </>
        }
      >
        <CardsTable
          rows={stats.cardRows}
          playerOptions={stats.decksWithCards
            .filter((d) => Object.keys(d.oracleQty).length > 0)
            .map((d) => ({
              playerId: d.playerId,
              displayName: d.displayName,
              rank: d.rank,
              percentileScore: d.percentileScore,
              oracleQty: d.oracleQty,
            }))
            .sort((a, b) => a.rank - b.rank || a.displayName.localeCompare(b.displayName))}
        />
      </TournamentSection>

      {hasMetagame ? (
        <TournamentSection
          id="metagame"
          title="Metagame"
          description={
            <>
              Play share and head-to-head game win rates by archetype.{" "}
              <Link
                href="/methodology#metagame"
                className="underline hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                How is this calculated?
              </Link>
            </>
          }
        >
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Who brought what?
          </h3>
          {stats.groupedPlayRates.length > 0 ? (
            <SuperArchetypePlayRates rows={stats.groupedPlayRates} />
          ) : stats.superArchetypePlayRates.length > 0 ? (
            <SuperArchetypePlayRates rows={stats.superArchetypePlayRates} />
          ) : null}

          {stats.groupedPlayRates.length > 0 &&
          stats.superArchetypePlayRates.length > 0 ? (
            <Disclosure title="Show individual archetypes">
              <SuperArchetypePlayRates rows={stats.superArchetypePlayRates} />
            </Disclosure>
          ) : null}

          {stats.metagameGrouped ? (
            <div className="border-t border-zinc-200/70 pt-8 dark:border-zinc-800/70">
              <h3 className="mb-4 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                How matchups went (games)
              </h3>
              <MetagameMatrix data={stats.metagameGrouped} />
            </div>
          ) : null}

          {stats.metagame ? (
            <div className="border-t border-zinc-200/70 pt-6 dark:border-zinc-800/70">
              <Disclosure title="Show all individual archetype matchups">
                <MetagameMatrix data={stats.metagame} />
              </Disclosure>
            </div>
          ) : !stats.metagameGrouped ? (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              Not enough matchup data between different archetypes for a
              matrix — play share above still applies.
            </p>
          ) : null}
        </TournamentSection>
      ) : null}

      <TournamentSection id="decklists" title="Decklists">
        <DeckTable
          decks={stats.decksWithCards}
          cardPreviewsByOracle={stats.cardPreviewsByOracle}
          matches={stats.matches}
          cardCmcByOracle={stats.cardCmcByOracle}
          cardTypesByOracle={stats.cardTypesByOracle}
          slug={slug}
        />
      </TournamentSection>

      {hasCardPackages ? (
        <TournamentSection
          id="card-packages"
          title="Card packages"
          description={
            <>
              Main read: <strong>cards that show up in the same decklists</strong>{" "}
              (co-occurrence), not a separate win model. We only use lists with
              resolved cards; the corpus is the upper half of those lists by{" "}
              <strong>percentile</strong> (median split within that subset —
              each deck&rsquo;s percentile still compares to the full field).{" "}
              <Link
                href="/methodology#card-packages"
                className="underline hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Methodology
              </Link>
            </>
          }
        >
          <CardPerformanceClusterTable
            clusters={stats.cardPerformanceClusters}
            corpus={stats.cardPackageCorpus}
            oracleNames={Object.fromEntries(
              stats.cardRows.map((r) => [r.oracle_id, r.name]),
            )}
          />
        </TournamentSection>
      ) : null}

      <TournamentSection id="standings" title="Standings">
        <StandingsTable standings={stats.standings} />
      </TournamentSection>

      <ScryfallFooter />
      </div>
    </div>
  );
}
