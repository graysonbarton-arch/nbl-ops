# companion-module-clockotron

A [Bitfocus Companion](https://bitfocus.io/companion) module for [Clockotron](https://github.com/dlamon1/clockotron), the countdown timer that writes into vMix text inputs. Built for Companion 5.x (module SDK 2.1, Node 26 runtime).

## Install on the show PC

1. In Companion, open **Modules**, click **Import module package**, and pick `release/clockotron-1.0.0.tgz`.
2. Under **Connections**, add **Clockotron** and fill in the settings. See [companion/HELP.md](companion/HELP.md).

## How it talks to Clockotron

Clockotron runs an HTTP control API on port **5491** with plain GET requests: `/start`, `/stop`, `/reset`, `/slower`, `/normal`, `/faster`, `/digit?value=N`, `/clear`, `/postClock`, and `/{h,m,s}{Up,Down}`. The API can't be read from, so the live time comes from vMix's XML API (`http://<vmix>:8088/api`). It reads the text input that Clockotron writes to.

## Development

```sh
npm install                    # or yarn (the template is set up for yarn 4)
npm test                       # unit tests for time and vMix parsing
npx companion-module-build     # writes clockotron-<version>.tgz
```

To work on the module live, point Companion's **Developer modules** folder at the parent of this directory.
