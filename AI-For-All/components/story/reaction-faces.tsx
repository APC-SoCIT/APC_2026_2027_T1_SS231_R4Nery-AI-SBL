/**
 * components/story/reaction-faces.tsx
 *
 * Lightweight inline-SVG reaction characters for the Story Reaction screen.
 * Inline SVG keeps the page fast on budget phones and slow mall Wi-Fi
 * (SRS 5.1) and needs no extra image assets. If the design team later
 * exports the illustrated PNGs, drop them in public/ai-for-all/reactions/
 * and swap the <svg> for an <img> here; nothing else needs to change.
 */
import type { StoryReactionValue } from '@/lib/reactions'

const INK = '#1d1d35'

function Eye({ cx, cy, r = 5.5, look = 0 }: { cx: number; cy: number; r?: number; look?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={INK} strokeWidth={1.5} />
      <circle cx={cx + 0.8 + look} cy={cy + 0.6} r={r * 0.5} fill={INK} />
    </>
  )
}

function ClosedEye({ cx, cy }: { cx: number; cy: number }) {
  return <path d={`M${cx - 4} ${cy} q4 3 8 0`} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
}

function SleepyEye({ cx, cy, body, r = 5.5 }: { cx: number; cy: number; body: string; r?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={INK} strokeWidth={1.5} />
      <circle cx={cx} cy={cy + 2} r={r * 0.45} fill={INK} />
      <path d={`M${cx - r - 1} ${cy} A${r + 1} ${r + 1} 0 0 1 ${cx + r + 1} ${cy} Z`} fill={body} />
      <path d={`M${cx - r} ${cy} H${cx + r}`} stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
    </>
  )
}

const line = { fill: 'none', stroke: INK, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function Smile({ y = 42 }: { y?: number }) {
  return <path d={`M26 ${y} q6 5 12 0`} {...line} />
}
function Flat({ y = 43 }: { y?: number }) {
  return <path d={`M27 ${y} h10`} {...line} />
}
function Frown({ y = 45 }: { y?: number }) {
  return <path d={`M27 ${y} q5 -4 10 0`} {...line} />
}
function Wavy({ y = 44 }: { y?: number }) {
  return <path d={`M25 ${y} q2.5 -3 5 0 t5 0 t5 0`} {...line} />
}

function Face({ value }: { value: StoryReactionValue }) {
  switch (value) {
    case 'hooked':
      return (
        <>
          <circle cx="32" cy="34" r="22" fill="#ff8fab" />
          <path d="M11 13 l3 4 M17 9 l1.5 4.5" stroke="#ff5c8a" strokeWidth={2} strokeLinecap="round" />
          {[25, 39].map((x) => (
            <g key={x}>
              <circle cx={x} cy="31" r="5.5" fill={INK} />
              <path d={`M${x - 2.8} 31 h5.6 M${x} 28.2 v5.6`} stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
            </g>
          ))}
          <Smile />
        </>
      )
    case 'enjoying':
      return (
        <>
          <g fill="#ff6b9a">
            <circle cx="21" cy="23" r="12" />
            <circle cx="43" cy="23" r="12" />
            <circle cx="21" cy="43" r="12" />
            <circle cx="43" cy="43" r="12" />
            <circle cx="32" cy="33" r="13" />
          </g>
          <ClosedEye cx={26} cy={30} />
          <ClosedEye cx={38} cy={30} />
          <Smile y={39} />
        </>
      )
    case 'curious':
      return (
        <>
          <path d="M32 8 L53 20 V46 L32 58 L11 46 V20 Z" fill="#9a67d8" stroke="#9a67d8" strokeWidth={4} strokeLinejoin="round" />
          <text x="51" y="12" fontSize="13" fontWeight="800" fill="#7b4fc4" fontFamily="Arial, sans-serif">?</text>
          <Eye cx={25} cy={30} r={6.5} />
          <Eye cx={39} cy={30} r={6.5} />
          <circle cx="32" cy="43" r="2.6" fill={INK} />
        </>
      )
    case 'learning':
      return (
        <>
          <g fill="#a67ee3">
            <rect x="10" y="17" width="44" height="39" rx="12" />
            <circle cx="20" cy="18" r="7" />
            <circle cx="32" cy="15" r="8" />
            <circle cx="44" cy="18" r="7" />
          </g>
          <path d="M55 2 L56.6 6.9 L61.5 8.5 L56.6 10.1 L55 15 L53.4 10.1 L48.5 8.5 L53.4 6.9 Z" fill="#ffc21a" />
          <ClosedEye cx={25} cy={34} />
          <ClosedEye cx={39} cy={34} />
          <Smile y={43} />
        </>
      )
    case 'neutral':
      return (
        <>
          <path d="M12 56 V31 a20 20 0 0 1 40 0 V56 Z" fill="#2c9cf2" />
          <Eye cx={25} cy={31} />
          <Eye cx={39} cy={31} />
          <Flat y={44} />
        </>
      )
    case 'unsure':
      return (
        <>
          <path d="M20 10 H44 L56 32 L44 54 H20 L8 32 Z" fill="#1c63d8" stroke="#1c63d8" strokeWidth={4} strokeLinejoin="round" />
          <Eye cx={25} cy={29} />
          <Eye cx={39} cy={29} />
          <Frown y={43} />
        </>
      )
    case 'confused':
      return (
        <>
          <circle cx="32" cy="33" r="22" fill="#1fa45a" />
          <circle cx="25" cy="29" r="6" fill="#fff" stroke={INK} strokeWidth={1.5} />
          <path d="M25 29 m-0.5 -0.5 a1.2 1.2 0 1 1 1.6 1.6 a2.6 2.6 0 1 1 -3.6 -3.4 a4 4 0 1 1 5.4 5.6" {...line} strokeWidth={1.4} />
          <Eye cx={39} cy={29} />
          <Wavy y={42} />
        </>
      )
    case 'slow':
      return (
        <>
          <path d="M32 9 L57 54 H7 Z" fill="#29a85a" stroke="#29a85a" strokeWidth={5} strokeLinejoin="round" />
          <path d="M53 17 l5 -2 M55 23 h5" stroke="#29a85a" strokeWidth={2} strokeLinecap="round" />
          <SleepyEye cx={25} cy={38} body="#29a85a" r={4.8} />
          <SleepyEye cx={39} cy={38} body="#29a85a" r={4.8} />
          <Flat y={47} />
        </>
      )
    case 'bored':
      return (
        <>
          <rect x="10" y="10" width="44" height="44" rx="7" fill="#ff6a14" />
          <SleepyEye cx={25} cy={29} body="#ff6a14" />
          <SleepyEye cx={39} cy={29} body="#ff6a14" />
          <Flat y={42} />
        </>
      )
    case 'overwhelmed':
      return (
        <>
          <circle cx="31" cy="34" r="22" fill="#ff7b1c" />
          <path d="M55 5 q4.5 6.5 0 9.5 q-4.5 -3 0 -9.5 Z" fill="#4fb3ff" />
          <path d="M19 22 l7 3 M43 22 l-7 3" {...line} />
          <Eye cx={24} cy={31} />
          <Eye cx={38} cy={31} />
          <path d="M24 47 q7 -9 14 0 Z" fill={INK} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
        </>
      )
    case 'losing_interest':
      return (
        <>
          <g fill="#ffb000">
            <rect x="13" y="9" width="38" height="16" rx="8" />
            <rect x="9" y="24" width="46" height="16" rx="8" />
            <rect x="13" y="39" width="38" height="17" rx="8.5" />
          </g>
          <SleepyEye cx={25} cy={30} body="#ffb000" />
          <SleepyEye cx={39} cy={30} body="#ffb000" />
          <Frown y={46} />
        </>
      )
    case 'try_another':
      return (
        <>
          <path d="M12 56 V14 A42 42 0 0 1 54 56 Z" fill="#ffbe10" />
          <path d="M51 13 l5 -3 M54 20 l5 -1" stroke="#ffbe10" strokeWidth={2} strokeLinecap="round" />
          <Eye cx={27} cy={34} look={1.5} />
          <Eye cx={40} cy={34} look={1.5} />
          <path d="M30 46 q5 3.5 10 0" {...line} />
        </>
      )
  }
}

export function ReactionFace({ value }: { value: StoryReactionValue }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <Face value={value} />
    </svg>
  )
}