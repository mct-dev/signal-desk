# Signal Desk

Autonomous opportunity detection from public no-key internet sources.

Signal Desk collects public data, clusters repeated language into market signals, scores each opportunity, and publishes a static website that can update on a schedule without private API keys or paid data feeds.

## Sources

- Hacker News public Firebase API
- Reddit public RSS feeds
- Apple public RSS/JSON feeds
- arXiv RSS feeds
- npm public registry search
- PyPI public RSS feed
- GitHub Trending public page

## Local

```sh
bun install
bun run collect
bun run build
bun run preview
```

## Deployment

The GitHub Actions workflow runs every six hours, refreshes `public/data/signals.json`, commits updated data, builds with Bun, and deploys `dist` to GitHub Pages.

No developer API keys, paid APIs, authenticated accounts, private scraping, CAPTCHA bypass, or paywall bypass are used.
