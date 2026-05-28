import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildOpportunityBriefs,
  classifyEvidence,
  nextHistoryFrom,
} from './signal-core.js'

const now = '2026-05-28T00:00:00.000Z'

function item(overrides) {
  return {
    id: overrides.id ?? overrides.url,
    source: overrides.source ?? 'Reddit',
    sourceType: overrides.sourceType ?? 'discussion',
    evidenceType: overrides.evidenceType,
    title: overrides.title,
    summary: overrides.summary ?? '',
    url: overrides.url,
    publishedAt: overrides.publishedAt ?? now,
    tags: overrides.tags ?? [],
    metrics: overrides.metrics ?? {},
  }
}

test('classifies direct pain and paid workaround evidence', () => {
  const directPain = classifyEvidence(
    item({
      title: 'SOC2 evidence collection is painful for small teams',
      summary: 'We are stuck in spreadsheets and screenshots. Existing tools are too expensive.',
      url: 'https://example.com/pain',
    }),
  )

  assert.equal(directPain.evidenceType, 'pain')
  assert.equal(directPain.hasPain, true)
  assert.equal(directPain.hasSpend, true)
  assert.ok(directPain.painTerms.includes('painful'))
  assert.ok(directPain.spendTerms.includes('expensive'))
})

test('builds concrete briefs from niche pain plus spend evidence and downranks generic trend chatter', () => {
  const evidence = [
    item({
      source: 'Reddit',
      title: 'SOC2 evidence collection for tiny AI startups is a mess',
      summary:
        'We need a lightweight way to collect screenshots, policies, and vendor evidence before enterprise sales. Vanta is expensive for us.',
      url: 'https://reddit.example/soc2-ai-startups',
      tags: ['soc2', 'compliance', 'ai-startups'],
      metrics: { comments: 32 },
    }),
    item({
      source: 'Reddit Echo',
      sourceType: 'echo',
      title: 'How do I automate SOC2 vendor evidence collection?',
      summary: 'Small team, no GRC owner, current workaround is Google Drive folders.',
      url: 'https://reddit.example/search/soc2-evidence',
      tags: ['soc2', 'automation', 'compliance'],
      metrics: { comments: 18, echo: true },
    }),
    item({
      source: 'GitHub Issues',
      sourceType: 'developer-pain',
      title: 'Need audit trail export for SOC2 evidence',
      summary: 'Customers ask for SOC2 proof and we manually export logs every week.',
      url: 'https://github.example/issues/1',
      tags: ['soc2', 'audit-log', 'export'],
      metrics: { comments: 9 },
    }),
    item({
      source: 'GDELT',
      sourceType: 'news',
      evidenceType: 'macro',
      title: 'AI compliance coverage increases',
      summary: 'Rising coverage around AI governance, compliance, and enterprise risk.',
      url: 'https://gdelt.example/ai-compliance',
      tags: ['ai', 'compliance'],
      metrics: { tone: -1.4 },
    }),
    item({
      source: 'Hacker News',
      title: 'AI agents are the future',
      summary: 'Broad discussion about AI agents and demos.',
      url: 'https://news.example/ai-agents',
      tags: ['ai', 'agents'],
      metrics: { score: 400, comments: 200 },
    }),
    item({
      source: 'npm',
      sourceType: 'package',
      title: 'ai',
      summary: 'AI SDK package update.',
      url: 'https://npm.example/ai',
      tags: ['ai'],
      metrics: { score: 100 },
    }),
    item({
      source: 'Apple',
      sourceType: 'app-store',
      title: 'Top AI Chat App',
      summary: 'Top free app in productivity.',
      url: 'https://apps.example/ai-chat',
      tags: ['ai'],
      metrics: { rank: 1 },
    }),
  ]

  const briefs = buildOpportunityBriefs(evidence, { snapshots: [] }, { now })

  assert.ok(briefs.length >= 1)
  assert.equal(briefs[0].customer, 'Tiny AI startups selling to enterprise buyers')
  assert.match(briefs[0].pain, /SOC2 evidence/i)
  assert.match(briefs[0].wedge, /evidence/i)
  assert.ok(briefs[0].score > 70)
  assert.ok(briefs[0].scoreBreakdown.pain >= 20)
  assert.ok(briefs[0].scoreBreakdown.spend >= 15)
  assert.ok(briefs[0].evidence.every((entry) => entry.url))

  const genericAi = briefs.find((brief) => /AI agents/i.test(brief.title))
  assert.equal(genericAi, undefined)
})

test('stores true cluster counts in history instead of capped evidence counts', () => {
  const opportunities = [
    {
      id: 'soc2-evidence-automation',
      title: 'SOC2 Evidence Automation',
      mentionCount: 17,
      score: 82,
      confidence: 'high',
    },
  ]

  const history = nextHistoryFrom(opportunities, { snapshots: [] }, now)

  assert.equal(history.snapshots[0].clusters[0].id, 'soc2-evidence-automation')
  assert.equal(history.snapshots[0].clusters[0].count, 17)
  assert.equal(history.snapshots[0].clusters[0].score, 82)
})

test('fallback pain clusters can include macro context without crashing', () => {
  const briefs = buildOpportunityBriefs(
    [
      item({
        source: 'Reddit',
        title: 'Teams are stuck manually reconciling webhook retries',
        summary: 'The workaround is a spreadsheet and manual checks after every failed webhook.',
        url: 'https://reddit.example/webhook-retries',
        tags: ['webhooks', 'retries'],
      }),
      item({
        source: 'Reddit Echo',
        sourceType: 'echo',
        title: 'Webhook retries fail after timeout',
        summary: 'The retry state is difficult to inspect and the workaround is manual.',
        url: 'https://reddit.example/search/webhook-retries',
        tags: ['webhooks', 'retries'],
        metrics: { comments: 11, echo: true },
      }),
      item({
        source: 'GitHub Issues',
        sourceType: 'developer-pain',
        title: 'Webhook retries are expensive to debug after customer incidents',
        summary: 'Missing retry state makes customer support slow and manual.',
        url: 'https://github.example/webhook-retries',
        tags: ['webhooks', 'retries'],
        metrics: { comments: 7 },
      }),
      item({
        source: 'OWID',
        sourceType: 'macro',
        evidenceType: 'macro',
        title: 'Internet adoption: United States',
        summary: 'Share of the population using the Internet was 92 in 2024.',
        url: 'https://ourworldindata.org/grapher/share-of-individuals-using-the-internet',
        tags: ['internet adoption'],
      }),
    ],
    { snapshots: [] },
    { now },
  )

  assert.ok(briefs.length >= 1)
  assert.equal(briefs[0].macroContext.length, 1)
})
