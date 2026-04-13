import type { ParsedDeckLine } from "@/lib/types";
import {
  DECK_TYPE_BUCKET_ORDER,
  countDeckByType,
  type DeckStatCardBucket,
} from "@/lib/cardTypeBucket";

function nonzeroEntries(
  counts: Record<DeckStatCardBucket, number>,
): { bucket: DeckStatCardBucket; n: number }[] {
  return DECK_TYPE_BUCKET_ORDER.filter((b) => counts[b] > 0).map((bucket) => ({
    bucket,
    n: counts[bucket]!,
  }));
}

function BoardBlock({
  label,
  lines,
  resolvedOracleIds,
  oracleTypes,
  board,
}: {
  label: string;
  lines: ParsedDeckLine[];
  resolvedOracleIds: Record<string, string>;
  oracleTypes: Record<string, string>;
  board: "main" | "side";
}) {
  const counts = countDeckByType(lines, resolvedOracleIds, oracleTypes, board);
  const rows = nonzeroEntries(counts);
  if (rows.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm tabular-nums text-zinc-800 dark:text-zinc-200">
        {rows.map(({ bucket, n }) => (
          <li key={bucket}>
            <span className="text-zinc-500 dark:text-zinc-400">{bucket}</span>{" "}
            <span className="font-medium">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DeckTypeBreakdown({
  lines,
  resolvedOracleIds,
  oracleTypes,
}: {
  lines: ParsedDeckLine[];
  resolvedOracleIds: Record<string, string>;
  oracleTypes: Record<string, string>;
}) {
  const main = countDeckByType(lines, resolvedOracleIds, oracleTypes, "main");
  const side = countDeckByType(lines, resolvedOracleIds, oracleTypes, "side");
  const hasMain = DECK_TYPE_BUCKET_ORDER.some((b) => main[b] > 0);
  const hasSide = DECK_TYPE_BUCKET_ORDER.some((b) => side[b] > 0);
  if (!hasMain && !hasSide) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Card types
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
        {hasMain ? (
          <BoardBlock
            label="Mainboard"
            lines={lines}
            resolvedOracleIds={resolvedOracleIds}
            oracleTypes={oracleTypes}
            board="main"
          />
        ) : null}
        {hasSide ? (
          <BoardBlock
            label="Sideboard"
            lines={lines}
            resolvedOracleIds={resolvedOracleIds}
            oracleTypes={oracleTypes}
            board="side"
          />
        ) : null}
      </div>
    </div>
  );
}
