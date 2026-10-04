'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Plus, Target, ChevronDown, ChevronRight, Pencil, Trash2,
  BookOpen, Layers, Tag, X, Check, FolderOpen, Search,
  ChevronsLeft, ChevronLeft, ChevronsRight,
  ArrowUpAZ, SlidersHorizontal
} from 'lucide-react'
import { StoryModule } from '@/lib/story-data'
import { fetchAllStories } from '@/lib/supabase/stories'
import toast from 'react-hot-toast'

// ── Constants ──────────────────────────────────────────────────────────────
const TOPIC_COLORS: Record<string, string> = {
  'AI Concepts': '#818cf8',
  'Smart Helpers': '#38bdf8',
  'Creative Thinking': '#fb923c',
  'Fairness in Technology': '#4ade80',
  'Rate Limiting': '#f87171',
  'Prompt Engineering': '#fbbf24',
  'Ethics in AI': '#a78bfa',
  'Machine Learning': '#34d399',
  'Data & Privacy': '#60a5fa',
  'Robotics': '#f472b6',
}
const PRESET_TOPICS = Object.keys(TOPIC_COLORS)
const QUESTS_PER_PAGE = 8

type SortKey = 'alpha-asc' | 'alpha-desc' | 'status' | 'level' | 'scenes'
type StatusFilter = 'All' | 'Published' | 'Draft' | 'Archived'
type TopicOverrides = Record<string, string[]>

function topicColor(t: string) { return TOPIC_COLORS[t] ?? '#94a3b8' }

type EnrichedStory = StoryModule & { _topics: string[] }
type TopicGroup = { name: string; quests: EnrichedStory[] }

function groupByTopics(stories: EnrichedStory[], sortKey: SortKey): TopicGroup[] {
  const map = new Map<string, EnrichedStory[]>()
  for (const s of stories) {
    const topics = s._topics.length ? s._topics : ['Uncategorised']
    for (const t of topics) {
      if (!map.has(t)) map.set(t, [])
      map.get(t)!.push(s)
    }
  }
  const sorter = makeSorter(sortKey)
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, quests]) => ({ name, quests: [...quests].sort(sorter) }))
}

function makeSorter(key: SortKey) {
  return (a: StoryModule, b: StoryModule) => {
    switch (key) {
      case 'alpha-asc': return a.title.localeCompare(b.title)
      case 'alpha-desc': return b.title.localeCompare(a.title)
      case 'status': return a.status.localeCompare(b.status)
      case 'level': return a.level.localeCompare(b.level)
      case 'scenes': return (b.scenes?.length ?? 0) - (a.scenes?.length ?? 0)
      default: return 0
    }
  }
}

// ── Multi-chip topic picker ────────────────────────────────────────────────
function TopicChipPicker({ selected, onChange, knownTopics }: {
  selected: string[]
  onChange: (t: string[]) => void
  knownTopics: string[]
}) {
  const [newTopic, setNewTopic] = useState('')
  const allTopics = Array.from(new Set([...PRESET_TOPICS, ...knownTopics]))

  const toggle = (t: string) =>
    onChange(selected.includes(t) ? selected.filter(x => x !== t) : [...selected, t])

  const addCustom = () => {
    const v = newTopic.trim()
    if (!v) return
    if (!selected.includes(v)) onChange([...selected, v])
    setNewTopic('')
  }

  return (
    <div>
      {selected.length > 0 && (
        <div className="gb-selected-chips">
          {selected.map(t => (
            <span key={t} className="gb-selected-chip" style={{ '--chip-color': topicColor(t) } as any}>
              <span className="gb-chip-dot" style={{ background: topicColor(t) }} />{t}
              <button className="gb-chip-remove" onClick={() => toggle(t)}><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="gb-topic-grid">
        {allTopics.map(t => (
          <button key={t} className={`gb-topic-chip ${selected.includes(t) ? 'selected' : ''}`} style={{ '--chip-color': topicColor(t) } as any} onClick={() => toggle(t)}>
            <span className="gb-chip-dot" style={{ background: topicColor(t) }} />{t}
            {selected.includes(t) && <Check size={11} className="gb-chip-check" />}
          </button>
        ))}
      </div>
      <div className="gb-custom-topic-row">
        <input value={newTopic} onChange={e => setNewTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustom()} placeholder="+ Type a new topic and press Enter" className="gb-custom-topic-input" />
        {newTopic.trim() && <button className="gb-btn-secondary gb-btn-xs" onClick={addCustom}>Add</button>}
      </div>
    </div>
  )
}

// ── Quest row ─────────────────────────────────────────────────────────────
function QuestRow({ story, onEdit, onDelete }: {
  story: EnrichedStory
  onEdit: (s: EnrichedStory) => void
  onDelete: (s: EnrichedStory) => void
}) {
  return (
    <div className="gb-quest-row">
      <span className="gb-quest-dot" style={{ background: story.color || topicColor(story._topics[0] ?? '') }} />
      <div className="gb-quest-info">
        <strong>{story.title}</strong>
        <div className="gb-quest-meta">
          <span className="gb-quest-meta-pill">{story.level}</span>
          <span className="gb-quest-meta-pill">{story.scenes?.length ?? 0} scenes</span>
          <span className={`gb-quest-status gb-quest-status--${story.status.toLowerCase()}`}>{story.status}</span>
          {story._topics.length > 1 && (
            <span className="gb-quest-multi-badge">+{story._topics.length - 1} topic{story._topics.length > 2 ? 's' : ''}</span>
          )}
        </div>
      </div>
      <div className="gb-quest-actions">
        <button className="gb-icon-btn" title="Edit topics" onClick={() => onEdit(story)}><Pencil size={14} /></button>
        <button className="gb-icon-btn gb-icon-btn--danger" title="Remove from goalboard" onClick={() => onDelete(story)}><Trash2 size={14} /></button>
      </div>
    </div>
  )
}

// ── Topic section with pagination ─────────────────────────────────────────
function TopicSection({ group, onEditQuest, onDeleteQuest }: {
  group: TopicGroup
  onEditQuest: (s: EnrichedStory) => void
  onDeleteQuest: (s: EnrichedStory) => void
}) {
  const [open, setOpen] = useState(true)
  const [page, setPage] = useState(1)
  const color = topicColor(group.name)
  const totalPages = Math.ceil(group.quests.length / QUESTS_PER_PAGE)
  const visible = group.quests.slice((page - 1) * QUESTS_PER_PAGE, page * QUESTS_PER_PAGE)

  return (
    <div className="gb-topic-section">
      <button className="gb-topic-header" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="gb-topic-accent" style={{ background: color }} />
        <FolderOpen size={16} style={{ color, flexShrink: 0 }} />
        <span className="gb-topic-name">{group.name}</span>
        <span className="gb-topic-count">{group.quests.length} quest{group.quests.length !== 1 ? 's' : ''}</span>
        <span className="gb-topic-chevron">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
      </button>
      {open && (
        <div className="gb-topic-body">
          {visible.map(q => <QuestRow key={q.id} story={q} onEdit={onEditQuest} onDelete={onDeleteQuest} />)}
          {totalPages > 1 && (
            <div className="gb-pagination--inline">
              <button onClick={() => setPage(1)} disabled={page === 1} className="gb-pg-btn" title="First"><ChevronsLeft size={13} /></button>
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="gb-pg-btn" title="Prev"><ChevronLeft size={13} /></button>
              <span className="gb-pg-info">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="gb-pg-btn" title="Next"><ChevronRight size={13} /></button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="gb-pg-btn" title="Last"><ChevronsRight size={13} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Edit Topics modal ─────────────────────────────────────────────────────
function EditTopicModal({ story, allTopics, onClose, onSave }: {
  story: EnrichedStory
  allTopics: string[]
  onClose: () => void
  onSave: (story: StoryModule, newTopics: string[]) => void
}) {
  const [selected, setSelected] = useState<string[]>(story._topics.length ? story._topics : [story.category])
  const handleSave = () => {
    if (!selected.length) return toast.error('Select at least one topic')
    onSave(story, selected)
  }
  return (
    <div className="gb-modal-backdrop" onClick={onClose}>
      <div className="gb-modal" onClick={e => e.stopPropagation()}>
        <div className="gb-modal-header">
          <div><h3>Edit Quest Topics</h3><p>Pick one or more topics for <strong>{story.title}</strong>.</p></div>
          <button className="gb-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '16px 24px' }}>
          <TopicChipPicker selected={selected} onChange={setSelected} knownTopics={allTopics} />
        </div>
        <div className="gb-modal-footer">
          <button className="gb-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="gb-btn-primary" onClick={handleSave} disabled={!selected.length}><Check size={15} /> Save Topics</button>
        </div>
      </div>
    </div>
  )
}

// ── Add Quest modal ───────────────────────────────────────────────────────
function AddQuestModal({ allStories, boardIds, allTopics, onClose, onAdd }: {
  allStories: StoryModule[]
  boardIds: Set<string>
  allTopics: string[]
  onClose: () => void
  onAdd: (story: StoryModule, topics: string[]) => void
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<StoryModule | null>(null)
  const [topics, setTopics] = useState<string[]>([])

  const available = allStories.filter(s =>
    !boardIds.has(s.id) &&
    (search.trim() === '' || s.title.toLowerCase().includes(search.toLowerCase()))
  )

  const handleAdd = () => {
    if (!selected) return toast.error('Select a quest first')
    const finalTopics = topics.length ? topics : [selected.category || 'Uncategorised']
    onAdd(selected, finalTopics)
  }

  return (
    <div className="gb-modal-backdrop" onClick={onClose}>
      <div className="gb-modal gb-modal--wide" onClick={e => e.stopPropagation()}>
        <div className="gb-modal-header">
          <div><h3>Add Quest to Goalboard</h3><p>Pick a story and assign it to one or more topic groups.</p></div>
          <button className="gb-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="gb-add-layout">
          <div className="gb-add-left">
            <div className="gb-search-wrap">
              <Search size={14} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stories..." />
            </div>
            <div className="gb-story-list">
              {available.length === 0 && (
                <div className="gb-empty-pick">
                  {allStories.length === boardIds.size ? 'All stories are already on the goalboard.' : 'No stories match.'}
                </div>
              )}
              {available.map(s => (
                <button key={s.id} className={`gb-story-pick ${selected?.id === s.id ? 'selected' : ''}`} onClick={() => { setSelected(s); setTopics([s.category || 'Uncategorised']) }}>
                  <span className="gb-pick-dot" style={{ background: s.color || topicColor(s.category) }} />
                  <div><strong>{s.title}</strong><small>{s.category} &middot; {s.level}</small></div>
                  {selected?.id === s.id && <Check size={14} className="gb-pick-check" />}
                </button>
              ))}
            </div>
          </div>
          <div className="gb-add-right">
            <span className="gb-add-section-label">Assign to Topics <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '10px' }}>(select multiple)</span></span>
            {selected ? (
              <TopicChipPicker selected={topics} onChange={setTopics} knownTopics={allTopics} />
            ) : (
              <div className="gb-add-placeholder"><Tag size={22} /><p>Select a quest on the left first</p></div>
            )}
          </div>
        </div>
        <div className="gb-modal-footer">
          <button className="gb-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="gb-btn-primary" onClick={handleAdd} disabled={!selected}><Plus size={15} /> Add to Board</button>
        </div>
      </div>
    </div>
  )
}

// ── Filter dropdown ───────────────────────────────────────────────────────
function FilterDropdown({ sort, setSort, statusFilter, setStatusFilter, levelFilter, setLevelFilter }: {
  sort: SortKey; setSort: (v: SortKey) => void
  statusFilter: StatusFilter; setStatusFilter: (v: StatusFilter) => void
  levelFilter: string; setLevelFilter: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeCount = [sort !== 'alpha-asc', statusFilter !== 'All', levelFilter !== 'All'].filter(Boolean).length

  return (
    <div className="gb-filter-wrap" ref={ref}>
      <button className={`gb-filter-btn${activeCount > 0 ? ' gb-filter-btn--active' : ''}`} onClick={() => setOpen(o => !o)}>
        <SlidersHorizontal size={15} /> Filter &amp; Sort
        {activeCount > 0 && <span className="gb-filter-badge">{activeCount}</span>}
        <ChevronDown size={13} style={{ marginLeft: 2, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div className="gb-filter-panel">
          <div className="gb-filter-section">
            <label className="gb-filter-label"><ArrowUpAZ size={13} /> Sort Quests</label>
            {([['alpha-asc', 'A \u2192 Z (Default)'], ['alpha-desc', 'Z \u2192 A'], ['status', 'By Status'], ['level', 'By Level'], ['scenes', 'Most Scenes']] as [SortKey, string][]).map(([val, label]) => (
              <button key={val} className={`gb-filter-opt${sort === val ? ' active' : ''}`} onClick={() => setSort(val)}>
                {sort === val && <Check size={12} />}{label}
              </button>
            ))}
          </div>
          <div className="gb-filter-divider" />
          <div className="gb-filter-section">
            <label className="gb-filter-label">Status</label>
            {(['All', 'Published', 'Draft', 'Archived'] as StatusFilter[]).map(v => (
              <button key={v} className={`gb-filter-opt${statusFilter === v ? ' active' : ''}`} onClick={() => setStatusFilter(v)}>
                {statusFilter === v && <Check size={12} />}{v}
              </button>
            ))}
          </div>
          <div className="gb-filter-divider" />
          <div className="gb-filter-section">
            <label className="gb-filter-label">Level</label>
            {(['All', 'Starter', 'Intermediate', 'Advanced']).map(v => (
              <button key={v} className={`gb-filter-opt${levelFilter === v ? ' active' : ''}`} onClick={() => setLevelFilter(v)}>
                {levelFilter === v && <Check size={12} />}{v}
              </button>
            ))}
          </div>
          {activeCount > 0 && (
            <>
              <div className="gb-filter-divider" />
              <button className="gb-filter-reset" onClick={() => { setSort('alpha-asc'); setStatusFilter('All'); setLevelFilter('All') }}>
                <X size={12} /> Reset all filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function AdminGoalboardPage() {
  const [allStories, setAllStories] = useState<StoryModule[]>([])
  const [boardIds, setBoardIds] = useState<Set<string>>(new Set())
  const [topicOverrides, setTopicOverrides] = useState<TopicOverrides>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('alpha-asc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [levelFilter, setLevelFilter] = useState('All')
  const [editTarget, setEditTarget] = useState<EnrichedStory | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    ; (async () => {
      setLoading(true)
      const stories = await fetchAllStories()
      setAllStories(stories)
      try {
        const saved = localStorage.getItem('ai_for_all_goalboard')
        if (saved) {
          const parsed = JSON.parse(saved) as { boardIds: string[]; topicOverrides: TopicOverrides }
          setBoardIds(new Set(parsed.boardIds ?? []))
          const migrated: TopicOverrides = {}
          for (const [id, val] of Object.entries(parsed.topicOverrides ?? {})) {
            migrated[id] = Array.isArray(val) ? val : [val as unknown as string]
          }
          setTopicOverrides(migrated)
        } else {
          setBoardIds(new Set(stories.filter(s => s.status === 'Published').map(s => s.id)))
        }
      } catch {
        setBoardIds(new Set(stories.filter(s => s.status === 'Published').map(s => s.id)))
      }
      setLoading(false)
    })()
  }, [])

  const persist = (ids: Set<string>, overrides: TopicOverrides) => {
    try { localStorage.setItem('ai_for_all_goalboard', JSON.stringify({ boardIds: Array.from(ids), topicOverrides: overrides })) } catch { /* noop */ }
  }

  const boardStories = useMemo(() =>
    allStories.filter(s => boardIds.has(s.id)).map(s => ({
      ...s,
      _topics: topicOverrides[s.id] ?? [s.category || 'Uncategorised'],
    })),
    [allStories, boardIds, topicOverrides]
  )

  const filtered = useMemo(() => {
    let list = boardStories
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.title.toLowerCase().includes(q) || s._topics.some(t => t.toLowerCase().includes(q)))
    }
    if (statusFilter !== 'All') list = list.filter(s => s.status === statusFilter)
    if (levelFilter !== 'All') list = list.filter(s => s.level === levelFilter)
    return list
  }, [boardStories, search, statusFilter, levelFilter])

  const groups = useMemo(() => groupByTopics(filtered, sort), [filtered, sort])
  const allTopics = useMemo(() => Array.from(new Set(boardStories.flatMap(s => s._topics))), [boardStories])

  const handleTopicSave = (story: StoryModule, newTopics: string[]) => {
    const next = { ...topicOverrides, [story.id]: newTopics }
    setTopicOverrides(next); persist(boardIds, next); setEditTarget(null)
    toast.success(`Topics updated for "${story.title}"`)
  }
  const handleDelete = (story: StoryModule) => {
    if (!window.confirm(`Remove "${story.title}" from the Goalboard?`)) return
    const next = new Set(boardIds); next.delete(story.id)
    const nextOv = { ...topicOverrides }; delete nextOv[story.id]
    setBoardIds(next); setTopicOverrides(nextOv); persist(next, nextOv)
    toast.success(`"${story.title}" removed`)
  }
  const handleAdd = (story: StoryModule, topics: string[]) => {
    const nextIds = new Set([...boardIds, story.id])
    const nextOv = { ...topicOverrides, [story.id]: topics }
    setBoardIds(nextIds); setTopicOverrides(nextOv); persist(nextIds, nextOv)
    setAddOpen(false)
    toast.success(`"${story.title}" added to ${topics.length > 1 ? `${topics.length} topics` : `"${topics[0]}"`}`)
  }

  return (
    <>
      {editTarget && (
        <EditTopicModal story={editTarget} allTopics={allTopics} onClose={() => setEditTarget(null)} onSave={handleTopicSave} />
      )}
      {addOpen && (
        <AddQuestModal allStories={allStories} boardIds={boardIds} allTopics={allTopics} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
      )}

      <div className="gb-page">
        <div className="gb-page-header">
          <div>
            <h1 className="gb-page-title">
              <Target size={26} style={{ verticalAlign: 'middle', marginRight: 10 }} />Goal Board
            </h1>
            <p className="gb-page-sub">Topics sorted A-Z. Quests can belong to multiple topics.</p>
          </div>
          <button className="gb-btn-primary" onClick={() => setAddOpen(true)}><Plus size={16} /> Add Quest</button>
        </div>

        <div className="gb-stat-strip">
          <div className="gb-stat-card"><Layers size={18} /><strong>{allTopics.length}</strong><span>Topics</span></div>
          <div className="gb-stat-card"><BookOpen size={18} /><strong>{boardStories.length}</strong><span>Quests</span></div>
          <div className="gb-stat-card"><Target size={18} /><strong>{boardStories.filter(s => s.status === 'Published').length}</strong><span>Published</span></div>
        </div>

        <div className="gb-toolbar">
          <div className="gb-search-bar">
            <Search size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quests or topics..." />
            {search && <button className="gb-search-clear" onClick={() => setSearch('')}><X size={14} /></button>}
          </div>
          <FilterDropdown sort={sort} setSort={setSort} statusFilter={statusFilter} setStatusFilter={setStatusFilter} levelFilter={levelFilter} setLevelFilter={setLevelFilter} />
        </div>

        <div className="gb-board">
          {loading ? (
            <div className="gb-loading">{[...Array(3)].map((_, i) => <div key={i} className="gb-skeleton" />)}</div>
          ) : groups.length === 0 ? (
            <div className="gb-empty">
              <Target size={36} />
              <h3>{search || statusFilter !== 'All' || levelFilter !== 'All' ? 'No quests match your filters.' : 'No quests on the board yet.'}</h3>
              {!search && statusFilter === 'All' && levelFilter === 'All' && <p>Click <strong>Add Quest</strong> to get started.</p>}
            </div>
          ) : (
            groups.map(g => <TopicSection key={g.name} group={g} onEditQuest={setEditTarget} onDeleteQuest={handleDelete} />)
          )}
        </div>
      </div>

      <style>{`
        .gb-page{max-width:900px}
        .gb-page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;gap:16px;flex-wrap:wrap}
        .gb-page-title{margin:0 0 4px;font-size:26px;display:flex;align-items:center}
        .gb-page-sub{margin:0;color:var(--muted);font-size:13px}
        .gb-stat-strip{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
        .gb-stat-card{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;background:var(--white);box-shadow:0 4px 14px rgba(38,48,105,.06);font-size:13px;color:var(--muted)}
        .gb-stat-card svg{color:#818cf8}
        .gb-stat-card strong{color:var(--ink);font-size:18px}
        .gb-toolbar{display:flex;gap:10px;margin-bottom:16px;align-items:center}
        .gb-search-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;background:var(--white);box-shadow:0 4px 14px rgba(38,48,105,.06);flex:1;color:var(--muted)}
        .gb-search-bar input{flex:1;border:none;outline:none;background:transparent;font-size:14px;color:var(--ink)}
        .gb-search-clear{background:transparent;color:var(--muted);border:none;cursor:pointer;display:flex;align-items:center}
        .gb-filter-wrap{position:relative}
        .gb-filter-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:10px;background:var(--white);box-shadow:0 4px 14px rgba(38,48,105,.06);border:1.5px solid var(--line);font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;white-space:nowrap;transition:all .15s}
        .gb-filter-btn:hover{border-color:#818cf8;color:var(--ink)}
        .gb-filter-btn--active{border-color:#818cf8;color:var(--ink);background:#f0f1ff}
        .gb-filter-badge{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#818cf8;color:#fff;font-size:10px;font-weight:800}
        .gb-filter-panel{position:absolute;right:0;top:calc(100% + 8px);width:220px;background:var(--white);border-radius:14px;box-shadow:0 12px 40px rgba(38,48,105,.14);border:1px solid var(--line);z-index:500;overflow:hidden;animation:gbSlideUp .15s ease}
        .gb-filter-section{padding:10px 8px 6px}
        .gb-filter-label{display:flex;align-items:center;gap:5px;padding:4px 8px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
        .gb-filter-opt{display:flex;align-items:center;gap:7px;width:100%;padding:8px 10px;border-radius:8px;background:transparent;border:none;font-size:13px;color:var(--ink);cursor:pointer;text-align:left;transition:background .12s}
        .gb-filter-opt:hover{background:#f0f1ff}
        .gb-filter-opt.active{color:#5b5ee0;font-weight:700}
        .gb-filter-divider{height:1px;background:var(--line);margin:0 8px}
        .gb-filter-reset{display:flex;align-items:center;gap:6px;width:100%;padding:10px 14px;border:none;background:transparent;font-size:12px;color:#c25a53;cursor:pointer;transition:background .12s}
        .gb-filter-reset:hover{background:#fff0ee}
        .gb-board{display:flex;flex-direction:column;gap:12px}
        .gb-topic-section{border-radius:14px;background:var(--white);box-shadow:0 4px 18px rgba(38,48,105,.06);overflow:hidden}
        .gb-topic-header{display:flex;align-items:center;gap:10px;width:100%;padding:14px 18px;background:transparent;border:none;cursor:pointer;text-align:left;transition:background .15s}
        .gb-topic-header:hover{background:#f7f8ff}
        .gb-topic-accent{width:4px;height:22px;border-radius:3px;flex-shrink:0}
        .gb-topic-name{flex:1;font-size:15px;font-weight:700;color:var(--ink)}
        .gb-topic-count{font-size:11px;padding:3px 9px;border-radius:20px;background:#eef0ff;color:#5f6bb3;font-weight:600}
        .gb-topic-chevron{color:var(--muted);display:flex}
        .gb-topic-body{border-top:1px solid var(--line);padding:0 18px}
        .gb-quest-row{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)}
        .gb-quest-row:last-child{border-bottom:none}
        .gb-quest-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
        .gb-quest-info{flex:1;min-width:0}
        .gb-quest-info strong{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .gb-quest-meta{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:3px}
        .gb-quest-meta-pill{font-size:10px;padding:1px 7px;border-radius:20px;background:#f1f5f9;color:#64748b;font-weight:600}
        .gb-quest-status{font-size:10px;padding:2px 7px;border-radius:20px;font-weight:600}
        .gb-quest-status--published{background:#e8faf0;color:#1a7a45}
        .gb-quest-status--draft{background:#fff0ee;color:#c25a53}
        .gb-quest-status--archived{background:#f1f5f9;color:#64748b}
        .gb-quest-multi-badge{font-size:10px;padding:1px 7px;border-radius:20px;background:#ece9ff;color:#6d5fbc;font-weight:700}
        .gb-quest-actions{display:flex;gap:4px;flex-shrink:0}
        .gb-pagination--inline{display:flex;align-items:center;gap:4px;padding:10px 0 12px;border-top:1px solid var(--line)}
        .gb-pg-btn{display:grid;place-items:center;width:28px;height:28px;border-radius:7px;border:1px solid var(--line);background:transparent;color:var(--muted);cursor:pointer;transition:all .12s}
        .gb-pg-btn:hover:not(:disabled){background:#eef0ff;border-color:#c8ccff;color:#5b5ee0}
        .gb-pg-btn:disabled{opacity:.35;cursor:not-allowed}
        .gb-pg-info{font-size:12px;font-weight:600;color:var(--muted);padding:0 6px}
        .gb-icon-btn{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:transparent;color:var(--muted);border:1px solid var(--line);cursor:pointer;transition:all .15s}
        .gb-icon-btn:hover{background:#eef0ff;color:#5f6bb3;border-color:#c8ccff}
        .gb-icon-btn--danger:hover{background:#fff0ee;color:#c25a53;border-color:#fecaca}
        .gb-btn-primary{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:10px;background:var(--ink);color:var(--white);font-size:13px;font-weight:700;border:none;cursor:pointer;transition:opacity .15s;white-space:nowrap}
        .gb-btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .gb-btn-primary:not(:disabled):hover{opacity:.85}
        .gb-btn-secondary{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:10px;background:transparent;color:var(--muted);font-size:13px;font-weight:700;border:1px solid var(--line);cursor:pointer;transition:all .15s}
        .gb-btn-secondary:hover{background:#f5f6ff}
        .gb-btn-xs{padding:5px 10px;font-size:11px;border-radius:7px}
        .gb-loading{display:flex;flex-direction:column;gap:12px}
        .gb-skeleton{height:68px;border-radius:14px;background:linear-gradient(90deg,var(--lavender) 25%,#f5f6ff 50%,var(--lavender) 75%);background-size:200% 100%;animation:gbShimmer 1.4s infinite}
        @keyframes gbShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .gb-empty{display:grid;place-items:center;text-align:center;padding:60px 20px;color:var(--muted);background:var(--white);border-radius:14px;box-shadow:0 4px 18px rgba(38,48,105,.06)}
        .gb-empty svg{margin-bottom:14px;opacity:.35}
        .gb-empty h3{margin:0 0 8px;color:var(--ink);font-size:18px}
        .gb-empty p{margin:0;font-size:13px}
        .gb-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:grid;place-items:center;padding:20px;backdrop-filter:blur(4px);animation:gbFadeIn .2s ease}
        @keyframes gbFadeIn{from{opacity:0}to{opacity:1}}
        .gb-modal{width:min(100%,560px);border-radius:18px;background:var(--white);box-shadow:0 24px 60px rgba(0,0,0,.18);overflow:hidden;animation:gbSlideUp .2s ease}
        .gb-modal--wide{width:min(100%,860px)}
        @keyframes gbSlideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
        .gb-modal-header{display:flex;justify-content:space-between;align-items:flex-start;padding:22px 24px 0}
        .gb-modal-header h3{margin:0 0 4px;font-size:18px}
        .gb-modal-header p{margin:0;font-size:13px;color:var(--muted)}
        .gb-modal-close{display:grid;place-items:center;width:32px;height:32px;border-radius:8px;background:transparent;border:1px solid var(--line);cursor:pointer;color:var(--muted);flex-shrink:0}
        .gb-modal-close:hover{background:#f5f6ff}
        .gb-modal-footer{display:flex;justify-content:flex-end;gap:10px;padding:16px 24px 22px;border-top:1px solid var(--line)}
        .gb-selected-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
        .gb-selected-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 8px 4px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1.5px solid var(--chip-color);background:color-mix(in srgb,var(--chip-color) 18%,white);color:var(--ink)}
        .gb-chip-remove{display:grid;place-items:center;width:14px;height:14px;border-radius:50%;background:rgba(0,0,0,.12);border:none;cursor:pointer;color:inherit;padding:0}
        .gb-chip-remove:hover{background:rgba(0,0,0,.25)}
        .gb-topic-grid{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}
        .gb-topic-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:20px;border:1.5px solid var(--line);background:transparent;font-size:12px;font-weight:600;color:var(--ink);cursor:pointer;transition:all .15s}
        .gb-topic-chip.selected{border-color:var(--chip-color);background:color-mix(in srgb,var(--chip-color) 15%,white)}
        .gb-topic-chip:hover:not(.selected){background:#f5f6ff;border-color:#c8ccff}
        .gb-chip-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
        .gb-chip-check{color:#22c55e;flex-shrink:0}
        .gb-custom-topic-row{display:flex;gap:8px;align-items:center}
        .gb-custom-topic-input{flex:1;padding:8px 11px;border:1.5px solid var(--line);border-radius:8px;font-size:13px;color:var(--ink);outline:none;transition:border-color .15s}
        .gb-custom-topic-input:focus{border-color:#818cf8}
        .gb-add-layout{display:grid;grid-template-columns:1fr 1.1fr;border-top:1px solid var(--line);border-bottom:1px solid var(--line);max-height:460px}
        .gb-add-left{border-right:1px solid var(--line);display:flex;flex-direction:column;overflow:hidden}
        .gb-add-right{padding:16px;overflow-y:auto}
        .gb-add-section-label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:0 0 10px;display:block}
        .gb-add-placeholder{display:grid;place-items:center;text-align:center;padding:30px 16px;color:var(--muted);gap:8px}
        .gb-add-placeholder p{margin:0;font-size:12px}
        .gb-search-wrap{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line);color:var(--muted)}
        .gb-search-wrap input{flex:1;border:none;outline:none;font-size:13px;background:transparent;color:var(--ink)}
        .gb-story-list{overflow-y:auto;flex:1}
        .gb-story-pick{display:flex;align-items:center;gap:10px;width:100%;padding:11px 14px;background:transparent;border:none;border-bottom:1px solid var(--line);cursor:pointer;text-align:left;transition:background .12s}
        .gb-story-pick:hover{background:#f7f8ff}
        .gb-story-pick.selected{background:#eef0ff}
        .gb-story-pick strong{display:block;font-size:13px;color:var(--ink)}
        .gb-story-pick small{font-size:11px;color:var(--muted)}
        .gb-pick-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
        .gb-pick-check{margin-left:auto;color:#4ade80;flex-shrink:0}
        .gb-empty-pick{padding:32px 16px;text-align:center;color:var(--muted);font-size:13px}
        @media(max-width:620px){.gb-add-layout{grid-template-columns:1fr;max-height:none}.gb-add-left{border-right:none;border-bottom:1px solid var(--line);max-height:220px}.gb-filter-panel{width:200px}}
      `}</style>
    </>
  )
}
