import { readFile } from 'node:fs/promises'
import { XMLParser } from 'fast-xml-parser'
import { normalizeText, slugify } from './signal-core.js'

const USER_AGENT = 'signal-desk/0.2 opportunity-research'
const MANUAL_LINKS_PATH = new URL('../sources/manual-links.json', import.meta.url)
const ECHO_SOURCES_PATH = new URL('../sources/echo-sources.json', import.meta.url)

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text',
})

class SkipSourceError extends Error {
  constructor(message) {
    super(message)
    this.skipped = true
  }
}

function skipSource(message) {
  throw new SkipSourceError(message)
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
      ...(options.headers ?? {}),
    },
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return response.json()
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': USER_AGENT,
      ...(options.headers ?? {}),
    },
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return response.text()
}

function asArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function rssItems(xmlText) {
  const xml = parser.parse(xmlText)
  const channelItems = asArray(xml?.rss?.channel?.item)
  const atomEntries = asArray(xml?.feed?.entry)

  return [...channelItems, ...atomEntries].map((entry) => {
    const link = typeof entry.link === 'string' ? entry.link : entry.link?.href
    return {
      title: normalizeText(entry.title),
      url: link ?? '',
      summary: normalizeText(entry.description ?? entry.summary ?? entry.content),
      publishedAt: entry.pubDate ?? entry.published ?? entry.updated ?? new Date().toISOString(),
    }
  })
}

function evidence(overrides) {
  return {
    id: overrides.id ?? slugify(`${overrides.source}-${overrides.url || overrides.title}`),
    source: overrides.source,
    sourceType: overrides.sourceType,
    title: normalizeText(overrides.title),
    summary: normalizeText(overrides.summary),
    url: overrides.url,
    publishedAt: overrides.publishedAt ?? new Date().toISOString(),
    tags: overrides.tags ?? [],
    metrics: overrides.metrics ?? {},
    evidenceType: overrides.evidenceType,
  }
}

function uniqueByUrl(items) {
  const seen = new Set()
  return items.filter((item) => {
    const key = item.url || item.id
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function enabledItems(items) {
  return items.filter((item) => item.enabled !== false)
}

async function settledFlat(promises) {
  const results = await Promise.allSettled(promises)
  return results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
}

async function readJsonFile(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

function dateFrom(value) {
  if (!value) return new Date().toISOString()
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`
  return new Date(value).toISOString()
}

function isXUrl(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return hostname === 'x.com' || hostname === 'twitter.com'
  } catch {
    return false
  }
}

export function manualLinkToEvidence(link) {
  const source = isXUrl(link.url) ? 'Manual X Seed' : 'Manual Signal'
  return evidence({
    source,
    sourceType: 'curated-link',
    evidenceType: link.evidenceType ?? 'context',
    title: link.title,
    summary: link.note ?? link.summary ?? link.text ?? '',
    url: link.url,
    publishedAt: dateFrom(link.addedAt ?? link.publishedAt),
    tags: link.tags ?? [],
    metrics: { curated: true },
  })
}

export function redditSearchUrl({ subreddit, query, sort = 'new', time = 'month' }) {
  const base = subreddit ? `https://www.reddit.com/r/${subreddit}/search.rss` : 'https://www.reddit.com/search.rss'
  const params = new URLSearchParams({
    q: query,
    restrict_sr: subreddit ? '1' : '0',
    sort,
    t: time,
  })
  return `${base}?${params.toString()}`
}

export function echoFeedToEvidence(item, sourceConfig) {
  const source = sourceConfig.source ?? sourceConfig.label
  const label = sourceConfig.label ?? source
  return evidence({
    ...item,
    source,
    sourceType: 'echo',
    evidenceType: sourceConfig.evidenceType ?? 'context',
    summary: [label, item.summary].filter(Boolean).join('. '),
    tags: sourceConfig.tags ?? [],
    metrics: { ...(item.metrics ?? {}), echo: true, ...(sourceConfig.metrics ?? {}) },
  })
}

export function echoHackerNewsHitToEvidence(hit, sourceConfig) {
  return evidence({
    source: 'Hacker News Echo',
    sourceType: 'echo',
    evidenceType: sourceConfig.evidenceType ?? 'context',
    title: hit.title ?? hit.story_title,
    summary: `${sourceConfig.label}. ${hit.story_text ?? hit.comment_text ?? ''}`,
    url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
    publishedAt: hit.created_at ?? new Date().toISOString(),
    tags: sourceConfig.tags ?? [],
    metrics: {
      echo: true,
      query: sourceConfig.query,
      score: hit.points ?? 0,
      comments: hit.num_comments ?? 0,
      objectID: hit.objectID,
    },
  })
}

export async function runSource(source, fn) {
  const started = new Date().toISOString()
  try {
    const items = await fn()
    return {
      run: {
        source,
        ok: true,
        skipped: false,
        itemCount: items.length,
        fetchedAt: new Date().toISOString(),
        startedAt: started,
      },
      items,
    }
  } catch (error) {
    return {
      run: {
        source,
        ok: false,
        skipped: Boolean(error.skipped),
        itemCount: 0,
        fetchedAt: new Date().toISOString(),
        startedAt: started,
        error: error.message,
      },
      items: [],
    }
  }
}

export async function collectHackerNews() {
  const storyIds = await fetchJson('https://hacker-news.firebaseio.com/v0/topstories.json')
  const ids = storyIds.slice(0, 80)
  const stories = await Promise.all(
    ids.map((id) =>
      fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(() => null),
    ),
  )

  return stories
    .filter(Boolean)
    .filter((story) => story.title && !story.deleted)
    .map((story) =>
      evidence({
        source: 'Hacker News',
        sourceType: 'discussion',
        title: story.title,
        summary: story.text ?? '',
        url: story.url ?? `https://news.ycombinator.com/item?id=${story.id}`,
        publishedAt: new Date((story.time ?? Date.now() / 1000) * 1000).toISOString(),
        metrics: {
          score: story.score ?? 0,
          comments: story.descendants ?? 0,
          rank: ids.indexOf(story.id) + 1,
        },
      }),
    )
}

export async function collectReddit() {
  const subreddits = ['SaaS', 'startups', 'Entrepreneur', 'SideProject', 'webdev', 'devops', 'ExperiencedDevs']
  const feeds = await Promise.all(
    subreddits.map(async (subreddit) => {
      const xml = await fetchText(`https://www.reddit.com/r/${subreddit}/.rss`)
      return rssItems(xml).slice(0, 20).map((item) =>
        evidence({
          ...item,
          source: 'Reddit',
          sourceType: 'discussion',
          summary: `${item.summary} subreddit:${subreddit}`,
          tags: [subreddit],
        }),
      )
    }),
  )
  return uniqueByUrl(feeds.flat())
}

export async function collectManualLinks() {
  const links = await readJsonFile(MANUAL_LINKS_PATH, [])
  return enabledItems(links).filter((link) => link.url && link.title).map(manualLinkToEvidence)
}

export async function collectEchoSources() {
  const config = await readJsonFile(ECHO_SOURCES_PATH, {})
  const redditSearches = enabledItems(config.redditSearches ?? [])
  const hackerNewsSearches = enabledItems(config.hackerNewsSearches ?? [])
  const rssFeeds = enabledItems(config.rssFeeds ?? [])

  const redditResults = await settledFlat(
    redditSearches.map(async (search) => {
      const xml = await fetchText(redditSearchUrl(search))
      return rssItems(xml)
        .slice(0, search.limit ?? 15)
        .map((item) =>
          echoFeedToEvidence(item, {
            source: 'Reddit Echo',
            label: search.label ?? 'Reddit Echo',
            tags: search.tags ?? [],
            evidenceType: search.evidenceType,
            metrics: { query: search.query, subreddit: search.subreddit ?? 'all' },
          }),
        )
    }),
  )

  const hackerNewsResults = await settledFlat(
    hackerNewsSearches.map(async (search) => {
      const url = new URL('https://hn.algolia.com/api/v1/search_by_date')
      url.searchParams.set('query', search.query)
      url.searchParams.set('tags', 'story')
      url.searchParams.set('hitsPerPage', String(search.limit ?? 15))
      const json = await fetchJson(url)
      return (json.hits ?? []).map((hit) => echoHackerNewsHitToEvidence(hit, search))
    }),
  )

  const rssResults = await settledFlat(
    rssFeeds.map(async (feed) => {
      const xml = await fetchText(feed.url)
      return rssItems(xml)
        .slice(0, feed.limit ?? 15)
        .map((item) =>
          echoFeedToEvidence(item, {
            ...feed,
            metrics: { feedUrl: feed.url },
          }),
        )
    }),
  )

  return uniqueByUrl([...redditResults.flat(), ...hackerNewsResults.flat(), ...rssResults.flat()])
}

export async function collectGithubIssues() {
  const searches = [
    '"SOC2" "evidence" "startup"',
    '"SSO" "enterprise" "bug"',
    '"Auth0" "confusing"',
    '"usage based billing" "Stripe"',
    '"prompt regression" "LLM"',
    '"schema drift" "dbt"',
    '"RAG" "hallucination"',
    '"MCP" "agent" "failed"',
  ]
  const headers = {}
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

  const results = await Promise.all(
    searches.map(async (search) => {
      const url = new URL('https://api.github.com/search/issues')
      url.searchParams.set('q', `${search} type:issue is:issue created:>2025-01-01`)
      url.searchParams.set('sort', 'updated')
      url.searchParams.set('order', 'desc')
      url.searchParams.set('per_page', '15')
      const json = await fetchJson(url, { headers })
      return (json.items ?? []).map((issue) =>
        evidence({
          source: 'GitHub Issues',
          sourceType: 'developer-pain',
          title: issue.title,
          summary: issue.body ?? '',
          url: issue.html_url,
          publishedAt: issue.created_at,
          tags: (issue.labels ?? []).map((label) => label.name).filter(Boolean),
          metrics: { comments: issue.comments ?? 0, score: issue.score ?? 0 },
        }),
      )
    }),
  )

  return uniqueByUrl(results.flat())
}

export async function collectNpm() {
  const searches = ['soc2', 'saml', 'auth0', 'stripe metering', 'llm eval', 'rag', 'mcp agent', 'dbt']
  const results = await Promise.all(
    searches.map(async (term) => {
      const url = new URL('https://registry.npmjs.org/-/v1/search')
      url.searchParams.set('text', term)
      url.searchParams.set('size', '20')
      const json = await fetchJson(url)
      return (json.objects ?? []).map((entry) =>
        evidence({
          source: 'npm',
          sourceType: 'package',
          evidenceType: 'adoption',
          title: entry.package?.name,
          summary: entry.package?.description,
          url: entry.package?.links?.npm ?? `https://www.npmjs.com/package/${entry.package?.name}`,
          publishedAt: entry.package?.date ?? new Date().toISOString(),
          tags: [term],
          metrics: { search: term, score: Math.round((entry.score?.final ?? 0) * 100) },
        }),
      )
    }),
  )
  return uniqueByUrl(results.flat())
}

export async function collectPypi() {
  const xml = await fetchText('https://pypi.org/rss/updates.xml')
  return rssItems(xml)
    .slice(0, 100)
    .map((item) =>
      evidence({
        ...item,
        source: 'PyPI',
        sourceType: 'package',
        evidenceType: 'adoption',
      }),
    )
}

export async function collectGithubTrending() {
  const html = await fetchText('https://github.com/trending?since=weekly')
  const repoBlocks = html.split('<article class="Box-row"').slice(1)
  return repoBlocks.slice(0, 25).map((block) => {
    const repoMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[\s\S]*?<\/a>/)
    const descMatch = block.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/)
    const starsMatch = block.match(/stars this week\s*<\/span>|([0-9,]+)\s+stars this week/)
    const repoPath = repoMatch?.[1]?.replace(/\s+/g, '') ?? ''
    const cleanRepo = repoPath.replace(/^\//, '').replace(/\s/g, '')
    return evidence({
      source: 'GitHub Trending',
      sourceType: 'package',
      evidenceType: 'adoption',
      title: cleanRepo,
      summary: normalizeText(descMatch?.[1] ?? ''),
      url: `https://github.com/${cleanRepo}`,
      tags: [],
      metrics: { starsThisWeek: starsMatch?.[1] ? Number(starsMatch[1].replace(/,/g, '')) : 0 },
    })
  })
}

export async function collectGdelt() {
  const queries = [
    ['AI compliance', '"AI compliance" OR "AI governance" OR "security questionnaire"'],
    ['Usage billing', '"usage based pricing" OR "usage billing" OR "cloud cost optimization"'],
    ['Authentication', '"single sign-on" OR "identity provider" OR "OAuth"'],
    ['LLM quality', '"LLM evaluation" OR "AI hallucination" OR "RAG quality"'],
  ]
  const results = await Promise.all(
    queries.map(async ([label, query]) => {
      const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc')
      url.searchParams.set('query', query)
      url.searchParams.set('mode', 'ArtList')
      url.searchParams.set('format', 'json')
      url.searchParams.set('maxrecords', '10')
      url.searchParams.set('timespan', '30d')
      const json = await fetchJson(url)
      return (json.articles ?? []).map((article) =>
        evidence({
          source: 'GDELT',
          sourceType: 'news',
          evidenceType: 'macro',
          title: article.title,
          summary: `${label}. ${article.seendate ?? ''} ${article.domain ?? ''}`,
          url: article.url,
          publishedAt: article.seendate ? new Date(article.seendate).toISOString() : new Date().toISOString(),
          tags: [label],
          metrics: { tone: article.tone ?? 0 },
        }),
      )
    }),
  )
  return uniqueByUrl(results.flat())
}

function parseCsvRows(csv) {
  const rows = []
  let current = ''
  let row = []
  let quoted = false

  for (const char of csv) {
    if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(current)
      current = ''
    } else if (char === '\n' && !quoted) {
      row.push(current)
      rows.push(row)
      row = []
      current = ''
    } else if (char !== '\r') {
      current += char
    }
  }
  if (current || row.length) {
    row.push(current)
    rows.push(row)
  }

  const [headers, ...data] = rows
  return data.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])),
  )
}

function latestRowsByEntity(rows, valueColumn, entities = ['United States', 'World']) {
  return entities
    .map((entity) =>
      rows
        .filter((row) => row.Entity === entity && row[valueColumn])
        .sort((a, b) => Number(b.Year) - Number(a.Year))[0],
    )
    .filter(Boolean)
}

export async function collectOwid() {
  const charts = [
    {
      slug: 'share-of-individuals-using-the-internet',
      title: 'Internet adoption',
      valueColumn: 'Share of the population using the Internet',
      tags: ['internet adoption', 'digital adoption'],
    },
    {
      slug: 'gdp-per-capita-worldbank',
      title: 'GDP per capita',
      valueColumn: 'GDP per capita',
      tags: ['economic capacity', 'macro'],
    },
  ]
  const results = await Promise.all(
    charts.map(async (chart) => {
      const csv = await fetchText(`https://ourworldindata.org/grapher/${chart.slug}.csv`)
      return latestRowsByEntity(parseCsvRows(csv), chart.valueColumn).map((row) =>
        evidence({
          source: 'OWID',
          sourceType: 'macro',
          evidenceType: 'macro',
          title: `${chart.title}: ${row.Entity}`,
          summary: `${chart.valueColumn} was ${row[chart.valueColumn]} in ${row.Year}.`,
          url: `https://ourworldindata.org/grapher/${chart.slug}`,
          publishedAt: `${row.Year}-12-31T00:00:00.000Z`,
          tags: chart.tags,
          metrics: { year: Number(row.Year), value: Number(row[chart.valueColumn]) },
        }),
      )
    }),
  )
  return results.flat()
}

export async function collectWorldBank() {
  const indicators = [
    ['IT.NET.USER.ZS', 'Individuals using the Internet', ['internet adoption', 'digital adoption']],
    ['NY.GDP.PCAP.KD', 'GDP per capita', ['economic capacity', 'macro']],
  ]
  const results = await Promise.all(
    indicators.map(async ([indicator, label, tags]) => {
      const url = `https://api.worldbank.org/v2/country/US/indicator/${indicator}?format=json&per_page=8`
      const json = await fetchJson(url)
      return (json[1] ?? [])
        .filter((row) => row.value !== null)
        .slice(0, 2)
        .map((row) =>
          evidence({
            source: 'World Bank',
            sourceType: 'macro',
            evidenceType: 'macro',
            title: `${label}: United States`,
            summary: `${label} was ${row.value} in ${row.date}.`,
            url: `https://data.worldbank.org/indicator/${indicator}?locations=US`,
            publishedAt: `${row.date}-12-31T00:00:00.000Z`,
            tags,
            metrics: { year: Number(row.date), value: Number(row.value) },
          }),
        )
    }),
  )
  return results.flat()
}

export async function collectBls() {
  const series = [
    ['LNS14000000', 'US unemployment rate', ['labor market', 'macro']],
    ['CES5051800001', 'Data processing and hosting employment', ['tech employment', 'infrastructure']],
  ]
  const results = await Promise.all(
    series.map(async ([seriesId, label, tags]) => {
      const url = `https://api.bls.gov/publicAPI/v2/timeseries/data/${seriesId}`
      const json = await fetchJson(url)
      return (json.Results?.series?.[0]?.data ?? []).slice(0, 3).map((row) =>
        evidence({
          source: 'BLS',
          sourceType: 'macro',
          evidenceType: 'macro',
          title: label,
          summary: `${label} was ${row.value} in ${row.periodName} ${row.year}.`,
          url: `https://data.bls.gov/timeseries/${seriesId}`,
          publishedAt: `${row.year}-${row.period?.replace('M', '').padStart(2, '0') ?? '01'}-01T00:00:00.000Z`,
          tags,
          metrics: { year: Number(row.year), period: row.period, value: Number(row.value) },
        }),
      )
    }),
  )
  return results.flat()
}

export async function collectFred() {
  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) skipSource('FRED_API_KEY not configured')

  const series = [
    ['UNRATE', 'US unemployment rate', ['labor market', 'macro']],
    ['ICSA', 'Initial unemployment claims', ['labor market', 'macro']],
  ]
  const results = await Promise.all(
    series.map(async ([seriesId, label, tags]) => {
      const url = new URL('https://api.stlouisfed.org/fred/series/observations')
      url.searchParams.set('series_id', seriesId)
      url.searchParams.set('api_key', apiKey)
      url.searchParams.set('file_type', 'json')
      url.searchParams.set('sort_order', 'desc')
      url.searchParams.set('limit', '3')
      const json = await fetchJson(url)
      return (json.observations ?? [])
        .filter((row) => row.value && row.value !== '.')
        .map((row) =>
          evidence({
            source: 'FRED',
            sourceType: 'macro',
            evidenceType: 'macro',
            title: label,
            summary: `${label} was ${row.value} on ${row.date}.`,
            url: `https://fred.stlouisfed.org/series/${seriesId}`,
            publishedAt: `${row.date}T00:00:00.000Z`,
            tags,
            metrics: { value: Number(row.value) },
          }),
        )
    }),
  )
  return results.flat()
}

export function collectors() {
  return [
    ['Manual Links', collectManualLinks],
    ['Echo Sources', collectEchoSources],
    ['Hacker News', collectHackerNews],
    ['Reddit', collectReddit],
    ['GitHub Issues', collectGithubIssues],
    ['npm', collectNpm],
    ['PyPI', collectPypi],
    ['GitHub Trending', collectGithubTrending],
    ['GDELT', collectGdelt],
    ['OWID', collectOwid],
    ['World Bank', collectWorldBank],
    ['BLS', collectBls],
    ['FRED', collectFred],
  ]
}
