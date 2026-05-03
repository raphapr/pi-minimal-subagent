# Problem: Subagent environment configuration

## Problem brief

Pi users can configure this project’s `subagent` tool to run named Markdown-defined agents in an isolated Pi subprocess. That isolation is useful, but it creates a configuration gap when extensions inside the subagent rely on environment variables for runtime configuration. Today, the subagent process inherits the parent process environment, which means env-derived extension configuration tends to match the main agent unless the user changes the wider runtime environment.

The affected user is a Pi user configuring specialized subagents. Sometimes a delegated subagent needs extension configuration that differs from the main agent’s setup, and those needs vary by extension. Because each extension may read different environment variables, standardizing every extension-specific configuration path inside this minimal subagent extension would be hard to maintain and would not scale well.

This matters now because more specialized subagent usage will make configuration mismatches feel like unreliable subagents: the subagent may run, but with the wrong extension context for the task. If nothing changes, users may need awkward global environment changes or per-extension workarounds, while the project risks accumulating special-case configuration support requests.

A worthwhile outcome would let users give a subagent a predictable runtime context that can intentionally differ from the parent agent, while preserving the project’s generic, per-agent delegation model. The next phase should explore a product-level solution that gives users control over per-subagent env-derived configuration without turning this extension into a registry of extension-specific config behavior.

## What we know

**User-provided:**

- The primary affected user is the Pi user configuring subagents.
- Some Pi extensions expose or consume configuration through environment variables.
- Subagents sometimes need those env-derived extension configs to be different from the main agent’s configuration.
- The need varies per extension, which makes standardization difficult.
- The current/anticipated issue is subagents using the parent agent’s env-derived extension config when the delegated task needs a different setup.
- The main why-now is near-term subagent adoption risk plus maintainer scalability risk, not a single confirmed blocking failure case.
- Desired outcomes are predictable per-subagent runtime context, separation from parent config where needed, and a generic escape hatch for extension-specific env needs.

**Project-verified / grounding:**

- This project is a minimal Pi extension that registers one `subagent` tool.
- The tool runs named Markdown-defined agents from user or project agent files.
- Subagents are executed through an isolated Pi subprocess.
- The current runner spawns the subprocess with `env: process.env`, so the child receives the parent process environment by default.
- There are no existing `.planning` artifacts for this initiative.

**Assumptions:**

- The important problem is user-controlled per-subagent configuration, not standardizing how every Pi extension declares or reads configuration.
- Environment-variable injection is a likely solution idea because it is generic across extensions, but the discovery phase is not choosing its exact design.
- Secret exposure and auditability matter as constraints, but they are not the main problem driving the initiative.
- Users are willing to configure per-subagent values explicitly if doing so makes subagent behavior predictable.

## Boundaries and parked ideas

**Out of scope:**

- Designing the exact configuration schema, precedence rules, merge behavior, or validation rules.
- Standardizing all Pi extension configuration APIs.
- Implementing extension-specific config adapters inside this project.
- Deciding whether values are defined globally, per project, per agent, per invocation, or by another scope.
- Changing how the main agent itself receives environment variables.

**Parked solution ideas:**

- Inject environment variables into the subagent subprocess from Pi configuration.
- Allow subagent-specific overrides so a subagent can differ from the parent agent.
- Provide a generic env-based escape hatch instead of per-extension configuration plumbing.

## Worth solving?

**Judgment:** Worth solving now

**Problem type:** User pain / Operational friction / Technical debt

**Why:** The problem affects whether specialized subagents behave predictably for users. It also creates a maintainability risk: without a generic user-controlled mechanism, this minimal extension could be pulled toward one-off support for each extension that needs env-derived configuration.

## Phase handoff

Ready for next phase: Yes

Recommended next phase: `/shape`

Target user or stakeholder: Pi users configuring specialized subagents that need extension runtime configuration different from the main agent.

Desired outcome / success signal: A user can intentionally give a subagent the env-derived runtime context it needs, trust that extensions inside the subagent see that context, and avoid changing the parent agent’s configuration or relying on extension-specific hacks.

Why / blocker: The core affected user, current/anticipated failure mode, reason to act, and worthwhile outcome are clear enough for product shaping. The next phase should choose the user-facing behavior and boundaries without prematurely committing to implementation details.

What the next phase must verify:

- Which configuration scope users expect for env values: global, project, agent, invocation, or a combination.
- Whether env values should merge with, override, or replace the parent process environment.
- How visible/auditable configured env vars should be, especially for secrets.
- How to prevent accidental leakage of unrelated parent secrets while keeping configuration ergonomic.
- How this behavior should be explained so users understand the difference between parent agent config and subagent config.

Remaining uncertainty:

- No concrete failing extension/use case has been documented yet; the initiative is partly preventative.
- The desired safety model for secrets is not yet decided.
- The exact source of truth for Pi configuration values is not yet chosen.
