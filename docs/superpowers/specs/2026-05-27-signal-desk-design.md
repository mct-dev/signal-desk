# Signal Desk MVP Design

Signal Desk is a deployed public website that updates without manual work. It collects public no-paid data, filters for niche tech-business pain plus spend evidence, and presents weekly opportunity briefs with evidence links.

## Scope

- Static React/Vite website with GitHub Pages deployment.
- Scheduled GitHub Actions collector weekly.
- Durable JSON snapshots committed into `public/data`.
- Optional free API keys are allowed only where they do not replace public-source collection. Missing keys degrade source health instead of failing the run.
- No paid APIs, private scraping, CAPTCHA bypass, or paywall bypass.
- Sources: manual/X seed links, Reddit RSS and search RSS, Hacker News and HN search echoes, curated RSS echoes, GitHub Issues, npm, PyPI, GitHub Trending, GDELT, OWID, World Bank, BLS, and optional FRED.
- Production Pages builds require `SIGNAL_DESK_PASSWORD`, encrypt the signal payload, and remove cleartext data files from the published artifact.

## Data Flow

1. `scripts/collect-signals.js` fetches public sources.
2. Raw items become normalized evidence records with source, title, summary, URL, date, tags, metrics, source type, and evidence type.
3. Manual/X links seed hypotheses without scraping X; regular echo sources corroborate those ideas via Reddit RSS, HN search, RSS feeds, and other public surfaces.
4. Evidence is grouped into narrow opportunity profiles or high-quality fallback clusters.
5. Score prioritizes pain, spend/adoption evidence, recurrence, source quality, niche specificity, and macro context.
6. `public/data/signals.json` powers local/source data; `public/data/history.json` stores recent baselines.
7. Production builds publish `data/signals.enc.json` and require a browser password unlock before evidence is decrypted.

## UI

The first screen is the product: weekly opportunity briefs, summary metrics, filters, selected-brief detail panel, source health, and evidence links. No marketing wrapper, no course content, no manual review queue.

## Acceptance

- `bun run collect` produces fresh `signals.json`.
- `bun run test` verifies scoring and schema behavior.
- `bun run build` creates static site.
- Deployed workflow refreshes data and rebuilds on schedule.
- Every visible opportunity names a customer, pain, wedge, business model, validation step, risks, and public evidence.
