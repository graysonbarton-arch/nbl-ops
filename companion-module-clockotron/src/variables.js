export default function (self) {
	self.setVariableDefinitions({
		connected: { name: 'Clockotron reachable (true/false)' },
		time: { name: 'Clock text exactly as shown in vMix' },
		time_hms: { name: 'Clock as HH:MM:SS' },
		time_seconds: { name: 'Clock in total seconds' },
		time_h: { name: 'Clock hours' },
		time_m: { name: 'Clock minutes (00-59)' },
		time_s: { name: 'Clock seconds (00-59)' },
		running: { name: 'Clock is running (true/false)' },
		keypad_entry: { name: 'Digits typed on the keypad from Companion' },
		keypad_preview: { name: 'Keypad entry as H:MM:SS' },
		speed_percent: { name: 'Clock speed % (from speed changes sent by Companion)' },
	})
}
