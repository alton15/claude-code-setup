import type { EngineInterface, RenderInputOf, RenderSurface } from 'claude-code'

import type { Task } from '../types'
import { QUIET_ERRORS } from './account'
import {
  bar,
  compactTokens,
  contextColor,
  elapsed,
  exhaustsAt,
  modelName,
  money,
  padCols,
  percentColor,
  resetsIn,
  WEEK_MS,
  whenLabel,
  windowMs,
  windowName,
} from './format'
import { readView } from './state'

/** Label column, in terminal columns: '컨텍스트' (8) and a space. */
const LABEL_COLS = 9
const TASKS_SHOWN = 8

const STATUS_MARK: Record<Task['status'], string> = {
  completed: '✔',
  in_progress: '▶',
  pending: '○',
}

/** One meter row's figures, whichever source they came from. */
type Meter = { key: string; label: string; percent: number; resetsAt?: string; lengthMs?: number }

// Spelled per surface so a check of `e.surface` narrows the element table.
type PaneInput = { [S in RenderSurface]: RenderInputOf<'Pane', S> }[RenderSurface]

export async function renderPane($: EngineInterface, e: PaneInput) {
  const { Box, Text } = $.ui.resolve(e)

  const view = await readView($)
  const { companion: current, usage: measured, account, model, compactAt, active: running, tasks: todo } = view

  const width = e.props.bodyColumns
  const barWidth = Math.max(6, Math.min(16, width - LABEL_COLS - 14))
  const clockNow = Math.max(view.now, current.at, account?.fetchedAt ?? 0)
  const done = todo.filter(task => task.status === 'completed').length
  const ordered = [
    ...todo.filter(task => task.status === 'in_progress'),
    ...todo.filter(task => task.status === 'pending'),
    ...todo.filter(task => task.status === 'completed'),
  ]

  const section = (title: string) => (
    <Text color="subtle" bold>
      ── {title}
    </Text>
  )

  const meters: Meter[] = [
    ...(measured?.limits ?? []).map(limit => ({
      key: limit.kind,
      label: windowName(limit.kind),
      percent: limit.percentUsed,
      resetsAt: limit.resetsAt,
      lengthMs: windowMs(limit.kind),
    })),
    ...(account?.windows ?? []).map(window => ({
      key: `model:${window.label}`,
      label: window.label,
      percent: window.percentUsed,
      resetsAt: window.resetsAt,
      lengthMs: WEEK_MS,
    })),
  ]

  const meterRow = (meter: Meter) => {
    const runsOutAt = exhaustsAt(meter.percent, meter.resetsAt, meter.lengthMs, clockNow)
    return (
      <Box key={meter.key} flexDirection="column">
        <Text>
          {padCols(meter.label, LABEL_COLS)}
          <Text color={percentColor(meter.percent)}>{bar(meter.percent, barWidth)}</Text>{' '}
          {meter.percent}%<Text dimColor> {resetsIn(meter.resetsAt, clockNow)}</Text>
        </Text>
        {runsOutAt !== undefined && (
          <Text color="warning">
            {' '.repeat(LABEL_COLS)}⚠ 이 속도면 {whenLabel(runsOutAt, clockNow)} 소진
          </Text>
        )}
      </Box>
    )
  }

  const accountNote =
    account?.error !== undefined && !QUIET_ERRORS.has(account.error) ? (
      <Text dimColor wrap="truncate-end">
        {padCols('모델별', LABEL_COLS)}못 읽음 ({account.error})
        {account.fetchedAt > 0 ? ` · ${elapsed(clockNow - account.fetchedAt)} 전 값` : ''}
      </Text>
    ) : null

  const extra = account?.extra
  const extraRow =
    extra === undefined ? null : (
      <Text>
        {padCols('추가사용', LABEL_COLS)}
        <Text color={extra.percentUsed === undefined ? 'claude' : percentColor(extra.percentUsed)}>
          {money(extra.usedMinor, extra.currency)}
        </Text>
        {extra.limitMinor !== undefined && (
          <Text dimColor> / {money(extra.limitMinor, extra.currency)}</Text>
        )}
      </Text>
    )

  const sessionAge =
    measured?.startedAt !== undefined && clockNow > measured.startedAt
      ? ` · ${elapsed(clockNow - measured.startedAt)}`
      : ''

  const usageRows =
    measured === null ? (
      <Text dimColor>첫 응답을 기다리는 중…</Text>
    ) : (
      <Box flexDirection="column">
        {measured.contextPercent !== undefined && (
          <Text>
            {padCols('컨텍스트', LABEL_COLS)}
            <Text color={contextColor(measured.contextPercent, compactAt)}>
              {bar(measured.contextPercent, barWidth, compactAt ?? undefined)}
            </Text>{' '}
            {measured.contextPercent}%
            <Text dimColor>
              {' '}
              {compactTokens(measured.contextTokens ?? 0)}/{compactTokens(measured.contextWindow)}
            </Text>
          </Text>
        )}
        {compactAt !== null && measured.contextPercent !== undefined && (
          <Text dimColor>
            {' '.repeat(LABEL_COLS)}│ {compactAt}%에서 자동 압축
          </Text>
        )}
        {meters.map(meterRow)}
        {accountNote}
        {extraRow}
        {measured.costUsd !== undefined && (
          <Text>
            {padCols('비용', LABEL_COLS)}
            <Text color="claude">${measured.costUsd.toFixed(2)}</Text>
            <Text dimColor>{sessionAge}</Text>
          </Text>
        )}
      </Box>
    )

  const modelRow =
    model === null ? (
      <Text dimColor>첫 요청을 기다리는 중…</Text>
    ) : (
      <Text wrap="truncate-end">
        <Text bold>{modelName(model.id)}</Text>
        {model.effort !== undefined && <Text dimColor> · {model.effort}</Text>}
      </Text>
    )

  const activeRows =
    running.length === 0 ? (
      <Text dimColor>쉬는 중</Text>
    ) : (
      <Box flexDirection="column">
        {running.map(tool => (
          <Text key={tool.id} wrap="truncate-end">
            <Text color="warning">⟳</Text> {tool.isSubagent ? '↳ ' : ''}
            <Text bold>{tool.tool}</Text> {tool.label}
            <Text dimColor> {elapsed(clockNow - tool.startedAt)}</Text>
          </Text>
        ))}
      </Box>
    )

  const taskRows =
    todo.length === 0 ? (
      <Text dimColor>등록된 태스크 없음</Text>
    ) : (
      <Box flexDirection="column">
        {ordered.slice(0, TASKS_SHOWN).map(task => (
          <Text
            key={task.id}
            wrap="truncate-end"
            dimColor={task.status === 'completed'}
            color={task.status === 'in_progress' ? 'suggestion' : undefined}
          >
            {STATUS_MARK[task.status]}{' '}
            {task.status === 'in_progress' && task.activeForm ? task.activeForm : task.subject}
          </Text>
        ))}
        {todo.length > TASKS_SHOWN && <Text dimColor>…외 {todo.length - TASKS_SHOWN}개</Text>}
      </Box>
    )

  return (
    <Box flexDirection="column">
      {section('사용량')}
      {usageRows}
      {section('모델')}
      {modelRow}
      {section(`진행 중 (${running.length})`)}
      {activeRows}
      {section(`태스크 ${done}/${todo.length}`)}
      {taskRows}
    </Box>
  )
}
