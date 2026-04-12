export function ArchetypeTable({
  rows,
}: {
  rows: { archetype: string; deckCount: number; avgScore: number }[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full max-w-lg border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900/80">
            <th className="px-3 py-2 font-medium">Archetype</th>
            <th className="px-3 py-2 font-medium text-right">Decks</th>
            <th className="px-3 py-2 font-medium text-right">Avg score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.archetype}
              className="border-b border-zinc-100 dark:border-zinc-900"
            >
              <td className="px-3 py-2 font-medium">{r.archetype}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.deckCount}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.avgScore.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
