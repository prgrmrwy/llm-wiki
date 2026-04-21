## Context

This repo uses OpenSpec for tracking changes and design decisions, but agents have no instruction to consult it. Without root-level instruction files, every new conversation starts cold with no guidance on how to approach tasks in this codebase.

## Goals / Non-Goals

**Goals:**
- Create `CLAUDE.md` and `AGENTS.md` at repo root
- Encode the habit: consult openspec before reading source code

**Non-Goals:**
- Comprehensive project documentation (that belongs in README)
- Encoding every possible work habit (start minimal, add over time)

## Decisions

**Single primary habit vs. exhaustive guide**
Start with one high-value habit (openspec-first context gathering) rather than a long list. A short file gets read; a long one gets skipped.

**CLAUDE.md vs. AGENTS.md content**
Same content, different audiences. `CLAUDE.md` is for Claude Code; `AGENTS.md` is for Codex and other OpenAI-compatible agents. Both should contain identical habits so behavior is consistent regardless of which agent is used.

**Exact command to include**
Document the concrete command (`openspec list --json`) rather than just saying "check openspec" — an agent needs the exact invocation to act on it.

## Risks / Trade-offs

- [Stale instructions] → Keep files short so updating them is low-friction
- [Ignored by agents] → No mitigation; this is inherent to instruction files
