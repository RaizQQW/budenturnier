# Budenturnier Stats

A Next.js stats site for small custom-format Magic: The Gathering constructed events. Tracks standings, decklists, card performance, and metagame breakdowns per tournament.

## Features

- Card performance table with Bayesian-adjusted percentile scores, copy-weighted scoring, and win-rate delta
- Metagame section: archetype play shares and head-to-head game win rate matrix
- Decklist viewer with card image previews on hover/tap
- Card packages: co-occurrence clusters among top-performing decks
- CSV export for every data view
- Mobile-friendly with touch-optimized card previews

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/                     Next.js App Router pages
  layout.tsx             Root layout with shared header/nav
  page.tsx               Home page — list of all events
  methodology/page.tsx   How scoring and card evaluation work
  t/[slug]/page.tsx      Per-tournament stats page

components/              UI components (all client or server as needed)

lib/                     Server-side data pipeline
  aggregate.ts           Main entry point — loads and derives all tournament stats
  scoring.ts             Swiss + bracket performance score calculation
  harmonizeArchetype.ts  Card-signature-based archetype detection
  validation.ts          Bundle consistency checks (used by check:data)
  parseDecklist.ts       Decklist .txt parser
  types.ts               Shared TypeScript types

data/
  tournaments/
    index.json                      List of all events (slug, title, date, format, counts)
    <slug>/
      meta.json                     Event metadata (title, format, scoring config)
      standings.json                Final standings (rank, displayName, matchPoints, …)
      matches.json                  All Bo3 match results (Swiss + bracket)
      decks.json                    Player → archetype tag + deck file reference
      card-cache.json               Scryfall card data (oracle_id, colors, images, …)
      decklists/
        <player-name>.txt           One decklist per player

scripts/
  cache-cards.ts          Fetches card data from Scryfall for all decklists → card-cache.json
  check-data.ts           Validates a tournament bundle for consistency errors and warnings
  import-standings.mjs    Converts a TSV export from tournament software → standings.json
  import-matches.mjs      Validates and copies a matches.json file into the data directory
```

## npm Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run cache:cards` | Fetch Scryfall card data for all decklists |
| `npm run check:data` | Validate all tournament bundles (name consistency, missing files, unresolved cards) |

## Adding a New Event

1. **Create the event folder**: `data/tournaments/<slug>/`

2. **Write `meta.json`**:
   ```json
   {
     "schemaVersion": 1,
     "slug": "my-event-2026",
     "title": "My Event 2026",
     "format": "Constructed",
     "date": "2026-06-01",
     "scoring": {
       "bracketSemisWeight": 1.25,
       "bracketThirdPlaceWeight": 1.25,
       "bracketFinalsWeight": 1.5,
       "placementBonusWithMatches": false
     }
   }
   ```

3. **Import standings** from a tab-separated export:
   ```bash
   node scripts/import-standings.mjs <slug> standings.tsv
   ```
   Columns: `rank`, `displayName`, `matchPoints`, `omwPercent`, `gwPercent`, `ogwPercent`, `hasDecklist`

4. **Write `decks.json`** with one entry per player:
   ```json
   { "decks": [
     { "playerId": "player-name", "displayName": "Player Name",
       "deckFile": "player-name.txt", "archetype": "Izzet Control" }
   ] }
   ```

5. **Add decklists** to `decklists/` as `.txt` files:
   ```
   ~~Mainboard~~
   4 Lightning Bolt
   20 Mountain
   ...
   ~~Sideboard~~
   3 Smash to Smithereens
   ```

6. **Import matches** (if you have a `matches.json`):
   ```bash
   node scripts/import-matches.mjs <slug> matches.json
   ```

7. **Fetch card data from Scryfall**:
   ```bash
   npm run cache:cards
   ```

8. **Validate the bundle**:
   ```bash
   npm run check:data
   ```
   Fix any ERRORs before publishing. WARNings typically indicate unresolved card names (run `cache:cards` again or correct the decklist spelling).

9. **Register the event** in `data/tournaments/index.json`:
   ```json
   { "tournaments": [
     { "slug": "my-event-2026", "title": "My Event 2026", "date": "2026-06-01",
       "format": "Constructed", "playerCount": 19, "decklistsWith": 17 }
   ] }
   ```

## Decklist Format

Cards are parsed from plain `.txt` files. Supported formats:

- Section headers: `~~Mainboard~~`, `Mainboard`, `Mainboard:`, `~~Sideboard~~`, `Sideboard`, etc.
- Card lines: `<qty> <card name>` (MTGO export style)
- MDFC names: `Delver of Secrets / Insectile Aberration` or `Delver of Secrets // Insectile Aberration`
- Set codes and foil markers are stripped automatically

Cards not found in `card-cache.json` are silently dropped from analytics. Run `npm run check:data` to surface unresolved names.
