import type { MetagameMatrixPayload } from "@/lib/metagameMatrix";
import { metagameHeatColor } from "@/lib/metagameMatrix";

function cellText(cell: MetagameMatrixPayload["cells"][string][string]) {
  const { gamesForRow, gamesForCol, winRate } = cell;
  const d = gamesForRow + gamesForCol;
  if (d === 0) return "—";
  const pct = winRate != null ? `${Math.round(winRate * 100)}%` : "";
  return `${gamesForRow}–${gamesForCol}${pct ? ` (${pct})` : ""}`;
}

function cellTextColor(
  winRate: number | null,
  isMirror: boolean,
): string | undefined {
  if (isMirror) return undefined;
  if (winRate == null || Number.isNaN(winRate)) return undefined;
  if (winRate >= 0.58 || winRate <= 0.42) return "rgb(250 250 250)";
  return undefined;
}

export function MetagameMatrix({ data }: { data: MetagameMatrixPayload }) {
  const { archetypes, cells, archetypeRecords } = data;

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-lg border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
        <h3 className="mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Overall game record
        </h3>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Games won and lost in non-mirror matches (Swiss + bracket). Draws
          (1–1) count one win per player.
        </p>
        <ul className="flex flex-col gap-2 text-sm">
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
                className="flex flex-wrap items-center gap-3 border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-800"
              >
                <span className="min-w-[10rem] shrink-0 font-medium text-zinc-800 dark:text-zinc-200">
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

      <div>
        <h3 className="mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Matchup grid
        </h3>
        <p className="mb-2 max-w-xl text-xs text-zinc-500 dark:text-zinc-400">
          Read across from the left: each cell is how many games that row won
          vs the column, out of all games played between those two deck types.
        </p>
        <ul className="mb-3 flex flex-col gap-1 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400 sm:flex-row sm:flex-wrap sm:gap-x-4">
          <li className="flex gap-1.5">
            <span
              className="mt-0.5 size-2.5 shrink-0 rounded-sm bg-green-500/70"
              aria-hidden
            />
            Greener = that row won more of the games in the cell
          </li>
          <li className="flex gap-1.5">
            <span
              className="mt-0.5 size-2.5 shrink-0 rounded-sm bg-zinc-200 dark:bg-zinc-600"
              aria-hidden
            />
            Paler = closer to even or few games played
          </li>
          <li>
            <span className="font-mono text-zinc-400">×</span> = same deck type
            (not counted)
          </li>
        </ul>
        <div className="overflow-x-auto rounded-lg border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950/40">
          <table className="border-collapse text-[11px] sm:text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 min-w-[9rem] border border-zinc-200 bg-zinc-100 px-2 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                  vs →
                </th>
                {archetypes.map((c) => (
                  <th
                    key={c}
                    className="max-w-[6rem] border border-zinc-200 bg-zinc-100/90 px-1.5 py-2.5 align-bottom text-xs font-medium leading-tight text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-300"
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
                    className="sticky left-0 z-10 border border-zinc-200 bg-zinc-50 px-2 py-2 text-left text-[11px] font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200"
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
                        className={`border border-zinc-200 px-1.5 py-2 text-center align-middle dark:border-zinc-700 ${
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
      </div>

      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Byes and mirror pairings are excluded. Draws (1–1) give each side one
        game win. Cell percentage is row wins ÷ all games in that matchup.
      </p>
    </div>
  );
}
