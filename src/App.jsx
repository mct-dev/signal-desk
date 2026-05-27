import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  Database,
  ExternalLink,
  Filter,
  Gauge,
  GitBranch,
  Globe2,
  Layers3,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import './App.css'

const fallbackData = {
  generatedAt: new Date().toISOString(),
  summary: {
    opportunityCount: 0,
    evidenceCount: 0,
    sourceCount: 0,
    staleSources: 0,
  },
  sourceRuns: [],
  opportunities: [],
}

const sourceIcons = {
  'Hacker News': Activity,
  Reddit: Globe2,
  Apple: Sparkles,
  arXiv: Layers3,
  npm: Database,
  PyPI: Database,
  GitHub: GitBranch,
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

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="metric">
      <Icon size={16} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function SourceChip({ name }) {
  const Icon = sourceIcons[name] ?? Globe2
  return (
    <span className="source-chip">
      <Icon size={13} />
      {name}
    </span>
  )
}

function Sparkline({ values }) {
  const points = values?.length ? values : [12, 18, 16, 24, 33, 41, 56]
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
    <svg className="sparkline" viewBox="0 0 100 38" role="img" aria-label="Signal trend">
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
          <span>{item.category}</span>
        </div>
        <p>{item.whyNow}</p>
        <div className="chip-row">
          {item.sources.slice(0, 4).map((source) => (
            <SourceChip key={source} name={source} />
          ))}
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
            <span>{item.source}</span>
            <strong>{item.title}</strong>
          </div>
          <ExternalLink size={15} />
        </a>
      ))}
    </div>
  )
}

function SourceRun({ run }) {
  const status = run.ok ? 'ok' : 'error'
  return (
    <div className={`source-run ${status}`}>
      <div>
        <strong>{run.source}</strong>
        <span>{run.itemCount} items</span>
      </div>
      <span>{run.ok ? 'Live' : 'Failed'}</span>
    </div>
  )
}

function App() {
  const [data, setData] = useState(fallbackData)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('All')
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
    data.opportunities.forEach((item) => item.sources.forEach((source) => names.add(source)))
    return ['All', ...Array.from(names).sort()]
  }, [data.opportunities])

  const opportunities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return data.opportunities.filter((item) => {
      const matchesSource = sourceFilter === 'All' || item.sources.includes(sourceFilter)
      const haystack = `${item.title} ${item.category} ${item.whyNow}`.toLowerCase()
      return matchesSource && (!normalizedQuery || haystack.includes(normalizedQuery))
    })
  }, [data.opportunities, query, sourceFilter])

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
            <p>Autonomous opportunity detection from public no-key sources.</p>
          </div>
          <div className="updated">
            <CalendarClock size={16} />
            <span>Updated {formatDate(data.generatedAt)}</span>
          </div>
        </header>

        <section className="summary-grid" aria-label="Summary">
          <Metric label="Opportunities" value={data.summary.opportunityCount} icon={Gauge} />
          <Metric label="Evidence links" value={data.summary.evidenceCount} icon={Layers3} />
          <Metric label="Live sources" value={data.summary.sourceCount} icon={Database} />
          <Metric label="Source alerts" value={data.summary.staleSources} icon={AlertTriangle} />
        </section>

        <section className="desk-layout">
          <div className="signal-list" id="signals">
            <div className="toolbar">
              <div className="search-box">
                <Search size={17} />
                <input
                  aria-label="Search opportunities"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search signal"
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
            </div>

            <div className="list-header">
              <span>Ranked signal</span>
              <span>Evidence</span>
            </div>

            {loading ? (
              <div className="empty-state">Loading latest signal file.</div>
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
              <div className="empty-state">No signals match current filters.</div>
            )}
          </div>

          <aside className="detail-panel">
            {selected ? (
              <>
                <div className="detail-header">
                  <div>
                    <span className={`score-badge ${scoreTone(selected.score)}`}>{selected.score}</span>
                    <h2>{selected.title}</h2>
                  </div>
                  <Sparkline values={selected.sparkline} />
                </div>

                <p className="why-now">{selected.whyNow}</p>

                <div className="score-grid">
                  <Metric label="Velocity" value={selected.metrics.velocity} icon={TrendingUp} />
                  <Metric label="Pain" value={selected.metrics.pain} icon={AlertTriangle} />
                  <Metric label="Money" value={selected.metrics.money} icon={Gauge} />
                  <Metric label="Novelty" value={selected.metrics.novelty} icon={Sparkles} />
                </div>

                <section>
                  <h3>Source mix</h3>
                  <div className="chip-row">
                    {selected.sources.map((source) => (
                      <SourceChip key={source} name={source} />
                    ))}
                  </div>
                </section>

                <section>
                  <h3>Opportunity notes</h3>
                  <ul className="notes-list">
                    {selected.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3>Evidence</h3>
                  <EvidenceList evidence={selected.evidence} />
                </section>
              </>
            ) : (
              <div className="empty-state">Select signal for details.</div>
            )}
          </aside>
        </section>

        <section className="source-status" id="sources">
          <div>
            <h2>Source health</h2>
            <p>No developer integrations, no paid data access, no private scraping.</p>
          </div>
          <div className="source-grid">
            {data.sourceRuns.map((run) => (
              <SourceRun key={run.source} run={run} />
            ))}
          </div>
        </section>

        <footer id="refresh">
          <span>Automation target: GitHub Actions scheduled collector commits fresh JSON and redeploys GitHub Pages.</span>
          <a href="https://github.com" target="_blank" rel="noreferrer">
            Deployment docs <ArrowUpRight size={14} />
          </a>
        </footer>
      </main>
    </div>
  )
}

export default App
