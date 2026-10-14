/**
 * Parse a user-entered duration into whole seconds.
 * Accepts "HH:MM:SS", "MM:SS", plain seconds ("90"), or unit form ("1h 5m 30s").
 * Returns null when the input can't be understood.
 */
export function parseDuration(input) {
	const str = String(input ?? '').trim()
	if (str === '') return null

	if (/^\d+(:\d+){0,2}$/.test(str)) {
		const parts = str.split(':').map(Number)
		while (parts.length < 3) parts.unshift(0)
		const [h, m, s] = parts
		return h * 3600 + m * 60 + s
	}

	const unitRe = /(\d+)\s*([hms])/gi
	let total = 0
	let matched = ''
	for (const match of str.matchAll(unitRe)) {
		const n = Number(match[1])
		const unit = match[2].toLowerCase()
		total += unit === 'h' ? n * 3600 : unit === 'm' ? n * 60 : n
		matched += match[0]
	}
	if (matched.replace(/\s/g, '') !== str.replace(/\s/g, '')) return null
	return total
}

/**
 * Clockotron's keypad reads typed digits as HHMMSS, e.g. "13000" = 1:30:00.
 * Build the digit string that makes Clockotron land on exactly `totalSeconds`.
 */
export function secondsToKeypadDigits(totalSeconds) {
	const secs = Math.max(0, Math.floor(totalSeconds))
	const h = Math.floor(secs / 3600)
	const m = Math.floor((secs % 3600) / 60)
	const s = secs % 60
	return `${h}${pad2(m)}${pad2(s)}`.replace(/^0+(?=\d)/, '')
}

/**
 * Parse a clock string as Clockotron writes it to vMix ("HH:MM:SS", "MM:SS" or "SS").
 * Returns null if it isn't a clock value.
 */
export function parseClockText(text) {
	const str = String(text ?? '').trim()
	const match = /^(-)?(\d+)(?::(\d+))?(?::(\d+))?$/.exec(str)
	if (!match) return null
	const parts = [match[2], match[3], match[4]].filter((p) => p !== undefined).map(Number)
	let total = 0
	for (const p of parts) total = total * 60 + p
	return match[1] ? -total : total
}

export function formatHMS(totalSeconds) {
	const secs = Math.abs(Math.floor(totalSeconds))
	const h = Math.floor(secs / 3600)
	const m = Math.floor((secs % 3600) / 60)
	const s = secs % 60
	return `${totalSeconds < 0 ? '-' : ''}${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

export function pad2(n) {
	return String(n).padStart(2, '0')
}
