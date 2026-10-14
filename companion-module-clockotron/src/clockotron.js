/**
 * Client for Clockotron's built-in HTTP control API (Express server on port 5491).
 *
 * Every endpoint is a plain GET. Requests are sent strictly one after another so that
 * keypad digits arrive in the order they were pressed.
 */
export class ClockotronClient {
	constructor({ host, port, timeoutMs = 2000 }) {
		this.baseUrl = `http://${host}:${port}`
		this.timeoutMs = timeoutMs
		this.queue = Promise.resolve()
	}

	/** Queue a GET to `path` (e.g. "/start" or "/digit?value=5"). Resolves with the response body. */
	send(path) {
		const run = () => this.#get(path)
		const result = this.queue.then(run, run)
		this.queue = result.catch(() => {})
		return result
	}

	/** Queue several requests back to back. */
	async sendAll(paths) {
		for (const path of paths) await this.send(path)
	}

	/** Lightweight reachability check against the /api endpoint (bypasses the queue). */
	async ping() {
		const body = await this.#get('/api')
		if (body.trim() !== 'api') throw new Error(`Unexpected response from ${this.baseUrl}/api`)
	}

	async #get(path) {
		const res = await fetch(this.baseUrl + path, { signal: AbortSignal.timeout(this.timeoutMs) })
		const body = await res.text()
		if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`)
		return body
	}
}
