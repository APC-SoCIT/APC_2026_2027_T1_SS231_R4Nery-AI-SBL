'use client'

// Small original mascot used on the "Generating your Story" step.
// Pure inline SVG, brand-colored, no external assets.
export function GeneratingMascot() {
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="65" cy="65" r="62" fill="#eaf2ff" />
      {/* body */}
      <rect x="30" y="55" width="70" height="55" rx="20" fill="#0755b9" />
      {/* head */}
      <circle cx="65" cy="45" r="30" fill="#79a8ff" />
      {/* ears */}
      <circle cx="38" cy="30" r="9" fill="#79a8ff" />
      <circle cx="92" cy="30" r="9" fill="#79a8ff" />
      {/* face */}
      <circle cx="54" cy="45" r="5" fill="#17244a" />
      <circle cx="76" cy="45" r="5" fill="#17244a" />
      <path d="M54 58 Q65 66 76 58" stroke="#17244a" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* cheeks */}
      <circle cx="44" cy="52" r="4" fill="#ff9d8f" opacity="0.6" />
      <circle cx="86" cy="52" r="4" fill="#ff9d8f" opacity="0.6" />
      {/* laptop */}
      <rect x="42" y="88" width="46" height="30" rx="4" fill="#ffffff" />
      <rect x="42" y="88" width="46" height="6" rx="3" fill="#c7e94e" />
      <path d="M60 100 l4 5 l6 -9" stroke="#0755b9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* waving arm */}
      <circle cx="103" cy="70" r="8" fill="#79a8ff" />
      {/* star */}
      <path
        d="M107 20 l3 7 7 1 -5 5 1 8 -6 -4 -6 4 1 -8 -5 -5 7 -1z"
        fill="#c7e94e"
      />
    </svg>
  )
}