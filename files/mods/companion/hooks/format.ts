const LABEL_MAX = 60

function basename(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, LABEL_MAX)
}

function field(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** A short human label for what a tool call is doing, from its input. */
export function toolLabel(tool: string, input: Record<string, unknown>): string {
  const path = field(input, 'file_path') ?? field(input, 'notebook_path')
  if (path !== undefined) return basename(path)

  const detail =
    field(input, 'description') ??
    field(input, 'command') ??
    field(input, 'pattern') ??
    field(input, 'query') ??
    field(input, 'url') ??
    field(input, 'subject') ??
    field(input, 'prompt')

  return detail === undefined ? '' : oneLine(detail)
}

// Hangul, CJK and fullwidth forms take two terminal columns.
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/

export function displayWidth(text: string): number {
  return [...text].reduce((cols, ch) => cols + (WIDE.test(ch) ? 2 : 1), 0)
}

/** Pads to `cols` terminal columns, so Korean and Latin labels line up. */
export function padCols(text: string, cols: number): string {
  return text + ' '.repeat(Math.max(1, cols - displayWidth(text)))
}

/** A bar of `width` cells; `marker` (a percent) draws a tick where it falls. */
export function bar(percent: number, width: number, marker?: number): string {
  const clamped = Math.max(0, Math.min(100, percent))
  const filled = Math.round((clamped / 100) * width)
  const cells = Array.from({ length: width }, (_, i) => (i < filled ? '█' : '░'))
  if (marker === undefined || marker <= 0 || marker >= 100) return cells.join('')
  const at = Math.min(width - 1, Math.round((marker / 100) * width))
  return cells.map((cell, i) => (i === at && cell === '░' ? '│' : cell)).join('')
}

export function compactTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}k`
  return String(tokens)
}

export function elapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m${String(seconds % 60).padStart(2, '0')}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h${String(minutes % 60).padStart(2, '0')}m`
}

const WINDOW_NAMES: Record<string, string> = {
  five_hour: '5시간',
  seven_day: '7일',
  spend_limit: '지출',
}

export function windowName(kind: string): string {
  return WINDOW_NAMES[kind] ?? kind
}

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

const WINDOW_MS: Record<string, number> = {
  five_hour: 5 * HOUR_MS,
  seven_day: 7 * DAY_MS,
}

/** Length of a rate window by kind; per-model weekly windows are a week. */
export function windowMs(kind: string): number | undefined {
  return WINDOW_MS[kind]
}

export const WEEK_MS = 7 * DAY_MS

/** "14:30" in local time within a day, "N일 뒤" past it. */
export function whenLabel(at: number, now: number): string {
  const hours = (at - now) / HOUR_MS
  if (hours >= 24) return `${Math.round(hours / 24)}일 뒤`
  const date = new Date(at)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** "↻ 14:30" in local time, or "↻ 2일 뒤" past a day away. */
export function resetsIn(iso: string | undefined, now: number): string {
  if (iso === undefined) return ''
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return ''
  return `↻ ${whenLabel(at, now)}`
}

const PACE_MIN_PERCENT = 10
const PACE_MIN_ELAPSED_SHARE = 0.1

/**
 * When the window runs out at the pace used so far, if that comes before it
 * resets; undefined when it lasts, or too little of it has gone to tell.
 */
export function exhaustsAt(
  percentUsed: number,
  resetsAtIso: string | undefined,
  lengthMs: number | undefined,
  now: number,
): number | undefined {
  if (resetsAtIso === undefined || lengthMs === undefined) return undefined
  if (percentUsed < PACE_MIN_PERCENT || percentUsed >= 100) return undefined
  const resetsAt = Date.parse(resetsAtIso)
  if (Number.isNaN(resetsAt) || resetsAt <= now) return undefined
  const gone = lengthMs - (resetsAt - now)
  if (gone < lengthMs * PACE_MIN_ELAPSED_SHARE) return undefined
  const at = now + ((100 - percentUsed) / percentUsed) * gone
  return at < resetsAt ? at : undefined
}

export function percentColor(percent: number): 'success' | 'warning' | 'error' {
  if (percent >= 85) return 'error'
  if (percent >= 60) return 'warning'
  return 'success'
}

/** Context colour against the auto-compact point when one is set. */
export function contextColor(percent: number, compactAt: number | null): 'success' | 'warning' | 'error' {
  if (compactAt === null) return percentColor(percent)
  if (percent >= compactAt - 5) return 'error'
  if (percent >= compactAt - 20) return 'warning'
  return 'success'
}

const FAMILY = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2})(?!\d))?/

/** "claude-opus-5-5" → "Opus 5.5", "claude-haiku-4-5-20251001" → "Haiku 4.5"; else the id. */
export function modelName(id: string): string {
  const isLong = /\[1m\]$/i.test(id)
  const bare = id.replace(/\[[^\]]*\]$/, '')
  const match = FAMILY.exec(bare)
  if (match === null) return id
  const [, family = '', major, minor] = match
  const name = `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}${minor === undefined ? '' : `.${minor}`}`
  return isLong ? `${name} (1M)` : name
}

const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', KRW: '₩' }
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND'])

/** An amount in minor units (cents; whole units for zero-decimal currencies). */
export function money(minor: number, currency: string): string {
  const code = currency.toUpperCase()
  const symbol = SYMBOLS[code] ?? `${code} `
  if (ZERO_DECIMAL.has(code)) return `${symbol}${Math.round(minor).toLocaleString('en-US')}`
  return `${symbol}${(minor / 100).toFixed(2)}`
}
