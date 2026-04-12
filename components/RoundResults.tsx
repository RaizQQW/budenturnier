import type { MatchRow } from "@/lib/aggregate";

type RoundEntry =
  | { kind: "swiss"; round: number; opponent: string; gamesFor: number; gamesAgainst: number; result: "W" | "L" | "D" }
  | { kind: "bracket"; round: "semis" | "third" | "finals"; opponent: string; gamesFor: number; gamesAgainst: number; result: "W" | "L" | "D" }
  | { kind: "bye"; round: number };

function bracketLabel(r: "semis" | "third" | "finals"): string {
  if (r === "semis") return "Semis";
  if (r === "third") return "3rd";
  return "Finals";
}

function buildRounds(matches: MatchRow[], playerName: string): RoundEntry[] {
  const entries: RoundEntry[] = [];

  for (const m of matches) {
    const isA = m.playerA === playerName;
    const isB = m.playerB === playerName;
    if (!isA && !isB) continue;

    if (m.bye) {
      entries.push({ kind: "bye", round: m.swissRound ?? 0 });
      continue;
    }

    const gamesFor = isA ? m.gamesA : m.gamesB;
    const gamesAgainst = isA ? m.gamesB : m.gamesA;
    const opponent = isA ? (m.playerB ?? "?") : m.playerA;
    const result: "W" | "L" | "D" =
      gamesFor > gamesAgainst ? "W" : gamesFor < gamesAgainst ? "L" : "D";

    if (m.phase === "swiss") {
      entries.push({ kind: "swiss", round: m.swissRound ?? 0, opponent, gamesFor, gamesAgainst, result });
    } else if (m.phase === "bracket" && m.bracketRound) {
      entries.push({ kind: "bracket", round: m.bracketRound, opponent, gamesFor, gamesAgainst, result });
    }
  }

  // Sort: Swiss rounds ascending, then bracket in play order
  const bracketOrder: Record<string, number> = { semis: 1, third: 2, finals: 2 };
  entries.sort((a, b) => {
    if (a.kind === "bye" || a.kind === "swiss") {
      const aR = a.round as number;
      const bR = b.kind === "bye" || b.kind === "swiss" ? (b.round as number) : 999;
      return aR - bR;
    }
    if (b.kind === "bye" || b.kind === "swiss") return 1;
    return (bracketOrder[a.round] ?? 9) - (bracketOrder[b.round] ?? 9);
  });

  return entries;
}

export function RoundResults({ matches, playerName }: { matches: MatchRow[]; playerName: string }) {
  const rounds = buildRounds(matches, playerName);
  if (rounds.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {rounds.map((entry, i) => {
        if (entry.kind === "bye") {
          return (
            <span
              key={i}
              className="inline-flex flex-col items-center rounded border border-zinc-200 bg-zinc-50 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              title={`Round ${entry.round}: Bye`}
            >
              <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                R{entry.round}
              </span>
              <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">BYE</span>
            </span>
          );
        }

        const label = entry.kind === "swiss" ? `R${entry.round}` : bracketLabel(entry.round);
        const colors =
          entry.result === "W"
            ? "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/40 dark:text-green-300"
            : entry.result === "L"
              ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
              : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

        return (
          <span
            key={i}
            className={`inline-flex flex-col items-center rounded border px-2 py-1 ${colors}`}
            title={`${label}: vs ${entry.opponent} — ${entry.gamesFor}–${entry.gamesAgainst}`}
          >
            <span className="text-[10px] font-medium opacity-70">{label}</span>
            <span className="text-xs font-bold">{entry.result}</span>
            <span className="text-[10px] tabular-nums opacity-70">
              {entry.gamesFor}–{entry.gamesAgainst}
            </span>
          </span>
        );
      })}
    </div>
  );
}
