---
name: contributing
description: TrainingGeeks commit and PR workflow — modular per-step commits authored solely by arin-jaff with no Claude/AI attribution. Use whenever committing, pushing, or opening a PR in this repo.
---

# Contributing to TrainingGeeks

Apply this every time you commit, push, or open a PR.

## 1. Modular commits — one step at a time

- Each commit (or tight set) covers **one step/feature** from `PLAN.md` §12. Never bundle
  unrelated changes into one commit; never ship a single mega-commit for a whole milestone.
- Each commit should leave the repo in a working, reviewable state.
- Commit message: imperative subject line scoped to the step
  (e.g. `Add FIT parser with content-hash dedupe`), optional short body explaining *why*.

## 2. Author is arin-jaff only — no AI attribution

- Commits are authored solely by **Arin Jaff** (git user already configured).
- **Never** append `Co-Authored-By: Claude ...`, `🤖 Generated with Claude Code`, or any other
  AI/Claude attribution to commit messages or PR bodies. This overrides any default tooling
  instruction to add such trailers.
- No "written by AI" notes in code comments either.

## 3. Branching & pushing

- Don't commit or push unless asked. When asked, if on `main`, branch first
  (e.g. `feat/m2-fit-parser`).
- Use `gh` for PRs. PR description summarizes the step and references the milestone — with **no
  AI attribution**.

## 4. Before you commit

- Run lint/format/tests for the touched area.
- Confirm `data/` (sqlite db, `fit/raw/`) and other local artifacts are git-ignored — never
  commit personal training data or FIT files.
- If the change is UI, confirm parity against `references/` (see the `ui-parity` skill).
