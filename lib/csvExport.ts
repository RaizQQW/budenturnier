import type {
  CardAggregateRow,
  CardPerformanceCluster,
  SuperArchetypePlayRate,
} from "./types";
import type { MetagameMatrixPayload } from "./metagameMatrix";

function esc(s: string): string {
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function cardRowsToCsv(rows: CardAggregateRow[]): string {
  const headers = [
    "oracle_id",
    "name",
    "type_line",
    "deck_count",
    "sum_score",
    "avg_score",
    "top4_finishers_among_decks_with_card",
    "decks_with_card",
    "best_rank",
    "play_rate",
    "main_copy_share",
    "side_copy_share",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        esc(r.oracle_id),
        esc(r.name),
        esc(r.type_line),
        String(r.deckCount),
        r.sumPerformanceScore.toFixed(2),
        r.avgPerformanceScore.toFixed(2),
        String(r.topCutDeckCount),
        String(r.deckCount),
        String(r.bestRank),
        r.playRate.toFixed(4),
        r.mainCopyShare.toFixed(4),
        r.sideboardCopyShare.toFixed(4),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

export function superArchetypePlayRatesToCsv(
  rows: SuperArchetypePlayRate[],
): string {
  const h = ["archetype", "decklists_with", "decklists_total", "play_rate"];
  const lines = [h.join(",")];
  for (const r of rows) {
    lines.push(
      [
        esc(r.archetype),
        String(r.decklistsWith),
        String(r.decklistsTotal),
        r.playRate.toFixed(4),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

export function metagameMatrixToCsv(m: MetagameMatrixPayload): string {
  const { archetypes, cells } = m;
  const lines = [
    "row_archetype,col_archetype,games_for_row,games_for_col,row_game_win_pct",
  ];
  for (const row of archetypes) {
    for (const col of archetypes) {
      if (row === col) continue;
      const c = cells[row]?.[col];
      if (!c) continue;
      const d = c.gamesForRow + c.gamesForCol;
      if (d === 0) continue;
      const pct =
        c.winRate != null ? (100 * c.winRate).toFixed(2) : "";
      lines.push(
        [
          esc(row),
          esc(col),
          String(c.gamesForRow),
          String(c.gamesForCol),
          pct,
        ].join(","),
      );
    }
  }
  return lines.join("\r\n");
}

export function cardPerformanceClustersToCsv(
  clusters: CardPerformanceCluster[],
  oracleNames: Record<string, string>,
): string {
  const h = [
    "cluster_id",
    "label",
    "card_count",
    "avg_member_avg_score",
    "oracle_id",
    "name",
  ];
  const lines = [h.join(",")];
  for (const c of clusters) {
    for (const oid of c.oracleIds) {
      lines.push(
        [
          String(c.id + 1),
          esc(c.label),
          String(c.cardCount),
          c.avgMemberAvgScore.toFixed(2),
          esc(oid),
          esc(oracleNames[oid] ?? oid),
        ].join(","),
      );
    }
  }
  return lines.join("\r\n");
}
