import type { ArchetypeCluster, DeckWithCards } from "@/lib/types";

export function ClusterTable({
  clusters,
  decks,
  oracleNames,
}: {
  clusters: ArchetypeCluster[];
  decks: DeckWithCards[];
  oracleNames: Record<string, string>;
}) {
  const nameById = new Map(decks.map((d) => [d.playerId, d.displayName]));

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
              Avg score {c.avgScore.toFixed(1)}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            {c.label}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Players:{" "}
            {c.playerIds
              .map((id) => nameById.get(id) ?? id)
              .join(", ") || "—"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Distinctive:{" "}
            {c.distinctiveOracleIds
              .map((oid) => oracleNames[oid] ?? oid)
              .join(", ")}
          </p>
        </div>
      ))}
    </div>
  );
}
