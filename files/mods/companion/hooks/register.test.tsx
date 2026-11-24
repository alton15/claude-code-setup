import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'
import type { On } from 'claude-code'

const HOME = '/Users/tester'
const ASSETS = `${HOME}/.claude/companion/assets`
const HANDLE = 'handle-1'
const FABLE_RESET = '2026-11-28T00:00:00.000Z'
const USAGE_FILE = `${HOME}/.claude/companion/usage.json`
const NOW = Date.parse('2026-11-24T06:00:00.000Z')
const MINUTE = 60_000

const PANE = {
  plugin: 'companion',
  component: 'Pane',
  requestId: 'companion',
  props: {
    title: '현황',
    isFocused: false,
    bodyColumns: 44,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

/** What /api/oauth/usage answers for a Max account using Fable. */
const USAGE_BODY = {
  five_hour: { utilization: 12, resets_at: '2026-11-24T10:00:00.000Z' },
  seven_day: { utilization: 20, resets_at: FABLE_RESET },
  seven_day_opus: null,
  seven_day_sonnet: { utilization: 4, resets_at: FABLE_RESET },
  limits: [
    { kind: 'session', group: 'session', percent: 12, resets_at: '2026-11-24T10:00:00.000Z', scope: null },
    {
      kind: 'weekly_scoped',
      group: 'weekly',
      percent: 37.5,
      resets_at: FABLE_RESET,
      scope: { model: { display_name: 'Fable' } },
    },
  ],
  extra_usage: { is_enabled: true, monthly_limit: 5000, used_credits: 1240, utilization: 24.8, currency: 'usd' },
}

type Write = { path: string; text: string }
type Fetch = { url: string; auth?: string; beta?: string }

type EngineOptions = {
  isAppBuilt?: boolean
  env?: Record<string, string>
  isLoggedIn?: boolean
  usageStatus?: number
  usageBody?: unknown
  usageHeaders?: Record<string, string>
  /** Files on disk at the start, by absolute path: what other sessions wrote. */
  files?: Record<string, string>
}

/** Stands in for the engine: one PNG per mood, no desktop app, files in memory, writes and fetches recorded. */
function engine(on: On, options: EngineOptions = {}) {
  const {
    isAppBuilt = false,
    env = {},
    isLoggedIn = true,
    usageStatus = 200,
    usageBody = USAGE_BODY,
    usageHeaders = {},
  } = options
  const writes: Write[] = []
  const fetches: Fetch[] = []
  const files = new Map(Object.entries(options.files ?? {}))
  mock.env(on, { HOME, ...env })
  const clock = mock.clock(on, { now: NOW })
  on('fs.list', () => ({
    value: [{ name: '01.png', kind: 'file', size: 1, mtimeMs: 0, isLink: false }],
  }))
  on('fs.exists', (_, e) => ({ value: e.path.endsWith('.app') ? isAppBuilt : files.has(e.path) }))
  on('fs.read', (_, e) => {
    const text = files.get(e.path)
    if (text === undefined) throw new Error(`ENOENT: ${e.path}`)
    return { value: text }
  })
  on('fs.write', (_, e) => {
    writes.push({ path: e.path, text: e.text })
    files.set(e.path, e.text)
    return { value: undefined }
  })
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 50_000, window: 200_000, percent: 25 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 12 }],
      cost: { usd: 0.42 },
    },
  }))
  on('session.authorize', () => ({ value: isLoggedIn ? { handle: HANDLE, kind: 'bearer' } : null }))
  on('http.fetch', (_, e) => {
    fetches.push({ url: e.url, auth: e.init?.auth, beta: e.init?.headers?.['anthropic-beta'] })
    return {
      value: {
        status: usageStatus,
        ok: usageStatus >= 200 && usageStatus < 300,
        headers: usageHeaders,
        text: JSON.stringify(usageBody),
      },
    }
  })
  on('ui.log', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'hud' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('turn.step', async function* (_, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: null, usage: null }
  })
  /** What the shared usage file holds now, parsed; undefined while none was written. */
  const shared = () => {
    const text = files.get(USAGE_FILE)
    return text === undefined ? undefined : JSON.parse(text)
  }
  return { writes, fetches, clock, shared }
}

function hud($: Parameters<TestBody>[0], args: string) {
  return $.command.run({
    command: 'hud',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 },
  })
}

async function start($: Parameters<TestBody>[0], clock: { settle: () => Promise<void> }) {
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.settle()
}

function recordToasts(on: On): string[] {
  const toasts: string[] = []
  on('ui.toast', (_, e) => {
    toasts.push(String(e.text))
    return { value: undefined }
  })
  return toasts
}

test('the pane shows usage from the session', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /25%/ }))?.text).toContain('50k/200k')
  expect(await ui.find({ type: 'Text', text: /\$0\.42/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /5시간/ })).toBeDefined()
  await ui.unmount()
})

test('the pane shows the Fable weekly window and usage credits from the usage endpoint', async ($, on) => {
  const { clock, fetches } = engine(on)
  await start($, clock)

  expect(fetches[0]?.url).toBe('https://api.anthropic.com/api/oauth/usage')
  expect(fetches[0]?.auth).toBe(HANDLE)
  expect(fetches[0]?.beta).toBe('oauth-2025-04-20')

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^Fable/ }))?.text).toContain('37.5%')
  expect((await ui.find({ type: 'Text', text: /^Sonnet/ }))?.text).toContain('4%')
  const extra = (await ui.find({ type: 'Text', text: /추가사용/ }))?.text
  expect(extra).toContain('$12.40')
  expect(extra).toContain('$50.00')
  await ui.unmount()
})

test('a failed usage read says so and keeps the engine windows', async ($, on) => {
  const { clock } = engine(on, { usageStatus: 429 })
  await start($, clock)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /못 읽음 \(HTTP 429\)/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /5시간/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Fable/ })).toBeUndefined()
  await ui.unmount()
})

test('without a subscription login the pane shows no per-model rows and no error', async ($, on) => {
  const { clock, fetches } = engine(on, { isLoggedIn: false })
  await start($, clock)

  expect(fetches).toEqual([])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /못 읽음/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^Fable/ })).toBeUndefined()
  await ui.unmount()
})

test('a fresh reading another session shared is shown without fetching', async ($, on) => {
  const fromOtherSession = { v: 1, body: USAGE_BODY, fetchedAt: NOW - MINUTE, attemptAt: NOW - MINUTE, rateLimited: 0 }
  const { clock, fetches } = engine(on, { files: { [USAGE_FILE]: JSON.stringify(fromOtherSession) } })
  await start($, clock)

  expect(fetches).toEqual([])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^Fable/ }))?.text).toContain('37.5%')
  await ui.unmount()
})

test('a stale shared reading is fetched once and shared again', async ($, on) => {
  const stale = { v: 1, body: {}, fetchedAt: NOW - 10 * MINUTE, attemptAt: NOW - 10 * MINUTE, rateLimited: 0 }
  const { clock, fetches, shared } = engine(on, { files: { [USAGE_FILE]: JSON.stringify(stale) } })
  await start($, clock)

  expect(fetches.length).toBe(1)
  expect(shared()).toEqual({ v: 1, body: USAGE_BODY, fetchedAt: NOW, attemptAt: NOW, rateLimited: 0 })
})

test('a 429 holds every read back until its backoff ends, a forced one too', async ($, on) => {
  const { clock, fetches, shared } = engine(on, { usageStatus: 429 })
  await start($, clock)
  expect(fetches.length).toBe(1)
  expect(shared()?.retryAt).toBe(NOW + 10 * MINUTE)

  await clock.advance(5 * MINUTE)
  const reply = await hud($, 'refresh')
  expect(fetches.length).toBe(1)
  expect(reply.text).toContain('HTTP 429')
  expect(reply.text).toContain('5m00s 뒤 다시')

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /5m00s 뒤 다시/ })).toBeDefined()
  await ui.unmount()

  await clock.advance(5 * MINUTE)
  expect(fetches.length).toBe(2)
  expect(shared()?.retryAt).toBe(NOW + 30 * MINUTE)
})

test('a Retry-After longer than the backoff is what the sessions wait', async ($, on) => {
  const { clock, shared } = engine(on, { usageStatus: 429, usageHeaders: { 'retry-after': '2700' } })
  await start($, clock)

  expect(shared()?.retryAt).toBe(NOW + 45 * MINUTE)
})

test('/hud refresh reads now even when the shared reading is fresh', async ($, on) => {
  const fresh = { v: 1, body: USAGE_BODY, fetchedAt: NOW - MINUTE, attemptAt: NOW - MINUTE, rateLimited: 0 }
  const { clock, fetches } = engine(on, { files: { [USAGE_FILE]: JSON.stringify(fresh) } })
  await start($, clock)
  expect(fetches).toEqual([])

  const reply = await hud($, 'refresh')
  expect(fetches.length).toBe(1)
  expect(reply.text).toContain('Fable 37.5%')
})

test('the model row follows the main loop, not a subagent', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)

  for await (const _ of $.turn.step({ turnId: 't1', index: 0, model: 'claude-fable-5-2', effort: 'high', messageCount: 1 })) {
    // drain
  }
  for await (const _ of $.turn.step({
    turnId: 't2',
    index: 0,
    model: 'claude-haiku-4-5-20251001',
    messageCount: 1,
    agentId: 'a1',
  })) {
    // drain
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /Fable 5\.2/ }))?.text).toContain('high')
  expect(await ui.find({ type: 'Text', text: /Haiku/ })).toBeUndefined()
  await ui.unmount()
})

test('a set auto-compact point is drawn and warns five points before it', async ($, on) => {
  const { clock } = engine(on, { env: { CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '60' } })
  const toasts = recordToasts(on)
  await start($, clock)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /60%에서 자동 압축/ })).toBeDefined()
  await ui.unmount()

  await $.session.measure({
    context: { tokens: 112_000, window: 200_000, percent: 56 },
    rateLimits: [],
    cost: { usd: 1 },
    changed: ['context' as const],
  })
  expect(toasts.filter(text => text.includes('자동 압축')).length).toBe(1)
})

test('a Fable window past 90% raises one warning', async ($, on) => {
  const nearlyFull = {
    ...USAGE_BODY,
    limits: [{ kind: 'weekly_scoped', percent: 93, resets_at: FABLE_RESET, scope: { model: { display_name: 'Fable' } } }],
  }
  const { clock } = engine(on, { usageBody: nearlyFull })
  const toasts = recordToasts(on)
  await start($, clock)
  await $.command.run({
    command: 'hud',
    args: 'refresh',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 },
  })
  await clock.settle()

  expect(toasts.filter(text => text.includes('Fable 주간 한도 93%')).length).toBe(1)
})

test('a finished turn writes the happy mood to the desktop file', async ($, on) => {
  const { writes, clock } = engine(on)
  on('tool.call', () => ({ result: {} }))
  await start($, clock)

  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  await $.turn.complete({ answer: 'ok', durationMs: 5, isAborted: false, turnId: 't1', reason: 'answer' })

  const desktop = writes.filter(write => write.path.endsWith('/state.json'))
  const last = JSON.parse(desktop[desktop.length - 1]?.text ?? '{}')
  expect(last.mood).toBe('happy')
  expect(last.file).toBe(`${ASSETS}/happy/01.png`)
})

test('a failed tool leaves the pane with nothing running', async ($, on) => {
  const { clock } = engine(on)
  on('tool.call', () => ({ result: { stdout: '', stderr: 'boom' }, isError: true }))
  await start($, clock)

  await $.tool.call({ tool: 'Bash', command: 'false' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /쉬는 중/ })).toBeDefined()
  await ui.unmount()
})

test('tasks are listed from TaskCreate and TaskUpdate', async ($, on) => {
  const { clock } = engine(on)
  // One unmatched stub: with a session's many MCP tools typed, a per-tool
  // matcher here runs past tsc's instantiation depth.
  on('tool.call', (_, e) =>
    e.tool === 'TaskCreate'
      ? { result: { task: { id: '7', subject: 'Write tests' } } }
      : { result: { success: true, taskId: '7', updatedFields: ['status'] } },
  )
  await start($, clock)

  await $.tool.call({ tool: 'TaskCreate', subject: 'Write tests', description: 'cover the pane' })
  await $.tool.call({ tool: 'TaskUpdate', taskId: '7', status: 'in_progress', activeForm: 'Writing tests' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /Writing tests/ }))?.text).toContain('▶')
    expect(await ui.find({ type: 'Text', text: /태스크 0\/1/ })).toBeDefined()
    await ui.unmount()
  }
})

test('a context past 80% raises one warning', async ($, on) => {
  const { clock } = engine(on)
  const toasts = recordToasts(on)
  await start($, clock)

  const measure = {
    context: { tokens: 170_000, window: 200_000, percent: 85 },
    rateLimits: [],
    cost: { usd: 1 },
    changed: ['context' as const],
  }
  await $.session.measure(measure)
  await $.session.measure(measure)

  expect(toasts.filter(text => text.includes('컨텍스트')).length).toBe(1)
})

test('the pane draws no mascot and a new session leaves the desktop app closed', async ($, on) => {
  const { clock } = engine(on, { isAppBuilt: true })
  const runs: string[][] = []
  on('process.run', (_, e) => {
    runs.push([...e.argv])
    return {
      value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
    }
  })
  await start($, clock)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ key: 'mascot' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Companion|💬/ })).toBeUndefined()
  await ui.unmount()
  expect(runs).toEqual([])
})
