import type { ParsedDeckLine } from "@/lib/types";
import { cardNameKey } from "@/lib/parseDecklist";

type OracleCmc = Record<string, number>; // oracle_id → cmc

/** Build CMC bucket counts from mainboard lines. Lands (cmc=0, type=Land) excluded. */
function buildCurve(
  lines: ParsedDeckLine[],
  resolvedOracleIds: Record<string, string>,
  oracleCmc: OracleCmc,
  oracleTypes: Record<string, string>,
): Map<number, number> {
  const buckets = new Map<number, number>();
  for (const line of lines) {
    if (line.board !== "main") continue;
    const oid = resolvedOracleIds[cardNameKey(line.name)];
    if (!oid) continue;
    const typeLine = oracleTypes[oid] ?? "";
    if (/\bLand\b/.test(typeLine)) continue;
    const cmc = oracleCmc[oid];
    if (cmc == null) continue;
    const bucket = Math.min(7, Math.floor(cmc)); // 7+ bucket
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + line.qty);
  }
  return buckets;
}

export function ManaCurve({
  lines,
  resolvedOracleIds,
  oracleCmc,
  oracleTypes,
}: {
  lines: ParsedDeckLine[];
  resolvedOracleIds: Record<string, string>;
  oracleCmc: OracleCmc;
  oracleTypes: Record<string, string>;
}) {
  const curve = buildCurve(lines, resolvedOracleIds, oracleCmc, oracleTypes);
  if (curve.size === 0) return null;

  const max = Math.max(...curve.values(), 1);
  const buckets = [1, 2, 3, 4, 5, 6, 7] as const;
  const labels = ["1", "2", "3", "4", "5", "6", "7+"];

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Mana curve (mainboard, non-land)
      </p>
      <div className="flex items-end gap-1" style={{ height: "4rem" }}>
        {buckets.map((b, idx) => {
          const count = curve.get(b) ?? 0;
          const pct = count === 0 ? 0 : Math.max(6, Math.round((count / max) * 100));
          return (
            <div
              key={b}
              className="flex flex-1 flex-col items-center gap-0.5"
              title={`${labels[idx]} CMC: ${count} card${count !== 1 ? "s" : ""}`}
            >
              {count > 0 && (
                <span className="text-[9px] tabular-nums text-zinc-500">{count}</span>
              )}
              <div className="flex w-full items-end" style={{ height: "3rem" }}>
                <div
                  className="w-full rounded-t bg-indigo-400/80 dark:bg-indigo-500/70"
                  style={{ height: count === 0 ? "2px" : `${pct}%` }}
                />
              </div>
              <span className="text-[9px] text-zinc-500">{labels[idx]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
