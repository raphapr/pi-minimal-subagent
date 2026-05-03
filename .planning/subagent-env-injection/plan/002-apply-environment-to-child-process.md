# Step 2: Apply environment to child process

## Objective

Use the resolved `settings.environment` map when spawning the subagent child Pi process so configured values are added to or override the inherited parent process environment.

## Why this step exists

This is the runtime behavior that makes the configured environment visible to subagents and their loaded extensions. It covers the specification delta for the `src/runner.ts` child process integration boundary while preserving the existing tool contract and CLI argument behavior.

## Execution metadata

**Execution mode:** Autonomous

**Wave:** Wave 2 — depends on Step 1; can run in parallel with Step 3 because file ownership is disjoint.

**Depends on:** Step 1

**Parallel safety / file overlap:** Safe in parallel with Step 3 because this step owns `src/runner.ts` and Step 3 owns `README.md`. Not safe in parallel with Step 1 because both depend on the `Settings` shape and TypeScript compile state.

## Read first

- `.planning/subagent-env-injection/specification.md` — especially Technical invariants, Selected approach, Integrations, and Permissions/security/privacy.
- `src/types.ts` / `Settings` — confirm Step 1 added the resolved `environment` map.
- `src/settings.ts` / `resolveSettings` — confirm Step 1 returns the merged global/project environment map.
- `src/runner.ts` / `runSubagent` — existing spawn boundary currently passes `env: process.env`.
- `src/index.ts` / `SubagentParams` and `execute` — confirm tool parameters remain only `agent` and `task`, and settings flow into `runSubagent` unchanged.

## File ownership / likely touched surfaces

- `src/runner.ts` — change child process spawn environment construction only.

## Project grounding

- `src/runner.ts:runSubagent` currently calls `spawn(command, [...prefixArgs, ...piArgs], { cwd, shell: false, stdio: ["pipe", "pipe", "pipe"], env: process.env })`.
- `src/runner.ts:buildPiArgs` owns CLI argument construction; the specification says environment values should not be passed through CLI arguments.
- `src/index.ts` already passes resolved `settings` into `runSubagent`; no new entrypoint or tool parameter is needed.

## Concrete actions

- In `src/runner.ts`, replace the direct child `env: process.env` spawn option with a merged environment equivalent to `{ ...process.env, ...settings.environment }`, with configured values winning.
- Prefer a small local helper if it improves clarity, such as `buildChildEnv(settings: Settings): NodeJS.ProcessEnv`, but keep it private to `src/runner.ts` unless another file genuinely needs it.
- Ensure the helper or inline expression preserves inherited environment variables when `settings.environment` is empty.
- Ensure configured values are not added to `piArgs`, stderr, progress text, result details, render output, or any other normal user-facing output.
- Do not change `buildPiArgs`, model selection, extension selection, skills, thinking, temp prompt handling, JSON event parsing, abort behavior, or semantic completion handling unless TypeScript requires a narrow adjustment directly caused by the `Settings` type change.
- Do not add unset/delete behavior for inherited variables.

## Acceptance criteria

- `src/runner.ts` no longer passes the unmerged `process.env` object directly as the child spawn environment.
- The child spawn environment includes all inherited parent variables and overlays all resolved `settings.environment` entries.
- `buildPiArgs` still does not receive or serialize environment values.
- `src/index.ts:SubagentParams` remains unchanged with only `agent` and `task`.
- `grep -R "environment" -n src/runner.ts src/index.ts src/render.ts` shows environment handling only at the runner boundary and no value exposure in entrypoint/rendering.

## Validation

### Automated

- Run `npm run typecheck` if dependencies are installed.
- If dependencies are missing, record the failure and defer full typecheck to Step 4.
- If a focused local assertion is practical, verify that the runner environment construction preserves an inherited key and overrides a configured key without invoking a full Pi subprocess.

### Manual

- None expected for this step alone; end-to-end child visibility is validated in Step 4 after docs and settings parsing are complete.

## Done criteria

- A resolved environment map can affect the spawned child process environment.
- Existing no-config behavior remains inherited environment behavior.
- No configured environment values are exposed through command arguments or normal tool result surfaces.

## Must-haves covered

- Configured environment values are visible to all spawned subagents.
- Configured values override/add named inherited variables only.
- Existing subagent invocation and rendering behavior remain stable.

## Review boundary

This step should be reviewed as:

- one PR/change set

Why:

It is the isolated runtime integration change. It depends on Step 1 but can be reviewed separately for correctness and safety at the child-process boundary.

## Safe pause point

Can work safely stop after this step?

Yes

Why:

After Step 1 and Step 2, the feature should be functionally implemented even if README docs and final validation are still pending. Do not release without Step 3 documentation and Step 4 validation.

## Risks / rollback notes / recorded gaps

- Environment values may be secrets; avoid logging or returning them. This step should not introduce any new output path for values.
- Child extensions can still print environment values themselves; that is outside this feature's control and should not be solved here.
- Replacing the environment instead of merging it would violate the user-confirmed behavior and may break Pi or extension execution.
- Rollback is reverting the runner change; removing `environment` settings also returns users to inherited-env behavior.

## Coding-agent handoff

Start by confirming Step 1 added `settings.environment`. Then edit only `src/runner.ts` so the child process spawn uses inherited `process.env` merged with `settings.environment`, configured values last. Avoid changing CLI args, tool params, result details, rendering, JSON parsing, or agent frontmatter. Verify with typecheck if available and report whether the spawn env merge is implemented as a helper or inline expression.
