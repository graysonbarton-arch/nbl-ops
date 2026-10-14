import test from 'node:test'
import assert from 'node:assert'
import { parseInputs, findInput, findText } from '../src/vmix.js'

const XML = `<vmix><version>27.0.0.49</version><inputs>
<input key="aaa-111" number="1" type="Colour" title="Black" shortTitle="Black" state="Paused">Black</input>
<input key="BBB-222" number="2" type="GT" title="Countdown.gtzip - 00:04:59" shortTitle="Countdown" state="Paused">Countdown.gtzip
<text index="0" name="Title.Text">Doors &amp; Show</text>
<text index="1" name="Clock.Text">00:04:59</text>
</input>
</inputs><overlays><overlay number="1"/></overlays></vmix>`

test('parses inputs and text fields', () => {
	const inputs = parseInputs(XML)
	assert.strictEqual(inputs.length, 2)
	assert.strictEqual(inputs[1].texts.length, 2)
	assert.strictEqual(inputs[1].texts[0].value, 'Doors & Show')
})

test('finds inputs by number, key, short title, title', () => {
	const inputs = parseInputs(XML)
	assert.strictEqual(findInput(inputs, '2')?.number, '2')
	assert.strictEqual(findInput(inputs, 'bbb-222')?.number, '2')
	assert.strictEqual(findInput(inputs, 'countdown')?.number, '2')
	assert.strictEqual(findInput(inputs, 'Black')?.number, '1')
	assert.strictEqual(findInput(inputs, 'nope'), undefined)
	assert.strictEqual(findInput(inputs, ''), undefined)
})

test('finds text field by name or index, default first', () => {
	const input = findInput(parseInputs(XML), '2')
	assert.strictEqual(findText(input, 'clock.text').value, '00:04:59')
	assert.strictEqual(findText(input, '1').value, '00:04:59')
	assert.strictEqual(findText(input, '').name, 'Title.Text')
	assert.strictEqual(findText(findInput(parseInputs(XML), '1'), ''), undefined)
})
