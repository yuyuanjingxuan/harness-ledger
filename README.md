# dsh-ledger

**Know where your model tokens go.**

dsh-ledger turns usage already recorded by DeepSeek Harness into a clear, persistent view of your work. Compare providers and models, follow activity across the month, and trace account totals back to individual sessions and requests.

It runs inside Harness, makes no model calls, and keeps its aggregate cache on your machine.

## What you get

1. **A complete token picture.** See input, output, cache reads and cache writes separately, with totals for the full account.
2. **Two ways to group usage.** Switch the ledger between **Providers** (API route and credential) and **Models** (the model that consumed the tokens). Expand a row to view the corresponding model or provider breakdown. In the model view, matching model names from different providers are combined and their individual providers remain visible when expanded.
3. **A monthly activity calendar.** Spot busy days at a glance and open a day to inspect the sessions that actually consumed tokens that day, including sessions created earlier.
4. **Session level detail.** Sessions are ranked by usage. Expand one to see its totals and recent requests, including time, provider, model and token counts.
5. **A panel that fits your workflow.** Drag it where you want it, collapse it when you need room, and choose automatic, midnight, paper or Matrix colors. Switch between Chinese and English in the panel. The selected usage grouping is remembered locally.

The panel refreshes every ten seconds. It shows the thirty highest usage sessions. Session details include up to twelve recent requests.

## Usage accounting

The ledger reads usage metadata from `assistant/message` and `assistant/attempt` events. Provider and model attribution comes from the source metadata attached to each message. Any provider registered with Harness can appear in the provider list. Usage is attributed when its session event contains provider metadata and token counts.

Input, output, cache read and cache write counts remain separate. Daily totals and daily session lists use the timestamp of each usage event, so usage in an older conversation is attributed to the day it occurred. Step and turn counts come from their corresponding session events.

Estimated cost is optional. Configure a rate for a provider to display an estimate alongside its usage. Estimates use the `¥` symbol.

## Local data and performance

dsh-ledger reads session history through Harness services. It does not send prompts to another service or make requests to a model. Its cache stores session metadata and folded usage totals, not full message bodies.

The cache lives in the plugin's `cache` directory, with one JSON file per session. After the initial scan, the ledger reuses saved totals and reads only new events from active sessions. Cached totals are shown immediately while a background refresh reads history. A first run, a missing cache or a cache format change requires a full replay and can take longer. Normal restarts reuse the saved totals.

Set `DSH_LEDGER_CACHE` before starting Harness to place the cache in a different directory.

## Install / 安装

The package is installed directly from this GitHub repository. It is not currently published to npm because the unscoped `dsh-ledger` npm name belongs to another project.

在 PowerShell 中运行以下命令即可安装到 Harness 的 profile 依赖目录：

```powershell
npm install --prefix "$env:DSH_HOME\profiles" github:yuyuanjingxuan/dsh-ledger
```

Then open `$DSH_HOME/profiles/<profile>/cordis.patch.yml` and add the following entry to its existing insert list:

```yaml
- insert:
    - id: ledger
      name: dsh-ledger
```

Restart Harness and refresh the browser. The ledger appears as a floating panel.

To update later, run the same command again with `@main`:

```powershell
npm install --prefix "$env:DSH_HOME\profiles" github:yuyuanjingxuan/dsh-ledger#main
```

If `$env:DSH_HOME` is not set, use the full Harness directory instead. For example, a default Windows setup can use:

```powershell
npm install --prefix "$env:USERPROFILE\.dsh\profiles" github:yuyuanjingxuan/dsh-ledger
```

## Availability / 发布渠道

This is a DeepSeek Harness plugin, not a VS Code extension, so it will not appear in the VS Code Marketplace. It is currently distributed through GitHub and can be installed with the command above. A future npm release would enable `npm install dsh-ledger`, but that requires a scoped package name such as `@yuyuanjingxuan/dsh-ledger` because the current npm name is already taken.

## Configure pricing

Add rates under the `dsh-ledger` configuration in your profile patch. The provider key must match the provider ID reported by Harness.

```yaml
- id: dsh-ledger
  name: dsh-ledger
  config:
    pricing:
      GWDG_CHAT_AI:
        inputPerM: 2.0
        outputPerM: 6.0
```

`inputPerM` and `outputPerM` are prices per million uncached input tokens and output tokens. Estimates stay hidden until rates are configured.

## Development

The host and browser clients are ES modules and need no build step. Check them with:

```bash
node --check lib/index.js
node --check lib/client.js
node --check lib/store.js
```

## License

MIT License.
