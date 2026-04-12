import type { SuperArchetypePlayRate } from "@/lib/types";

export function SuperArchetypePlayRates({
  rows,
}: {
  rows: SuperArchetypePlayRate[];
}) {
  if (rows.length === 0) return null;
  const n = rows[0]?.decklistsTotal ?? 0;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Meta share among decklists with a file and a manual or harmonized tag (
        {n} lists). Percentages sum to 100% across rows.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[240px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
              <th className="py-2 pr-4 font-medium text-zinc-700 dark:text-zinc-300">
                Super-archetype
              </th>
              <th className="py-2 text-right font-medium text-zinc-700 dark:text-zinc-300">
                Meta share
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.archetype}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
              >
                <td className="py-2 pr-4 font-medium text-zinc-900 dark:text-zinc-100">
                  {r.archetype}
                </td>
                <td className="py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {(100 * r.playRate).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
