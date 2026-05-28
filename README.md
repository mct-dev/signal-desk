# Signal Desk

Weekly opportunity briefs from public market, pain, spend, adoption, and macro signals.

Signal Desk collects public evidence, filters for niche tech-business pain, scores opportunities by pain plus spend, and publishes a static dashboard that can update on a schedule. The goal is not to show broad internet trends; it is to surface specific business opportunities that could become a SaaS product, service, or other value-creation wedge.

## Sources

Default no-key sources:

- Hacker News public Firebase API
- Reddit public RSS feeds
- Stack Exchange public API
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
- `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` enable OAuth collection; RSS remains the fallback.
- `FRED_API_KEY` enables FRED macro series. Without it, FRED is marked skipped.
- `BLS_API_KEY` is not required for the current BLS calls, but can be added later if broader BLS ranges are needed.

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
