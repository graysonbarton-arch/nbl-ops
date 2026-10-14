## Clockotron

Controls [Clockotron](https://github.com/dlamon1/clockotron), the countdown timer that writes into a vMix text input.

### Setup

1. Open Clockotron and connect it to vMix, then pick the text input and layer for the timer.
2. Add this connection in Companion.
   - **Clockotron IP**: the PC running Clockotron. Use `127.0.0.1` if Companion is on the same PC.
   - **Clockotron port**: `5491`. Clockotron always uses this port.
3. Optional, recommended: **Read clock from vMix**. Clockotron's API only accepts commands; it can't report the time back. With this on, the module reads the clock from the vMix input that Clockotron writes to. That makes the live time, running state, and time-remaining colors work.
   - **vMix IP / port**: where vMix's Web Controller listens. The default is port `8088`. Turn it on in vMix under Settings > Web Controller.
   - **vMix input**: the same text input you picked in Clockotron, by number, name or key.
   - **Text field**: the layer you picked in Clockotron, such as `Headline.Text`. Leave it blank to use the first text field.

If Companion is on a different PC, allow TCP port 5491 into the Clockotron PC in Windows Firewall.

### Actions

| Action                                            | Notes                                                                                                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start / Pause (toggle)                            | Clockotron's start and stop are both toggles.                                                                                                         |
| Start (only if stopped) / Pause (only if running) | These need vMix read-back to know whether the clock is running.                                                                                       |
| Reset                                             | Stops the clock and sets it to zero.                                                                                                                  |
| Set time                                          | Accepts `05:00`, `1:30:00`, `90`, or `1h 5m`. Supports variables. Loads the time without starting the clock.                                          |
| Add / subtract time                               | Adds or subtracts 1-99 hours, minutes or seconds.                                                                                                     |
| Clock speed                                       | Slower and Faster change the speed 1% per press. Normal returns to real time.                                                                         |
| Keypad: digit / clear / enter                     | Clockotron's keypad. Digits are read as HHMMSS, so typing `1`, `3`, `0` then Enter gives 1:30. Pressing Enter with nothing typed sets the clock to 0. |

### Variables

`$(clockotron:time_hms)`, `time`, `time_seconds`, `time_h`, `time_m`, `time_s`, `running`, `connected`, `keypad_entry`, `keypad_preview` and `speed_percent`.

The time variables and the running state need vMix read-back. `speed_percent` only counts speed changes sent from Companion.

### Feedbacks

- **Clockotron connected**
- **Clock is running**: needs vMix read-back.
- **Time remaining at or below**: a threshold such as `01:00`. Needs vMix read-back.

### Presets

Ready-made buttons are grouped into Clock, Transport, Add / Subtract, Set Time and Keypad. The clock display button turns green while running, amber at 1:00 and red at 0.
