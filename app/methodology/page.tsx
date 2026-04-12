import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology · Budenturnier",
  description: "How card and deck performance scores are calculated",
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </section>
  );
}

function Formula({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <summary className="cursor-pointer font-medium text-zinc-800 dark:text-zinc-200">
        {summary}
      </summary>
      <div className="mt-3 flex flex-col gap-2 text-zinc-600 dark:text-zinc-400">
        {children}
      </div>
    </details>
  );
}

export default function MethodologyPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-4 py-10 sm:px-6">
      <header>
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Home
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Methodology
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          How we score decks, evaluate cards, and detect patterns. Written for
          players first, with expandable technical details for those who want
          the math.
        </p>
      </header>

      <Section id="deck-scoring" title="Deck scoring">
        <p>
          Every player earns a <strong>performance score</strong> based on
          their match results. Swiss rounds use standard match points: 3 for a
          win, 1 for a draw, 0 for a loss (all matches are best-of-three
          games).
        </p>
        <p>
          Top-cut bracket matches use the same point system but are
          multiplied by a weight that reflects the higher stakes:
          semi-finals at 1.25&times;, the 3rd-place match at 1.25&times;, and
          the finals at 1.5&times;. These weights are configurable per event.
        </p>
        <p>
          Placement bonuses (extra points for finishing 1st, 2nd, etc.) are
          available but turned off by default when match-level data exists,
          since the bracket weights already reward top finishers without
          double-counting.
        </p>
        <Formula summary="Exact formula">
          <p>
            <code>performanceScore = swissMatchPoints + bracketWeightedPoints + placementBonus</code>
          </p>
          <p>
            Where <code>bracketWeightedPoints</code> = sum of (match points
            &times; round weight) for each bracket match the player
            participated in.
          </p>
        </Formula>
      </Section>

      <Section id="percentile" title="Percentile ranking">
        <p>
          Raw performance scores can be dominated by a single outstanding
          deck &mdash; the winner&rsquo;s score might be 2&ndash;3&times; the
          median. To prevent that from distorting card evaluations, we convert
          every player&rsquo;s raw score to a <strong>percentile
          rank</strong> (0&ndash;100).
        </p>
        <p>
          A percentile of 75 means &ldquo;this deck scored higher than 75% of
          the field.&rdquo; The gap between 1st and 2nd place shrinks from
          potentially huge raw-point differences to just a few percentile
          points, keeping any single deck from overwhelming the card rankings.
        </p>
        <Formula summary="Midpoint percentile formula">
          <p>
            <code>percentile = (below + equal / 2) / N &times; 100</code>
          </p>
          <p>
            Where <code>below</code> = number of players with a strictly
            lower raw score, <code>equal</code> = players with the same
            score (including this player), and <code>N</code> = total
            players. This &ldquo;midpoint&rdquo; method handles ties
            gracefully.
          </p>
        </Formula>
      </Section>

      <Section id="card-evaluation" title="Card evaluation">
        <p>
          Each card is evaluated based on how well the decks that play it
          performed, with three key adjustments that prevent misleading
          rankings:
        </p>

        <h3 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">
          Copy-weighted scoring
        </h3>
        <p>
          A 4-of mainboard staple contributes four times as much to a
          card&rsquo;s score as a 1-of sideboard hedge in the same deck. The
          weight is <code>copies / total cards in deck</code>, so the card&rsquo;s
          share of the 75-card deck determines its influence. This prevents a
          random 1-of in the winning deck from ranking as highly as a core
          piece.
        </p>

        <h3 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">
          Adjusted average (Adj. avg)
        </h3>
        <p>
          The primary ranking metric. It uses Bayesian shrinkage to pull
          low-sample cards toward the field average, so a card that only
          appeared in one (strong) deck can&rsquo;t dominate the rankings
          purely by luck of the draw. Cards that appear in many decks are
          barely affected; cards in just one or two decks are pulled
          significantly toward the average.
        </p>
        <Formula summary="Bayesian shrinkage formula">
          <p>
            <code>adjustedAvg = (W &times; weightedAvg + k &times; fieldMean) / (W + k)</code>
          </p>
          <p>
            Where <code>W</code> = sum of copy weights across all decks
            playing the card, <code>weightedAvg</code> = copy-weighted
            average percentile, <code>fieldMean</code> = average percentile
            of all decklists on file (always near 50), and{" "}
            <code>k = round(N / 3)</code> where N = decklists on file.
          </p>
          <p>
            With 17 decklists, k = 6. A 1-of in only the winning deck gets
            pulled from ~100 down to ~51. A 4-of in three top-half decks
            stays near its true average.
          </p>
        </Formula>

        <h3 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">
          Win-rate delta (Delta)
        </h3>
        <p>
          The difference between the average percentile of decks <em>with</em>{" "}
          the card and decks <em>without</em> it. A positive delta means decks
          playing this card performed better than the rest of the field. This
          metric uses unweighted presence (the card is either in the deck or
          not) for straightforward interpretability.
        </p>

        <h3 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">
          Other columns
        </h3>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Play %</strong> &mdash; fraction of decklists on file
            that include at least one copy.
          </li>
          <li>
            <strong>Top-4 %</strong> &mdash; share of decks running the card
            that finished rank 4 or better. Higher means the card correlates
            with top finishes.
          </li>
          <li>
            <strong>Avg main / Avg side</strong> &mdash; average number of
            copies in the mainboard and sideboard per deck that runs the card.
            Helps answer &ldquo;how many should I play?&rdquo;
          </li>
          <li>
            <strong>&Sigma; pctl</strong> &mdash; sum of percentile ranks
            across all decks playing the card. Measures total field impact
            rather than per-deck quality.
          </li>
        </ul>

        <h3 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">
          Raw mode
        </h3>
        <p>
          Toggle off &ldquo;Percentile scoring&rdquo; to see the original
          match-point-based sums and averages. These are not adjusted for
          copy count or sample size and are included for transparency.
        </p>
      </Section>

      <Section id="metagame" title="Metagame">
        <p>
          Each decklist is assigned a <strong>super-archetype</strong> label
          based on its color identity and key card signatures (e.g.
          &ldquo;Boros Humans&rdquo; or &ldquo;Rakdos Vampires&rdquo;).
          Labels can also be set manually per player when automatic detection
          misclassifies a deck.
        </p>
        <p>
          <strong>Play share</strong> shows what fraction of the field
          registered each archetype. The <strong>matchup matrix</strong>{" "}
          shows head-to-head game win rates between different archetypes,
          using all non-mirror, non-bye Bo3 games — including draws
          (1–1), where each side won one game.
        </p>
      </Section>

      <Section id="card-packages" title="Card packages">
        <p>
          We cluster non-land mainboard cards by co-occurrence in the
          better-performing half of decklists. Cards that show up together in
          winning decks are grouped into &ldquo;packages&rdquo; &mdash;
          natural building blocks that players gravitate toward.
        </p>
        <Formula summary="Clustering method">
          <p>
            Cards are represented as TF-IDF vectors across the top-half
            decklists (by performance score). We run k-means clustering
            (cosine similarity, k chosen from sample size) on cards that
            appear in at least two of those decks. Cluster labels are the
            card names closest to each centroid.
          </p>
        </Formula>
      </Section>

      <Section id="deck-archetypes" title="Deck archetypes (auto-detected)">
        <p>
          Independent of the card-level clusters, we also cluster entire
          decklists by their mainboard non-land composition. Each deck is
          represented as a TF-IDF vector across all cards, then grouped via
          k-means. This helps identify distinct deck strategies even without
          manual archetype tags.
        </p>
      </Section>

      <Section id="limitations" title="Limitations">
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Small samples</strong> &mdash; a 19-player event with 17
            decklists provides limited statistical power. All metrics should
            be read as &ldquo;useful signals&rdquo; rather than definitive
            truths.
          </li>
          <li>
            <strong>Pilot skill vs. card quality</strong> &mdash; every
            player had access to the same card pool, so card choices reflect
            deckbuilding decisions rather than luck of the draw. Still, a
            strong pilot can make mediocre cards look good; we cannot fully
            separate player skill from card quality.
          </li>
          <li>
            <strong>Copy weighting assumes linear value</strong> &mdash; a
            4-of gets 4&times; the weight of a 1-of, but the 4th copy of a
            card is not always as valuable as the 1st. This is a simplifying
            assumption.
          </li>
        </ul>
      </Section>

      <footer className="border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800">
        <p>
          Card data from{" "}
          <a
            href="https://scryfall.com"
            className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            Scryfall
          </a>
          . This site is not affiliated with Wizards of the Coast.
        </p>
      </footer>
    </div>
  );
}
