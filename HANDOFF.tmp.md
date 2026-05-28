# Signal Desk Handoff

Temporary handoff for next agent. Redacted: no credentials, tokens, local usernames, or private account details included.

## Current State

- Product built and deployed: https://mct-dev.github.io/signal-desk/
- Repository: https://github.com/mct-dev/signal-desk
- Main branch contains MVP plus scheduled deployment workflow.
- Existing design/spec artifact: `docs/superpowers/specs/2026-05-27-signal-desk-design.md`
- Existing project overview and commands: `README.md`
- Key commits:
  - `935dbfa` `feat(signal-desk): MVP autonomous signal site`
  - `ac156b4` `chore(data): refresh public signals`
  - `feb4167` `chore(signal-desk): opt actions into node 24`

## Conversation Summary

User wanted signal extraction, not a course clone. Requirement became: fully deployed website, automatic updates, only data sources the agent can pull directly, no developer integrations, no API keys, no paid data/API access.

MVP chosen: static React dashboard plus scheduled GitHub Actions collector. This avoids persistent paid storage and avoids gated APIs. Public JSON files in repo act as durable data store.

## Implemented Shape

Reference existing files instead of repeating details:

- UI: `src/App.jsx`, `src/App.css`, `src/index.css`
- Collector/scoring: `scripts/collect-signals.js`
- Static build: `scripts/build-site.js`
- Scheduled deploy: `.github/workflows/deploy.yml`
- Live data: `public/data/signals.json`
- Baseline history: `public/data/history.json`

No private scraping, CAPTCHA bypass, paywall bypass, authenticated accounts, developer keys, or paid APIs.

## Verification Already Done

- `bun run collect` passed.
- `bun run lint` passed.
- `bun run build` passed.
- GitHub Actions deploy passed.
- Live site returned HTTP `200`.
- Live `data/signals.json` returned HTTP `200`.
- Desktop/mobile screenshots reviewed locally.
- Search, row selection, detail panel, and evidence links were checked with Playwright fallback.

## Known Notes

- Browser plugin did not surface during verification; Playwright was temporarily installed for local verification, then removed before final commit.
- GitHub Actions still emits Node 20 deprecation annotation for some third-party actions, but workflow sets `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` and deploy succeeds.
- Scoring is useful MVP heuristic, not validated market truth. Next work should improve signal quality before adding more UI.
- GitHub Actions collector commits fresh data. Pull/rebase before pushing if remote has newer `chore(data)` commits.

## Suggested Skills

- `superpowers:systematic-debugging` when collector/source failures or scoring regressions appear.
- `build-web-apps:frontend-testing-debugging` when changing rendered UI or responsive behavior.
- `playwright` when verifying live/local UI flows, screenshots, filtering, and evidence links.
- `github:github` when inspecting workflow runs, Pages deploys, or repo state.
- `vercel:verification` or `build-web-apps:frontend-testing-debugging` if doing deeper product-quality browser verification.

## Good Next Steps

- Improve clustering so Apple/Reddit-heavy generic topics produce less noise.
- Add source-level freshness/staleness thresholds in UI.
- Add test fixture for collector output shape.
- Add source docs with allowed public endpoints and fallback behavior.
- Consider splitting collector into source modules once scoring logic grows.
