import type {
  CardPackageCorpusMeta,
  CardPerformanceCluster,
} from "@/lib/types";

/** Show a stronger caveat when the TF-IDF corpus is small. */
function isSmallSampleCorpus(c: CardPackageCorpusMeta): boolean {
  return c.focusDeckCount < 12 || c.listedDecklists < 14;
}

export function CardPerformanceClusterTable({
  clusters,
  corpus,
  oracleNames,
}: {
  clusters: CardPerformanceCluster[];
  corpus: CardPackageCorpusMeta | null;
  oracleNames: Record<string, string>;
}) {
  if (clusters.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {corpus ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          <p>
            Built from{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {corpus.focusDeckCount}
            </span>{" "}
            decklists at or above the median percentile among{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {corpus.listedDecklists}
            </span>{" "}
            lists with resolved cards. Percentiles for each deck still use the
            full standings field.
          </p>
          {isSmallSampleCorpus(corpus) ? (
            <p className="mt-2 border-t border-zinc-200/80 pt-2 text-zinc-700 dark:border-zinc-700/80 dark:text-zinc-300">
              Small sample: treat these groups as{" "}
              <strong className="font-medium">exploratory</strong>—useful for
              ideas, not strong conclusions about card quality.
            </p>
          ) : null}
        </div>
      ) : null}
      {clusters.map((c) => (
        <div
          key={c.id}
          className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-medium">Cluster {c.id + 1}</h3>
            <span className="max-w-[min(100%,18rem)] text-right text-sm text-zinc-500">
              {c.cardCount} cards · mean{" "}
              <abbr
                title="Average of each card's Adj. value (Bayesian-smoothed percentile)—same scale as the card table; secondary to co-occurrence."
                className="cursor-help underline decoration-dotted decoration-zinc-400 underline-offset-2"
              >
                adj. percentile
              </abbr>{" "}
              {c.avgMemberAvgScore.toFixed(1)}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            {c.label}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            {c.oracleIds.map((oid) => oracleNames[oid] ?? oid).join(" · ")}
          </p>
        </div>
      ))}
    </div>
  );
}
