import type { CardPerformanceCluster } from "@/lib/types";

export function CardPerformanceClusterTable({
  clusters,
  oracleNames,
}: {
  clusters: CardPerformanceCluster[];
  oracleNames: Record<string, string>;
}) {
  if (clusters.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {clusters.map((c) => (
        <div
          key={c.id}
          className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-medium">Cluster {c.id + 1}</h3>
            <span className="text-sm text-zinc-500">
              {c.cardCount} cards · avg score{" "}
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
