import { readFile, writeFile } from 'node:fs/promises'
import {
  buildOpportunityBriefs,
  buildPayload,
  nextHistoryFrom,
} from './signal-core.js'
import { collectors, runSource } from './source-collectors.js'

const DATA_PATH = new URL('../public/data/signals.json', import.meta.url)
const HISTORY_PATH = new URL('../public/data/history.json', import.meta.url)

async function readHistory() {
  try {
    const raw = await readFile(HISTORY_PATH, 'utf8')
    return JSON.parse(raw)
  } catch {
    return { snapshots: [] }
  }
}

async function main() {
  const generatedAt = new Date().toISOString()
  const results = await Promise.all(collectors().map(([source, fn]) => runSource(source, fn)))
  const items = results.flatMap((result) => result.items)
  const history = await readHistory()
  const opportunities = buildOpportunityBriefs(items, history, { now: generatedAt })
  const sourceRuns = results.map((result) => result.run)
  const payload = buildPayload({ opportunities, sourceRuns, generatedAt })
  const nextHistory = nextHistoryFrom(opportunities, history, generatedAt)

  await writeFile(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`)
  await writeFile(HISTORY_PATH, `${JSON.stringify(nextHistory, null, 2)}\n`)

  const sourceStatus = sourceRuns
    .map((run) => `${run.source}:${run.ok ? run.itemCount : run.skipped ? 'skipped' : 'error'}`)
    .join(' ')
  console.log(`Collected ${items.length} evidence items into ${opportunities.length} opportunity briefs.`)
  console.log(sourceStatus)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
