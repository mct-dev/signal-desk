import assert from 'node:assert/strict'
import test from 'node:test'
import {
  echoFeedToEvidence,
  echoHackerNewsHitToEvidence,
  manualLinkToEvidence,
  redditSearchUrl,
} from './source-collectors.js'

test('manual X links become curated seed evidence without scraping X content', () => {
  const item = manualLinkToEvidence({
    url: 'https://x.com/founder/status/123',
    title: 'AI support agents fail silently',
    note: 'Founder says failed support-agent runs require manual review before customer replies.',
    tags: ['ai-agent-ops', 'support-ops'],
    evidenceType: 'pain',
    addedAt: '2026-05-28',
  })

  assert.equal(item.source, 'Manual X Seed')
  assert.equal(item.sourceType, 'curated-link')
  assert.equal(item.evidenceType, 'pain')
  assert.equal(item.summary, 'Founder says failed support-agent runs require manual review before customer replies.')
  assert.equal(item.url, 'https://x.com/founder/status/123')
  assert.deepEqual(item.tags, ['ai-agent-ops', 'support-ops'])
})

test('reddit search echo URLs use public RSS and subreddit scope', () => {
  const url = redditSearchUrl({
    subreddit: 'SaaS',
    query: '"AI agent" failed manual review',
    sort: 'new',
    time: 'month',
  })

  assert.equal(
    url,
    'https://www.reddit.com/r/SaaS/search.rss?q=%22AI+agent%22+failed+manual+review&restrict_sr=1&sort=new&t=month',
  )
})

test('echo feed items preserve configured source labels and topic tags', () => {
  const item = echoFeedToEvidence(
    {
      title: 'Founder complains about usage billing reconciliation',
      summary: 'Manual invoice checks are slow and error-prone.',
      url: 'https://example.com/billing',
      publishedAt: '2026-05-28T00:00:00.000Z',
    },
    {
      label: 'Founder RSS',
      tags: ['usage-billing', 'pricing'],
    },
  )

  assert.equal(item.source, 'Founder RSS')
  assert.equal(item.sourceType, 'echo')
  assert.equal(item.title, 'Founder complains about usage billing reconciliation')
  assert.deepEqual(item.tags, ['usage-billing', 'pricing'])
})

test('echo feed items can use a broad source with a specific search label', () => {
  const item = echoFeedToEvidence(
    {
      title: 'Founder complains about SSO setup',
      summary: 'Enterprise login setup is still manual.',
      url: 'https://example.com/sso',
      publishedAt: '2026-05-28T00:00:00.000Z',
    },
    {
      source: 'Reddit Echo',
      label: 'Reddit enterprise SSO pain',
      tags: ['auth-sso'],
      metrics: { query: '"SSO" enterprise customer auth' },
    },
  )

  assert.equal(item.source, 'Reddit Echo')
  assert.match(item.summary, /Reddit enterprise SSO pain/)
  assert.equal(item.metrics.query, '"SSO" enterprise customer auth')
})

test('hacker news search hits become echo evidence with comment metrics', () => {
  const item = echoHackerNewsHitToEvidence(
    {
      title: 'AI agent run failed silently',
      url: 'https://example.com/agent-failure',
      story_text: 'Manual recovery was needed.',
      created_at: '2026-05-28T00:00:00.000Z',
      points: 42,
      num_comments: 19,
      objectID: 'abc123',
    },
    { label: 'HN AI Agent Failures', tags: ['ai-agent-ops'] },
  )

  assert.equal(item.source, 'Hacker News Echo')
  assert.equal(item.sourceType, 'echo')
  assert.equal(item.metrics.comments, 19)
  assert.equal(item.url, 'https://example.com/agent-failure')
})
