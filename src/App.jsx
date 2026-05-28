import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Database,
  ExternalLink,
  Filter,
  Gauge,
  GitBranch,
  Globe2,
  Layers3,
  Lightbulb,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react'
import './App.css'

const fallbackData = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  cadence: 'weekly',
  summary: {
    opportunityCount: 0,
    evidenceCount: 0,
    sourceCount: 0,
    sourceAlerts: 0,
    skippedSources: 0,
    highConfidenceCount: 0,
  },
  sourceRuns: [],
  opportunities: [],
}

const sourceIcons = {
  'Hacker News': Activity,
  Reddit: Globe2,
  'Reddit Echo': Globe2,
  'Manual X Seed': Target,
  'Manual Signal': Target,
  'GitHub Issues': GitBranch,
  'GitHub Trending': GitBranch,
  'Hacker News Echo': Activity,
  npm: Database,
  PyPI: Database,
  GDELT: BarChart3,
  OWID: Globe2,
  'World Bank': Globe2,
  BLS: BriefcaseBusiness,
  FRED: BarChart3,
}

const evidenceLabels = {
  pain: 'Pain',
  spend: 'Spend',
  adoption: 'Adoption',
  macro: 'Macro',
  attention: 'Attention',
  context: 'Context',
}

function formatDate(value) {
  if (!value) return 'Unknown'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function scoreTone(score) {
  if (score >= 80) return 'hot'
  if (score >= 65) return 'warm'
  return 'watch'
}

function confidenceTone(confidence) {
  if (confidence === 'high') return 'hot'
  if (confidence === 'medium') return 'warm'
  return 'watch'
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="metric">
      <Icon size={16} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function EvidenceType({ type }) {
  return <span className={`evidence-type ${type}`}>{evidenceLabels[type] ?? type}</span>
}

function Sparkline({ values }) {
  const points = values?.length ? values : [2, 4, 5, 7, 9, 11, 13]
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const coordinates = points
    .map((value, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100
      const y = 34 - ((value - min) / range) * 28
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className="sparkline" viewBox="0 0 100 38" role="img" aria-label="Evidence trend">
      <polyline points={coordinates} fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  )
}

function OpportunityRow({ item, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`opportunity-row ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(item.id)}
    >
      <div className={`score-badge ${scoreTone(item.score)}`}>{item.score}</div>
      <div className="row-main">
        <div className="row-title">
          <h3>{item.title}</h3>
          <span className={`confidence-pill ${confidenceTone(item.confidence)}`}>{item.confidence}</span>
        </div>
        <p>{item.customer}</p>
        <strong className="row-pain">{item.pain}</strong>
        <div className="chip-row">
          <span className="source-chip">
            <Layers3 size={13} />
            {item.sourceCount} sources
          </span>
          <span className="source-chip">
            <Activity size={13} />
            {item.mentionCount} signals
          </span>
        </div>
      </div>
      <div className="row-side">
        <Sparkline values={item.sparkline} />
        <span>{item.evidence.length} links</span>
      </div>
    </button>
  )
}

function EvidenceList({ evidence }) {
  return (
    <div className="evidence-list">
      {evidence.slice(0, 10).map((item) => (
        <a key={`${item.source}-${item.url}`} href={item.url} target="_blank" rel="noreferrer">
          <div>
            <span>
              {item.source}
              <EvidenceType type={item.evidenceType} />
            </span>
            <strong>{item.title}</strong>
          </div>
          <ExternalLink size={15} />
        </a>
      ))}
    </div>
  )
}

function TextStack({ title, children, icon: Icon }) {
  return (
    <section className="brief-section">
      <h3>
        <Icon size={16} />
        {title}
      </h3>
      <p>{children}</p>
    </section>
  )
}

function SourceRun({ run }) {
  const status = run.ok ? 'ok' : run.skipped ? 'skipped' : 'error'
  const label = run.ok ? 'Live' : run.skipped ? 'Skipped' : 'Failed'
  const Icon = sourceIcons[run.source] ?? Globe2
  return (
    <div className={`source-run ${status}`}>
      <div>
        <strong>
          <Icon size={13} />
          {run.source}
        </strong>
        <span>{run.ok ? `${run.itemCount} items` : run.error}</span>
      </div>
      <span>{label}</span>
    </div>
  )
}

function ScoreBreakdown({ metrics }) {
  return (
    <div className="score-grid">
      <Metric label="Pain" value={metrics.pain} icon={AlertTriangle} />
      <Metric label="Spend" value={metrics.spend} icon={BadgeDollarSign} />
      <Metric label="Recurrence" value={metrics.recurrence} icon={RefreshCw} />
      <Metric label="Source quality" value={metrics.sourceQuality} icon={ShieldCheck} />
    </div>
  )
}

function App() {
  const [data, setData] = useState(fallbackData)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [confidenceFilter, setConfidenceFilter] = useState('All')
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    const dataUrl = new URL('data/signals.json', document.baseURI).href
    fetch(dataUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Data fetch failed: ${response.status}`)
        return response.json()
      })
      .then((payload) => {
        setData(payload)
        setSelectedId(payload.opportunities?.[0]?.id ?? '')
      })
      .catch(() => {
        setData(fallbackData)
      })
      .finally(() => setLoading(false))
  }, [])

  const allSources = useMemo(() => {
    const names = new Set()
    data.opportunities.forEach((item) => {
      item.evidence.forEach((entry) => names.add(entry.source))
    })
    return ['All', ...Array.from(names).sort()]
  }, [data.opportunities])

  const opportunities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return data.opportunities.filter((item) => {
      const matchesSource = sourceFilter === 'All' || item.evidence.some((entry) => entry.source === sourceFilter)
      const matchesConfidence = confidenceFilter === 'All' || item.confidence === confidenceFilter
      const haystack = `${item.title} ${item.customer} ${item.pain} ${item.wedge} ${item.businessModel}`.toLowerCase()
      return matchesSource && matchesConfidence && (!normalizedQuery || haystack.includes(normalizedQuery))
    })
  }, [data.opportunities, query, sourceFilter, confidenceFilter])

  const selected = useMemo(() => {
    return opportunities.find((item) => item.id === selectedId) ?? opportunities[0]
  }, [opportunities, selectedId])

  return (
    <div className="app-shell">
      <aside className="nav-rail" aria-label="Primary">
        <div className="brand-mark">SD</div>
        <nav>
          <a href="#signals" aria-label="Signals">
            <TrendingUp size={19} />
          </a>
          <a href="#sources" aria-label="Sources">
            <Database size={19} />
          </a>
          <a href="#refresh" aria-label="Refresh">
            <RefreshCw size={19} />
          </a>
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <h1>Signal Desk</h1>
            <p>Weekly opportunity briefs from public market, pain, spend, and macro signals.</p>
          </div>
          <div className="updated">
            <CalendarClock size={16} />
            <span>Updated {formatDate(data.generatedAt)}</span>
          </div>
        </header>

        <section className="summary-grid" aria-label="Summary">
          <Metric label="Opportunities" value={data.summary.opportunityCount} icon={Gauge} />
          <Metric label="High confidence" value={data.summary.highConfidenceCount} icon={CheckCircle2} />
          <Metric label="Evidence links" value={data.summary.evidenceCount} icon={Layers3} />
          <Metric label="Source alerts" value={data.summary.sourceAlerts} icon={AlertTriangle} />
        </section>

        <section className="desk-layout">
          <div className="signal-list" id="signals">
            <div className="toolbar">
              <div className="search-box">
                <Search size={17} />
                <input
                  aria-label="Search opportunity briefs"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search opportunity"
                />
              </div>
              <label className="source-select">
                <Filter size={16} />
                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                  aria-label="Filter by source"
                >
                  {allSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>
              <label className="source-select">
                <ShieldCheck size={16} />
                <select
                  value={confidenceFilter}
                  onChange={(event) => setConfidenceFilter(event.target.value)}
                  aria-label="Filter by confidence"
                >
                  {['All', 'high', 'medium', 'low'].map((confidence) => (
                    <option key={confidence} value={confidence}>
                      {confidence}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="list-header">
              <span>Weekly opportunity brief</span>
              <span>Evidence</span>
            </div>

            {loading ? (
              <div className="empty-state">Loading latest opportunity file.</div>
            ) : opportunities.length ? (
              opportunities.map((item) => (
                <OpportunityRow
                  key={item.id}
                  item={item}
                  selected={selected?.id === item.id}
                  onSelect={setSelectedId}
                />
              ))
            ) : (
              <div className="empty-state">No opportunities match current filters.</div>
            )}
          </div>

          <aside className="detail-panel">
            {selected ? (
              <>
                <div className="detail-header">
                  <div>
                    <span className={`score-badge ${scoreTone(selected.score)}`}>{selected.score}</span>
                    <h2>{selected.title}</h2>
                    <p>{selected.customer}</p>
                  </div>
                  <Sparkline values={selected.sparkline} />
                </div>

                <p className="why-now">{selected.whyNow}</p>

                <ScoreBreakdown metrics={selected.scoreBreakdown} />

                <TextStack title="Pain" icon={AlertTriangle}>
                  {selected.pain}
                </TextStack>
                <TextStack title="Current workaround" icon={RefreshCw}>
                  {selected.currentWorkaround}
                </TextStack>
                <TextStack title="Product wedge" icon={Lightbulb}>
                  {selected.wedge}
                </TextStack>
                <TextStack title="Business model" icon={BadgeDollarSign}>
                  {selected.businessModel}
                </TextStack>
                <TextStack title="Validation step" icon={Target}>
                  {selected.validationStep}
                </TextStack>

                <section className="brief-section">
                  <h3>
                    <ShieldCheck size={16} />
                    Risks
                  </h3>
                  <ul className="notes-list">
                    {selected.risks.map((risk) => (
                      <li key={risk}>{risk}</li>
                    ))}
                  </ul>
                </section>

                <section className="brief-section">
                  <h3>
                    <BadgeDollarSign size={16} />
                    Spend and adoption signals
                  </h3>
                  <EvidenceList evidence={selected.spendSignals.length ? selected.spendSignals : selected.evidence} />
                </section>

                <section className="brief-section">
                  <h3>
                    <BarChart3 size={16} />
                    Macro context
                  </h3>
                  {selected.macroContext.length ? (
                    <EvidenceList evidence={selected.macroContext} />
                  ) : (
                    <p>No matching macro context in this run.</p>
                  )}
                </section>

                <section className="brief-section">
                  <h3>
                    <Layers3 size={16} />
                    Evidence trail
                  </h3>
                  <EvidenceList evidence={selected.evidence} />
                </section>
              </>
            ) : (
              <div className="empty-state">Select an opportunity for details.</div>
            )}
          </aside>
        </section>

        <section className="source-status" id="sources">
          <div>
            <h2>Source health</h2>
            <p>Public sources plus optional free API keys. Missing keys degrade confidence instead of stopping the run.</p>
          </div>
          <div className="source-grid">
            {data.sourceRuns.map((run) => (
              <SourceRun key={run.source} run={run} />
            ))}
          </div>
        </section>

        <footer id="refresh">
          <span>Automation target: weekly GitHub Actions collector commits opportunity JSON and redeploys GitHub Pages.</span>
          <a href="https://github.com/mct-dev/signal-desk" target="_blank" rel="noreferrer">
            Repository <ArrowUpRight size={14} />
          </a>
        </footer>
      </main>
    </div>
  )
}

export default App
