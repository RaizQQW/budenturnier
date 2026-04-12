import type { SuperArchetypePlayRate } from "@/lib/types";

export function SuperArchetypePlayRates({
  rows,
}: {
  rows: SuperArchetypePlayRate[];
}) {
  if (rows.length === 0) return null;
  const n = rows[0]?.decklistsTotal ?? 0;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Share of decklists we have on file ({n}{" "}
        {n === 1 ? "player" : "players"}). Rows add up to 100%.
      </p>
      <div className="overflow-x-auto rounded-lg border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950/40">
        <table className="w-full min-w-[280px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-100/80 text-left dark:border-zinc-800 dark:bg-zinc-900">
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                Archetype
              </th>
              <th className="px-4 py-3 text-right font-medium text-zinc-700 dark:text-zinc-300">
                Share
              </th>
              <th className="min-w-[8rem] px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                <span className="sr-only">Bar</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.archetype}
                className={`border-b border-zinc-100 last:border-0 dark:border-zinc-800/80 ${
                  i % 2 === 1
                    ? "bg-zinc-50/50 dark:bg-zinc-900/25"
                    : ""
                }`}
              >
                <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                  {r.archetype}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {(100 * r.playRate).toFixed(1)}%
                </td>
                <td className="px-4 py-2.5 align-middle">
                  <span
                    className="block h-2 max-w-[12rem] overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                    title={`${(100 * r.playRate).toFixed(1)}%`}
                  >
                    <span
                      className="block h-full rounded-full bg-emerald-600/80 dark:bg-emerald-500/80"
                      style={{ width: `${Math.min(100, 100 * r.playRate)}%` }}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
