# TrainingGeeks — Agent Conventions

Read `docs/PLAN.md` before doing any work. `references/tp-ui/` is the visual source of truth;
`references/.fit-files/` holds real run/bike/swim sample FITs (gzipped) for parser/metrics
tests. `references/` is git-ignored — these stay local.

## Non-negotiable rules (always apply)

1. **Modular commits.** One focused commit (or tight set) per step/feature we add — never a
   single mega-commit. Keep each commit independently reviewable and, where possible, demoable.
   Map work to the milestones in `docs/PLAN.md` §12.

2. **Author is arin-jaff only — never credit Claude.** Do **not** add
   `Co-Authored-By: Claude`, "Generated with Claude Code", or any AI attribution to commit
   messages, PR bodies, or code comments. Commits are authored solely by Arin Jaff.

3. **Always check the references.** While building any feature, open the relevant screenshot(s)
   in `references/` and verify the layout, wording, colors, and behavior match TrainingPeaks.
   If a feature has no reference, keep it consistent with the existing TP-styled UI. See
   `.claude/skills/ui-parity/`.

4. **No emojis. No AI-looking output.** Clean, sharp, plain text. Simple, data-dense layouts.
   Light main surface, dark navy top nav, blue accents.

5. **Licensed assets only.** Follow `.claude/skills/asset-sourcing/` — approved sources,
   `assets/asset_manifest.json`, save prompts + metadata for anything generated.

## Stack quick reference

Next.js (App Router, TS) · Tailwind · SQLite + Drizzle · `@garmin/fitsdk` · uPlot + ECharts ·
react-grid-layout + dnd-kit · MapLibre. Keep `src/lib/{fit,metrics,db,connectors}` pure and
framework-agnostic so the UI ports cleanly into the later **Tauri** macOS build.

## Skills

- `.claude/skills/contributing/` — commit/PR workflow, modularity, author rules.
- `.claude/skills/ui-parity/` — checking work against `references/`.
- `.claude/skills/asset-sourcing/` — licensed-asset and manifest rules.
