import { parseDuration } from './time.js'

const DIGIT_CHOICES = [...'0123456789'].map((d) => ({ id: d, label: d }))

export default function (self) {
	self.setActionDefinitions({
		start_pause: {
			name: 'Start / Pause (toggle)',
			description: "Clockotron's start and stop both toggle the clock, so this is a single toggle.",
			options: [],
			callback: async () => {
				await self.command('/start')
			},
		},
		start: {
			name: 'Start (only if stopped)',
			description: 'Needs "Read clock from vMix" so the module knows whether the clock is running.',
			options: [],
			callback: async () => {
				if (self.state.running) return
				await self.command('/start')
			},
		},
		pause: {
			name: 'Pause (only if running)',
			description: 'Needs "Read clock from vMix" so the module knows whether the clock is running.',
			options: [],
			callback: async () => {
				if (!self.state.running) return
				await self.command('/stop')
			},
		},
		reset: {
			name: 'Reset (stop and zero)',
			options: [],
			callback: async () => {
				await self.command('/reset')
			},
		},
		set_time: {
			name: 'Set time',
			description: 'Loads a time into the clock (does not start it).',
			options: [
				{
					type: 'textinput',
					id: 'time',
					label: 'Time (HH:MM:SS, MM:SS, seconds, or 1h 5m 30s)',
					default: '05:00',
					useVariables: true,
				},
			],
			callback: async (action) => {
				const secs = parseDuration(action.options.time)
				if (secs === null) {
					self.log('error', `Set time: can't read "${action.options.time}" as a time`)
					return
				}
				await self.setTime(secs)
			},
		},
		adjust: {
			name: 'Add / subtract time',
			options: [
				{
					type: 'dropdown',
					id: 'direction',
					label: 'Direction',
					default: 'Up',
					choices: [
						{ id: 'Up', label: 'Add' },
						{ id: 'Down', label: 'Subtract' },
					],
				},
				{
					type: 'number',
					id: 'amount',
					label: 'Amount',
					default: 1,
					min: 1,
					max: 99,
				},
				{
					type: 'dropdown',
					id: 'unit',
					label: 'Unit',
					default: 'm',
					choices: [
						{ id: 'h', label: 'Hours' },
						{ id: 'm', label: 'Minutes' },
						{ id: 's', label: 'Seconds' },
					],
				},
			],
			callback: async (action) => {
				const { direction, unit } = action.options
				const amount = Math.max(1, Math.min(99, Math.floor(Number(action.options.amount) || 1)))
				await self.commands(Array(amount).fill(`/${unit}${direction}`))
			},
		},
		speed: {
			name: 'Clock speed',
			description: 'Slower/faster nudge the tick by 1% per press; Normal restores real time.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Speed',
					default: 'normal',
					choices: [
						{ id: 'slower', label: 'Slower (1%)' },
						{ id: 'normal', label: 'Normal' },
						{ id: 'faster', label: 'Faster (1%)' },
					],
				},
			],
			callback: async (action) => {
				await self.speed(action.options.mode)
			},
		},
		keypad_digit: {
			name: 'Keypad: digit',
			description: 'Type a digit into the Clockotron keypad. Digits are read as HHMMSS, then press Enter.',
			options: [
				{
					type: 'dropdown',
					id: 'digit',
					label: 'Digit',
					default: '0',
					choices: DIGIT_CHOICES,
				},
			],
			callback: async (action) => {
				const digit = String(action.options.digit)
				if (!/^\d$/.test(digit)) return
				await self.keypadDigit(digit)
			},
		},
		keypad_clear: {
			name: 'Keypad: clear',
			options: [],
			callback: async () => {
				await self.keypadClear()
			},
		},
		keypad_enter: {
			name: 'Keypad: enter (load typed time)',
			description: 'Pressing Enter with nothing typed sets the clock to 0.',
			options: [],
			callback: async () => {
				await self.keypadEnter()
			},
		},
	})
}
