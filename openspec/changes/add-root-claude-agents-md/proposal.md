## Why

This repo has no root-level `CLAUDE.md` or `AGENTS.md`, so agents have no recorded work habits for this project. The most impactful habit to establish first: always search `openspec` for existing design context before reading source code, so agents build on prior decisions rather than re-deriving them.

## What Changes

- Add `CLAUDE.md` at repo root with work habits for Claude Code
- Add `AGENTS.md` at repo root with equivalent habits for Codex/other agents
- Both files document the habit: run `openspec list --json` and read relevant change artifacts (proposal, design, specs) when gathering context for any task

## Capabilities

### New Capabilities

- `root-agent-instructions`: Root-level instruction files (`CLAUDE.md`, `AGENTS.md`) that guide agent behavior in this repository

### Modified Capabilities

<!-- none -->

## Impact

- New files: `CLAUDE.md`, `AGENTS.md` at repo root
- No code changes, no API changes, no dependencies affected
- Agents working in this repo will automatically load these instructions
