# Step 1: Resolve environment settings

## Objective

Extend the resolved subagent settings contract so global/project `pi-minimal-subagent.environment` entries are parsed into a string-only environment map with project entries overriding global entries by environment-variable key.

## Why this step exists

This establishes the shared configuration data that later runner behavior depends on. It covers the specification deltas for `Settings`, `readSettings(...)`, and global/project key-level merge semantics before any child process behavior consumes the new setting.

## Execution metadata

**Execution mode:** Autonomous

**Wave:** Wave 1 — foundational settings work; not parallel-safe with other code steps because later runner behavior depends on this data shape.

**Depends on:** none

**Parallel safety / file overlap:** Not parallel-safe with Step 2 because both may need to coordinate on the `Settings` shape. Safe in parallel with Step 3 only if the Step 3 executor treats `environment` semantics as fixed by the specification and does not edit source files.

## Read first

- `.planning/subagent-env-injection/specification.md` — source of the selected technical approach, string-only parsing rules, and merge semantics.
- `src/types.ts` / `Settings` — shared settings contract that must carry the resolved `environment` map.
- `src/settings.ts` / `readSettings` and `resolveSettings` — existing package settings parser and global/project precedence point.
- `/home/whitman/.nvm/versions/node/v24.15.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/settings.md` — Pi settings convention: project settings override global settings and nested objects are merged.
- `README.md` Settings section — current documented package settings shape to keep terminology consistent.

## File ownership / likely touched surfaces

- `src/types.ts` — add the resolved `environment` property to `Settings`.
- `src/settings.ts` — parse `environment`, merge global/project maps by key, and preserve existing `model`/`extensions` behavior.

## Project grounding

- `src/types.ts` currently defines `Settings` as `{ model: string | null; extensions: string[] | null }`, so there is no place to carry resolved environment values yet.
- `src/settings.ts:readSettings` currently reads only `model` and `extensions` from the `pi-minimal-subagent` settings object.
- `src/settings.ts:resolveSettings` currently returns defaults plus global/project settings via top-level object spread.
- Pi `docs/settings.md` documents nested object merge behavior for project overrides, which supports key-level merge for `environment`.

## Concrete actions

- Update `src/types.ts:Settings` to include `environment: Record<string, string>` as a resolved setting, defaulting to an empty object when no valid config exists.
- In `src/settings.ts`, add a small parser for `environment` that accepts only a plain JSON object-like value, keeps entries whose key is non-empty after trimming and whose value is a string, preserves empty string values, and ignores arrays, null, non-string values, and empty keys.
- Keep `extensions` path resolution behavior unchanged; `environment` values are literal environment strings and must not pass through `resolveConfiguredPath`.
- Change `resolveSettings(cwd)` so it reads global and project package settings separately, keeps existing top-level override behavior for `model` and `extensions`, and merges `environment` as `{ ...globalEnvironment, ...projectEnvironment }` with project values winning per variable name.
- Preserve existing forgiving behavior for missing/unreadable/invalid settings files: no thrown error and resolved `environment` is `{}`.
- Do not add per-agent environment fields to `AgentConfig` or parse agent frontmatter in this step.

## Acceptance criteria

- `src/types.ts` contains `environment: Record<string, string>` on `Settings`.
- `src/settings.ts` recognizes the `environment` setting under the existing `pi-minimal-subagent` key.
- Global/project `environment` values merge by key with project values winning, without changing `model` and `extensions` precedence.
- Non-string values and empty keys are ignored; empty string values remain valid.
- `grep -R "environment" -n src/types.ts src/settings.ts` shows the new setting is represented only in the settings/type layer after this step.

## Validation

### Automated

- Run `npm run typecheck` if dependencies are installed.
- If `tsc` is unavailable because `node_modules` is absent, record that validation is blocked by missing install and defer full typecheck to Step 4.
- If a lightweight ad-hoc check is practical without adding a test harness, verify `resolveSettings` behavior against temporary global/project settings fixtures; otherwise keep this as a Step 4 validation item.

### Manual

- None expected for this step beyond reviewing the settings merge behavior against the specification.

## Done criteria

- Resolved settings always include an `environment` object.
- Existing valid `model` and `extensions` settings still parse as before.
- Invalid or absent `environment` settings do not prevent subagents from running.

## Must-haves covered

- Users can express subagent environment values under the existing `pi-minimal-subagent` settings object.
- Project settings override global environment values by variable name.
- Invalid environment entries are forgivingly ignored without adding new failure modes.

## Review boundary

This step should be reviewed as:

- one PR/change set

Why:

It is a coherent settings-contract change and is a safe pause point before runner behavior consumes the new setting.

## Safe pause point

Can work safely stop after this step?

Yes

Why:

No child-process behavior changes yet. The project may not compile until Step 2 updates all `Settings` consumers if any required construction sites are missed, but runtime behavior is not partially changed.

## Risks / rollback notes / recorded gaps

- Current `readSettings` is private and `resolveSettings` depends on Pi's global agent directory, so focused automated testing may require a small helper or ad-hoc fixture setup. Record the chosen validation path in Step 4.
- Do not implement `null` as unset/delete; the specification explicitly excludes deletion semantics.
- Do not stringify numbers, booleans, arrays, or objects; accepting only strings avoids surprising environment values and follows the existing parser's filtering style.

## Coding-agent handoff

Read the specification, then inspect `src/types.ts` and `src/settings.ts` before editing. Add `environment: Record<string, string>` to the resolved settings type, parse only string-valued entries from `pi-minimal-subagent.environment`, and merge global/project environment maps by key with project values winning. Avoid touching runner behavior, README docs, tool parameters, or agent frontmatter in this step. Verify with typecheck if available and report whether dependency installation is needed for full validation.
