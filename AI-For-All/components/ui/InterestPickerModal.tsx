'use client'

/**
 * components/ui/InterestPickerModal.tsx
 *
 * Animated popup shown to new registered users so they can pick
 * up to MAX_INTERESTS topics that interest them.
 *
 * Usage:
 *   <InterestPickerModal
 *     open={show}
 *     onComplete={(interests) => { ... }}
 *   />
 *
 * The modal calls PATCH /api/account/interests and then calls onComplete.
 * Pass onComplete={null} to skip saving (useful for guests — not shown).
 */

import { useState, useEffect } from 'react'
import { Sparkles, Check, ChevronRight, Loader2 } from 'lucide-react'
import { PRESET_TOPICS, TOPIC_COLORS, MAX_INTERESTS } from '@/lib/topics'

interface Props {
  open: boolean
  onComplete: (interests: string[]) => void
}

const TOPIC_EMOJIS: Record<string, string> = {
  'AI Concepts':            '🤖',
  'Smart Helpers':          '🧠',
  'Creative Thinking':      '🎨',
  'Fairness in Technology': '⚖️',
  'Rate Limiting':          '🚦',
  'Prompt Engineering':     '💬',
  'Ethics in AI':           '🛡️',
  'Machine Learning':       '📊',
  'Data & Privacy':         '🔒',
  'Robotics':               '🦾',
}

export function InterestPickerModal({ open, onComplete }: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Animate in/out
  useEffect(() => {
    if (open) {
      setMounted(true)
      // Give the DOM a tick to mount before triggering the animation
      setTimeout(() => setVisible(true), 20)
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 400)
      return () => clearTimeout(t)
    }
  }, [open])

  function toggle(topic: string) {
    setSelected(prev => {
      if (prev.includes(topic)) return prev.filter(t => t !== topic)
      if (prev.length >= MAX_INTERESTS) return prev          // already at limit
      return [...prev, topic]
    })
  }

  async function handleSave() {
    if (selected.length === 0) return
    setSaving(true)
    try {
      await fetch('/api/account/interests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: selected }),
      })
    } catch {
      // Non-fatal — still close and continue
    } finally {
      setSaving(false)
      onComplete(selected)
    }
  }

  function handleSkip() {
    onComplete([])
  }

  if (!mounted) return null

  return (
    <div className={`ipm-backdrop${visible ? ' ipm-backdrop--in' : ''}`} role="dialog" aria-modal="true" aria-label="Choose your interests">
      <div className={`ipm-card${visible ? ' ipm-card--in' : ''}`}>

        {/* Header */}
        <div className="ipm-header">
          <div className="ipm-header-icon" aria-hidden="true">
            <Sparkles size={28} />
          </div>
          <h2 className="ipm-title">What interests you?</h2>
          <p className="ipm-subtitle">
            Pick up to <strong>{MAX_INTERESTS} topics</strong> to personalize your learning journey.
          </p>
        </div>

        {/* Topic grid */}
        <div className="ipm-grid" role="group" aria-label="Topic choices">
          {PRESET_TOPICS.map((topic, i) => {
            const isSelected = selected.includes(topic)
            const isDisabled = !isSelected && selected.length >= MAX_INTERESTS
            const color = TOPIC_COLORS[topic] ?? '#94a3b8'
            const emoji = TOPIC_EMOJIS[topic] ?? '✨'

            return (
              <button
                key={topic}
                className={`ipm-chip${isSelected ? ' ipm-chip--on' : ''}${isDisabled ? ' ipm-chip--dim' : ''}`}
                style={{
                  '--chip-color': color,
                  animationDelay: `${i * 40}ms`,
                } as React.CSSProperties}
                onClick={() => toggle(topic)}
                aria-pressed={isSelected}
                disabled={isDisabled && !isSelected}
                title={topic}
              >
                <span className="ipm-chip-emoji" aria-hidden="true">{emoji}</span>
                <span className="ipm-chip-label">{topic}</span>
                {isSelected && (
                  <span className="ipm-chip-check" aria-hidden="true">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Counter */}
        <div className="ipm-counter" aria-live="polite">
          {selected.length === 0
            ? 'Tap a topic to select it'
            : selected.length === MAX_INTERESTS
            ? `🎉 Great picks! You chose ${MAX_INTERESTS}`
            : `${selected.length} of ${MAX_INTERESTS} selected`}
        </div>

        {/* Actions */}
        <div className="ipm-actions">
          <button
            className="ipm-skip"
            onClick={handleSkip}
            disabled={saving}
          >
            Skip for now
          </button>
          <button
            className={`ipm-save${selected.length > 0 ? ' ipm-save--ready' : ''}`}
            onClick={handleSave}
            disabled={selected.length === 0 || saving}
            aria-busy={saving}
          >
            {saving
              ? <><Loader2 size={16} className="ipm-spin" /> Saving…</>
              : <>{`Let's go`} <ChevronRight size={16} /></>
            }
          </button>
        </div>
      </div>

      <style>{`
        /* Backdrop */
        .ipm-backdrop{
          position:fixed;inset:0;z-index:9000;
          display:flex;align-items:center;justify-content:center;
          padding:16px;
          background:rgba(10,12,30,0);
          backdrop-filter:blur(0px);
          transition:background .35s ease,backdrop-filter .35s ease;
        }
        .ipm-backdrop--in{
          background:rgba(10,12,30,.55);
          backdrop-filter:blur(8px);
        }

        /* Card */
        .ipm-card{
          width:100%;max-width:520px;
          border-radius:24px;
          background:#fff;
          box-shadow:0 32px 80px rgba(10,12,30,.22),0 4px 16px rgba(10,12,30,.1);
          padding:32px 28px 24px;
          opacity:0;
          transform:translateY(40px) scale(.96);
          transition:opacity .38s cubic-bezier(.22,1,.36,1),transform .38s cubic-bezier(.22,1,.36,1);
          will-change:transform,opacity;
        }
        .ipm-card--in{
          opacity:1;
          transform:translateY(0) scale(1);
        }

        /* Header */
        .ipm-header{text-align:center;margin-bottom:24px}
        .ipm-header-icon{
          display:inline-flex;align-items:center;justify-content:center;
          width:56px;height:56px;border-radius:16px;
          background:linear-gradient(135deg,#818cf8,#a78bfa);
          color:#fff;margin-bottom:14px;
          box-shadow:0 8px 24px rgba(129,140,248,.35);
          animation:ipmIconPop .5s .1s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes ipmIconPop{from{transform:scale(.6) rotate(-10deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
        .ipm-title{
          margin:0 0 8px;
          font-size:22px;font-weight:800;
          background:linear-gradient(135deg,#1e1b4b,#4c1d95);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
        }
        .ipm-subtitle{margin:0;font-size:14px;color:#64748b;line-height:1.5}
        .ipm-subtitle strong{color:#4c1d95}

        /* Grid */
        .ipm-grid{
          display:flex;flex-wrap:wrap;gap:8px;
          margin-bottom:16px;
          justify-content:center;
        }

        /* Chips */
        .ipm-chip{
          display:inline-flex;align-items:center;gap:7px;
          padding:9px 14px;border-radius:99px;
          border:2px solid color-mix(in srgb,var(--chip-color) 35%,transparent);
          background:color-mix(in srgb,var(--chip-color) 8%,white);
          color:color-mix(in srgb,var(--chip-color) 70%,#1e293b);
          font-size:13px;font-weight:600;cursor:pointer;
          transition:all .18s cubic-bezier(.22,1,.36,1);
          animation:ipmChipIn .35s both;
          position:relative;user-select:none;
        }
        @keyframes ipmChipIn{
          from{opacity:0;transform:translateY(10px) scale(.9)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }
        .ipm-chip:hover:not(:disabled){
          border-color:var(--chip-color);
          background:color-mix(in srgb,var(--chip-color) 15%,white);
          transform:translateY(-2px);
          box-shadow:0 4px 12px color-mix(in srgb,var(--chip-color) 30%,transparent);
        }
        .ipm-chip--on{
          border-color:var(--chip-color) !important;
          background:color-mix(in srgb,var(--chip-color) 18%,white) !important;
          box-shadow:0 4px 16px color-mix(in srgb,var(--chip-color) 35%,transparent);
          transform:translateY(-1px);
        }
        .ipm-chip--dim{opacity:.38;cursor:not-allowed;transform:none !important}
        .ipm-chip-emoji{font-size:16px;line-height:1}
        .ipm-chip-label{line-height:1}
        .ipm-chip-check{
          display:flex;align-items:center;justify-content:center;
          width:18px;height:18px;border-radius:50%;
          background:var(--chip-color);color:#fff;
          flex-shrink:0;
          animation:ipmCheckIn .2s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes ipmCheckIn{from{transform:scale(0) rotate(-90deg)}to{transform:scale(1) rotate(0)}}

        /* Counter */
        .ipm-counter{
          text-align:center;font-size:12px;color:#94a3b8;
          margin-bottom:20px;
          min-height:18px;
          transition:color .2s;
        }

        /* Actions */
        .ipm-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px}
        .ipm-skip{
          background:transparent;border:none;cursor:pointer;
          font-size:13px;color:#94a3b8;padding:10px 12px;border-radius:10px;
          transition:color .15s,background .15s;
        }
        .ipm-skip:hover{color:#475569;background:#f1f5f9}
        .ipm-save{
          display:inline-flex;align-items:center;gap:6px;
          padding:12px 22px;border-radius:14px;border:none;cursor:pointer;
          font-size:14px;font-weight:700;
          background:#e2e8f0;color:#94a3b8;
          transition:all .2s cubic-bezier(.22,1,.36,1);
        }
        .ipm-save--ready{
          background:linear-gradient(135deg,#818cf8,#6366f1);
          color:#fff;
          box-shadow:0 6px 20px rgba(99,102,241,.4);
        }
        .ipm-save--ready:hover{
          transform:translateY(-1px);
          box-shadow:0 8px 24px rgba(99,102,241,.5);
        }
        .ipm-save:disabled:not(.ipm-save--ready){cursor:not-allowed}
        .ipm-spin{animation:ipmRotate .8s linear infinite}
        @keyframes ipmRotate{to{transform:rotate(360deg)}}

        @media(max-width:480px){
          .ipm-card{padding:24px 16px 20px;border-radius:20px}
          .ipm-title{font-size:19px}
          .ipm-chip{font-size:12px;padding:8px 11px}
          .ipm-chip-emoji{font-size:14px}
        }
      `}</style>
    </div>
  )
}
