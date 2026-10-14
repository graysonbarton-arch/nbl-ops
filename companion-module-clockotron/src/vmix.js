/**
 * Clockotron has no read-back API, but it writes the running clock into a vMix text input.
 * We read that value back from vMix's XML API (http://<vmix>:8088/api) to drive
 * variables and feedbacks.
 */

export async function fetchVmixXml({ host, port, timeoutMs = 2000 }) {
	const res = await fetch(`http://${host}:${port}/api`, { signal: AbortSignal.timeout(timeoutMs) })
	if (!res.ok) throw new Error(`vMix responded HTTP ${res.status}`)
	return res.text()
}

export function decodeXml(str) {
	return str
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
		.replace(/&amp;/g, '&')
}

function parseAttributes(attrString) {
	const attrs = {}
	for (const match of attrString.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) {
		attrs[match[1]] = decodeXml(match[2])
	}
	return attrs
}

/** Returns [{ number, key, title, shortTitle, texts: [{ index, name, value }] }] */
export function parseInputs(xml) {
	const inputs = []
	for (const match of xml.matchAll(/<input\s([^>]*?)(?:\/>|>([\s\S]*?)<\/input>)/g)) {
		const attrs = parseAttributes(match[1])
		const body = match[2] ?? ''
		const texts = []
		for (const t of body.matchAll(/<text\s([^>]*?)(?:\/>|>([\s\S]*?)<\/text>)/g)) {
			const tAttrs = parseAttributes(t[1])
			texts.push({ index: tAttrs.index, name: tAttrs.name, value: decodeXml(t[2] ?? '') })
		}
		inputs.push({
			number: attrs.number,
			key: attrs.key,
			title: attrs.title,
			shortTitle: attrs.shortTitle,
			texts,
		})
	}
	return inputs
}

/** Match an input by number, GUID key, or title (case-insensitive). */
export function findInput(inputs, ref) {
	const wanted = String(ref ?? '').trim()
	if (wanted === '') return undefined
	const lower = wanted.toLowerCase()
	return (
		inputs.find((i) => i.number === wanted) ??
		inputs.find((i) => i.key?.toLowerCase() === lower) ??
		inputs.find((i) => i.shortTitle?.toLowerCase() === lower) ??
		inputs.find((i) => i.title?.toLowerCase() === lower)
	)
}

/** Pick a text field by name ("Headline.Text") or index ("0"); defaults to the first one. */
export function findText(input, fieldRef) {
	if (!input || input.texts.length === 0) return undefined
	const wanted = String(fieldRef ?? '').trim()
	if (wanted === '') return input.texts[0]
	const lower = wanted.toLowerCase()
	return input.texts.find((t) => t.name?.toLowerCase() === lower) ?? input.texts.find((t) => t.index === wanted)
}
