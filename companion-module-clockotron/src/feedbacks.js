import { combineRgb } from '@companion-module/base'
import { parseDuration } from './time.js'

export default function (self) {
	self.setFeedbackDefinitions({
		connected: {
			name: 'Clockotron connected',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 120, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [],
			callback: () => self.state.connected,
		},
		running: {
			name: 'Clock is running',
			description: 'Needs "Read clock from vMix" in the connection settings.',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 160, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [],
			callback: () => self.state.running,
		},
		time_remaining: {
			name: 'Time remaining at or below',
			description: 'Needs "Read clock from vMix" in the connection settings.',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					type: 'textinput',
					id: 'threshold',
					label: 'Threshold (HH:MM:SS, MM:SS or seconds)',
					default: '01:00',
				},
			],
			callback: (feedback) => {
				const secs = self.state.clockSeconds
				const threshold = parseDuration(feedback.options.threshold)
				if (secs === null || threshold === null) return false
				return secs <= threshold
			},
		},
	})
}
