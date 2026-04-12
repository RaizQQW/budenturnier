import type { MetagameMatrixPayload } from "@/lib/metagameMatrix";
import { metagameHeatColor } from "@/lib/metagameMatrix";

function cellText(cell: MetagameMatrixPayload["cells"][string][string]) {
  const { gamesForRow, gamesForCol, winRate } = cell;
  const d = gamesForRow + gamesForCol;
  if (d === 0) return "—";
  const pct =
    winRate != null ? `${Math.round(winRate * 100)}%` : "";
  return `${gamesForRow}–${gamesForCol}${pct ? ` (${pct})` : ""}`;
}

function cellTextColor(
  winRate: number | null,
  isMirror: boolean,
): string | undefined {
  if (isMirror) return undefined;
  if (winRate == null || Number.isNaN(winRate)) return undefined;
  if (winRate >= 0.58 || winRate <= 0.42)
    return "rgb(250 250 250)";
  return undefined;
}

export function MetagameMatrix({ data }: { data: MetagameMatrixPayload }) {
  const { archetypes, cells, archetypeRecords } = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Super-archetype winrates (Bo3 games, non-mirror, non-bye, non-draw)
        </h3>
        <ul className="flex flex-col gap-1.5 text-sm">
          {archetypes.map((a) => {
            const { gamesWon, gamesLost } = archetypeRecords[a] ?? {
              gamesWon: 0,
              gamesLost: 0,
            };
            const d = gamesWon + gamesLost;
            const pct = d > 0 ? ((100 * gamesWon) / d).toFixed(1) : "—";
            return (
              <li
                key={a}
                className="flex items-center gap-3 border-b border-zinc-100 pb-1 dark:border-zinc-800"
              >
                <span className="min-w-[12rem] shrink-0 font-medium text-zinc-800 dark:text-zinc-200">
                  {a}
                </span>
                <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
                  {d > 0 ? `${gamesWon}–${gamesLost}` : "0–0"}{" "}
                  {d > 0 ? <>({pct}%)</> : null}
                </span>
                {d > 0 ? (
                  <span
                    className="h-2 min-w-[4rem] flex-1 max-w-xs overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                    title={`${gamesWon} game wins / ${d} games played`}
                  >
                    <span
                      className="block h-full rounded-full bg-green-600 dark:bg-green-500"
                      style={{ width: `${(100 * gamesWon) / d}%` }}
                    />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="overflow-x-auto">
        <h3 className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Matchup matrix (row game wins vs column game wins)
        </h3>
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-[10rem] border border-zinc-200 bg-zinc-100 px-2 py-2 text-left text-[10px] font-medium uppercase text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                vs →
              </th>
              {archetypes.map((c) => (
                <th
                  key={c}
                  className="max-w-[5.5rem] border border-zinc-200 bg-zinc-50 px-1 py-2 align-bottom text-[10px] font-medium leading-tight text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300"
                  title={c}
                >
                  <span className="line-clamp-3 block hyphens-auto break-words">
                    {c}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {archetypes.map((row) => (
              <tr key={row}>
                <th
                  className="sticky left-0 z-10 border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-left text-[11px] font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200"
                  scope="row"
                >
                  {row}
                </th>
                {archetypes.map((col) => {
                  const isMirror = row === col;
                  const cell = cells[row]?.[col] ?? {
                    gamesForRow: 0,
                    gamesForCol: 0,
                    winRate: null,
                  };
                  const bg = isMirror
                    ? undefined
                    : metagameHeatColor(cell.winRate);
                  const fg = cellTextColor(cell.winRate, isMirror);
                  return (
                    <td
                      key={col}
                      className={`border border-zinc-200 px-1 py-1 text-center align-middle dark:border-zinc-700 ${
                        isMirror ? "bg-zinc-100 dark:bg-zinc-800" : ""
                      }`}
                      style={
                        isMirror
                          ? undefined
                          : {
                              backgroundColor: bg,
                              color: fg,
                            }
                      }
                      title={`${row} vs ${col}: ${cellText(cell)} (Bo3 games)`}
                    >
                      {isMirror ? (
                        <span className="text-zinc-400">×</span>
                      ) : (
                        <span className="font-medium tabular-nums">
                          {cellText(cell)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        Rows and columns use the{" "}
        <strong className="font-medium text-zinc-700 dark:text-zinc-300">
          harmonized super-archetype
        </strong>{" "}
        (same as the Decks table: optional{" "}
        <code className="rounded bg-zinc-100 px-0.5 dark:bg-zinc-800">
          harmonizedArchetype
        </code>{" "}
        in <code className="rounded bg-zinc-100 px-0.5 dark:bg-zinc-800">decks.json</code>, else
        decklist rules). Each
        cell is{" "}
        <strong className="font-medium text-zinc-700 dark:text-zinc-300">
          games won by the row label—games won by the column label
        </strong>{" "}
        summed over every Swiss or bracket pairing between those two
        archetypes (e.g. a 2–1 finals shows as two game wins for the winner and
        one for the loser in that matchup row). Percentages are{" "}
        <strong className="font-medium text-zinc-700 dark:text-zinc-300">
          row games ÷ (row games + column games)
        </strong>
        . Intentional draws (1–1), byes, and mirror super-archetypes are
        excluded. Only players with a harmonized or manual archetype in the
        deck registry are included.
      </p>
    </div>
  );
}
