# Signal Desk

Weekly opportunity briefs from public market, pain, spend, adoption, and macro signals.

Signal Desk collects public evidence, filters for niche tech-business pain, scores opportunities by pain plus spend, and publishes a static dashboard that can update on a schedule. The goal is not to show broad internet trends; it is to surface specific business opportunities that could become a SaaS product, service, or other value-creation wedge.

## Sources

Default no-key sources:

- Hacker News public Firebase API
- Reddit public RSS feeds
- Reddit public search RSS echoes from `sources/echo-sources.json`
- Hacker News public search echoes from `sources/echo-sources.json`
- Curated manual/X seed links from `sources/manual-links.json`
- Curated RSS echo feeds from `sources/echo-sources.json`
- GitHub public issue search
- npm public registry search
- PyPI public RSS feed
- GitHub Trending public page
- GDELT DOC API
- Our World in Data Grapher CSV
- World Bank Indicators API
- BLS Public Data API

Optional free API keys:

- `GITHUB_TOKEN` raises GitHub issue-search rate limits.
- `FRED_API_KEY` enables FRED macro series. Without it, FRED is marked skipped.
- `BLS_API_KEY` is not required for the current BLS calls, but can be added later if broader BLS ranges are needed.

Production privacy:

- `SIGNAL_DESK_PASSWORD` is required by the GitHub Pages build.
- The production build encrypts `signals.json` into `signals.enc.json` and removes cleartext signal/history JSON from the Pages artifact.
- The static app shell remains public on GitHub Pages, but the opportunity data requires the password to decrypt in the browser.
- Set or rotate the password with `gh secret set SIGNAL_DESK_PASSWORD --repo mct-dev/signal-desk`, then rerun the deploy workflow.

## Curated Seeds and Echoes

X is treated as a seed source, not a scraped data source. Add high-signal X or other manual links to `sources/manual-links.json` with a title, note, tags, and evidence type. The collector uses your note and link as evidence and does not fetch or scrape X content.

Regular echo collection is configured in `sources/echo-sources.json`:

- `redditSearches` uses public Reddit RSS search URLs.
- `hackerNewsSearches` uses the public HN Algolia search endpoint.
- `rssFeeds` uses normal public RSS or Atom feeds.

Echo sources run on every collection. They help corroborate manually observed ideas across public surfaces without relying on Reddit or X APIs.

## Output

The collector writes `public/data/signals.json` with `schemaVersion: 2`.

Each opportunity includes:

- customer
- pain
- current workaround
- product wedge
- business model
- validation step
- confidence
- score breakdown
- source evidence
- spend and adoption signals
- macro context
- risks

## Local

```sh
bun install
bun run test
bun run collect
bun run lint
bun run build
bun run preview
```

## Deployment

The GitHub Actions workflow runs weekly, refreshes `public/data/*.json`, commits updated data, builds with Bun, and deploys `dist` to GitHub Pages. Manual dispatch remains available for ad hoc refreshes.

No paid APIs, private scraping, CAPTCHA bypass, or paywall bypass are used.
