import { combineRgb } from '@companion-module/base'

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)
const GREY = combineRgb(40, 40, 40)
const GREEN = combineRgb(0, 160, 0)
const RED = combineRgb(200, 0, 0)
const AMBER = combineRgb(230, 140, 0)
const BLUE = combineRgb(0, 70, 160)

function button(name, text, actions, { bgcolor = BLACK, size = '14', feedbacks = [] } = {}) {
	return {
		type: 'simple',
		name,
		style: { text, size, color: WHITE, bgcolor },
		steps: [{ down: actions, up: [] }],
		feedbacks,
	}
}

const act = (actionId, options = {}) => ({ actionId, options })

export default function (self) {
	const v = (name) => `$(${self.label}:${name})`
	const presets = {}
	const sections = []

	const addSection = (id, name, entries) => {
		for (const [presetId, preset] of entries) presets[presetId] = preset
		sections.push({ id, name, definitions: entries.map(([presetId]) => presetId) })
	}

	addSection('display', 'Clock', [
		[
			'clock_display',
			button('Clock display', v('time_hms'), [act('start_pause')], {
				size: '18',
				feedbacks: [
					{ feedbackId: 'running', options: {}, style: { bgcolor: GREEN, color: WHITE } },
					{ feedbackId: 'time_remaining', options: { threshold: '01:00' }, style: { bgcolor: AMBER, color: BLACK } },
					{ feedbackId: 'time_remaining', options: { threshold: '0' }, style: { bgcolor: RED, color: WHITE } },
				],
			}),
		],
		[
			'connection',
			button('Connection status', 'CLOCK\\nOFFLINE', [], {
				bgcolor: RED,
				feedbacks: [
					{
						feedbackId: 'connected',
						options: {},
						style: { text: 'CLOCK\\nONLINE', bgcolor: combineRgb(0, 90, 0), color: WHITE },
					},
				],
			}),
		],
	])

	addSection('transport', 'Transport', [
		[
			'start_pause',
			button('Start / Pause', 'START\\nPAUSE', [act('start_pause')], {
				feedbacks: [{ feedbackId: 'running', options: {}, style: { bgcolor: GREEN, color: WHITE } }],
			}),
		],
		['reset', button('Reset', 'RESET', [act('reset')], { bgcolor: RED })],
		['speed_slower', button('Slower', 'SLOWER\\n' + v('speed_percent') + '%', [act('speed', { mode: 'slower' })])],
		['speed_normal', button('Normal speed', 'NORMAL\\nSPEED', [act('speed', { mode: 'normal' })])],
		['speed_faster', button('Faster', 'FASTER\\n' + v('speed_percent') + '%', [act('speed', { mode: 'faster' })])],
	])

	const adjust = [
		['h', 'Up', 1, '+1 HR'],
		['h', 'Down', 1, '-1 HR'],
		['m', 'Up', 1, '+1 MIN'],
		['m', 'Down', 1, '-1 MIN'],
		['m', 'Up', 5, '+5 MIN'],
		['m', 'Down', 5, '-5 MIN'],
		['s', 'Up', 10, '+10 SEC'],
		['s', 'Down', 10, '-10 SEC'],
		['s', 'Up', 1, '+1 SEC'],
		['s', 'Down', 1, '-1 SEC'],
	]
	addSection(
		'adjust',
		'Add / Subtract',
		adjust.map(([unit, direction, amount, label]) => [
			`adjust_${direction}_${amount}${unit}`.toLowerCase(),
			button(label, label, [act('adjust', { direction, amount, unit })], { bgcolor: BLUE }),
		]),
	)

	const quick = ['00:30', '01:00', '02:00', '03:00', '05:00', '10:00', '15:00', '30:00', '01:00:00']
	addSection(
		'set',
		'Set Time',
		quick.map((time) => [
			`set_${time.replace(/:/g, '')}`,
			button(`Set ${time}`, `SET\\n${time}`, [act('set_time', { time })], { bgcolor: GREY }),
		]),
	)

	addSection('keypad', 'Keypad', [
		...[...'1234567890'].map((d) => [
			`keypad_${d}`,
			button(`Keypad ${d}`, d, [act('keypad_digit', { digit: d })], { size: '30', bgcolor: GREY }),
		]),
		['keypad_clear', button('Keypad clear', 'CLEAR', [act('keypad_clear')], { bgcolor: RED })],
		[
			'keypad_enter',
			button('Keypad enter', 'ENTER\\n' + v('keypad_preview'), [act('keypad_enter')], { bgcolor: GREEN }),
		],
	])

	self.setPresetDefinitions(sections, presets)
}
