# dsh-ledger

A token usage and cost ledger for DeepSeek Harness. It watches your session logs, folds every usage sample into a compact account, and shows the result in a floating panel that you can drag around the browser window.

## What it shows

The panel refreshes every 10 seconds and gives you:

* Total input, output, cache read and cache write tokens
* A breakdown by provider, and per model when you expand a provider
* The whole current month as a calendar, with one cell per day
* A list of sessions sorted by total usage, expandable down to individual requests
* A placeholder for per provider pricing, so cost estimates can be added later

Daily totals are the sum of cache read, cache write and output tokens, plus the uncached input. The layout follows the dsh light and dark theme automatically, and the panel language can be switched between Chinese and English from the header.

## How it works

The host half lives in `lib/index.js`. On the first poll it opens each session log through the dsh `sessionQuery` service, folds the events once, and keeps the result in memory. Live sessions are read again only from the last event offset, so later polls touch just the new events, not the whole log. Old sessions are folded once and never touched again until they change.

The fold counts an event as usage whenever `assistant/message` or `assistant/attempt` carries a usage object, and counts `step/end` and `turn/end` for step and turn numbers. Providers and models come from the event metadata, with unknown values collected under a fallback bucket.

The computed account is served as JSON at `GET /ledger/stats`. The browser half in `lib/client.js` polls that route and renders the panel.

## Install

dsh loads third party plugins from the shared profiles directory. Put this package there and register it in the profile patch file.

1. Copy the package so that `package.json` and `lib` end up at `$DSH_HOME/profiles/node_modules/dsh-ledger`.
2. In `$DSH_HOME/profiles/<profile>/cordis.patch.yml`, add these lines under the existing insert list:

```yaml
- insert:
    - id: ledger
      name: dsh-ledger
```

3. Restart dsh and refresh the browser. The ledger panel appears as a floating card.

## Configure pricing

Cost estimation is wired in but turned off. You define per provider rates in the plugin config under the `dsh-ledger` settings section. The shape is:

```yaml
- id: dsh-ledger
  name: dsh-ledger
  config:
    pricing:
      GWDG_CHAT_AI:
        inputPerM: 2.0
        outputPerM: 6.0
```

`inputPerM` and `outputPerM` are the price per million tokens. When set, the panel shows an estimated amount for that provider. Without a config the estimate stays hidden.

## Development

The host and client are plain ES modules with no build step.

```bash
node --check lib/index.js
node --check lib/client.js
```

A small logic test that feeds fake session events through the fold path lives outside the package and was used during development. The client is served as a module table bundle and does not need compiling.

## License

MIT, see [LICENSE](LICENSE).
