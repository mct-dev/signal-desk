import { readFile, writeFile } from 'node:fs/promises'
import { XMLParser } from 'fast-xml-parser'

const DATA_PATH = new URL('../public/data/signals.json', import.meta.url)
const HISTORY_PATH = new URL('../public/data/history.json', import.meta.url)
const USER_AGENT = 'signal-desk/0.1 public-source-research'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text',
})

const stopwords = new Set([
  'about',
  'after',
  'again',
  'against',
  'all',
  'also',
  'and',
  'another',
  'any',
  'app',
  'apps',
  'are',
  'because',
  'been',
  'being',
  'best',
  'between',
  'build',
  'can',
  'com',
  'could',
  'daily',
  'does',
  'dont',
  'for',
  'free',
  'from',
  'get',
  'getting',
  'has',
  'have',
  'help',
  'how',
  'into',
  'just',
  'like',
  'make',
  'more',
  'need',
  'new',
  'not',
  'now',
  'out',
  'over',
  'people',
  'really',
  'show',
  'some',
  'than',
  'that',
  'the',
  'their',
  'then',
  'there',
  'this',
  'use',
  'using',
  'want',
  'was',
  'what',
  'when',
  'where',
  'which',
  'will',
  'with',
  'would',
  'you',
  'your',
])

const topicRules = [
  {
    id: 'ai-agents-automation',
    title: 'AI Agents + Automation',
    category: 'AI workflows',
    keywords: ['agent', 'agents', 'automation', 'browser', 'llm', 'mcp', 'openai', 'claude'],
  },
  {
    id: 'local-open-models',
    title: 'Local + Open Models',
    category: 'AI workflows',
    keywords: ['local', 'open', 'model', 'models', 'llama', 'inference', 'reasoning'],
  },
  {
    id: 'model-evals-benchmarks',
    title: 'Model Evals + Benchmarks',
    category: 'Developer tools',
    keywords: ['eval', 'evals', 'benchmark', 'benchmarks', 'evaluation', 'dataset', 'datasets'],
  },
  {
    id: 'developer-infrastructure',
    title: 'Developer Infrastructure',
    category: 'Developer tools',
    keywords: ['api', 'database', 'deploy', 'github', 'javascript', 'python', 'server', 'testing'],
  },
  {
    id: 'health-fitness-apps',
    title: 'Health + Fitness Apps',
    category: 'Consumer apps',
    keywords: ['fitness', 'health', 'heart', 'sleep', 'workout', 'medical', 'nutrition'],
  },
  {
    id: 'personal-productivity',
    title: 'Personal Productivity',
    category: 'Productivity',
    keywords: ['calendar', 'focus', 'habit', 'notes', 'productivity', 'task', 'todo', 'workflow'],
  },
  {
    id: 'small-business-sales',
    title: 'Small Business + Sales',
    category: 'Commerce',
    keywords: ['business', 'customer', 'lead', 'marketing', 'sales', 'startup', 'revenue'],
  },
  {
    id: 'ecommerce-shopping',
    title: 'Ecommerce + Shopping',
    category: 'Commerce',
    keywords: ['amazon', 'checkout', 'ecommerce', 'inventory', 'shop', 'shopping', 'store'],
  },
  {
    id: 'consumer-finance',
    title: 'Consumer Finance',
    category: 'Consumer apps',
    keywords: ['bank', 'budget', 'finance', 'money', 'payment', 'price', 'subscription'],
  },
  {
    id: 'creative-tools',
    title: 'Creative Tools',
    category: 'Creator tools',
    keywords: ['audio', 'design', 'image', 'music', 'photo', 'video', 'writer', 'youtube'],
  },
  {
    id: 'privacy-security',
    title: 'Privacy + Security',
    category: 'Developer tools',
    keywords: ['auth', 'privacy', 'security', 'vpn', 'password', 'encrypted', 'identity'],
  },
]

const painTerms = [
  'annoying',
  'broken',
  'bug',
  'confusing',
  'difficult',
  'expensive',
  'frustrating',
  'hard',
  'hate',
  'issue',
  'missing',
  'problem',
  'slow',
  'stuck',
  'terrible',
  'wish',
]

const moneyTerms = [
  'ad',
  'affiliate',
  'buy',
  'checkout',
  'customer',
  'deal',
  'enterprise',
  'growth',
  'market',
  'paid',
  'pay',
  'price',
  'pricing',
  'revenue',
  'sales',
  'shop',
  'startup',
  'subscription',
]

const noveltyTerms = [
  'agent',
  'automation',
  'benchmark',
  'browser',
  'dataset',
  'eval',
  'generated',
  'local',
  'mcp',
  'multimodal',
  'open-source',
  'reasoning',
  'synthetic',
  'workflow',
]

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function textOf(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'object' && value.text) return String(value.text)
  return ''
}

function normalizeText(value) {
  return textOf(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^-|-$/g, ''))
    .filter((token) => token.length > 2 && /^[a-z][a-z0-9+#.-]*$/.test(token) && !stopwords.has(token))
}

function topKeywords(item) {
  const tokens = tokenize(`${item.title} ${item.summary}`)
  const counts = new Map()
  tokens.forEach((token) => counts.set(token, (counts.get(token) ?? 0) + 1))
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([token]) => token)
}

function clusterKey(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase()
  const matches = topicRules
    .map((rule) => ({
      rule,
      hits: rule.keywords.reduce((total, keyword) => total + (text.includes(keyword) ? 1 : 0), 0),
    }))
    .filter((match) => match.hits > 0)
    .sort((a, b) => b.hits - a.hits)

  if (matches.length) return matches[0].rule.id

  const keywords = topKeywords(item)
  if (!keywords.length) return slugify(item.title)
  return keywords.slice(0, 3).sort().join('-')
}

function titleFromKeywords(keywords) {
  return keywords
    .slice(0, 3)
    .map((word) => {
      if (word === 'ai') return 'AI'
      if (word === 'mcp') return 'MCP'
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' + ')
}

function titleForKey(key, keywords) {
  return topicRules.find((rule) => rule.id === key)?.title ?? titleFromKeywords(keywords)
}

function categoryForKey(key, keywords, text) {
  return topicRules.find((rule) => rule.id === key)?.category ?? categoryFor(keywords, text)
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return response.json()
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
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

async function collectHackerNews() {
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
    .map((story) => ({
      source: 'Hacker News',
      title: normalizeText(story.title),
      summary: '',
      url: story.url ?? `https://news.ycombinator.com/item?id=${story.id}`,
      publishedAt: new Date((story.time ?? Date.now() / 1000) * 1000).toISOString(),
      metrics: {
        score: story.score ?? 0,
        comments: story.descendants ?? 0,
        rank: ids.indexOf(story.id) + 1,
      },
    }))
}

async function collectReddit() {
  const subreddits = [
    'Entrepreneur',
    'SaaS',
    'SideProject',
    'startups',
    'smallbusiness',
    'productivity',
    'ecommerce',
    'ArtificialInteligence',
  ]
  const feeds = await Promise.all(
    subreddits.map(async (subreddit) => {
      const xml = await fetchText(`https://www.reddit.com/r/${subreddit}/.rss`)
      return rssItems(xml).slice(0, 20).map((item) => ({
        ...item,
        source: 'Reddit',
        summary: `${item.summary} subreddit:${subreddit}`,
        metrics: { subreddit },
      }))
    }),
  )
  return feeds.flat()
}

async function collectApple() {
  const feeds = [
    ['Top Free', 'https://rss.applemarketingtools.com/api/v2/us/apps/top-free/100/apps.json'],
    ['Top Paid', 'https://rss.applemarketingtools.com/api/v2/us/apps/top-paid/100/apps.json'],
  ]
  const results = await Promise.all(
    feeds.map(async ([label, url]) => {
      const json = await fetchJson(url)
      return (json.feed?.results ?? []).map((app, index) => ({
        source: 'Apple',
        title: normalizeText(app.name),
        summary: normalizeText(`${app.artistName} ${app.genres?.map((genre) => genre.name).join(' ')} chart:${label}`),
        url: app.url,
        publishedAt: app.releaseDate ?? new Date().toISOString(),
        metrics: { rank: index + 1, chart: label },
      }))
    }),
  )
  return results.flat()
}

async function collectArxiv() {
  const feeds = ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV']
  const results = await Promise.all(
    feeds.map(async (category) => {
      const xml = await fetchText(`https://arxiv.org/rss/${category}`)
      return rssItems(xml).slice(0, 25).map((item) => ({
        ...item,
        source: 'arXiv',
        summary: `${item.summary} arxiv:${category}`,
        metrics: { category },
      }))
    }),
  )
  return results.flat()
}

async function collectNpm() {
  const searches = ['ai', 'agent', 'llm', 'mcp', 'vector', 'automation', 'browser']
  const results = await Promise.all(
    searches.map(async (term) => {
      const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(term)}&size=25`
      const json = await fetchJson(url)
      return (json.objects ?? []).map((entry) => ({
        source: 'npm',
        title: normalizeText(entry.package?.name),
        summary: normalizeText(entry.package?.description),
        url: entry.package?.links?.npm ?? `https://www.npmjs.com/package/${entry.package?.name}`,
        publishedAt: entry.package?.date ?? new Date().toISOString(),
        metrics: {
          search: term,
          score: Math.round((entry.score?.final ?? 0) * 100),
        },
      }))
    }),
  )
  return results.flat()
}

async function collectPypi() {
  const xml = await fetchText('https://pypi.org/rss/updates.xml')
  return rssItems(xml)
    .slice(0, 100)
    .map((item) => ({
      ...item,
      source: 'PyPI',
      summary: normalizeText(item.summary),
      metrics: {},
    }))
}

async function collectGithubTrending() {
  const html = await fetchText('https://github.com/trending?since=daily')
  const repoBlocks = html.split('<article class="Box-row"').slice(1)
  return repoBlocks.slice(0, 25).map((block) => {
    const repoMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[\s\S]*?<\/a>/)
    const descMatch = block.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/)
    const starsMatch = block.match(/stars today\s*<\/span>|([0-9,]+)\s+stars today/)
    const repoPath = repoMatch?.[1]?.replace(/\s+/g, '') ?? ''
    const cleanRepo = repoPath.replace(/^\//, '').replace(/\s/g, '')
    return {
      source: 'GitHub',
      title: cleanRepo,
      summary: normalizeText(descMatch?.[1] ?? ''),
      url: `https://github.com/${cleanRepo}`,
      publishedAt: new Date().toISOString(),
      metrics: { starsToday: starsMatch?.[1] ? Number(starsMatch[1].replace(/,/g, '')) : 0 },
    }
  })
}

async function runSource(source, fn) {
  try {
    const items = await fn()
    return {
      run: {
        source,
        ok: true,
        itemCount: items.length,
        fetchedAt: new Date().toISOString(),
      },
      items,
    }
  } catch (error) {
    return {
      run: {
        source,
        ok: false,
        itemCount: 0,
        fetchedAt: new Date().toISOString(),
        error: error.message,
      },
      items: [],
    }
  }
}

async function readHistory() {
  try {
    const raw = await readFile(HISTORY_PATH, 'utf8')
    return JSON.parse(raw)
  } catch {
    return { snapshots: [] }
  }
}

function scoreTermHits(text, terms) {
  const normalized = text.toLowerCase()
  return terms.reduce((count, term) => count + (normalized.includes(term) ? 1 : 0), 0)
}

function buildClusters(items, history) {
  const clusters = new Map()

  items.forEach((item) => {
    if (!item.title || !item.url) return
    const key = clusterKey(item)
    if (!clusters.has(key)) {
      clusters.set(key, {
        id: slugify(key),
        keywords: key.split('-').filter(Boolean),
        items: [],
        sources: new Set(),
      })
    }
    const cluster = clusters.get(key)
    cluster.items.push(item)
    cluster.sources.add(item.source)
  })

  const previousCounts = new Map()
  history.snapshots?.forEach((snapshot) => {
    snapshot.clusters?.forEach((cluster) => {
      previousCounts.set(cluster.id, Math.max(previousCounts.get(cluster.id) ?? 0, cluster.count))
    })
  })

  return Array.from(clusters.values())
    .filter((cluster) => cluster.items.length >= 3 || cluster.sources.size >= 2)
    .map((cluster) => {
      const titleText = cluster.items.map((item) => `${item.title} ${item.summary}`).join(' ')
      const count = cluster.items.length
      const prior = previousCounts.get(cluster.id) ?? 0
      const velocity = clamp(Math.round((count - prior + 3) * 14), 20, 100)
      const pain = clamp(scoreTermHits(titleText, painTerms) * 18 + cluster.items.filter((i) => i.source === 'Reddit').length * 4, 5, 100)
      const money = clamp(scoreTermHits(titleText, moneyTerms) * 16 + cluster.items.filter((i) => i.source === 'Apple').length * 6, 5, 100)
      const novelty = clamp(scoreTermHits(titleText, noveltyTerms) * 18 + cluster.sources.size * 8, 10, 100)
      const sourceDiversity = clamp(cluster.sources.size * 20, 10, 100)
      const saturation = clamp(count > 18 ? 18 : count * 2, 0, 35)
      const score = clamp(
        Math.round(
          velocity * 0.25 +
            pain * 0.2 +
            money * 0.2 +
            sourceDiversity * 0.15 +
            novelty * 0.1 +
            Math.min(count * 5, 100) * 0.1 -
            saturation * 0.2,
        ),
        1,
        99,
      )
      const sources = Array.from(cluster.sources).sort()
      const evidence = cluster.items
        .sort((a, b) => sourceWeight(b) - sourceWeight(a))
        .slice(0, 12)
        .map((item) => ({
          source: item.source,
          title: item.title,
          url: item.url,
          publishedAt: item.publishedAt,
        }))

      return {
        id: cluster.id,
        title: titleForKey(cluster.id, cluster.keywords),
        category: categoryForKey(cluster.id, cluster.keywords, titleText),
        score,
        sources,
        whyNow: whyNow(cluster, prior),
        notes: notesFor(cluster, { velocity, pain, money, novelty, sourceDiversity }),
        metrics: { velocity, pain, money, novelty, sourceDiversity, saturation },
        sparkline: sparklineFor(count, prior, score),
        evidence,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
}

function sourceWeight(item) {
  const metrics = item.metrics ?? {}
  return (metrics.score ?? 0) + (metrics.comments ?? 0) * 2 + (metrics.starsToday ?? 0) + (100 - (metrics.rank ?? 100))
}

function categoryFor(keywords, text) {
  const haystack = `${keywords.join(' ')} ${text}`.toLowerCase()
  if (haystack.includes('app') || haystack.includes('ios') || haystack.includes('mobile')) return 'Consumer apps'
  if (haystack.includes('agent') || haystack.includes('llm') || haystack.includes('ai')) return 'AI workflows'
  if (haystack.includes('shop') || haystack.includes('sales') || haystack.includes('customer')) return 'Commerce'
  if (haystack.includes('developer') || haystack.includes('github') || haystack.includes('npm')) return 'Developer tools'
  if (haystack.includes('productivity') || haystack.includes('automation')) return 'Productivity'
  return 'Market signal'
}

function whyNow(cluster, prior) {
  const sources = Array.from(cluster.sources).join(', ')
  const delta = prior ? `${cluster.items.length} current mentions versus prior peak ${prior}` : `${cluster.items.length} fresh mentions`
  return `${delta} across ${sources}. Public evidence shows repeated attention before any private data or paid API is needed.`
}

function notesFor(cluster, metrics) {
  const notes = [
    `${cluster.items.length} public artifacts clustered by shared language.`,
    `${cluster.sources.size} independent source types reduce single-platform noise.`,
  ]
  if (metrics.pain > 45) notes.push('Pain-language density suggests a problem worth validating.')
  if (metrics.money > 45) notes.push('Monetization terms or ranked app evidence suggest buyer intent.')
  if (metrics.novelty > 45) notes.push('Novelty terms point to fresh tooling or behavior change.')
  return notes
}

function sparklineFor(count, prior, score) {
  const base = Math.max(prior, 1)
  return [
    base,
    Math.round(base * 1.1),
    Math.round((base + count) * 0.45),
    Math.round((base + count) * 0.58),
    Math.round((base + count) * 0.72),
    count,
    Math.round(count + score / 10),
  ]
}

function snapshotFrom(opportunities) {
  return {
    at: new Date().toISOString(),
    clusters: opportunities.map((item) => ({
      id: item.id,
      count: item.evidence.length,
      score: item.score,
    })),
  }
}

async function main() {
  const collectors = [
    ['Hacker News', collectHackerNews],
    ['Reddit', collectReddit],
    ['Apple', collectApple],
    ['arXiv', collectArxiv],
    ['npm', collectNpm],
    ['PyPI', collectPypi],
    ['GitHub', collectGithubTrending],
  ]

  const results = await Promise.all(collectors.map(([source, fn]) => runSource(source, fn)))
  const items = results.flatMap((result) => result.items)
  const history = await readHistory()
  const opportunities = buildClusters(items, history)
  const sourceRuns = results.map((result) => result.run)
  const nextHistory = {
    snapshots: [snapshotFrom(opportunities), ...(history.snapshots ?? [])].slice(0, 60),
  }
  const payload = {
    generatedAt: new Date().toISOString(),
    summary: {
      opportunityCount: opportunities.length,
      evidenceCount: opportunities.reduce((total, item) => total + item.evidence.length, 0),
      sourceCount: sourceRuns.filter((run) => run.ok).length,
      staleSources: sourceRuns.filter((run) => !run.ok).length,
    },
    sourceRuns,
    opportunities,
  }

  await writeFile(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`)
  await writeFile(HISTORY_PATH, `${JSON.stringify(nextHistory, null, 2)}\n`)

  console.log(`Collected ${items.length} items into ${opportunities.length} opportunities.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
