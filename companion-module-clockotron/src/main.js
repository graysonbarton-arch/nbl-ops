import { InstanceBase, InstanceStatus, Regex } from '@companion-module/base'
import UpdateActions from './actions.js'
import UpdateFeedbacks from './feedbacks.js'
import UpdateVariableDefinitions from './variables.js'
import UpdatePresets from './presets.js'
import { ClockotronClient } from './clockotron.js'
import { fetchVmixXml, parseInputs, findInput, findText } from './vmix.js'
import { parseClockText, formatHMS, secondsToKeypadDigits } from './time.js'

// Companion 5 (module API 2.x) imports this file and uses the default export as the instance class.
export { UpgradeScripts } from './upgrades.js'

const HEALTH_INTERVAL_MS = 5000
// Clockotron ticks once a second; if the read-back value hasn't moved for this long we call it stopped.
const RUNNING_STALE_MS = 1800

export default class ClockotronInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.healthTimer = null
		this.vmixTimer = null
		this.resetState()
	}

	resetState() {
		this.state = {
			connected: false,
			keypadEntry: '',
			intervalMs: 1000,
			vmixOk: false,
			vmixError: null,
			clockText: '',
			clockSeconds: null,
			lastChangeAt: 0,
			prevChangeAt: 0,
			running: false,
		}
	}

	async init(config) {
		this.config = config
		this.updateActions()
		this.updateFeedbacks()
		this.updateVariableDefinitions()
		this.updatePresets()
		this.start()
	}

	async destroy() {
		this.stop()
	}

	async configUpdated(config) {
		this.stop()
		this.config = config
		this.resetState()
		this.start()
	}

	start() {
		const host = (this.config.host || '').trim()
		if (!host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Enter the IP of the PC running Clockotron')
			return
		}
		this.client = new ClockotronClient({ host, port: Number(this.config.port) || 5491 })
		this.updateStatus(InstanceStatus.Connecting)
		this.pushVariables()

		this.checkHealth()
		this.healthTimer = setInterval(() => this.checkHealth(), HEALTH_INTERVAL_MS)

		if (this.config.vmixEnabled && (this.config.vmixInput || '').trim()) {
			const interval = Math.max(100, Number(this.config.vmixPollMs) || 250)
			this.pollVmix()
			this.vmixTimer = setInterval(() => this.pollVmix(), interval)
		}
	}

	stop() {
		if (this.healthTimer) clearInterval(this.healthTimer)
		if (this.vmixTimer) clearInterval(this.vmixTimer)
		this.healthTimer = null
		this.vmixTimer = null
		this.client = null
	}

	async checkHealth() {
		try {
			await this.client.ping()
			this.setConnected(true)
		} catch (e) {
			this.setConnected(false, e)
		}
	}

	setConnected(connected, err) {
		const changed = connected !== this.state.connected
		this.state.connected = connected
		if (!connected) {
			this.updateStatus(InstanceStatus.ConnectionFailure, `Clockotron not reachable: ${err?.message ?? err}`)
			if (changed) this.log('warn', `Lost connection to Clockotron at ${this.client.baseUrl}`)
		} else {
			this.refreshStatus()
			if (changed) this.log('info', `Connected to Clockotron at ${this.client.baseUrl}`)
		}
		if (changed) {
			this.pushVariables()
			this.checkFeedbacks('connected')
		}
	}

	refreshStatus() {
		if (!this.state.connected) return
		if (this.config.vmixEnabled && this.state.vmixError) {
			this.updateStatus(InstanceStatus.UnknownWarning, `Clock read-back from vMix: ${this.state.vmixError}`)
		} else {
			this.updateStatus(InstanceStatus.Ok)
		}
	}

	async pollVmix() {
		if (this.vmixBusy) return
		this.vmixBusy = true
		try {
			const xml = await fetchVmixXml({
				host: (this.config.vmixHost || '').trim() || '127.0.0.1',
				port: Number(this.config.vmixPort) || 8088,
			})
			const input = findInput(parseInputs(xml), this.config.vmixInput)
			if (!input) throw new Error(`input "${this.config.vmixInput}" not found`)
			const field = findText(input, this.config.vmixField)
			if (!field) throw new Error(`no matching text field on input "${this.config.vmixInput}"`)
			this.setVmixError(null)
			this.updateClock(field.value)
		} catch (e) {
			this.setVmixError(e.name === 'TimeoutError' ? 'vMix did not respond' : e.message)
		} finally {
			this.vmixBusy = false
		}
	}

	setVmixError(message) {
		if (message === this.state.vmixError) return
		if (message) this.log('warn', `vMix read-back: ${message}`)
		this.state.vmixError = message
		this.refreshStatus()
	}

	updateClock(text) {
		const now = Date.now()
		const s = this.state
		if (text !== s.clockText) {
			// The first value after (re)connecting tells us nothing about whether it is moving.
			if (s.clockText !== '') {
				s.prevChangeAt = s.lastChangeAt
				s.lastChangeAt = now
			}
			s.clockText = text
			s.clockSeconds = parseClockText(text)
		}
		// Running = the value keeps changing about once a second. Requiring two ticks in a row stops a
		// single manual nudge (e.g. +1 min while paused) from looking like the clock started.
		const tickGap = s.lastChangeAt - s.prevChangeAt
		s.running = now - s.lastChangeAt < RUNNING_STALE_MS && tickGap > 400 && tickGap < RUNNING_STALE_MS
		this.pushVariables()
		this.checkFeedbacks('running', 'time_remaining')
	}

	pushVariables() {
		const s = this.state
		const secs = s.clockSeconds
		this.setVariableValues({
			connected: s.connected,
			time: s.clockText,
			time_hms: secs === null ? '' : formatHMS(secs),
			time_seconds: secs === null ? '' : secs,
			time_h: secs === null ? '' : Math.floor(Math.abs(secs) / 3600),
			time_m: secs === null ? '' : String(Math.floor((Math.abs(secs) % 3600) / 60)).padStart(2, '0'),
			time_s: secs === null ? '' : String(Math.abs(secs) % 60).padStart(2, '0'),
			running: s.running,
			keypad_entry: s.keypadEntry,
			keypad_preview: s.keypadEntry === '' ? '' : formatKeypad(s.keypadEntry),
			speed_percent: Math.round(100000 / s.intervalMs),
		})
	}

	// ---- commands used by actions ----

	async command(path) {
		await this.commands([path])
	}

	async commands(paths) {
		if (!this.client) return
		try {
			await this.client.sendAll(paths)
			if (!this.state.connected) this.setConnected(true)
		} catch (e) {
			this.log('error', `Clockotron ${paths.join(', ')} failed: ${e.message}`)
			this.setConnected(false, e)
		}
	}

	async keypadDigit(digit) {
		this.state.keypadEntry += String(digit)
		this.pushVariables()
		await this.command(`/digit?value=${digit}`)
	}

	async keypadClear() {
		this.state.keypadEntry = ''
		this.pushVariables()
		await this.command('/clear')
	}

	async keypadEnter() {
		this.state.keypadEntry = ''
		this.pushVariables()
		await this.command('/postClock')
	}

	/** Load an exact time by replaying it on Clockotron's keypad: clear, digits, enter. */
	async setTime(totalSeconds) {
		const digits = secondsToKeypadDigits(totalSeconds)
		this.state.keypadEntry = ''
		this.pushVariables()
		await this.commands(['/clear', ...digits.split('').map((d) => `/digit?value=${d}`), '/postClock'])
	}

	async speed(mode) {
		if (mode === 'slower') this.state.intervalMs *= 1.01
		else if (mode === 'faster') this.state.intervalMs *= 0.99
		else this.state.intervalMs = 1000
		this.pushVariables()
		await this.command(`/${mode}`)
	}

	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Clockotron',
				value:
					'Clockotron runs a control API on port 5491. If Companion runs on the same PC as Clockotron, leave the IP as 127.0.0.1.',
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Clockotron IP',
				width: 8,
				default: '127.0.0.1',
				regex: Regex.HOSTNAME,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Clockotron port',
				width: 4,
				default: '5491',
				regex: Regex.PORT,
			},
			{
				type: 'static-text',
				id: 'vmixInfo',
				width: 12,
				label: 'Clock read-back from vMix (optional)',
				value:
					"Clockotron doesn't report its time over the API, but it writes it into a vMix text input. Turn this on to read that value from vMix so buttons can show the live countdown and change color as time runs out.",
			},
			{
				type: 'checkbox',
				id: 'vmixEnabled',
				label: 'Read clock from vMix',
				width: 12,
				default: true,
			},
			{
				type: 'textinput',
				id: 'vmixHost',
				label: 'vMix IP',
				width: 8,
				default: '127.0.0.1',
				regex: Regex.HOSTNAME,
			},
			{
				type: 'textinput',
				id: 'vmixPort',
				label: 'vMix web port',
				width: 4,
				default: '8088',
				regex: Regex.PORT,
			},
			{
				type: 'textinput',
				id: 'vmixInput',
				label: 'vMix input Clockotron writes to (number, name or key)',
				width: 8,
				default: '',
			},
			{
				type: 'textinput',
				id: 'vmixField',
				label: 'Text field (blank = first)',
				tooltip: 'Same layer you picked in Clockotron, e.g. Headline.Text, or an index like 0',
				width: 4,
				default: '',
			},
			{
				type: 'number',
				id: 'vmixPollMs',
				label: 'vMix poll interval (ms)',
				width: 4,
				default: 250,
				min: 100,
				max: 5000,
			},
		]
	}

	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}

	updatePresets() {
		UpdatePresets(this)
	}
}

/** Show typed keypad digits the way Clockotron will read them, e.g. "130" -> "0:01:30". */
function formatKeypad(entry) {
	const n = Number(entry)
	const h = Math.floor(n / 10000)
	const m = Math.floor((n / 100) % 100)
	const s = n % 100
	return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
