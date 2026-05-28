export const SCHEMA_VERSION = 2

const stopwords = new Set([
  'about',
  'after',
  'again',
  'against',
  'also',
  'and',
  'are',
  'because',
  'been',
  'being',
  'best',
  'between',
  'build',
  'can',
  'could',
  'daily',
  'does',
  'dont',
  'for',
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

const painTerms = [
  'annoying',
  'brittle',
  'broken',
  'bug',
  'confusing',
  'difficult',
  'expensive',
  'flaky',
  'friction',
  'frustrating',
  'hard',
  'manual',
  'mess',
  'missing',
  'pain',
  'painful',
  'problem',
  'slow',
  'spreadsheet',
  'stuck',
  'terrible',
  'workaround',
]

const spendTerms = [
  'budget',
  'buy',
  'compliance',
  'contract',
  'customer',
  'deal',
  'enterprise',
  'expensive',
  'invoice',
  'paid',
  'pay',
  'pricing',
  'procurement',
  'renewal',
  'revenue',
  'sales',
  'soc2',
  'subscription',
  'vendor',
]

const broadTerms = new Set([
  'ai',
  'agent',
  'agents',
  'app',
  'apps',
  'automation',
  'browser',
  'developer',
  'github',
  'model',
  'open',
  'productivity',
  'startup',
  'tool',
  'tools',
])

const opportunityProfiles = [
  {
    id: 'soc2-evidence-automation',
    title: 'SOC2 Evidence Automation for Small AI Vendors',
    customer: 'Tiny AI startups selling to enterprise buyers',
    terms: ['soc2', 'security review', 'vendor evidence', 'audit trail', 'compliance', 'enterprise sales'],
    pain: 'Small AI vendors need SOC2 evidence without a dedicated GRC owner.',
    currentWorkaround: 'Screenshots, Google Drive folders, spreadsheets, and repeated manual exports.',
    wedge: 'A lightweight evidence inbox that captures policies, screenshots, logs, and vendor docs into auditor-ready packets.',
    businessModel: 'Usage-tiered SaaS sold to startups entering enterprise procurement.',
    validationStep:
      'Interview 10 seed-to-Series-B AI founders who recently lost or delayed an enterprise deal during security review.',
    risks: ['Crowded GRC market', 'Trust requirements are high', 'SOC2 scope varies by customer'],
  },
  {
    id: 'auth-sso-integration-debugging',
    title: 'Auth and SSO Integration Debugging',
    customer: 'Small B2B SaaS teams adding enterprise SSO',
    terms: ['oauth', 'sso', 'saml', 'auth0', 'openid', 'login', 'authentication', 'jwt'],
    pain: 'Teams lose engineering time debugging authentication edge cases for enterprise customers.',
    currentWorkaround: 'Support tickets, scattered provider docs, and custom debug scripts.',
    wedge: 'A hosted SSO test harness that reproduces customer identity-provider setups and explains failed login flows.',
    businessModel: 'Developer-tool SaaS priced by environment or enterprise customer count.',
    validationStep:
      'Find 20 recent unresolved OAuth, SAML, and Auth0 questions and ask maintainers which failures blocked deals.',
    risks: ['Identity providers differ widely', 'Security posture must be credible', 'Some pain may stay in consulting'],
  },
  {
    id: 'llm-evaluation-regression',
    title: 'LLM Evaluation Regression Workflows',
    customer: 'Product engineering teams shipping LLM features',
    terms: ['eval', 'evals', 'benchmark', 'hallucination', 'prompt regression', 'llm testing', 'rag quality'],
    pain: 'Teams need repeatable ways to catch quality regressions before LLM features reach customers.',
    currentWorkaround: 'Ad hoc spreadsheets, hand-curated prompts, and manual review sessions.',
    wedge: 'A small-team eval runner that turns production failures into regression suites with plain-language reports.',
    businessModel: 'Seat-based SaaS with paid CI usage for teams shipping LLM workflows.',
    validationStep: 'Collect 15 examples of teams reverting prompts or models because tests missed a regression.',
    risks: ['Fast-moving platform APIs', 'Hard to standardize quality metrics', 'Some teams build internal tooling'],
  },
  {
    id: 'usage-billing-operations',
    title: 'Usage-Based Billing Operations',
    customer: 'API and AI infrastructure startups moving to usage pricing',
    terms: ['billing', 'invoice', 'usage based', 'metering', 'stripe', 'pricing', 'subscription', 'credits'],
    pain: 'Usage-priced startups struggle to reconcile events, invoices, credits, and customer disputes.',
    currentWorkaround: 'Warehouse queries, Stripe exports, support escalations, and one-off scripts.',
    wedge: 'A billing-ops cockpit that reconciles usage events to invoices and flags disputes before renewal calls.',
    businessModel: 'SaaS priced by monthly tracked revenue or invoice volume.',
    validationStep: 'Talk to 10 API startups that introduced credits or usage tiers in the last year.',
    risks: ['Billing data is sensitive', 'Integration surface is wide', 'Stripe may absorb parts of the workflow'],
  },
  {
    id: 'data-pipeline-reliability',
    title: 'Data Pipeline Reliability for Lean Teams',
    customer: 'Small data teams supporting revenue and operations dashboards',
    terms: ['pipeline', 'schema drift', 'etl', 'warehouse', 'dbt', 'airflow', 'snowflake'],
    pain: 'Lean teams need to detect schema drift and stale metrics before business users lose trust.',
    currentWorkaround: 'Slack alerts, dbt tests, manual dashboard checks, and tribal knowledge.',
    wedge: 'A narrow monitor that watches high-value tables and explains broken downstream business metrics.',
    businessModel: 'Team SaaS priced by monitored data assets.',
    validationStep: 'Find teams with one to three data engineers and ask which dashboard failures caused executive escalations.',
    risks: ['Many adjacent observability tools exist', 'Data stacks vary', 'Requires clean onboarding to win'],
  },
  {
    id: 'ai-agent-ops',
    title: 'AI Agent Operations and Recovery',
    customer: 'Teams using browser or workflow agents in production',
    terms: ['agent workflow', 'browser automation', 'mcp', 'workflow automation', 'tool calling', 'agent failed'],
    pain: 'Agent workflows fail in ambiguous states and teams need recovery, audit, and handoff controls.',
    currentWorkaround: 'Manual babysitting, logs, screenshots, and rerunning failed tasks from scratch.',
    wedge: 'An operations layer for agent runs: checkpoints, human handoff, replay, and failure taxonomies.',
    businessModel: 'Usage-based SaaS priced by agent run volume.',
    validationStep: 'Interview teams running agents against real browsers, support queues, or internal workflows.',
    risks: ['Platform vendors may add run management', 'Reliability problems may be too application-specific'],
  },
  {
    id: 'privacy-security-review',
    title: 'Lightweight Privacy and Security Review',
    customer: 'Small SaaS teams facing larger-customer security questionnaires',
    terms: ['privacy', 'security review', 'questionnaire', 'vendor risk', 'dpia', 'policy', 'data retention'],
    pain: 'Small teams repeatedly answer security and privacy questionnaires without reusable evidence.',
    currentWorkaround: 'Copy-paste answers, shared docs, and founder-led procurement calls.',
    wedge: 'A reusable questionnaire answer bank connected to live policies and evidence.',
    businessModel: 'SaaS priced by workspace and questionnaire volume.',
    validationStep: 'Review recent founder complaints about security questionnaires and ask where deals slowed down.',
    risks: ['Overlap with GRC tools', 'Answers must stay accurate', 'Legal review may be required'],
  },
]

export function normalizeText(value) {
  if (!value) return ''
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export function tokenize(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^-|-$/g, ''))
    .filter((token) => token.length > 2 && /^[a-z][a-z0-9+#.-]*$/.test(token) && !stopwords.has(token))
}

function termHits(text, terms) {
  const normalized = text.toLowerCase()
  return terms.filter((term) => normalized.includes(term))
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function publishedMs(item) {
  const time = Date.parse(item.publishedAt)
  return Number.isNaN(time) ? 0 : time
}

export function classifyEvidence(item) {
  const title = normalizeText(item.title)
  const summary = normalizeText(item.summary)
  const text = `${title} ${summary} ${(item.tags ?? []).join(' ')}`.toLowerCase()
  const painMatches = termHits(text, painTerms)
  const spendMatches = termHits(text, spendTerms)
  const sourceType = item.sourceType ?? inferSourceType(item.source)
  const qaPain = sourceType === 'qa' && item.metrics?.isAnswered === false
  const developerPain =
    sourceType === 'developer-pain' &&
    /\b(bug|broken|error|fail|failed|flaky|issue|missing|problem|regression|slow|stuck)\b/i.test(text)
  const hasPain = painMatches.length > 0 || qaPain || developerPain
  const hasSpend = spendMatches.length > 0
  const evidenceType = item.evidenceType ?? inferEvidenceType({ sourceType, hasPain, hasSpend, item })

  return {
    ...item,
    title,
    summary,
    sourceType,
    evidenceType,
    hasPain,
    hasSpend,
    painTerms: painMatches,
    spendTerms: spendMatches,
  }
}

function inferSourceType(source) {
  if (source === 'GitHub Issues') return 'developer-pain'
  if (source === 'Manual X Seed' || source === 'Manual Signal') return 'curated-link'
  if (source.includes('Echo')) return 'echo'
  if (source === 'npm' || source === 'PyPI') return 'package'
  if (source === 'OWID' || source === 'World Bank' || source === 'BLS' || source === 'FRED') return 'macro'
  if (source === 'GDELT') return 'news'
  if (source === 'Apple') return 'app-store'
  return 'discussion'
}

function inferEvidenceType({ sourceType, hasPain, hasSpend, item }) {
  if (sourceType === 'macro' || sourceType === 'news') return 'macro'
  if (hasPain) return 'pain'
  if (hasSpend) return 'spend'
  if (sourceType === 'package' || sourceType === 'app-store') return 'adoption'
  if ((item.metrics?.comments ?? 0) > 20 || (item.metrics?.score ?? 0) > 100) return 'attention'
  return 'context'
}

function profileFor(item) {
  const text = `${item.title} ${item.summary} ${(item.tags ?? []).join(' ')}`.toLowerCase()
  const titleTags = `${item.title} ${(item.tags ?? []).join(' ')}`.toLowerCase()
  const scored = opportunityProfiles
    .map((profile) => ({
      profile,
      hits: profile.terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0),
      titleHits: profile.terms.reduce((total, term) => total + (titleTags.includes(term) ? 1 : 0), 0),
    }))
    .filter((entry) => entry.titleHits > 0 || entry.hits >= 2)
    .sort((a, b) => b.titleHits - a.titleHits || b.hits - a.hits)

  if (item.sourceType === 'developer-pain' && scored[0]?.titleHits === 0) return null
  return scored[0]?.profile ?? null
}

function fallbackCluster(item) {
  const tagTokens = (item.tags ?? [])
    .map((tag) => slugify(tag))
    .filter((tag) => tag && !broadTerms.has(tag))
  const tokens = (tagTokens.length >= 2 ? tagTokens : tokenize(`${item.title} ${item.summary}`))
    .filter((token) => !broadTerms.has(token))
    .slice(0, 4)
  if (tokens.length < 2) return null
  const key = tokens.sort().slice(0, 3).join('-')
  return {
    id: key,
    isFallback: true,
    title: tokens
      .slice(0, 3)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(' + '),
    customer: 'Tech teams with a repeated operational pain',
    pain: `Repeated evidence mentions ${tokens.slice(0, 3).join(', ')} as an unresolved workflow problem.`,
    currentWorkaround: 'Manual process or fragmented tooling visible in public evidence.',
    wedge: 'A narrow workflow product focused on the repeated failure mode in the evidence.',
    businessModel: 'SaaS or specialized service validated through customer interviews.',
    validationStep: 'Contact evidence authors and ask what they tried, what failed, and what budget exists.',
    risks: ['Evidence may be too sparse', 'Customer segment needs sharpening'],
  }
}

function clusterIdentity(item) {
  const profile = profileFor(item)
  if (profile) return profile
  if (!item.hasPain && item.evidenceType !== 'spend') return null
  return fallbackCluster(item)
}

function scoreCluster(cluster, priorCount, macroContext = []) {
  const sourceCount = new Set(cluster.items.map((item) => item.source)).size
  const painCount = cluster.items.filter((item) => item.hasPain || item.evidenceType === 'pain').length
  const spendCount = cluster.items.filter((item) => item.hasSpend || item.evidenceType === 'spend').length
  const adoptionCount = cluster.items.filter((item) => item.evidenceType === 'adoption').length
  const macroCount = macroContext.length + cluster.items.filter((item) => item.evidenceType === 'macro').length
  const directPainSources = new Set(
    cluster.items.filter((item) => item.hasPain || item.evidenceType === 'pain').map((item) => item.source),
  ).size
  const count = cluster.items.length
  const acceleration = priorCount ? clamp(count - priorCount, -10, 12) : clamp(count, 0, 12)
  const pain = clamp(painCount * 6 + directPainSources * 4, 0, 30)
  const spend = clamp(spendCount * 5 + cluster.items.filter((item) => item.sourceType === 'app-store').length, 0, 20)
  const recurrence = clamp(Math.round(Math.log2(count + 1) * 4) + Math.max(acceleration, 0), 0, 15)
  const sourceQuality = clamp(sourceCount * 2 + directPainSources * 2, 0, 10)
  const nicheSpecificity = cluster.profile ? 8 : 4
  const macro = clamp(macroCount * 2 + adoptionCount, 0, 7)
  let score = pain + spend + recurrence + sourceQuality + nicheSpecificity + macro

  if (painCount === 0) score = Math.min(score, 45)
  if (spendCount === 0 && adoptionCount === 0 && macroCount === 0 && sourceCount < 2) score = Math.min(score, 55)
  if (!cluster.profile && sourceCount < 2) score = Math.min(score, 50)

  return {
    score: clamp(Math.round(score), 1, 99),
    scoreBreakdown: { pain, spend, recurrence, sourceQuality, nicheSpecificity, macro },
  }
}

function confidenceFor(score, evidenceCount, sourceCount) {
  if (score >= 78 && evidenceCount >= 4 && sourceCount >= 3) return 'high'
  if (score >= 60 && evidenceCount >= 3 && sourceCount >= 2) return 'medium'
  return 'low'
}

function whyNow(cluster, priorCount) {
  const sourceCount = new Set(cluster.items.map((item) => item.source)).size
  const painCount = cluster.items.filter((item) => item.hasPain || item.evidenceType === 'pain').length
  const spendCount = cluster.items.filter((item) => item.hasSpend || item.evidenceType === 'spend').length
  const delta = priorCount ? `${cluster.items.length} current evidence items versus prior peak ${priorCount}` : `${cluster.items.length} current evidence items`
  return `${delta} across ${sourceCount} source types, including ${painCount} pain signals and ${spendCount} spend signals.`
}

function evidenceWeight(item) {
  const typeWeight = {
    pain: 80,
    spend: 70,
    adoption: 45,
    macro: 35,
    attention: 25,
    context: 10,
  }[item.evidenceType] ?? 10
  const metrics = item.metrics ?? {}
  const sourceWeight = {
    'GitHub Issues': 18,
    'Manual X Seed': 18,
    'Manual Signal': 14,
    'Reddit Echo': 16,
    Reddit: 15,
    'Hacker News Echo': 12,
    'Hacker News': 10,
    npm: 8,
    PyPI: 7,
    GDELT: 6,
    OWID: 5,
    'World Bank': 5,
    BLS: 5,
    FRED: 5,
  }[item.source] ?? 4
  return (
    typeWeight +
    sourceWeight +
    Math.min((metrics.comments ?? 0) * 1.5, 20) +
    Math.min((metrics.viewCount ?? 0) / 100, 12) +
    Math.min((metrics.score ?? 0) / 10, 12)
  )
}

function compactEvidence(items, type) {
  return items
    .filter((item) => !type || item.evidenceType === type)
    .sort((a, b) => evidenceWeight(b) - evidenceWeight(a) || publishedMs(b) - publishedMs(a))
    .slice(0, type ? 4 : 10)
    .map((item) => ({
      source: item.source,
      sourceType: item.sourceType,
      evidenceType: item.evidenceType,
      title: item.title,
      url: item.url,
      publishedAt: item.publishedAt,
      metrics: item.metrics ?? {},
      painTerms: item.painTerms ?? [],
      spendTerms: item.spendTerms ?? [],
    }))
}

function previousCounts(history) {
  const counts = new Map()
  history.snapshots?.forEach((snapshot) => {
    snapshot.clusters?.forEach((cluster) => {
      counts.set(cluster.id, Math.max(counts.get(cluster.id) ?? 0, cluster.count ?? 0))
    })
  })
  return counts
}

function macroContextFor(profile, macroItems) {
  if (!macroItems.length) return []
  const profileTerms = profile.terms ?? []
  const profileText = `${profile.title} ${profile.customer} ${profile.pain} ${profileTerms.join(' ')}`.toLowerCase()
  const exact = macroItems.filter((item) => {
    const haystack = `${item.title} ${item.summary} ${(item.tags ?? []).join(' ')}`.toLowerCase()
    return profileTerms.some((term) => haystack.includes(term)) || (item.tags ?? []).some((tag) => profileText.includes(String(tag).toLowerCase()))
  })

  if (exact.length) return compactEvidence(exact, 'macro')
  return compactEvidence(macroItems, 'macro').slice(0, 2)
}

export function buildOpportunityBriefs(items, history = { snapshots: [] }, options = {}) {
  const classified = items.map(classifyEvidence).filter((item) => item.title && item.url)
  const macroItems = classified.filter((item) => item.evidenceType === 'macro')
  const clusters = new Map()

  classified
    .filter((item) => item.evidenceType !== 'macro')
    .forEach((item) => {
    const profile = clusterIdentity(item)
    if (!profile) return
    if (!clusters.has(profile.id)) {
      clusters.set(profile.id, { profile, items: [] })
    }
    clusters.get(profile.id).items.push(item)
    })

  const prior = previousCounts(history)

  return Array.from(clusters.values())
    .map((cluster) => {
      const sourceCount = new Set(cluster.items.map((item) => item.source)).size
      const priorCount = prior.get(cluster.profile.id) ?? 0
      const macroContext = macroContextFor(cluster.profile, macroItems)
      const scoring = scoreCluster(cluster, priorCount, macroContext)
      const evidence = compactEvidence(cluster.items)
      const spendSignals = compactEvidence(
        cluster.items.filter((item) => item.hasSpend || item.evidenceType === 'spend' || item.evidenceType === 'adoption'),
      )
      const confidence = confidenceFor(scoring.score, cluster.items.length, sourceCount)
      const isFallback = Boolean(cluster.profile.isFallback)

      return {
        id: cluster.profile.id,
        title: cluster.profile.title,
        customer: cluster.profile.customer,
        pain: cluster.profile.pain,
        currentWorkaround: cluster.profile.currentWorkaround,
        wedge: cluster.profile.wedge,
        businessModel: cluster.profile.businessModel,
        validationStep: cluster.profile.validationStep,
        score: scoring.score,
        confidence,
        isFallback,
        scoreBreakdown: scoring.scoreBreakdown,
        mentionCount: cluster.items.length,
        sourceCount,
        whyNow: whyNow(cluster, priorCount),
        evidence,
        spendSignals,
        macroContext,
        risks: cluster.profile.risks,
        sparkline: sparklineFor(cluster.items.length, priorCount, scoring.score, options.now),
      }
    })
    .filter((brief) => {
      const painEvidenceCount = brief.evidence.filter((item) => item.evidenceType === 'pain').length
      if (brief.isFallback) return brief.score >= 60 && brief.sourceCount >= 2 && painEvidenceCount >= 2
      return brief.score >= 50 && painEvidenceCount >= 2
    })
    .sort((a, b) => b.score - a.score || b.sourceCount - a.sourceCount || b.mentionCount - a.mentionCount)
    .slice(0, 20)
}

function sparklineFor(count, prior, score) {
  const base = Math.max(prior, 1)
  return [
    base,
    Math.round(base * 1.05),
    Math.round((base + count) * 0.4),
    Math.round((base + count) * 0.58),
    Math.round((base + count) * 0.75),
    count,
    Math.round(count + score / 12),
  ]
}

export function nextHistoryFrom(opportunities, history = { snapshots: [] }, now = new Date().toISOString()) {
  return {
    snapshots: [
      {
        at: now,
        clusters: opportunities.map((item) => ({
          id: item.id,
          count: item.mentionCount,
          score: item.score,
          confidence: item.confidence,
        })),
      },
      ...(history.snapshots ?? []),
    ].slice(0, 60),
  }
}

export function buildPayload({ opportunities, sourceRuns, generatedAt = new Date().toISOString() }) {
  const evidenceCount = opportunities.reduce((total, item) => total + item.evidence.length, 0)
  const sourceCount = sourceRuns.filter((run) => run.ok).length
  const skippedSources = sourceRuns.filter((run) => run.skipped).length
  const sourceAlerts = sourceRuns.filter((run) => !run.ok && !run.skipped).length

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    cadence: 'weekly',
    summary: {
      opportunityCount: opportunities.length,
      evidenceCount,
      sourceCount,
      sourceAlerts,
      skippedSources,
      highConfidenceCount: opportunities.filter((item) => item.confidence === 'high').length,
    },
    sourceRuns,
    opportunities,
  }
}
