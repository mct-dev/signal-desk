# Signal Desk Codex Automation

Signal Desk's Codex automation is a daily product-research loop. It uses the
repo as the source of truth for current signal state, history, research digests,
seed updates, and commits produced by the automation.

## Output Paths

- `automation/digests/YYYY-MM-DD.md` stores the email-style digest for each run.
- `automation/state/latest.json` stores machine-readable metadata from the most
  recent run.
- `public/data/signals.json` stores current opportunity signal state.
- `public/data/history.json` stores historical opportunity baselines.
- `sources/manual-links.json` stores curated public seed links, including public
  X URLs captured as human-written notes instead of scraped content.
- `sources/echo-sources.json` stores recurring public echo queries and RSS feeds.

## Digest Shape

Each digest should be concise enough to read like an email:

1. Subject line.
2. Executive summary.
3. High-confidence opportunity briefs.
4. Commercially actionable opportunities.
5. General market trend notes for the future market-trends page.
6. Source health and data-quality issues.
7. Seed/source changes committed by the automation.
8. Recommended validation steps.

## Run Rules

- Prefer public evidence and explicit personal-context pointers from recent local
  reading, newsletters, browser history, saved highlights, or Chronicle-visible
  activity.
- Do not store private message contents, credentials, paywalled text, or raw
  personal browsing data in the repo.
- If personal context suggests a lead, store only the public URL, short note,
  tags, and evidence type needed for Signal Desk.
- Use X only through manual public URL seeds with human-written notes, official X
  API access, or licensed/approved data sources. Do not scrape X's website, use
  browser/cookie automation against X, bypass rate limits, or store raw X content
  in the repo.
- Run `bun run collect`, `bun run test`, `bun run lint`, and `bun run build`
  after changing sources or signal generation.
- Commit automation-created changes immediately, staging only files changed by
  that automation run.
