/** Shared tournament + stats types (matches plan JSON shapes). */

export type TournamentMeta = {
  schemaVersion: number;
  slug: string;
  title: string;
  format: string;
  /** Optional URL describing or linking to the card pool / format rules. */
  formatUrl?: string;
  date: string;
  /**
   * Maps a broad group label to an array of harmonized archetype names.
   * Archetypes not listed in any group keep their own name.
   */
  archetypeGroups?: Record<string, string[]>;
  scoring?: {
    bracketSemisWeight: number;
    /** 3rd/4th playoff; defaults to `bracketSemisWeight` when omitted. */
    bracketThirdPlaceWeight?: number;
    bracketFinalsWeight: number;
    /** Optional additive points by final rank (`"1"` = first place). */
    placementBonuses?: Record<string, number>;
    /**
     * When `matches.json` is used: if not `true`, **placement bonuses are skipped**
     * so rank is not double-counted (bracket weights already reward top cut).
     * Set to `true` to stack placement on top of match-derived scores.
     */
    placementBonusWithMatches?: boolean;
  };
};

export type StandingRow = {
  rank: number;
  displayName: string;
  matchPoints: number;
  omwPercent?: number;
  gwPercent?: number;
  ogwPercent?: number;
  hasDecklist: boolean;
};

export type MatchRow = {
  phase: "swiss" | "bracket";
  swissRound?: number;
  bracketRound?: "semis" | "third" | "finals";
  table: number;
  playerA: string;
  playerB: string | null;
  gamesA: number;
  gamesB: number;
  bye: boolean;
};

export type MatchesFile = {
  matches: MatchRow[];
};

export type DeckEntry = {
  playerId: string;
  displayName: string;
  deckFile: string | null;
  archetype?: string | null;
  /**
   * When set, used as the harmonized super-archetype (metagame, play rates,
   * Decks table). Otherwise derived from the decklist via rules in
   * `harmonizeArchetype.ts`.
   */
  harmonizedArchetype?: string | null;
};

export type DecksFile = {
  decks: DeckEntry[];
};

export type StandingsFile = {
  standings: StandingRow[];
};

export type CardCacheEntry = {
  oracle_id: string;
  name: string;
  type_line: string;
  colors: string[];
  color_identity: string[];
  image_normal?: string;
  scryfall_uri?: string;
};

export type CardCacheFile = {
  cards: Record<string, CardCacheEntry>;
};

export type ParsedDeckLine = {
  name: string;
  qty: number;
  board: "main" | "side";
};

export type DeckListParsed = {
  lines: ParsedDeckLine[];
};

export type DeckWithCards = {
  playerId: string;
  displayName: string;
  archetype: string | null;
  /**
   * Coarse label from mainboard signatures (see `harmonizeArchetype.ts`);
   * manual-tag harmonization when no signature matches.
   */
  harmonizedArchetype: string | null;
  /** Final rank from standings */
  rank: number;
  performanceScore: number;
  /** Midpoint percentile rank (0–100) among all players. */
  percentileScore: number;
  swissMatchPoints: number;
  bracketWeightedPoints: number;
  placementBonus: number;
  /** oracle_id → qty split (plain object for client serialization). */
  oracleQty: Record<string, { main: number; side: number }>;
  lines: ParsedDeckLine[];
  /** Plain object so deck rows serialize to the client table. */
  resolvedOracleIds: Record<string, string>;
};

/** Slim card payload for decklist previews (from cache). */
export type CardPreviewPayload = {
  name: string;
  type_line: string;
  image_normal?: string;
  scryfall_uri?: string;
};

export type CardAggregateRow = {
  oracle_id: string;
  name: string;
  type_line: string;
  colors: string[];
  image_normal?: string;
  scryfall_uri?: string;
  deckCount: number;

  /* --- raw scoring (match-points based) --- */
  sumPerformanceScore: number;
  avgPerformanceScore: number;

  /* --- percentile scoring --- */
  /** Sum of deck percentile ranks for decks running this card. */
  sumPercentile: number;
  /** Mean deck percentile among decks running this card. */
  avgPercentile: number;
  /** Bayesian-shrunk avg percentile: `(n*avg + k*50) / (n+k)`, k=2. */
  adjustedAvgPercentile: number;
  /** `avgPercentile(with) - avgPercentile(without)`. */
  winRateDelta: number;

  topCutDeckCount: number;
  /** `topCutDeckCount / deckCount` (0–1). */
  topCutRate: number;
  bestRank: number;

  /** Average main-deck copies per deck that runs the card. */
  avgMainCopies: number;
  /** Average sideboard copies per deck that runs the card. */
  avgSideCopies: number;

  /** Share of all copies (main+side) that are in sideboards, 0–1. */
  sideboardCopyShare: number;
  /** Share of all copies in mainboards, 0–1 (tech vs core). */
  mainCopyShare: number;
  /** Fraction of decklists on file that run ≥1 copy (meta presence). */
  playRate: number;
  /** Sum of (main + side) copies across all decklists that run this card. */
  totalCopiesPlayed: number;
};

/** Player row for card-table “focus this deck” UI (decklists with parsed cards). */
export type CardTablePlayerOption = {
  playerId: string;
  displayName: string;
  rank: number;
  percentileScore: number;
  oracleQty: Record<string, { main: number; side: number }>;
};

/** Super-archetype share among decklists with lists (denominator = lists on file). */
export type SuperArchetypePlayRate = {
  archetype: string;
  decklistsWith: number;
  decklistsTotal: number;
  playRate: number;
};

export type TournamentIndexEntry = {
  slug: string;
  title: string;
  date: string;
};

export type TournamentIndexFile = {
  tournaments: TournamentIndexEntry[];
};

export type ArchetypeCluster = {
  id: number;
  label: string;
  playerIds: string[];
  avgScore: number;
  distinctiveOracleIds: string[];
};

/** k-means groupings of cards by co-occurrence in best-half decks. */
export type CardPerformanceCluster = {
  id: number;
  /** Representative card names from centroid similarity. */
  label: string;
  oracleIds: string[];
  /** Mean `adjustedAvgPercentile` among cards in this cluster (0–100). */
  avgMemberAvgScore: number;
  cardCount: number;
};
