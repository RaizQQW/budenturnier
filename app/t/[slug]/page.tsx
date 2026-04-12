import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchetypeTable } from "@/components/ArchetypeTable";
import { CardsTable } from "@/components/CardsTable";
import { ClusterTable } from "@/components/ClusterTable";
import { DeckTable } from "@/components/DeckTable";
import { MetagameMatrix } from "@/components/MetagameMatrix";
import { ScryfallFooter } from "@/components/ScryfallFooter";
import { CardPerformanceClusterTable } from "@/components/CardPerformanceClusterTable";
import { SuperArchetypePlayRates } from "@/components/SuperArchetypePlayRates";
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
  if (stats.superArchetypePlayRates.length > 0) {
    csvBundles.push({
      label: "Play rates",
      filename: "super-archetype-play-rate.csv",
      csv: superArchetypePlayRatesToCsv(stats.superArchetypePlayRates),
    });
  }
  if (stats.metagame) {
    csvBundles.push({
      label: "Matrix",
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-10 sm:px-6">
      <header className="rounded-xl border border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-white px-6 py-7 shadow-sm dark:border-zinc-800/80 dark:from-zinc-900/50 dark:to-zinc-950/80">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← All events
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {stats.meta.title}
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          {stats.meta.format} · {stats.meta.date}
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Decklists on file: {stats.decklistCoverage.withList} /{" "}
          {stats.decklistCoverage.total} players
        </p>
      </header>

      <TournamentSection
        title="Card performance"
        aside={<TournamentCsvExports slug={slug} bundles={csvBundles} />}
        description={
          <>
            Each card gets the full{" "}
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">
              deck performance score
            </strong>{" "}
            once per deck (unique oracle). Swiss + weighted bracket points;
            placement bonuses are usually off when match data exists (see{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              meta.json
            </code>
            ).{" "}
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">
              Play %
            </strong>{" "}
            is how many decklists on file run the card.{" "}
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">
              ≤4th
            </strong>{" "}
            counts decklists with the card that placed 4th or better.{" "}
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">
              Main % / Side %
            </strong>{" "}
            split all registered copies (core vs tech).
          </>
        }
      >
        <CardsTable rows={stats.cardRows} />
      </TournamentSection>

      {stats.cardPerformanceClusters.length > 0 ? (
        <TournamentSection
          title="Card clusters (best-half decks)"
          description={
            <>
              Non-land mainboard cards that appear together in the upper half
              of decklists by performance score, clustered with k-means on
              TF‑IDF deck vectors. Labels list centroid‑proximate cards. Export
              in CSV above.
            </>
          }
        >
          <CardPerformanceClusterTable
            clusters={stats.cardPerformanceClusters}
            oracleNames={Object.fromEntries(
              stats.cardRows.map((r) => [r.oracle_id, r.name]),
            )}
          />
        </TournamentSection>
      ) : null}

      <TournamentSection title="Decks">
        <DeckTable
          decks={stats.decksWithCards}
          cardPreviewsByOracle={stats.cardPreviewsByOracle}
        />
      </TournamentSection>

      {stats.superArchetypePlayRates.length > 0 || stats.metagame ? (
        <TournamentSection
          title="Metagame (super-archetypes)"
          description="Play share uses tagged decklists only. The matchup matrix uses Bo3 games between two different super-archetypes."
        >
          {stats.superArchetypePlayRates.length > 0 ? (
            <SuperArchetypePlayRates rows={stats.superArchetypePlayRates} />
          ) : null}
          {stats.metagame ? (
            <div
              className={
                stats.superArchetypePlayRates.length > 0
                  ? "mt-2 border-t border-zinc-200/70 pt-8 dark:border-zinc-800/70"
                  : ""
              }
            >
              <MetagameMatrix data={stats.metagame} />
            </div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Not enough decisive matchups between two different tagged
              super-archetypes for a matrix — play share above still applies.
            </p>
          )}
        </TournamentSection>
      ) : null}

      {stats.archetypeRows.length > 0 ? (
        <TournamentSection
          title="Archetypes (manual tags)"
          description="Raw labels from decks.json — use harmonized columns in Decks for collapsed names."
        >
          <ArchetypeTable rows={stats.archetypeRows} />
        </TournamentSection>
      ) : null}

      {stats.clusters.length > 0 ? (
        <TournamentSection
          title="Suggested clusters (main nonland TF‑IDF, k-means)"
          description={
            <>
              Labels use centroid cards. Override with manual archetypes in{" "}
              <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                decks.json
              </code>{" "}
              when pools are odd.
            </>
          }
        >
          <ClusterTable
            clusters={stats.clusters}
            decks={stats.decksWithCards}
            oracleNames={Object.fromEntries(
              stats.cardRows.map((r) => [r.oracle_id, r.name]),
            )}
          />
        </TournamentSection>
      ) : null}

      <ScryfallFooter />
    </div>
  );
}
