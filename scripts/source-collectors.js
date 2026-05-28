import { XMLParser } from 'fast-xml-parser'
import { normalizeText, slugify } from './signal-core.js'

const USER_AGENT = 'signal-desk/0.2 opportunity-research'

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

async function redditAccessToken() {
  const clientId = process.env.REDDIT_CLIENT_ID
  const clientSecret = process.env.REDDIT_CLIENT_SECRET
  if (!clientId || !clientSecret) return ''

  const body = new URLSearchParams({ grant_type: 'client_credentials' })
  const token = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetchJson('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  return response.access_token ?? ''
}

export async function collectReddit() {
  const subreddits = ['SaaS', 'startups', 'Entrepreneur', 'SideProject', 'webdev', 'devops', 'ExperiencedDevs']
  const token = await redditAccessToken().catch(() => '')

  if (token) {
    const results = await Promise.all(
      subreddits.map(async (subreddit) => {
        const json = await fetchJson(`https://oauth.reddit.com/r/${subreddit}/new?limit=25`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        return (json.data?.children ?? []).map((child) => {
          const post = child.data ?? {}
          return evidence({
            source: 'Reddit',
            sourceType: 'discussion',
            title: post.title,
            summary: `${post.selftext ?? ''} subreddit:${subreddit}`,
            url: post.url_overridden_by_dest ?? `https://www.reddit.com${post.permalink}`,
            publishedAt: new Date((post.created_utc ?? Date.now() / 1000) * 1000).toISOString(),
            tags: [subreddit],
            metrics: { comments: post.num_comments ?? 0, score: post.score ?? 0 },
          })
        })
      }),
    )
    return uniqueByUrl(results.flat())
  }

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

export async function collectStackExchange() {
  const taggedQueries = [
    ['soc2', 'security'],
    ['oauth-2.0', 'auth0'],
    ['saml', 'single-sign-on'],
    ['stripe-payments'],
    ['openai-api'],
    ['langchain'],
    ['postgresql'],
    ['dbt'],
    ['airflow'],
  ]
  const results = await Promise.all(
    taggedQueries.map(async (tags) => {
      const url = new URL('https://api.stackexchange.com/2.3/questions')
      url.searchParams.set('order', 'desc')
      url.searchParams.set('sort', 'creation')
      url.searchParams.set('site', 'stackoverflow')
      url.searchParams.set('pagesize', '20')
      url.searchParams.set('fromdate', String(Math.floor(Date.parse('2025-01-01T00:00:00.000Z') / 1000)))
      url.searchParams.set('tagged', tags.join(';'))
      const json = await fetchJson(url)
      return (json.items ?? []).map((question) =>
        evidence({
          source: 'Stack Exchange',
          sourceType: 'qa',
          title: question.title,
          summary: `Question tagged ${question.tags?.join(', ')}. Answered: ${question.is_answered ? 'yes' : 'no'}.`,
          url: question.link,
          publishedAt: new Date((question.creation_date ?? Date.now() / 1000) * 1000).toISOString(),
          tags: question.tags ?? tags,
          metrics: {
            score: question.score ?? 0,
            answerCount: question.answer_count ?? 0,
            viewCount: question.view_count ?? 0,
            isAnswered: Boolean(question.is_answered),
          },
        }),
      )
    }),
  )
  return uniqueByUrl(results.flat())
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
    ['Hacker News', collectHackerNews],
    ['Reddit', collectReddit],
    ['Stack Exchange', collectStackExchange],
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
