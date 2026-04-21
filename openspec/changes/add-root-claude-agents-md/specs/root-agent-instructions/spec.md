## ADDED Requirements

### Requirement: Root instruction files exist
The repository SHALL have `CLAUDE.md` and `AGENTS.md` at the root level to provide agents with project-specific work habits.

#### Scenario: Files present at root
- **WHEN** an agent is invoked in this repository
- **THEN** `CLAUDE.md` and `AGENTS.md` are automatically loaded as instruction context

### Requirement: Openspec-first context gathering
When gathering context for any task, the agent SHALL consult openspec before reading source code.

#### Scenario: Starting a task with existing change
- **WHEN** an agent begins work on a feature or bug
- **THEN** it SHALL run `openspec list --json` to discover active and archived changes
- **THEN** it SHALL read the relevant change's `proposal.md`, `design.md`, and `specs/` before touching source files

#### Scenario: Starting a task with no matching change
- **WHEN** `openspec list --json` returns no relevant changes
- **THEN** the agent MAY proceed directly to reading source code

### Requirement: Instructions are consistent across agent types
`CLAUDE.md` and `AGENTS.md` SHALL contain equivalent content so behavior is consistent regardless of which agent runtime is used.

#### Scenario: Same habit in both files
- **WHEN** comparing `CLAUDE.md` and `AGENTS.md`
- **THEN** both SHALL describe the openspec-first context habit with the same concrete command
