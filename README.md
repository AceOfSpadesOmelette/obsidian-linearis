# Linearis

Obsidian plugin that shows **source line numbers** in both **editing** and **reading** mode.

## Features

- Toggle Linearis on or off
- Place the gutter on the **left** or **right**
- Editor mode uses CodeMirror logical/document lines (blank lines included; wrapped lines share one number)
- Reading mode maps numbers to Markdown **source** lines via section info (multi-line blocks such as tables may show distributed/gapped markers)
- Desktop and mobile (`isDesktopOnly: false`)

## Settings

Open **Settings → Community plugins → Linearis**:

| Setting | Description |
| --- | --- |
| Editing mode | `Left`, `Right`, or `Off` while editing |
| Reading mode | `Left`, `Right`, or `Off` while reading |

**Export settings** and **Import settings** save or restore that configuration as `linearis-settings.json`.

## Commands

- **Cycle editing placement (left / right / off)**
- **Cycle reading placement (left / right / off)**
- **Set editing/reading placement: left|right|off**

## Install (local development)

1. Clone or copy this folder into your vault:

   `<vault>/.obsidian/plugins/linearis/`

2. Install dependencies and build:

   ```bash
   npm install
   npm run build
   ```

3. In Obsidian: enable **Community plugins**, then enable **Linearis**.

For live reload while developing:

```bash
npm run dev
```

## Reading mode behavior

Numbers match Markdown **source** lines (the same sequence as the editor status bar `Ln N`).

In reading mode, only each rendered section’s **starting** source line is shown (for example a table that spans source lines 133–137 shows `133`, then the next block). Editor mode still numbers every logical source line, with wrapped text sharing a single number at its first visual row.

The gutter is pinned to the pane’s outer edge (left or right) and reserves a thin margin so note content never sits under the numbers.

## Release files

Ship these artifacts with a GitHub release:

- `main.js`
- `manifest.json`
- `styles.css`



## Develop

```bash
npm install
npm run build
npm test
```

CI runs build + Jest on push/PR. Tag a version matching `manifest.json` (for example `1.0.0`) to create a draft GitHub release with `main.js`, `manifest.json`, and `styles.css` when present.
