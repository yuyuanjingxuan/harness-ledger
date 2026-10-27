# harness-ledger

Token-usage ledger for DeepSeek Harness.

`harness-ledger` reads usage already recorded in Harness sessions and displays it in a draggable browser panel. It makes no model calls and keeps its cache locally.

## Features

- Account totals for input, output, cache read, cache write, and total tokens.
- Usage grouped by provider or model. The model view combines the same model name across providers and shows the provider breakdown when expanded.
- A monthly activity calendar. Selecting a day shows sessions with token usage recorded on that day, including older sessions.
- Session totals and recent request records with time, provider, model, and token counts.
- Per-provider price estimates with ¥0/M defaults for every discovered provider.
- Auto, Midnight, Paper, and Matrix panel themes.
- Chinese and English panel text.

The panel refreshes every ten seconds. It displays up to thirty highest-usage sessions and up to twelve recent requests for an expanded session.

## Install

Install a local checkout into the Harness profiles directory:

```powershell
npm install --prefix "$env:DSH_HOME\profiles" "C:\path\to\harness-ledger"
```

If `DSH_HOME` is not set, use the full path. For a default Windows installation:

```powershell
npm install --prefix "$env:USERPROFILE\.dsh\profiles" "C:\path\to\harness-ledger"
```

Register it in `$DSH_HOME/profiles/<profile>/cordis.patch.yml`:

```yaml
- insert:
    - id: ledger
      name: harness-ledger
```

Restart Harness and refresh the browser.

## Pricing

Every provider discovered by Harness starts at ¥0 per million tokens, so the panel works without a pricing block. Expand a provider to see its current estimate and the rates shown below the provider list.

To set a non-zero estimate, open Harness **Settings**, select the `ledger` plugin entry, and add a provider-rate row. The generated form writes the profile patch for you; restart is not required. The provider key must match the provider ID reported by Harness.

Raw profile configuration remains available as an alternative:

```yaml
- id: ledger
  config:
    pricing:
      GWDG_CHAT_AI:
        inputPerM: 2.0
        outputPerM: 6.0
```

`inputPerM` and `outputPerM` are prices per million uncached input tokens and output tokens. Zero is valid and means free.

## Local data

The plugin reads session history through Harness services. Its cache contains folded session metadata and usage totals, not full message bodies. Cached totals are returned immediately while session history refreshes in the background.

Set `HARNESS_LEDGER_CACHE` before starting Harness to use a different cache directory. The legacy `DSH_LEDGER_CACHE` name remains supported.

## Development

The host and browser modules are plain ES modules with no build step.

```bash
node --check lib/index.js
node --check lib/client.js
node --check lib/store.js
```

## License

MIT
