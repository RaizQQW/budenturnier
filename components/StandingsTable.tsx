import type { StandingRow } from "@/lib/types";

export function StandingsTable({ standings }: { standings: StandingRow[] }) {
  if (standings.length === 0) return null;

  const hasTiebreakers = standings.some(
    (s) => s.omwPercent != null || s.gwPercent != null,
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[400px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-100/80 text-left dark:border-zinc-800 dark:bg-zinc-900">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Player</th>
            <th className="px-3 py-2 text-right font-medium">Pts</th>
            {hasTiebreakers && (
              <>
                <th
                  className="px-3 py-2 text-right font-medium text-zinc-500 dark:text-zinc-400"
                  title="Opponent Match Win %"
                >
                  OMW%
                </th>
                <th
                  className="px-3 py-2 text-right font-medium text-zinc-500 dark:text-zinc-400"
                  title="Game Win %"
                >
                  GW%
                </th>
                <th
                  className="hidden px-3 py-2 text-right font-medium text-zinc-500 sm:table-cell dark:text-zinc-400"
                  title="Opponent Game Win %"
                >
                  OGW%
                </th>
              </>
            )}
            <th className="px-3 py-2 text-center font-medium text-zinc-500 dark:text-zinc-400">
              List
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const zebra =
              i % 2 === 1 ? "bg-zinc-50/50 dark:bg-zinc-900/30" : "";
            const topCut = s.rank <= 4;
            return (
              <tr
                key={s.displayName}
                className={`border-b border-zinc-100 dark:border-zinc-900 ${zebra}`}
              >
                <td
                  className={`px-3 py-2 tabular-nums font-medium ${topCut ? "text-amber-600 dark:text-amber-400" : "text-zinc-500 dark:text-zinc-400"}`}
                >
                  {s.rank}
                </td>
                <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                  {s.displayName}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold">
                  {s.matchPoints}
                </td>
                {hasTiebreakers && (
                  <>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                      {s.omwPercent != null ? `${s.omwPercent.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                      {s.gwPercent != null ? `${s.gwPercent.toFixed(1)}%` : "—"}
                    </td>
                    <td className="hidden px-3 py-2 text-right tabular-nums text-zinc-500 sm:table-cell dark:text-zinc-500">
                      {s.ogwPercent != null
                        ? `${s.ogwPercent.toFixed(1)}%`
                        : "—"}
                    </td>
                  </>
                )}
                <td className="px-3 py-2 text-center">
                  {s.hasDecklist ? (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                      ✓
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-300 dark:text-zinc-600">
                      —
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
