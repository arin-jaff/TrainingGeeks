# Contributing to TrainingGeeks

Thanks for your interest in improving TrainingGeeks. This is a self-hosted,
local-first training log — contributions that keep it fast, private, and
framework-agnostic are very welcome.

## Ways to help

- **Report a bug** — open an issue with steps to reproduce, what you expected,
  and what happened.
- **Request a feature** — describe the workflow you're missing. Screenshots or
  references from other tools help.
- **Send a pull request** — fixes, new metrics, connectors, UI parity
  improvements, docs.

## Getting set up

Requirements: **Node.js 22.6+ or 24** (the app uses the built-in `node:sqlite`
module).

```bash
git clone https://github.com/arin-jaff/TrainingGeeks.git
cd TrainingGeeks
npm install
cp .env.example .env.local   # fill in values as needed
npm run dev                  # http://localhost:3000
```

Auth is **disabled** when `TG_PASSWORD` is unset, so a fresh clone runs openly
for local development. See `.env.example` for sync, auth, and read-only options.

## Before you open a PR

Run all three and make sure they pass:

```bash
npm run lint        # ESLint (build fails on lint errors)
npx tsc --noEmit    # type check
npm test            # unit tests (node:test)
```

If you change anything in `src/lib/{fit,metrics,db,connectors}`, add or update a
test next to it (`*.test.ts`).

## Conventions

- **Keep `src/lib/{fit,metrics,db,connectors}` pure and framework-agnostic.** No
  React or Next imports there — it must port cleanly to the planned Tauri build.
- **Modular commits.** One focused change per commit; keep each independently
  reviewable. Avoid mega-commits.
- **Match the surrounding style** — naming, comment density, and idioms.
- **No emojis in code or UI.** Clean, sharp, data-dense layouts. Light main
  surface, dark navy nav, blue accents.
- **Metrics** follow standard endurance-training definitions; document any new
  formula in [METHODOLOGY.md](METHODOLOGY.md).

## Pull request flow

1. Fork and branch from `main`.
2. Make your change with tests and docs.
3. Ensure lint, types, and tests pass.
4. Open the PR against `main` and fill out the template.

## License

By contributing, you agree that your contributions are licensed under the
project's [AGPL-3.0-or-later](LICENSE) license.
