import type { Register } from 'claude-code'

import type { ActiveTool, Task } from '../types'
import { launchDesktop, quitDesktop } from './bridge'
import {
  cancelAll,
  checkSleepy,
  loadPaths,
  onMeasured,
  refreshAccount,
  reloadAssets,
  say,
  startTicker,
  syncDesktop,
  toUsage,
} from './companion'
import { elapsed, modelName, toolLabel } from './format'
import { renderPane } from './pane'
import { isBusy, reactionForTool } from './reactions'
import type { Reaction } from './reactions'
import {
  PANE,
  readAccount,
  readCompanion,
  readUsage,
  setCompactAt,
  setModel,
  setNow,
  setUsage,
  updateActive,
  updateTasks,
} from './state'

const PANE_TITLE = '현황'
const PANE_COLUMNS = 44
const SLEEP_CHECK_MS = 30_000
/** How often each session looks at the shared usage reading; it fetches only when that is stale. */
const ACCOUNT_POLL_MS = 5 * 60_000
const ACTIVE_MAX = 20

/** CLAUDE_AUTOCOMPACT_PCT_OVERRIDE as a percent in 1..99, else null. */
function compactPercent(raw: string | undefined): number | null {
  if (raw === undefined) return null
  const value = Number(raw.trim())
  return Number.isFinite(value) && value > 0 && value < 100 ? value : null
}

function upsertTask(list: readonly Task[], task: Task): Task[] {
  return list.some(one => one.id === task.id)
    ? list.map(one => (one.id === task.id ? { ...one, ...task } : one))
    : [...list, task]
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)

    await reloadAssets($)
    await $.command.register({
      name: 'hud',
      description:
        '현황 패널 열기 (인자: refresh = 사용량 새로고침, desktop = 데스크톱 컴패니언 실행, quit = 종료, reload = 이미지 다시 읽기)',
    })

    const { context, rateLimits, cost, startedAt } = await $.session.usage()
    await setUsage($, toUsage(context, rateLimits, cost, startedAt))
    await setCompactAt($, compactPercent(await $.env.get('CLAUDE_AUTOCOMPACT_PCT_OVERRIDE')))
    await updateActive($, () => [])

    $.clock.every(SLEEP_CHECK_MS, () => {
      void checkSleepy($)
    })
    $.clock.every(ACCOUNT_POLL_MS, () => {
      void refreshAccount($)
    })
    void refreshAccount($)

    void $.ui.open({ id: PANE, title: PANE_TITLE, columns: PANE_COLUMNS })
    await say($, 'greet')

    return started
  })

  on('command.run', { command: 'hud' }, async ($, e) => {
    const where = await loadPaths($)
    const arg = e.args.trim()

    if (arg === 'desktop') {
      const isOpen = await launchDesktop($, where.app)
      return {
        text: isOpen
          ? '데스크톱 컴패니언을 띄웠어요.'
          : `데스크톱 앱이 아직 없어요. 빌드: ${$.plugin.root}/desktop/build.sh`,
      }
    }
    if (arg === 'quit') {
      await quitDesktop($, where.app)
      return { text: '데스크톱 컴패니언을 종료했어요.' }
    }
    if (arg === 'refresh') {
      await refreshAccount($, true)
      const account = await readAccount($)
      if (account?.error !== undefined) {
        const now = await $.clock.now()
        const retry =
          account.retryAt !== undefined && account.retryAt > now
            ? ` · ${elapsed(account.retryAt - now)} 뒤 다시 읽어요`
            : ''
        return { text: `사용량을 못 읽었어요: ${account.error}${retry}` }
      }
      const rows = (account?.windows ?? []).map(w => `${w.label} ${w.percentUsed}%`)
      return { text: rows.length > 0 ? `사용량을 새로 읽었어요: ${rows.join(', ')}` : '사용량을 새로 읽었어요.' }
    }
    if (arg === 'reload') {
      const assets = await reloadAssets($)
      const counts = Object.entries(assets).map(([mood, files]) => `${mood} ${files.length}`)
      await say($, 'greet')
      return { text: `이미지를 다시 읽었어요: ${counts.join(', ')}` }
    }

    await $.ui.open({ id: PANE, title: PANE_TITLE, columns: PANE_COLUMNS })
    return { text: '현황 패널을 열었어요. (/hud refresh · /hud desktop · /hud quit · /hud reload)' }
  })

  on('session.measure', async ($, e, next) => {
    const previous = await readUsage($)
    await onMeasured($, toUsage(e.context, e.rateLimits, e.cost, previous?.startedAt))
    return next(e)
  })

  // Each model request of the main loop names its model and effort: the pane
  // shows the last one, so a /model switch or a fallback shows up at once.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      const effort = e.effort === undefined ? undefined : String(e.effort)
      await setModel($, { id: e.model, effort }).catch((error: unknown) => {
        $.ui.log(`companion: could not record ${modelName(e.model)}: ${String(error)}`, { to: 'debug' })
      })
    }
    return yield* next(e)
  })

  on('prompt.change', async ($, e, next) => {
    const current = await readCompanion($)
    if (isBusy(current.mood)) return next(e)

    const isTyping = e.text.trim().length > 0
    if (isTyping && current.mood !== 'curious') await say($, 'typing')
    if (!isTyping && current.mood === 'curious') await say($, 'idle')

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.command === undefined) await say($, 'submit')
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const startedAt = await $.clock.now()
    const tool = String(e.tool)
    const call: ActiveTool = {
      id: e.tool_use_id,
      tool,
      label: toolLabel(tool, e as unknown as Record<string, unknown>),
      startedAt,
      isSubagent: e.agentId !== undefined,
    }
    await updateActive($, list => [...list, call].slice(-ACTIVE_MAX))
    await setNow($, startedAt)
    startTicker($)
    if (e.agentId === undefined) await say($, reactionForTool(tool))

    const ran = await next(e)

    await updateActive($, list => list.filter(one => one.id !== call.id))
    const hasFailed = ran.deny === undefined && ran.isError === true
    if (hasFailed && e.agentId === undefined) await say($, 'tool-error')
    else await syncDesktop($)

    return ran
  })

  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const ran = await next(e)
    const created = ran.deny === undefined ? (ran.result as { task?: { id?: unknown } } | undefined) : undefined
    const id = created?.task?.id
    if (typeof id === 'string') {
      const task: Task = { id, subject: e.subject, status: 'pending', activeForm: e.activeForm }
      await updateTasks($, list => upsertTask(list, task))
    }
    return ran
  })

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true) return ran

    await updateTasks($, list => {
      if (e.status === 'deleted') return list.filter(one => one.id !== e.taskId)
      const existing = list.find(one => one.id === e.taskId)
      const patch: Task = {
        id: e.taskId,
        subject: e.subject ?? existing?.subject ?? `#${e.taskId}`,
        status: e.status ?? existing?.status ?? 'pending',
        activeForm: e.activeForm ?? existing?.activeForm,
      }
      return upsertTask(list, patch)
    })
    return ran
  })

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true) return ran

    const todos: Task[] = e.todos.map((todo, i) => ({
      id: `todo-${i}`,
      subject: todo.content,
      status: todo.status,
      activeForm: todo.activeForm,
    }))
    await updateTasks($, list => [...list.filter(one => !one.id.startsWith('todo-')), ...todos])
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)

    const reaction: Reaction =
      e.reason === 'answer' ? 'done' : e.reason === 'aborted' ? 'aborted' : 'failed'
    await say($, reaction)
    void refreshAccount($)
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    cancelAll()
    return next(e)
  })

  // A literal id, so `claude plugin validate` can read the matcher (PANE is 'companion').
  on('ui.render', { component: 'Pane', requestId: 'companion' }, ($, e) => renderPane($, e))
}
