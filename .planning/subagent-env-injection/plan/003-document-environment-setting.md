# Step 3: Document environment setting

## Objective

Update the README Settings section so users understand the new `environment` configuration object, its global/project precedence, inherited-environment merge behavior, string-only value expectation, and first-version safety boundary.

## Why this step exists

The feature changes the user-facing settings contract. Documentation is required so users can configure subagent environment values without mistaking the feature for per-agent/per-call configuration, parent-agent configuration, isolated environments, or a secrets-management system.

## Execution metadata

**Execution mode:** Autonomous

**Wave:** Wave 2 — depends on the Step 1 settings contract; can run in parallel with Step 2 because file ownership is disjoint.

**Depends on:** Step 1

**Parallel safety / file overlap:** Safe in parallel with Step 2 because this step owns only `README.md`. Not safe in parallel with another documentation step touching the README Settings section.

## Read first

- `.planning/subagent-env-injection/specification.md` — source of the exact user-facing `environment` contract and out-of-scope boundaries.
- `.planning/subagent-env-injection/solution.md` — product wording for global/project-only scope and minimal safety tradeoffs.
- `README.md` Settings section — existing documentation structure and examples for `model` and `extensions`.
- `/home/whitman/.nvm/versions/node/v24.15.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/settings.md` — global/project settings and nested object precedence convention.

## File ownership / likely touched surfaces

- `README.md` — update the Settings section only, unless a nearby sentence must be adjusted for clarity.

## Project grounding

- `README.md` currently documents global settings in `~/.pi/agent/settings.json`, project settings in `.pi/settings.json`, and the `pi-minimal-subagent` settings object with `model` and `extensions` only.
- `README.md` currently says subagent calls use only `{ "agent": "scout", "task": "..." }`; that should remain true.
- The specification selected `environment`, not `env`, as the setting name.

## Concrete actions

- Extend the README Settings JSON example to include an `environment` object under `pi-minimal-subagent` with at least one realistic placeholder variable name and string value.
- Add prose explaining that `environment` is optional and applies to all subagent runs in the resolved global/project scope.
- Document that global and project `environment` objects merge by variable name and project values override global values for the same name.
- Document that resolved `environment` values merge over the inherited parent process environment: configured names add new variables or override inherited variables, but omitted names continue to inherit normally.
- Document first-version value handling: values should be strings; non-string entries are ignored; empty string values are allowed if intentional.
- Document scope boundaries in concise user language: no per-agent env, no per-invocation env, no isolated environment, no secret masking/auditing/secrets manager.
- Avoid suggesting configured values affect the parent/main agent; they are for spawned subagents.
- Do not add technical implementation details about `src/settings.ts`, `src/runner.ts`, helper names, or Node spawn internals.

## Acceptance criteria

- `README.md` includes the literal setting name `environment` under `pi-minimal-subagent`.
- The README explains all-subagent scope, global/project key-level precedence, and inherited-env merge behavior.
- The README states that subagent calls still use only agent name and task, either explicitly or by preserving the existing Usage section unchanged.
- The README does not document per-agent frontmatter `environment` or per-call tool parameters.
- `grep -n "environment" README.md` shows the new setting documentation in the Settings section.

## Validation

### Automated

- No automated test required for documentation-only changes.
- Optionally run `grep -n "environment\|per-agent\|per-invocation" README.md` to confirm the relevant wording is present and scoped correctly.

### Manual

- Read the updated Settings section as a user and confirm it answers: where to put the object, who receives it, how project overrides global, whether inherited env remains, and what safety behavior is not promised.

## Done criteria

- Users can copy the README example structure to configure subagent environment variables.
- Documentation accurately reflects the selected product and technical contract without expanding scope.
- No source code files are touched by this step.

## Must-haves covered

- The user-facing `environment` settings contract is discoverable.
- Users understand this is global/project all-subagent configuration, not per-agent or per-call configuration.
- Users understand configured values override inherited values by name while inherited environment still exists.

## Review boundary

This step should be reviewed as:

- one PR/change set

Why:

It is a documentation-only change that can be reviewed independently, though it should not ship without the code changes from Steps 1 and 2.

## Safe pause point

Can work safely stop after this step?

Yes

Why:

Documentation can be reviewed independently. However, do not publish/release the docs without the implementation and validation steps because they describe behavior that does not exist until Steps 1 and 2 land.

## Risks / rollback notes / recorded gaps

- Avoid overpromising secret safety. The selected first version intentionally does not add masking, auditing, allowlists, or isolation.
- Avoid implying `environment` values are path-resolved like `extensions`; they are literal strings.
- The README has an unrelated stale local development path noted in prior exploration. Do not fix it in this step unless the parent/user separately expands scope.

## Coding-agent handoff

Read the specification and current README Settings section, then edit only `README.md` to document `pi-minimal-subagent.environment`. Keep the docs product-level: where users configure it, that it applies to all subagents in global/project scope, how project values override global values by key, and how configured values merge over inherited environment. Do not document per-agent or per-call support, and do not touch production code in this step.
