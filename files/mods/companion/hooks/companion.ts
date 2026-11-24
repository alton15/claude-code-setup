import type { EngineInterface, SessionRateLimit, Timer } from 'claude-code'

import type { AccountUsage, Usage } from '../types'
import { authorizeUsage, fetchAccountUsage, parseAccountUsage } from './account'
import type { AccountReading } from './account'
import { desktopState, imagesFor, indexAssets, paths } from './bridge'
import { windowName } from './format'
import type { AssetIndex, Paths } from './bridge'
import { isTransient, pick, react } from './reactions'
import type { Reaction } from './reactions'
import { afterFailure, afterSuccess, claim, planRead, readShared, retryAfterMs, writeShared } from './shared'
import type { Shared } from './shared'
import {
  readActive,
  readCompactAt,
  readCompanion,
  readUsage,
  setNow,
  setUsage,
  updateAccount,
  updateCompanion,
} from './state'

type Dollar = EngineInterface

const SETTLE_MS = 15_000
const SLEEP_AFTER_MS = 5 * 60_000
const TICK_MS = 1_000
const CONTEXT_WARN_PERCENT = 80
/** Warn this many points before the auto-compact point, when one is set. */
const COMPACT_WARN_MARGIN = 5
const LIMIT_WARN_PERCENT = 90
/**
 * Least time between two looks at the shared usage reading by this process,
 * unless forced: a floor even when the shared file cannot be written.
 */
const ACCOUNT_MIN_GAP_MS = 2 * 60_000

const NO_ASSETS: AssetIndex = {
  idle: [],
  curious: [],
  thinking: [],
  working: [],
  happy: [],
  error: [],
  sleepy: [],
}

type Runtime = {
  assets: AssetIndex
  where?: Paths
  ticker?: Timer
  settle?: Timer
  warned: ReadonlySet<string>
  accountAt: number
  accountRead?: Promise<void>
}

// Handles that live only as long as this copy of the module: a reload starts
// over here and session.start refills them. Values a drawing reads stay in $.state.
let runtime: Runtime = { assets: NO_ASSETS, warned: new Set(), accountAt: 0 }

export async function loadPaths($: Dollar): Promise<Paths> {
  const where = runtime.where ?? (await paths($))
  runtime = { ...runtime, where }
  return where
}

export async function reloadAssets($: Dollar): Promise<AssetIndex> {
  const where = await loadPaths($)
  const assets = await indexAssets($, where.assets)
  runtime = { ...runtime, assets }
  return assets
}

export function toUsage(
  context: { tokens?: number; window: number; percent?: number },
  limits: readonly SessionRateLimit[],
  cost: { usd: number } | undefined,
  startedAt?: number,
): Usage {
  return {
    contextPercent: context.percent,
    contextTokens: context.tokens,
    contextWindow: context.window,
    costUsd: cost?.usd,
    startedAt,
    limits: limits.map(({ kind, percentUsed, resetsAt }) => ({ kind, percentUsed, resetsAt })),
  }
}

/** Mirrors the companion to the state file the desktop app watches. */
export async function syncDesktop($: Dollar): Promise<void> {
  const where = runtime.where
  if (where === undefined) return
  const [current, tools, measured] = await Promise.all([
    readCompanion($),
    readActive($),
    readUsage($),
  ])
  const text = JSON.stringify(desktopState(current, tools, measured))
  await $.fs.write(where.stateFile, text).catch((error: unknown) => {
    $.ui.log(`companion: state file write failed: ${String(error)}`, { to: 'debug' })
  })
}

export async function say($: Dollar, reaction: Reaction): Promise<void> {
  const at = await $.clock.now()
  const { assets } = runtime
  const next = await updateCompanion($, prev => {
    const picked = react(reaction, Math.random, prev.line)
    const images = imagesFor(assets, picked.mood)
    const isSameMood = picked.mood === prev.mood && prev.file !== ''
    const file = isSameMood ? prev.file : images.length === 0 ? '' : pick(images, Math.random, prev.file)
    return { ...picked, file, at }
  })
  await syncDesktop($)

  runtime.settle?.cancel()
  const settle = isTransient(next.mood)
    ? $.clock.after(SETTLE_MS, () => {
        void settleToIdle($, at)
      })
    : undefined
  runtime = { ...runtime, settle }
}

export async function settleToIdle($: Dollar, since: number): Promise<void> {
  const current = await readCompanion($)
  if (current.at === since && isTransient(current.mood)) await say($, 'idle')
}

export async function checkSleepy($: Dollar): Promise<void> {
  const current = await readCompanion($)
  const idleFor = (await $.clock.now()) - current.at
  if (current.mood === 'idle' && idleFor >= SLEEP_AFTER_MS) await say($, 'sleepy')
}

export async function tick($: Dollar): Promise<void> {
  const tools = await readActive($)
  if (tools.length === 0) {
    stopTimers()
    return
  }
  const at = await $.clock.now()
  await setNow($, at)
}

export function startTicker($: Dollar): void {
  if (runtime.ticker !== undefined) return
  const ticker = $.clock.every(TICK_MS, () => {
    void tick($)
  })
  runtime = { ...runtime, ticker }
}

export function stopTimers(): void {
  runtime.ticker?.cancel()
  runtime = { ...runtime, ticker: undefined }
}

export function cancelAll(): void {
  runtime.ticker?.cancel()
  runtime.settle?.cancel()
  runtime = { ...runtime, ticker: undefined, settle: undefined }
}

export async function warnOnce($: Dollar, key: string, reaction: Reaction, toast: string) {
  if (runtime.warned.has(key)) return
  runtime = { ...runtime, warned: new Set([...runtime.warned, key]) }
  $.ui.toast(toast)
  await say($, reaction)
}

export async function onMeasured($: Dollar, measured: Usage): Promise<void> {
  await setUsage($, measured)
  await syncDesktop($)

  const context = measured.contextPercent ?? 0
  const compactAt = await readCompactAt($)
  const warnAt = compactAt === null ? CONTEXT_WARN_PERCENT : Math.max(1, compactAt - COMPACT_WARN_MARGIN)
  if (context >= warnAt) {
    const suffix = compactAt === null ? '' : ` · ${compactAt}%에서 자동 압축`
    await warnOnce($, 'context', 'context-high', `컨텍스트 ${context}% 사용 중${suffix}`)
  }
  for (const limit of measured.limits) {
    if (limit.percentUsed >= LIMIT_WARN_PERCENT) {
      const name = windowName(limit.kind)
      await warnOnce($, `limit:${limit.kind}`, 'limit-high', `${name} 한도 ${limit.percentUsed}% 사용`)
    }
  }
}

async function warnAccount($: Dollar, account: AccountUsage): Promise<void> {
  for (const window of account.windows) {
    if (window.percentUsed >= LIMIT_WARN_PERCENT) {
      const key = `model:${window.label.toLowerCase()}`
      await warnOnce($, key, 'limit-high', `${window.label} 주간 한도 ${window.percentUsed}% 사용`)
    }
  }
}

function readingOf($: Dollar, shared: Shared): AccountReading | undefined {
  if (shared.body === undefined) return undefined
  try {
    return parseAccountUsage(shared.body)
  } catch (error) {
    $.ui.log(`companion: shared usage body unreadable: ${String(error)}`, { to: 'debug' })
    return undefined
  }
}

/** Draws what the shared file says; this session's last windows while it holds no good read. */
function adopt($: Dollar, shared: Shared) {
  const reading = readingOf($, shared)
  return updateAccount($, prev => ({
    windows: reading?.windows ?? prev?.windows ?? [],
    extra: reading === undefined ? prev?.extra : reading.extra,
    fetchedAt: reading === undefined ? (prev?.fetchedAt ?? 0) : shared.fetchedAt,
    error: shared.error,
    retryAt: shared.retryAt,
  }))
}

/** Claims the attempt in the shared file, asks the endpoint, and shares what it answered. */
async function fetchShared(
  $: Dollar,
  file: string,
  shared: Shared | undefined,
  handle: string,
  at: number,
): Promise<Shared> {
  const claimed = claim(shared, at)
  await writeShared($, file, claimed)
  const outcome = await fetchAccountUsage($, handle)
  if (!outcome.isOk) $.ui.log(`companion: usage endpoint read failed: ${outcome.error}`, { to: 'debug' })
  const next = outcome.isOk
    ? afterSuccess(outcome.body, at)
    : afterFailure(claimed, at, {
        error: outcome.error,
        isRateLimited: outcome.isRateLimited,
        retryAfterMs: retryAfterMs(outcome.retryAfter, at),
      })
  await writeShared($, file, next)
  return next
}

async function readAccount($: Dollar, at: number, isForced: boolean): Promise<void> {
  const auth = await authorizeUsage($)
  if (!auth.isOk) {
    await updateAccount($, prev => ({
      windows: prev?.windows ?? [],
      extra: prev?.extra,
      fetchedAt: prev?.fetchedAt ?? 0,
      error: auth.error,
    }))
    await setNow($, at)
    return
  }

  const { usageFile } = await loadPaths($)
  const shared = await readShared($, usageFile)
  const isWaiting = shared !== undefined && planRead(shared, at, isForced) === 'wait'
  const next = isWaiting ? shared : await fetchShared($, usageFile, shared, auth.handle, at)
  const account = await adopt($, next)
  await setNow($, at)
  if (account !== null && account.error === undefined) await warnAccount($, account)
}

/**
 * Re-reads the per-model windows and usage credits from the reading every
 * session shares, asking the endpoint only when that is stale (or when forced)
 * and never during a 429 backoff; at most once per ACCOUNT_MIN_GAP_MS unless
 * forced, and never two reads at once.
 */
export async function refreshAccount($: Dollar, isForced = false): Promise<void> {
  if (runtime.accountRead !== undefined) return runtime.accountRead
  const at = await $.clock.now()
  if (!isForced && at - runtime.accountAt < ACCOUNT_MIN_GAP_MS) return

  const reading = readAccount($, at, isForced)
    .catch((error: unknown) => {
      $.ui.log(`companion: usage refresh failed: ${String(error)}`, { to: 'debug' })
    })
    .finally(() => {
      runtime = { ...runtime, accountRead: undefined }
    })
  runtime = { ...runtime, accountAt: at, accountRead: reading }
  return reading
}
