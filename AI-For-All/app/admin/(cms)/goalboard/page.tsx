'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Target, ChevronDown, ChevronRight, Pencil, Trash2,
  BookOpen, Layers, Tag, X, Check, FolderOpen, Search
} from 'lucide-react'
import { StoryModule } from '@/lib/story-data'
import { fetchAllStories } from '@/lib/supabase/stories'
import toast from 'react-hot-toast'

// ── Preset topic colour palette ────────────────────────────────────────────
const TOPIC_COLORS: Record<string, string> = {
  'AI Concepts':            '#818cf8',
  'Smart Helpers':          '#38bdf8',
  'Creative Thinking':      '#fb923c',
  'Fairness in Technology': '#4ade80',
  'Rate Limiting':          '#f87171',
  'Prompt Engineering':     '#fbbf24',
  'Ethics in AI':           '#a78bfa',
  'Machine Learning':       '#34d399',
  'Data & Privacy':         '#60a5fa',
  'Robotics':               '#f472b6',
}

function topicColor(topic: string) {
  return TOPIC_COLORS[topic] ?? '#94a3b8'
}

type TopicGroup = { name: string; quests: StoryModule[] }

function groupByTopic(stories: StoryModule[]): TopicGroup[] {
  const map = new Map<string, StoryModule[]>()
  for (const s of stories) {
    const key = s.category || 'Uncategorised'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return Array.from(map.entries()).map(([name, quests]) => ({ name, quests }))
}

// ── Quest row ─────────────────────────────────────────────────────────────
function QuestRow({ story, onEdit, onDelete }: {
  story: StoryModule
  onEdit: (s: StoryModule) => void
  onDelete: (s: StoryModule) => void
}) {
  return (
    <div className="gb-quest-row">
      <span className="gb-quest-dot" style={{ background: story.color || topicColor(story.category) }} />
      <div className="gb-quest-info">
        <strong>{story.title}</strong>
        <small>
          {story.level} &middot; {story.scenes?.length ?? 0} scenes &middot;{' '}
          <span className={`gb-quest-status gb-quest-status--${story.status.toLowerCase()}`}>
            {story.status}
          </span>
        </small>
      </div>
      <div className="gb-quest-actions">
        <button className="gb-icon-btn" title="Move to a different topic" onClick={() => onEdit(story)}>
          <Pencil size={14} />
        </button>
        <button className="gb-icon-btn gb-icon-btn--danger" title="Remove from goalboard" onClick={() => onDelete(story)}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Topic section ─────────────────────────────────────────────────────────
function TopicSection({ group, onEditQuest, onDeleteQuest }: {
  group: TopicGroup
  onEditQuest: (s: StoryModule) => void
  onDeleteQuest: (s: StoryModule) => void
}) {
  const [open, setOpen] = useState(true)
  const color = topicColor(group.name)
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
          {group.quests.map(q => (
            <QuestRow key={q.id} story={q} onEdit={onEditQuest} onDelete={onDeleteQuest} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Edit Topic modal ──────────────────────────────────────────────────────
function EditTopicModal({ story, allTopics, onClose, onSave }: {
  story: StoryModule
  allTopics: string[]
  onClose: () => void
  onSave: (story: StoryModule, newTopic: string) => void
}) {
  const [topic, setTopic] = useState(story.category)
  const [custom, setCustom] = useState('')
  const [mode, setMode] = useState<'pick' | 'new'>('pick')
  const knownTopics = Array.from(new Set([...Object.keys(TOPIC_COLORS), ...allTopics]))
  const handleSave = () => {
    const final = mode === 'new' ? custom.trim() : topic
    if (!final) return toast.error('Please select or enter a topic')
    onSave(story, final)
  }
  return (
    <div className="gb-modal-backdrop" onClick={onClose}>
      <div className="gb-modal" onClick={e => e.stopPropagation()}>
        <div className="gb-modal-header">
          <div>
            <h3>Move Quest to Topic</h3>
            <p>Reassign <strong>{story.title}</strong> to a different topic group.</p>
          </div>
          <button className="gb-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="gb-modal-tabs">
          <button className={mode === 'pick' ? 'active' : ''} onClick={() => setMode('pick')}><Tag size={14} /> Existing Topic</button>
          <button className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}><Plus size={14} /> New Topic</button>
        </div>
        {mode === 'pick' ? (
          <div className="gb-topic-grid">
            {knownTopics.map(t => (
              <button key={t} className={`gb-topic-chip ${topic === t ? 'selected' : ''}`} style={{ '--chip-color': topicColor(t) } as any} onClick={() => setTopic(t)}>
                <span className="gb-chip-dot" style={{ background: topicColor(t) }} />{t}
                {topic === t && <Check size={12} className="gb-chip-check" />}
              </button>
            ))}
          </div>
        ) : (
          <div className="gb-modal-field">
            <label>New Topic Name</label>
            <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="e.g. Generative AI, Computer Vision…" autoFocus />
          </div>
        )}
        <div className="gb-modal-footer">
          <button className="gb-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="gb-btn-primary" onClick={handleSave}><Check size={15} /> Confirm Topic</button>
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
  onAdd: (story: StoryModule, topic: string) => void
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<StoryModule | null>(null)
  const [topic, setTopic] = useState('')
  const [custom, setCustom] = useState('')
  const [mode, setMode] = useState<'pick' | 'new'>('pick')
  const knownTopics = Array.from(new Set([...Object.keys(TOPIC_COLORS), ...allTopics]))
  const available = allStories.filter(s =>
    !boardIds.has(s.id) &&
    (search.trim() === '' || s.title.toLowerCase().includes(search.toLowerCase()))
  )
  const handleAdd = () => {
    if (!selected) return toast.error('Select a quest first')
    const finalTopic = mode === 'new' ? custom.trim() : (topic || selected.category)
    if (!finalTopic) return toast.error('Please select or enter a topic')
    onAdd(selected, finalTopic)
  }
  return (
    <div className="gb-modal-backdrop" onClick={onClose}>
      <div className="gb-modal gb-modal--wide" onClick={e => e.stopPropagation()}>
        <div className="gb-modal-header">
          <div><h3>Add Quest to Goalboard</h3><p>Pick a story and assign it to a topic group.</p></div>
          <button className="gb-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="gb-add-layout">
          <div className="gb-add-left">
            <div className="gb-search-wrap">
              <Search size={14} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stories…" />
            </div>
            <div className="gb-story-list">
              {available.length === 0 && (
                <div className="gb-empty-pick">
                  {allStories.length === boardIds.size ? 'All stories are already on the goalboard.' : 'No stories match.'}
                </div>
              )}
              {available.map(s => (
                <button key={s.id} className={`gb-story-pick ${selected?.id === s.id ? 'selected' : ''}`} onClick={() => { setSelected(s); setTopic(s.category) }}>
                  <span className="gb-pick-dot" style={{ background: s.color || topicColor(s.category) }} />
                  <div><strong>{s.title}</strong><small>{s.category} &middot; {s.level}</small></div>
                  {selected?.id === s.id && <Check size={14} className="gb-pick-check" />}
                </button>
              ))}
            </div>
          </div>
          <div className="gb-add-right">
            <p className="gb-add-section-label">Assign to Topic</p>
            <div className="gb-modal-tabs">
              <button className={mode === 'pick' ? 'active' : ''} onClick={() => setMode('pick')}><Tag size={13} /> Existing</button>
              <button className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}><Plus size={13} /> New Topic</button>
            </div>
            {mode === 'pick' ? (
              <div className="gb-topic-grid gb-topic-grid--compact">
                {knownTopics.map(t => (
                  <button key={t} className={`gb-topic-chip ${topic === t ? 'selected' : ''}`} style={{ '--chip-color': topicColor(t) } as any} onClick={() => setTopic(t)}>
                    <span className="gb-chip-dot" style={{ background: topicColor(t) }} />{t}
                    {topic === t && <Check size={12} className="gb-chip-check" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="gb-modal-field">
                <label>New Topic Name</label>
                <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="e.g. Natural Language Processing" autoFocus />
              </div>
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

// ── Main page ─────────────────────────────────────────────────────────────
export default function AdminGoalboardPage() {
  const [allStories, setAllStories] = useState<StoryModule[]>([])
  const [boardIds, setBoardIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editTarget, setEditTarget] = useState<StoryModule | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [topicOverrides, setTopicOverrides] = useState<Record<string, string>>({})

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const stories = await fetchAllStories()
      setAllStories(stories)
      try {
        const saved = localStorage.getItem('ai_for_all_goalboard')
        if (saved) {
          const parsed = JSON.parse(saved) as { boardIds: string[]; topicOverrides: Record<string, string> }
          setBoardIds(new Set(parsed.boardIds ?? []))
          setTopicOverrides(parsed.topicOverrides ?? {})
        } else {
          setBoardIds(new Set(stories.filter(s => s.status === 'Published').map(s => s.id)))
        }
      } catch {
        setBoardIds(new Set(stories.filter(s => s.status === 'Published').map(s => s.id)))
      }
      setLoading(false)
    })()
  }, [])

  const persist = (ids: Set<string>, overrides: Record<string, string>) => {
    try { localStorage.setItem('ai_for_all_goalboard', JSON.stringify({ boardIds: Array.from(ids), topicOverrides: overrides })) } catch { /* noop */ }
  }

  const boardStories = useMemo(() =>
    allStories.filter(s => boardIds.has(s.id)).map(s => ({ ...s, category: topicOverrides[s.id] ?? s.category })),
    [allStories, boardIds, topicOverrides]
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return boardStories
    const q = search.toLowerCase()
    return boardStories.filter(s => s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
  }, [boardStories, search])

  const groups = useMemo(() => groupByTopic(filtered), [filtered])
  const allTopics = useMemo(() => Array.from(new Set(boardStories.map(s => s.category))), [boardStories])

  const handleTopicSave = (story: StoryModule, newTopic: string) => {
    const next = { ...topicOverrides, [story.id]: newTopic }
    setTopicOverrides(next); persist(boardIds, next); setEditTarget(null)
    toast.success(`"${story.title}" moved to "${newTopic}"`)
  }
  const handleDelete = (story: StoryModule) => {
    if (!window.confirm(`Remove "${story.title}" from the Goalboard?`)) return
    const next = new Set(boardIds); next.delete(story.id)
    setBoardIds(next); persist(next, topicOverrides)
    toast.success(`"${story.title}" removed`)
  }
  const handleAdd = (story: StoryModule, topic: string) => {
    const nextIds = new Set([...boardIds, story.id])
    const nextOverrides = { ...topicOverrides, [story.id]: topic }
    setBoardIds(nextIds); setTopicOverrides(nextOverrides); persist(nextIds, nextOverrides)
    setAddOpen(false); toast.success(`"${story.title}" added to "${topic}"`)
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
              <Target size={26} style={{ verticalAlign: 'middle', marginRight: 10 }} />
              Goal Board
            </h1>
            <p className="gb-page-sub">Quests are organised into topic groups. Each topic is a learning theme.</p>
          </div>
          <button className="gb-btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Quest
          </button>
        </div>

        <div className="gb-stat-strip">
          <div className="gb-stat-card"><Layers size={18} /><strong>{groups.length}</strong><span>Topic{groups.length !== 1 ? 's' : ''}</span></div>
          <div className="gb-stat-card"><BookOpen size={18} /><strong>{boardStories.length}</strong><span>Quest{boardStories.length !== 1 ? 's' : ''}</span></div>
          <div className="gb-stat-card"><Target size={18} /><strong>{boardStories.filter(s => s.status === 'Published').length}</strong><span>Published</span></div>
        </div>

        <div className="gb-search-bar">
          <Search size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quests or topics…" />
          {search && <button className="gb-search-clear" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>

        <div className="gb-board">
          {loading ? (
            <div className="gb-loading">{[...Array(3)].map((_, i) => <div key={i} className="gb-skeleton" />)}</div>
          ) : groups.length === 0 ? (
            <div className="gb-empty">
              <Target size={36} />
              <h3>{search ? 'No quests match your search.' : 'No quests on the board yet.'}</h3>
              {!search && <p>Click <strong>Add Quest</strong> to pick a story and assign it to a topic.</p>}
            </div>
          ) : (
            groups.map(g => (
              <TopicSection key={g.name} group={g} onEditQuest={setEditTarget} onDeleteQuest={handleDelete} />
            ))
          )}
        </div>
      </div>

      <style>{`
        .gb-page { max-width: 900px; }
        .gb-page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; gap:16px; flex-wrap:wrap; }
        .gb-page-title { margin:0 0 4px; font-size:26px; display:flex; align-items:center; }
        .gb-page-sub { margin:0; color:var(--muted); font-size:13px; }
        .gb-stat-strip { display:flex; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
        .gb-stat-card { display:flex; align-items:center; gap:8px; padding:10px 16px; border-radius:10px; background:var(--white); box-shadow:0 4px 14px rgba(38,48,105,.06); font-size:13px; color:var(--muted); }
        .gb-stat-card svg { color:#818cf8; }
        .gb-stat-card strong { color:var(--ink); font-size:18px; }
        .gb-search-bar { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; background:var(--white); box-shadow:0 4px 14px rgba(38,48,105,.06); margin-bottom:16px; color:var(--muted); }
        .gb-search-bar input { flex:1; border:none; outline:none; background:transparent; font-size:14px; color:var(--ink); }
        .gb-search-clear { background:transparent; color:var(--muted); border:none; cursor:pointer; display:flex; align-items:center; }
        .gb-board { display:flex; flex-direction:column; gap:12px; }
        .gb-topic-section { border-radius:14px; background:var(--white); box-shadow:0 4px 18px rgba(38,48,105,.06); overflow:hidden; }
        .gb-topic-header { display:flex; align-items:center; gap:10px; width:100%; padding:14px 18px; background:transparent; border:none; cursor:pointer; text-align:left; transition:background .15s; }
        .gb-topic-header:hover { background:#f7f8ff; }
        .gb-topic-accent { width:4px; height:22px; border-radius:3px; flex-shrink:0; }
        .gb-topic-name { flex:1; font-size:15px; font-weight:700; color:var(--ink); }
        .gb-topic-count { font-size:11px; padding:3px 9px; border-radius:20px; background:#eef0ff; color:#5f6bb3; font-weight:600; }
        .gb-topic-chevron { color:var(--muted); display:flex; }
        .gb-topic-body { border-top:1px solid var(--line); padding:0 18px; }
        .gb-quest-row { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid var(--line); }
        .gb-quest-row:last-child { border-bottom:none; }
        .gb-quest-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
        .gb-quest-info { flex:1; }
        .gb-quest-info strong { display:block; font-size:14px; }
        .gb-quest-info small { color:var(--muted); font-size:11px; }
        .gb-quest-status { font-size:10px; padding:2px 7px; border-radius:20px; font-weight:600; }
        .gb-quest-status--published { background:#e8faf0; color:#1a7a45; }
        .gb-quest-status--draft { background:#fff0ee; color:#c25a53; }
        .gb-quest-status--archived { background:#f1f5f9; color:#64748b; }
        .gb-quest-actions { display:flex; gap:4px; }
        .gb-icon-btn { display:grid; place-items:center; width:30px; height:30px; border-radius:8px; background:transparent; color:var(--muted); border:1px solid var(--line); cursor:pointer; transition:all .15s; }
        .gb-icon-btn:hover { background:#eef0ff; color:#5f6bb3; border-color:#c8ccff; }
        .gb-icon-btn--danger:hover { background:#fff0ee; color:#c25a53; border-color:#fecaca; }
        .gb-btn-primary { display:inline-flex; align-items:center; gap:6px; padding:10px 18px; border-radius:10px; background:var(--ink); color:var(--white); font-size:13px; font-weight:700; border:none; cursor:pointer; transition:opacity .15s; white-space:nowrap; }
        .gb-btn-primary:disabled { opacity:.5; cursor:not-allowed; }
        .gb-btn-primary:not(:disabled):hover { opacity:.85; }
        .gb-btn-secondary { display:inline-flex; align-items:center; gap:6px; padding:10px 18px; border-radius:10px; background:transparent; color:var(--muted); font-size:13px; font-weight:700; border:1px solid var(--line); cursor:pointer; transition:all .15s; }
        .gb-btn-secondary:hover { background:#f5f6ff; }
        .gb-loading { display:flex; flex-direction:column; gap:12px; }
        .gb-skeleton { height:68px; border-radius:14px; background:linear-gradient(90deg,#eef0ff 25%,#f5f6ff 50%,#eef0ff 75%); background-size:200% 100%; animation:gbShimmer 1.4s infinite; }
        @keyframes gbShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .gb-empty { display:grid; place-items:center; text-align:center; padding:60px 20px; color:var(--muted); background:var(--white); border-radius:14px; box-shadow:0 4px 18px rgba(38,48,105,.06); }
        .gb-empty svg { margin-bottom:14px; opacity:.35; }
        .gb-empty h3 { margin:0 0 8px; color:var(--ink); font-size:18px; }
        .gb-empty p { margin:0; font-size:13px; }
        .gb-modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:9000; display:grid; place-items:center; padding:20px; backdrop-filter:blur(4px); animation:gbFadeIn .2s ease; }
        @keyframes gbFadeIn { from{opacity:0} to{opacity:1} }
        .gb-modal { width:min(100%,520px); border-radius:18px; background:var(--white); box-shadow:0 24px 60px rgba(0,0,0,.18); overflow:hidden; animation:gbSlideUp .2s ease; }
        .gb-modal--wide { width:min(100%,820px); }
        @keyframes gbSlideUp { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
        .gb-modal-header { display:flex; justify-content:space-between; align-items:flex-start; padding:22px 24px 0; }
        .gb-modal-header h3 { margin:0 0 4px; font-size:18px; }
        .gb-modal-header p { margin:0; font-size:13px; color:var(--muted); }
        .gb-modal-close { display:grid; place-items:center; width:32px; height:32px; border-radius:8px; background:transparent; border:1px solid var(--line); cursor:pointer; color:var(--muted); flex-shrink:0; }
        .gb-modal-close:hover { background:#f5f6ff; }
        .gb-modal-tabs { display:flex; gap:8px; padding:16px 24px 0; }
        .gb-modal-tabs button { display:inline-flex; align-items:center; gap:5px; padding:7px 14px; border-radius:8px; border:1px solid var(--line); background:transparent; font-size:12px; font-weight:600; color:var(--muted); cursor:pointer; transition:all .15s; }
        .gb-modal-tabs button.active { background:var(--ink); color:var(--white); border-color:var(--ink); }
        .gb-topic-grid { display:flex; flex-wrap:wrap; gap:8px; padding:16px 24px; }
        .gb-topic-grid--compact { padding:12px 0; }
        .gb-topic-chip { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:20px; border:1.5px solid var(--line); background:transparent; font-size:12px; font-weight:600; color:var(--ink); cursor:pointer; transition:all .15s; }
        .gb-topic-chip.selected { border-color:var(--chip-color); background:color-mix(in srgb,var(--chip-color) 15%,white); }
        .gb-topic-chip:hover:not(.selected) { background:#f5f6ff; border-color:#c8ccff; }
        .gb-chip-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .gb-chip-check { color:green; flex-shrink:0; }
        .gb-modal-field { padding:16px 24px; }
        .gb-modal-field label { display:block; font-size:12px; font-weight:700; color:var(--muted); margin-bottom:8px; text-transform:uppercase; letter-spacing:.06em; }
        .gb-modal-field input { width:100%; padding:10px 12px; border:1.5px solid var(--line); border-radius:8px; font-size:14px; color:var(--ink); outline:none; transition:border-color .15s; box-sizing:border-box; }
        .gb-modal-field input:focus { border-color:#818cf8; }
        .gb-modal-footer { display:flex; justify-content:flex-end; gap:10px; padding:16px 24px 22px; border-top:1px solid var(--line); }
        .gb-add-layout { display:grid; grid-template-columns:1fr 1fr; border-top:1px solid var(--line); border-bottom:1px solid var(--line); max-height:420px; }
        .gb-add-left { border-right:1px solid var(--line); display:flex; flex-direction:column; overflow:hidden; }
        .gb-add-right { padding:16px; overflow-y:auto; }
        .gb-add-section-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--muted); margin:0 0 8px; }
        .gb-search-wrap { display:flex; align-items:center; gap:8px; padding:10px 14px; border-bottom:1px solid var(--line); color:var(--muted); }
        .gb-search-wrap input { flex:1; border:none; outline:none; font-size:13px; background:transparent; color:var(--ink); }
        .gb-story-list { overflow-y:auto; flex:1; }
        .gb-story-pick { display:flex; align-items:center; gap:10px; width:100%; padding:11px 14px; background:transparent; border:none; border-bottom:1px solid var(--line); cursor:pointer; text-align:left; transition:background .12s; }
        .gb-story-pick:hover { background:#f7f8ff; }
        .gb-story-pick.selected { background:#eef0ff; }
        .gb-story-pick strong { display:block; font-size:13px; color:var(--ink); }
        .gb-story-pick small { font-size:11px; color:var(--muted); }
        .gb-pick-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
        .gb-pick-check { margin-left:auto; color:#4ade80; flex-shrink:0; }
        .gb-empty-pick { padding:32px 16px; text-align:center; color:var(--muted); font-size:13px; }
        @media (max-width:600px) { .gb-add-layout{grid-template-columns:1fr} .gb-add-left{border-right:none;border-bottom:1px solid var(--line);max-height:220px} }
      `}</style>
    </>
  )
}
