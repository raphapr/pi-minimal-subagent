# Step 4: Validate environment feature

## Objective

Validate that the implemented `environment` feature satisfies the specification end to end: settings resolve correctly, the child process receives configured values over inherited values, documentation matches behavior, and no out-of-scope surface was accidentally added.

## Why this step exists

The repository currently has no test harness and local typecheck is known to require dependency installation. A final validation step prevents the implementation from relying only on code review and ensures the feature works through the actual settings-to-runner path before handoff.

## Execution metadata

**Execution mode:** Human-verify

**Wave:** Wave 3 — final verification after Steps 1, 2, and 3.

**Depends on:** Step 1, Step 2, Step 3

**Parallel safety / file overlap:** Not parallel-safe with implementation steps because validation must run against their completed output. This step should not modify production source files except for temporary local verification fixtures that are removed before completion.

## Read first

- `.planning/subagent-env-injection/specification.md` — complete acceptance targets and out-of-scope constraints.
- `.planning/subagent-env-injection/plan/001-resolve-environment-settings.md` — expected settings behavior and recorded testability gap.
- `.planning/subagent-env-injection/plan/002-apply-environment-to-child-process.md` — expected child process merge behavior.
- `.planning/subagent-env-injection/plan/003-document-environment-setting.md` — expected README behavior.
- `package.json` — confirms `npm run typecheck` is the existing validation command and no test script exists.
- `tsconfig.json` — confirms TypeScript validation includes `src/**/*.ts`.
- `src/settings.ts`, `src/types.ts`, `src/runner.ts`, and `README.md` — final implementation surfaces to inspect before validating.

## File ownership / likely touched surfaces

- No production file ownership expected.
- Temporary local verification fixtures may include `.pi/settings.json` or `.pi/agents/*.md` in a disposable checkout/worktree only; remove or revert them before finishing unless they already existed and are intentionally preserved.
- `node_modules/` may be created locally if dependencies must be installed for typecheck; do not commit it.

## Project grounding

- `package.json` has only one script: `"typecheck": "tsc --noEmit"`.
- `tsconfig.json` includes `src/**/*.ts`, so changes in `src/types.ts`, `src/settings.ts`, and `src/runner.ts` should be typechecked.
- Prior validation found `node_modules` absent and `npm run typecheck` failing with `sh: 1: tsc: not found`; this is an environment setup issue, not a known code error.
- The specification's validation anchors are typecheck, settings resolution behavior, runner inherited/override behavior, and manual child-process visibility.

## Concrete actions

- Inspect the final diffs for Steps 1–3 and confirm the only intended production surfaces changed are `src/types.ts`, `src/settings.ts`, `src/runner.ts`, and `README.md`.
- Run `npm run typecheck`. If it fails because `tsc` is missing, run `npm install` or otherwise install dependencies in the local checkout, then rerun `npm run typecheck`. If dependency installation is not allowed in the execution environment, record the exact blocker and do not mark automated validation complete.
- Verify by inspection or focused assertions that `resolveSettings` returns `environment: {}` when no valid environment config exists.
- Verify by inspection or focused assertions that global/project `environment` maps merge by key and project values win.
- Verify by inspection or focused assertions that non-string values and empty keys are ignored, while empty string values are preserved.
- Verify the runner spawn environment merges inherited values with `settings.environment`, configured values last.
- Perform a manual runtime check when feasible: in a disposable project setup, configure `pi-minimal-subagent.environment` with a distinctive test variable, run a subagent that can observe the child process environment, and confirm the configured value is visible in the subagent context. Also confirm removing the setting returns behavior to inherited environment only.
- Run scope-control greps to catch accidental expansion:
  - `grep -R "environment" -n src README.md`
  - `grep -R "env: process.env" -n src || true`
  - `grep -R "frontmatter.*environment\|environment:.*frontmatter\|SubagentParams" -n src README.md || true`
- Confirm README docs match the implementation exactly: setting name `environment`, global/project key merge, inherited env merge, string-only values, empty string allowed, no per-agent/per-call/isolation/secrets model.

## Acceptance criteria

- `npm run typecheck` passes after dependencies are available, or the exact environment blocker is recorded with enough detail for the parent/user to decide next action.
- Final implementation changes are limited to the planned production surfaces unless a deviation is explicitly justified and reported.
- Settings parsing behavior matches the specification for default `{}`, string-only entries, empty string preservation, invalid entry ignoring, and global/project key-level merge.
- Runner behavior matches the specification: inherited environment remains, configured names override/add values, and values are not passed as CLI args or exposed through result/rendering surfaces.
- README documentation matches the implemented behavior and does not document excluded scopes.
- Manual runtime verification is completed when feasible, or a concrete reason it was not possible is reported.

## Validation

### Automated

- `npm run typecheck`
- If dependencies are missing: `npm install` followed by `npm run typecheck`, provided local dependency installation is allowed.
- Scope-control greps listed in Concrete actions.

### Manual

- Manual runtime subagent check with a distinctive configured environment variable, if a local Pi run and suitable subagent/tool path are available.
- Manual review that no configured environment values are printed in normal parent tool output by this extension.

## Done criteria

- Automated validation is passing or blocked only by a clearly reported environment/setup issue.
- Manual or equivalent focused verification proves configured environment values reach the child process.
- All out-of-scope constraints remain intact: no per-agent env, no per-call env, no isolated env replacement, no secret masking/auditing, no unset/delete semantics.
- Temporary verification files are removed or reverted.

## Must-haves covered

- The full settings-to-runner flow works as specified.
- Users can rely on `pi-minimal-subagent.environment` to configure all subagent runs in global/project scope.
- Existing no-config inherited-environment behavior remains stable.
- The implementation is validated enough for coding handoff/review despite the repository's lack of an existing test harness.

## Review boundary

This step should be reviewed as:

- part of PR/change set with Steps 1, 2, and 3

Why:

It is a verification step rather than a production code change. Its output should be validation evidence attached to the implementation review.

## Safe pause point

Can work safely stop after this step?

Yes

Why:

This is the final validation and handoff point. If validation passes, the feature is ready for review/release. If validation is blocked, the blocker should be resolved before release.

## Risks / rollback notes / recorded gaps

- No formal test harness exists. If the implementer adds one, that is a scope expansion and should be justified; otherwise typecheck plus focused/manual validation is acceptable for this small feature.
- Dependency installation may be required for typecheck because `node_modules` is absent in the current checkout.
- Manual runtime verification may depend on local Pi availability and a subagent/tool path that can observe environment variables. If unavailable, report this clearly and provide the strongest focused code-level verification performed instead.
- Rollback is removing `pi-minimal-subagent.environment` from settings or reverting the source/docs changes. Removing the setting does not remove variables inherited from the parent process.

## Coding-agent handoff

After Steps 1–3 are complete, validate the entire feature. Start by reading the specification and all three prior plan files, then inspect the final changes in `src/types.ts`, `src/settings.ts`, `src/runner.ts`, and `README.md`. Run typecheck, installing dependencies if allowed and needed. Verify settings parsing/merge behavior, runner env overlay behavior, README accuracy, and absence of out-of-scope per-agent/per-call/isolation/secrets behavior. Perform a manual subagent runtime check if feasible, remove any temporary fixtures, and report exact validation results and blockers.
