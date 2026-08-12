/**
 * lib/phoneUtils.ts
 *
 * Philippine mobile number utilities.
 *
 * Storage / submission format: E.164  →  +63XXXXXXXXXX  (12 digits total)
 * Input formats accepted:
 *   09171234567   (local 11-digit with leading 0)
 *   9171234567    (10-digit without leading 0)
 *   +639171234567 (already E.164)
 *   639171234567  (E.164 without +)
 */

/** Strip all non-digit characters except a leading '+'. */
function strip(raw: string): string {
  return raw.replace(/[^\d+]/g, '')
}

/**
 * Convert any recognisable Philippine mobile format to E.164 (+63XXXXXXXXXX).
 * Returns null if the input cannot be normalised.
 */
export function toE164(raw: string): string | null {
  const s = strip(raw.trim())

  // Already E.164
  if (/^\+639\d{9}$/.test(s)) return s

  // 639XXXXXXXXX (no +)
  if (/^639\d{9}$/.test(s)) return `+${s}`

  // 09XXXXXXXXX (local, 11 digits)
  if (/^09\d{9}$/.test(s)) return `+63${s.slice(1)}`

  // 9XXXXXXXXX (10 digits, no leading 0)
  if (/^9\d{9}$/.test(s)) return `+63${s}`

  return null
}

/**
 * True if the raw string is a valid Philippine mobile number (any supported format).
 */
export function isValidPHPhone(raw: string): boolean {
  return toE164(raw) !== null
}

/**
 * Format for display: converts E.164 back to the local 0XXX-XXX-XXXX style.
 * Example: +639171234567  →  0917-123-4567
 */
export function formatDisplay(e164: string): string {
  const digits = e164.replace(/^\+63/, '0') // → 09171234567
  if (digits.length !== 11) return e164
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
}

/**
 * Return a user-friendly validation error for a phone field, or null if valid.
 */
export function phoneError(raw: string): string | null {
  if (!raw.trim()) return 'Please enter your mobile number.'
  if (!isValidPHPhone(raw))
    return 'Enter a valid Philippine mobile number (e.g. 0917 123 4567).'
  return null
}
