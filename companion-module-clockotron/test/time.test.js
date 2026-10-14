import test from 'node:test'
import assert from 'node:assert'
import { parseDuration, secondsToKeypadDigits, parseClockText, formatHMS } from '../src/time.js'

// Mirror of Clockotron's keypad conversion (src/renderer/components/clock.input.timer.jsx)
const clockotronKeypadToSeconds = (input) =>
	(input % 100) + Math.floor((input / 100) % 100) * 60 + Math.floor(input / 10000) * 3600

test('parseDuration', () => {
	assert.strictEqual(parseDuration('05:00'), 300)
	assert.strictEqual(parseDuration('1:02:03'), 3723)
	assert.strictEqual(parseDuration('90'), 90)
	assert.strictEqual(parseDuration('1h 5m 30s'), 3930)
	assert.strictEqual(parseDuration('10m'), 600)
	assert.strictEqual(parseDuration(''), null)
	assert.strictEqual(parseDuration('abc'), null)
	assert.strictEqual(parseDuration('5 minutes'), null)
})

test('keypad digits round-trip through Clockotron conversion', () => {
	for (const secs of [0, 1, 59, 60, 90, 300, 3599, 3600, 3723, 36000, 360000]) {
		const digits = secondsToKeypadDigits(secs)
		assert.strictEqual(clockotronKeypadToSeconds(digits), secs, `${secs}s -> ${digits}`)
	}
})

test('parseClockText handles every Clockotron display format', () => {
	assert.strictEqual(parseClockText('00:05:00'), 300)
	assert.strictEqual(parseClockText('65:00'), 3900)
	assert.strictEqual(parseClockText('125'), 125)
	assert.strictEqual(parseClockText(''), null)
	assert.strictEqual(parseClockText('LIVE'), null)
})

test('formatHMS', () => {
	assert.strictEqual(formatHMS(3723), '01:02:03')
	assert.strictEqual(formatHMS(0), '00:00:00')
})

test('keypad digits skip leading zeros', () => {
	assert.strictEqual(secondsToKeypadDigits(90), '130')
	assert.strictEqual(secondsToKeypadDigits(0), '0')
	assert.strictEqual(secondsToKeypadDigits(3600), '10000')
})
