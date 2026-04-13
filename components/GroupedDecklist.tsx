import type { CardPreviewPayload, ParsedDeckLine } from "@/lib/types";
import { buildGroupedMainSections } from "@/lib/decklistGrouping";
import { cardNameKey } from "@/lib/parseDecklist";

import { CardPreview } from "./CardPreview";

function DecklistRows({
  lines,
  resolvedOracleIds,
  cardPreviewsByOracle,
}: {
  lines: ParsedDeckLine[];
  resolvedOracleIds: Record<string, string>;
  cardPreviewsByOracle: Record<string, CardPreviewPayload>;
}) {
  return (
    <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
      {lines.map((line, i) => {
        const oid = resolvedOracleIds[cardNameKey(line.name)];
        const meta = oid ? cardPreviewsByOracle[oid] : undefined;
        return (
          <li
            key={`${line.board}-${i}-${line.name}`}
            className="flex gap-2 text-sm tabular-nums text-zinc-800 dark:text-zinc-200"
          >
            <span className="w-6 shrink-0 text-right text-zinc-500">{line.qty}×</span>
            <span className="min-w-0 break-words leading-snug">
              {meta ? (
                <CardPreview
                  name={meta.name}
                  typeLine={meta.type_line}
                  imageNormal={meta.image_normal}
                  scryfallUri={meta.scryfall_uri}
                />
              ) : (
                <span className="font-medium">{line.name}</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Mainboard grouped by type (Creatures, Spells, …); uses front face for MDFCs. */
export function GroupedDecklist({
  lines,
  resolvedOracleIds,
  cardPreviewsByOracle,
  oracleTypes,
}: {
  lines: ParsedDeckLine[];
  resolvedOracleIds: Record<string, string>;
  cardPreviewsByOracle: Record<string, CardPreviewPayload>;
  oracleTypes: Record<string, string>;
}) {
  const sections = buildGroupedMainSections(lines, resolvedOracleIds, oracleTypes);
  if (sections.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {sections.map(({ section, label, lines: groupLines, count }) => (
        <div key={section}>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {label}{" "}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">({count})</span>
          </h3>
          <DecklistRows
            lines={groupLines}
            resolvedOracleIds={resolvedOracleIds}
            cardPreviewsByOracle={cardPreviewsByOracle}
          />
        </div>
      ))}
    </div>
  );
}

/** Single heading + grid (e.g. sideboard, or ungrouped main). */
export function FlatDecklistSection({
  title,
  lines,
  resolvedOracleIds,
  cardPreviewsByOracle,
}: {
  title: string;
  lines: ParsedDeckLine[];
  resolvedOracleIds: Record<string, string>;
  cardPreviewsByOracle: Record<string, CardPreviewPayload>;
}) {
  if (lines.length === 0) return null;
  const count = lines.reduce((s, l) => s + l.qty, 0);
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {title}{" "}
        <span className="font-normal text-zinc-500 dark:text-zinc-400">({count})</span>
      </h3>
      <DecklistRows
        lines={lines}
        resolvedOracleIds={resolvedOracleIds}
        cardPreviewsByOracle={cardPreviewsByOracle}
      />
    </div>
  );
}
