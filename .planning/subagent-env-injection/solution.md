# Solution: Subagent environment configuration

## Solution brief

Pi users configuring subagents should be able to define a shared environment configuration for all subagent runs, so child subagents can run with predictable env-derived extension settings that may differ from the main agent's runtime context. The chosen shape preserves the user's initial proposal to inject environment variables from Pi configuration, but narrows it to global/project-level configuration for all subagents rather than per-agent or per-invocation customization.

The product bet is that a simple user-controlled env map is the right generic escape hatch for extension-specific configuration because extensions may each read different environment variables. Instead of teaching this minimal subagent tool about every extension's configuration model, users provide the environment variable names and values they want subagents to see.

This shape fits the current product because the project already presents subagents as named agents with shared global/project defaults. The feature should extend that configuration story without turning the tool into an orchestration framework, a per-call runtime configurator, or a secrets-management system.

Success means users can configure subagents once at the global or project level, run delegated tasks normally, and trust that all subagents receive the configured env values while existing inherited environment behavior remains stable unless explicitly overridden.

## Behavior contract

**Today / before:** Subagents run in a separate child runtime but inherit the parent process environment. Users can configure some subagent defaults globally or per project, but they cannot explicitly add or override environment variables for all subagent runs through this project's configuration.

**After:** Users can define a simple JSON object/key-value map in subagent configuration where each key is an environment variable name to expose to subagents and each value is the configured value for that variable. Those configured values apply to all subagent runs in that global or project scope. The configured values merge with the inherited environment and add or override only the named variables.

**Success signal:** A user can configure env-derived extension settings for subagents once, run ordinary `subagent` calls without extra per-call inputs, and observe that extensions inside subagents use the configured subagent values rather than only the parent/main-agent environment.

**Must not change:** Existing subagent calls should still require only the agent name and task. If no env values are configured, subagents should behave as they do today and inherit the parent environment. Existing model, extension, skill, and thinking configuration concepts should remain stable.

## Scope and decisions

**Minimum useful solution:** A global/project-level env configuration for all subagents, represented as a simple JSON object/key-value map, that merges into the inherited subagent environment and overrides/adds only named variables.

**In scope:**

- Global and project-level environment configuration for all subagent runs.
- A simple JSON object/key-value map where each key names an environment variable to configure for subagents.
- Merge/override behavior: configured values are added to the inherited environment or replace inherited values with the same name.
- Documentation-level clarity that configured env values apply to subagents, not to the parent/main agent, and that inherited environment still exists.
- Minimal value-safety behavior: avoid unnecessarily exposing configured values in normal user-facing output.

**Out of scope / deferred:**

- Per named-subagent env configuration — deliberately excluded because the user chose all-subagent global/project configuration only.
- Per-invocation env configuration — excluded to preserve the minimal `agent + task` tool shape.
- Fully isolated subagent environments — excluded because the chosen behavior preserves inherited env by default and only overrides named variables.
- Strong secrets management, masking, auditing, allowlists, or policy controls — excluded from the first version because the user explicitly chose minimal explicit control only.
- Standardizing extension-specific configuration semantics — excluded because the feature is meant to be a generic escape hatch for varied extension behavior, not an extension configuration framework.

**Locked decisions:**

- Env configuration is global/project-level for all subagents only.
- Env configuration is not per-agent and not per-invocation.
- Configured env values merge with the inherited environment and override/add only named variables.
- The default behavior remains inherited environment when no env values are configured.
- The user-facing configuration shape is a simple JSON object/key-value map where keys are environment variable names.
- The first version uses minimal explicit control only, not a strong secret-safety or isolation model.

**Delegated discretion:**

- Wording, artifact structure, and the final product framing were delegated to the shaping process.
- The solution records secret safety as a scope constraint rather than expanding it into a separate product capability.

**Open decisions:**

- Whether non-string values should be accepted or rejected later is not settled at the product level; the current shape only commits to a simple key-value map users can understand as environment configuration.
- Whether future versions should support per-agent or per-invocation overrides remains intentionally deferred, not rejected forever.
- The exact user-facing explanation for precedence between global and project settings should be made consistent with the project's existing configuration story.

**Appetite / constraints / accepted tradeoffs:**

- Appetite is intentionally small and minimal: solve the generic subagent env-control gap without adding a broader configuration framework.
- Accepted tradeoff: all subagents in a scope receive the same configured env values, so users cannot use this first version to give different named subagents different env setups in the same project.
- Accepted tradeoff: inherited parent environment remains available, so this does not provide strong isolation from parent secrets.
- Accepted tradeoff: because there is no first-version masking/auditing model, users remain responsible for what values they configure and where they store them.

## Options considered

**Chosen shape — Global/project env defaults for all subagents:** This won because it preserves the user's initial env-injection idea while keeping the product small and aligned with existing shared subagent configuration. It sacrifices per-agent and per-call flexibility, but that tradeoff is acceptable because the user explicitly wants global/project configuration only.

**Main alternative — Per named-subagent env configuration:** This was plausible because the original problem involved specialized subagents that may need different setups. It did not win because the user chose all-subagent global/project configuration and does not want per-agent behavior in this version.

**Main alternative — Per-invocation env configuration:** This was plausible because it would allow one-off task-specific runtime contexts. It did not win because it would make ordinary subagent calls more complex and move the tool away from its minimal `agent + task` product shape.

**Main alternative — Isolated env or strong secrets model:** This was plausible because env variables often contain secrets and inherited parent env can leak context. It did not win because the user chose merge/override behavior and minimal explicit control only; stronger isolation would be a larger product commitment.

**Non-product option:** Documentation-only or wrapper-based workarounds could explain or manually control inherited environment behavior, but they would not give users a native, repeatable way to configure subagent env values. No-action would leave the adoption and maintainer-scalability risks in place.

## Grounding and assumptions

**Project / product grounding:**

- The project is a minimal Pi subagent extension centered on running one named subagent on one focused task.
- Users already have global/project configuration concepts for subagent behavior.
- Users already define named subagents separately from the parent/main agent flow.
- Subagents currently inherit the parent process environment, so env-derived extension configuration generally follows the parent runtime unless the wider environment is changed.
- The project intentionally avoids built-in orchestration modes, so the solution should not expand into broader workflow orchestration or per-call runtime management.

**Product references:**

- Existing global/project subagent configuration behavior should guide how this feels to users.
- Existing minimal `agent + task` subagent invocation should remain the reference for ordinary use.

**Assumptions:**

- Users who need this are comfortable editing Pi configuration and understand environment-variable based extension configuration.
- A shared env configuration for all subagents in a scope is sufficient for the first version, even though some future users may want per-agent differences.
- Values configured through this feature may include secrets, but users accept minimal safety controls in the first version.
- Preserving inherited env by default is more important than strict isolation for the first version.

## Phase handoff

Ready for next phase: Yes

Recommended next phase: `/specify`

Why / blocker:

The product shape is settled enough for technical specification: add global/project-level env configuration for all subagents, represented as a simple key-value object, merged into inherited subagent environment with configured names overriding inherited values. The main scope boundaries are also explicit: no per-agent env, no per-invocation env, no strong isolation/secrets model in the first version.

What the next phase must verify:

- How to express the env map in the existing configuration experience without confusing it with parent/main-agent configuration.
- How global and project env configuration should combine in a way that matches existing user expectations.
- How to handle invalid, empty, or non-text values while keeping the user-facing model simple.
- How to avoid unnecessary exposure of configured env values in normal output.
- How to document that configured env values merge with inherited env rather than replacing it.

Remaining uncertainty:

- Whether future demand for per-agent env will be strong enough to revisit the intentionally narrow first version.
- Whether users will expect stronger secret handling once env values can be configured directly.
