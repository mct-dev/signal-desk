# Signal Desk MVP Design

Signal Desk is a deployed public website that updates without manual work. It collects public, no-key, no-paid data from sources Codex can fetch directly, clusters repeated language into opportunity signals, and presents scored evidence links.

## Scope

- Static React/Vite website with GitHub Pages deployment.
- Scheduled GitHub Actions collector every six hours.
- Durable JSON snapshots committed into `public/data`.
- No developer API keys, paid APIs, authenticated accounts, private scraping, CAPTCHA bypass, or paywall bypass.
- Sources: Hacker News public Firebase API, Reddit public RSS, Apple public RSS/JSON feeds, arXiv RSS, npm registry search, PyPI RSS, and GitHub Trending public page.

## Data Flow

1. `scripts/collect-signals.js` fetches public sources.
2. Raw items become normalized records with source, title, summary, URL, date, and source metrics.
3. Keyword clusters group repeated language across sources.
4. Score combines velocity, pain language, monetization clues, source diversity, novelty, and saturation.
5. `public/data/signals.json` powers the site; `public/data/history.json` stores recent baselines.

## UI

The first screen is the product: ranked opportunities, summary metrics, filters, selected-signal detail panel, source health, and evidence links. No marketing wrapper, no course content, no manual review queue in MVP.

## Acceptance

- `bun run collect` produces fresh `signals.json`.
- `bun run build` creates static site.
- Deployed workflow refreshes data and rebuilds on schedule.
- Every visible opportunity links back to public evidence.
