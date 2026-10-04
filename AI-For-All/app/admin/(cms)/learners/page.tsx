'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Users, Search, X, Check, ChevronDown, ArrowUpAZ, SlidersHorizontal,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  Mail, Shield, UserCircle, Circle, RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────
type Role = 'guest' | 'registered' | 'admin'
type SortKey = 'name-asc' | 'name-desc' | 'role' | 'joined-newest' | 'joined-oldest'

interface Learner {
  user_id: string
  username: string
  user_sname?: string
  email?: string
  role: Role
  created_at: string
}

const LEARNERS_PER_PAGE = 12

const ROLE_LABELS: Record<Role, string> = {
  guest: 'Guest',
  registered: 'Registered',
  admin: 'Admin',
}
const ROLE_COLORS: Record<Role, { bg: string; color: string }> = {
  guest:      { bg: '#f1f5f9', color: '#64748b' },
  registered: { bg: '#e8faf0', color: '#1a7a45' },
  admin:      { bg: '#ece9ff', color: '#6d5fbc' },
}

// ── Learner row ───────────────────────────────────────────────────────────
function LearnerRow({ learner }: { learner: Learner }) {
  const initials = [learner.username?.[0], learner.user_sname?.[0]].filter(Boolean).join('').toUpperCase() || '?'
  const joined = learner.created_at
    ? new Date(learner.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—'
  const rc = ROLE_COLORS[learner.role] ?? ROLE_COLORS.guest

  return (
    <div className="lr-row">
      {/* Avatar */}
      <div className="lr-avatar">{initials}</div>
      {/* Name + email */}
      <div className="lr-info">
        <strong>{[learner.username, learner.user_sname].filter(Boolean).join(' ') || 'Unnamed'}</strong>
        {learner.email && <small><Mail size={11} style={{marginRight:3}} />{learner.email}</small>}
      </div>
      {/* Role badge */}
      <span className="lr-role-badge" style={{ background: rc.bg, color: rc.color }}>
        {learner.role === 'admin' ? <Shield size={11} /> : learner.role === 'registered' ? <UserCircle size={11} /> : <Circle size={11} />}
        {ROLE_LABELS[learner.role]}
      </span>
      {/* Joined */}
      <span className="lr-joined">{joined}</span>
    </div>
  )
}

// ── Filter dropdown ───────────────────────────────────────────────────────
function FilterDropdown({ sort, setSort, roleFilter, setRoleFilter }: {
  sort: SortKey; setSort: (v: SortKey) => void
  roleFilter: string; setRoleFilter: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const activeCount = [sort !== 'joined-newest', roleFilter !== 'All'].filter(Boolean).length

  return (
    <div className="lr-filter-wrap" ref={ref}>
      <button className={`lr-filter-btn${activeCount > 0 ? ' active' : ''}`} onClick={() => setOpen(o => !o)}>
        <SlidersHorizontal size={15} /> Filter &amp; Sort
        {activeCount > 0 && <span className="lr-filter-badge">{activeCount}</span>}
        <ChevronDown size={13} style={{ marginLeft: 2, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div className="lr-filter-panel">
          <div className="lr-filter-section">
            <label className="lr-filter-label"><ArrowUpAZ size={13} /> Sort</label>
            {([
              ['joined-newest', 'Newest First'],
              ['joined-oldest', 'Oldest First'],
              ['name-asc',     'Name A → Z'],
              ['name-desc',    'Name Z → A'],
              ['role',         'By Role'],
            ] as [SortKey, string][]).map(([val, label]) => (
              <button key={val} className={`lr-filter-opt${sort === val ? ' active' : ''}`} onClick={() => setSort(val)}>
                {sort === val && <Check size={12} />}{label}
              </button>
            ))}
          </div>
          <div className="lr-filter-divider" />
          <div className="lr-filter-section">
            <label className="lr-filter-label">Role</label>
            {(['All', 'guest', 'registered', 'admin']).map(v => (
              <button key={v} className={`lr-filter-opt${roleFilter === v ? ' active' : ''}`} onClick={() => { setRoleFilter(v) }}>
                {roleFilter === v && <Check size={12} />}
                {v === 'All' ? 'All Roles' : ROLE_LABELS[v as Role]}
              </button>
            ))}
          </div>
          {activeCount > 0 && (
            <>
              <div className="lr-filter-divider" />
              <button className="lr-filter-reset" onClick={() => { setSort('joined-newest'); setRoleFilter('All') }}>
                <X size={12} /> Reset filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function AdminLearnersPage() {
  const supabase = createClient()
  const [learners, setLearners] = useState<Learner[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('joined-newest')
  const [roleFilter, setRoleFilter] = useState('All')
  const [page, setPage] = useState(1)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('user_id, username, user_sname, email, role, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load learners: ' + error.message)
    } else {
      setLearners((data ?? []) as Learner[])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])


  const filtered = useMemo(() => {
    let list = learners
    if (roleFilter !== 'All') list = list.filter(l => l.role === roleFilter)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(l =>
        (l.username ?? '').toLowerCase().includes(q) ||
        (l.user_sname ?? '').toLowerCase().includes(q) ||
        (l.email ?? '').toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'name-asc':     return (a.username ?? '').localeCompare(b.username ?? '')
        case 'name-desc':    return (b.username ?? '').localeCompare(a.username ?? '')
        case 'role':         return (a.role ?? '').localeCompare(b.role ?? '')
        case 'joined-oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'joined-newest':
        default:             return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
  }, [learners, query, roleFilter, sort])

  // Reset page on filter change
  useMemo(() => setPage(1), [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / LEARNERS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * LEARNERS_PER_PAGE, page * LEARNERS_PER_PAGE)

  const stats = useMemo(() => ({
    total: learners.length,
    registered: learners.filter(l => l.role === 'registered').length,
    guests: learners.filter(l => l.role === 'guest').length,
    admins: learners.filter(l => l.role === 'admin').length,
  }), [learners])

  return (
    <section className="lr-page">
      {/* Stat strip */}
      <div className="lr-stat-strip">
        <div className="lr-stat-card">
          <Users size={18} />
          <strong>{stats.total}</strong>
          <span>Total</span>
        </div>
        <div className="lr-stat-card">
          <UserCircle size={18} style={{ color: '#1a7a45' }} />
          <strong>{stats.registered}</strong>
          <span>Registered</span>
        </div>
        <div className="lr-stat-card">
          <Circle size={18} style={{ color: '#64748b' }} />
          <strong>{stats.guests}</strong>
          <span>Guests</span>
        </div>
        <div className="lr-stat-card">
          <Shield size={18} style={{ color: '#6d5fbc' }} />
          <strong>{stats.admins}</strong>
          <span>Admins</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="lr-toolbar">
        <div className="lr-search">
          <Search size={16} />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1) }}
            placeholder="Search by name or email…"
          />
          {query && (
            <button className="lr-search-clear" onClick={() => { setQuery(''); setPage(1) }}>
              <X size={13} />
            </button>
          )}
        </div>
        <FilterDropdown sort={sort} setSort={setSort} roleFilter={roleFilter} setRoleFilter={setRoleFilter} />
        <button className="lr-refresh-btn" onClick={load} title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Column headers */}
      {!loading && filtered.length > 0 && (
        <div className="lr-col-header">
          <span style={{ flex: '0 0 40px' }} />
          <span style={{ flex: 1 }}>Name / Email</span>
          <span style={{ flex: '0 0 110px' }}>Role</span>
          <span style={{ flex: '0 0 120px' }}>Joined</span>
        </div>
      )}

      {/* Rows */}
      <div className="lr-list">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="lr-skeleton" />)
        ) : filtered.length === 0 ? (
          <div className="lr-empty">
            <Users size={36} />
            <h3>{learners.length === 0 ? 'No learners found.' : 'No learners match your search.'}</h3>
            <p>{learners.length === 0 ? 'Learner accounts will appear here once users sign up.' : 'Try adjusting your search or filters.'}</p>
          </div>
        ) : (
          paginated.map(l => <LearnerRow key={l.user_id} learner={l} />)
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="lr-pagination">
          <span className="lr-pg-info">
            Showing {Math.min((page - 1) * LEARNERS_PER_PAGE + 1, filtered.length)}–{Math.min(page * LEARNERS_PER_PAGE, filtered.length)} of {filtered.length} learner{filtered.length !== 1 ? 's' : ''}
          </span>
          <div className="lr-pg-controls">
            <button onClick={() => setPage(1)} disabled={page === 1} className="lr-pg-btn"><ChevronsLeft size={14} /></button>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="lr-pg-btn"><ChevronLeft size={14} /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .reduce<(number | '…')[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('…')
                acc.push(n)
                return acc
              }, [])
              .map((n, i) =>
                n === '…' ? (
                  <span key={`e-${i}`} className="lr-pg-ellipsis">…</span>
                ) : (
                  <button key={n} onClick={() => setPage(n as number)} className={`lr-pg-btn lr-pg-num${page === n ? ' active' : ''}`}>{n}</button>
                )
              )}
            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="lr-pg-btn"><ChevronRight size={14} /></button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="lr-pg-btn"><ChevronsRight size={14} /></button>
          </div>
        </div>
      )}

      <style>{`
        .lr-page{max-width:900px;display:flex;flex-direction:column;gap:14px}

        /* Stat strip */
        .lr-stat-strip{display:flex;gap:12px;flex-wrap:wrap}
        .lr-stat-card{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;background:var(--white);box-shadow:0 4px 14px rgba(38,48,105,.06);font-size:13px;color:var(--muted)}
        .lr-stat-card svg{color:#818cf8}
        .lr-stat-card strong{color:var(--ink);font-size:18px}

        /* Toolbar */
        .lr-toolbar{display:flex;gap:8px;align-items:center}
        .lr-search{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;background:var(--white);box-shadow:0 4px 14px rgba(38,48,105,.06);flex:1;min-width:0;max-width:340px;color:var(--muted)}
        .lr-search input{flex:1;border:none;outline:none;background:transparent;font-size:14px;color:var(--ink)}
        .lr-search-clear{background:transparent;border:none;cursor:pointer;color:var(--muted);display:flex;align-items:center;padding:0}
        .lr-search-clear:hover{color:var(--ink)}
        .lr-refresh-btn{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;border:1.5px solid var(--line);background:var(--white);color:var(--muted);cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(38,48,105,.06)}
        .lr-refresh-btn:hover{border-color:#818cf8;color:#818cf8}

        /* Filter */
        .lr-filter-wrap{position:relative}
        .lr-filter-btn{display:inline-flex;align-items:center;gap:6px;padding:0 14px;height:38px;border-radius:10px;background:var(--white);border:1.5px solid var(--line);font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;white-space:nowrap;transition:all .15s;box-shadow:0 2px 8px rgba(38,48,105,.06)}
        .lr-filter-btn:hover,.lr-filter-btn.active{border-color:#818cf8;color:var(--ink);background:#f0f1ff}
        .lr-filter-badge{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#818cf8;color:#fff;font-size:10px;font-weight:800}
        .lr-filter-panel{position:absolute;right:0;top:calc(100% + 8px);width:200px;background:var(--white);border-radius:14px;box-shadow:0 12px 40px rgba(38,48,105,.14);border:1px solid var(--line);z-index:500;overflow:hidden;animation:lrSlideUp .15s ease}
        @keyframes lrSlideUp{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
        .lr-filter-section{padding:10px 8px 6px}
        .lr-filter-label{display:flex;align-items:center;gap:5px;padding:4px 8px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
        .lr-filter-opt{display:flex;align-items:center;gap:7px;width:100%;padding:8px 10px;border-radius:8px;background:transparent;border:none;font-size:13px;color:var(--ink);cursor:pointer;text-align:left;transition:background .12s}
        .lr-filter-opt:hover{background:#f0f1ff}
        .lr-filter-opt.active{color:#5b5ee0;font-weight:700}
        .lr-filter-divider{height:1px;background:var(--line);margin:0 8px}
        .lr-filter-reset{display:flex;align-items:center;gap:6px;width:100%;padding:10px 14px;border:none;background:transparent;font-size:12px;color:#c25a53;cursor:pointer;transition:background .12s}
        .lr-filter-reset:hover{background:#fff0ee}

        /* Column header */
        .lr-col-header{display:flex;align-items:center;gap:12px;padding:0 14px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}

        /* Rows */
        .lr-list{display:flex;flex-direction:column;gap:4px}
        .lr-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:var(--white);box-shadow:0 2px 10px rgba(38,48,105,.05);transition:box-shadow .15s}
        .lr-row:hover{box-shadow:0 4px 18px rgba(38,48,105,.09)}
        .lr-avatar{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#818cf8,#5b5ee0);color:#fff;font-size:13px;font-weight:800;flex-shrink:0}
        .lr-info{flex:1;min-width:0}
        .lr-info strong{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .lr-info small{display:flex;align-items:center;font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .lr-role-badge{display:inline-flex;align-items:center;gap:5px;flex:0 0 110px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700}
        .lr-joined{flex:0 0 120px;font-size:12px;color:var(--muted)}

        /* Empty / skeleton */
        .lr-empty{display:grid;place-items:center;text-align:center;padding:60px 20px;color:var(--muted);background:var(--white);border-radius:14px;box-shadow:0 4px 18px rgba(38,48,105,.06)}
        .lr-empty svg{margin-bottom:14px;opacity:.35}
        .lr-empty h3{margin:0 0 8px;color:var(--ink);font-size:18px}
        .lr-empty p{margin:0;font-size:13px}
        .lr-skeleton{height:62px;border-radius:12px;background:linear-gradient(90deg,#eef0ff 25%,#f5f6ff 50%,#eef0ff 75%);background-size:200% 100%;animation:lrShimmer 1.4s infinite}
        @keyframes lrShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

        /* Pagination */
        .lr-pagination{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding-top:12px;border-top:1px solid var(--line)}
        .lr-pg-info{font-size:12px;color:var(--muted)}
        .lr-pg-controls{display:flex;align-items:center;gap:4px}
        .lr-pg-btn{display:grid;place-items:center;min-width:32px;height:32px;border-radius:8px;border:1px solid var(--line);background:transparent;color:var(--muted);cursor:pointer;font-size:13px;transition:all .12s;padding:0 6px}
        .lr-pg-btn:hover:not(:disabled){background:#eef0ff;border-color:#c8ccff;color:#5b5ee0}
        .lr-pg-btn:disabled{opacity:.35;cursor:not-allowed}
        .lr-pg-num{font-weight:600}
        .lr-pg-num.active{background:#818cf8;border-color:#818cf8;color:#fff}
        .lr-pg-ellipsis{font-size:13px;color:var(--muted);padding:0 4px;user-select:none}

        @media(max-width:600px){
          .lr-joined{display:none}
          .lr-role-badge{flex:0 0 90px}
          .lr-col-header{display:none}
        }
      `}</style>
    </section>
  )
}
