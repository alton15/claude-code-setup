import { expect, test } from 'claude-code/testing'

import { parseAccountUsage, toIso } from './account'
import { bar, displayWidth, exhaustsAt, modelName, money, padCols } from './format'

const HOUR = 3_600_000

test('model ids read as family and version', async () => {
  expect(modelName('claude-opus-5-5')).toBe('Opus 5.5')
  expect(modelName('claude-fable-5-2')).toBe('Fable 5.2')
  expect(modelName('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
  expect(modelName('claude-sonnet-4-20250514')).toBe('Sonnet 4')
  expect(modelName('claude-opus-5-5[1m]')).toBe('Opus 5.5 (1M)')
  expect(modelName('my-gateway-model')).toBe('my-gateway-model')
})

test('Korean labels pad by terminal columns', async () => {
  expect(displayWidth('컨텍스트')).toBe(8)
  expect(displayWidth('Fable')).toBe(5)
  expect(displayWidth(padCols('5시간', 9))).toBe(9)
  expect(displayWidth(padCols('Fable', 9))).toBe(9)
})

test('a bar draws the auto-compact tick only on its empty part', async () => {
  expect(bar(25, 10, 60)).toBe('███░░░│░░░')
  expect(bar(80, 10, 60)).toBe('████████░░')
})

test('the pace projects a run-out only when it comes before the reset', async () => {
  const now = Date.parse('2026-11-24T06:00:00.000Z')
  const resetsAt = new Date(now + 2 * HOUR).toISOString()
  // 3 of 5 hours gone, 80% used: 20% left at 26.7%/h runs out in 45 minutes.
  expect(exhaustsAt(80, resetsAt, 5 * HOUR, now)).toBe(now + 0.75 * HOUR)
  // 30% used in 3 hours lasts past the reset.
  expect(exhaustsAt(30, resetsAt, 5 * HOUR, now)).toBeUndefined()
  // Too little used to tell.
  expect(exhaustsAt(5, resetsAt, 5 * HOUR, now)).toBeUndefined()
})

test('money reads minor units, whole units for zero-decimal currencies', async () => {
  expect(money(1240, 'usd')).toBe('$12.40')
  expect(money(15000, 'KRW')).toBe('₩15,000')
  expect(money(99, 'CHF')).toBe('CHF 0.99')
})

test('the usage body yields model-scoped rows first, without duplicates', async () => {
  const reading = parseAccountUsage({
    seven_day_sonnet: { utilization: 4, resets_at: '2026-11-28T00:00:00Z' },
    seven_day_opus: { utilization: null, resets_at: null },
    limits: [
      { percent: 12, scope: null },
      { percent: 37.54, resets_at: 1795737600, scope: { model: { display_name: 'Fable' } } },
      { percent: 9, scope: { model: { display_name: 'Sonnet' } } },
    ],
    extra_usage: { is_enabled: false, used_credits: 10 },
  })
  expect(reading.windows.map(w => `${w.label} ${w.percentUsed}`)).toEqual(['Fable 37.5', 'Sonnet 9'])
  expect(reading.windows[0]?.resetsAt).toBe(toIso(1795737600))
  expect(reading.extra).toBeUndefined()
})

test('a usage body that is not an object is refused', async () => {
  expect(() => parseAccountUsage([])).toThrow()
})
