# Specification: Subagent environment configuration

## Summary

Use a standard-light specification: the shaped product behavior maps cleanly to the existing settings-to-runner flow, but the feature introduces a user-facing configuration contract that needs precise precedence, typing, and safety boundaries. The selected approach extends the existing subagent settings with an `environment` map, resolves global and project values with project entries winning by variable name, and applies that map at the child process boundary by merging it over the inherited parent environment.

## Product solution being specified

This specifies global/project-level environment configuration for all subagent runs. The user-confirmed product decisions are: the setting is not per-agent and not per-invocation; configured values merge with the inherited child environment and override/add only named variables; current inherited environment behavior remains when no environment values are configured; the settings property should be named `environment`; the value should be a simple JSON object where each key is an environment variable name. Minimal explicit control is in scope, but strong isolation, secret masking, auditing, and unset/delete semantics are out of scope.

## Project grounding

### Relevant code surfaces

- `package.json` — Pi loads this package as an extension through `pi.extensions: ["./src/index.ts"]`; package purpose is “Minimal named subagent tool for Pi. Run one configured agent on one task.” — Verified
- `README.md` — documents the current user-facing settings surface under `pi-minimal-subagent`, with global settings in `~/.pi/agent/settings.json` and project settings in `.pi/settings.json`; currently documents `model` and `extensions`, not environment configuration — Verified
- `src/index.ts` — registers the `subagent` tool with only `agent` and `task`, resolves settings, and passes them to the runner; the selected solution should not change this tool input contract — Verified
- `src/settings.ts` — owns package settings parsing via `resolveSettings(cwd)` and `readSettings(...)`; currently parses `model` and `extensions` from the `pi-minimal-subagent` settings object — Verified
- `src/types.ts` — defines `Settings` as `{ model: string | null; extensions: string[] | null }`; this is the shared type that should carry the resolved environment map — Verified
- `src/runner.ts` — owns child Pi process execution; `runSubagent(...)` currently spawns the child with `env: process.env`, which is the exact boundary where configured values should be applied — Verified
- `src/agents.ts` — parses per-agent frontmatter for `model`, `extensions`, `skills`, and `thinking`; per-agent environment configuration is out of scope and this surface should remain unchanged — Verified
- `/home/whitman/.nvm/versions/node/v24.15.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/settings.md` — Pi settings use global and project JSON files, with project settings overriding global settings and nested objects merged — Cited
- `/home/whitman/.nvm/versions/node/v24.15.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/extensions.md` and `docs/packages.md` — extensions/packages are configured through settings and can run with full system permissions; this reinforces that environment values may be sensitive and should not be displayed unnecessarily — Cited

### Relevant current behavior

- The subagent tool invocation accepts only an agent name and task; there is no per-call runtime configuration today — Verified in `src/index.ts`.
- Package settings are read from Pi’s global agent settings and project `.pi/settings.json`, then passed to every subagent run — Verified in `src/settings.ts` and `src/index.ts`.
- Current subagent processes inherit the parent process environment wholesale through `env: process.env` — Verified in `src/runner.ts`.
- Agent frontmatter can influence model/extensions/skills/thinking, but not environment variables — Verified in `src/agents.ts`.
- Pi’s documented settings model says project settings override global settings and nested objects are merged — Cited in `docs/settings.md`.
- There is no existing test suite or test script; `npm run typecheck` exists, but local validation currently requires installing dependencies because `node_modules` is absent — Verified in `package.json` and prior command output.

### Canonical read-first references

- `.planning/subagent-env-injection/problem.md` — problem framing, user pain, and why-now.
- `.planning/subagent-env-injection/solution.md` — locked product decisions and out-of-scope boundaries.
- `README.md` — current user-facing settings documentation and minimal product promise.
- `src/settings.ts` — existing settings parser and precedence point.
- `src/types.ts` — settings data contract.
- `src/runner.ts` — child process environment boundary.
- `/home/whitman/.nvm/versions/node/v24.15.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/settings.md` — Pi settings precedence convention.

### Architectural responsibility map

- Environment settings parsing — configuration layer — reuse `src/settings.ts:resolveSettings` / `readSettings` — Custom work justified: Yes, a new settings key is needed but should follow existing parser style.
- Resolved environment data shape — shared runtime configuration type — reuse `src/types.ts:Settings` — Custom work justified: Yes, the existing settings contract must carry the new map.
- Applying environment values to subagent execution — process integration layer — reuse `src/runner.ts:runSubagent` spawn options — Custom work justified: Yes, this is the existing child-process boundary.
- User-facing configuration documentation — documentation layer — reuse README Settings section — Custom work justified: Yes, users need the new `environment` contract and inheritance behavior documented.
- Per-agent or per-call environment behavior — agent/tool contract layers — no existing surface should be reused for this version — Custom work justified: No, product explicitly excludes these scopes.

## Technical invariants

- The `subagent` tool input contract remains `{ agent, task }`; no per-invocation environment parameter is added.
- Existing behavior is preserved when `environment` is omitted or invalid: child runs still inherit `process.env` as today.
- Configured environment values apply to all subagent runs in the resolved global/project scope.
- Configured values add or override named inherited variables; they do not remove inherited variables.
- Project configuration takes precedence over global configuration for the same environment variable name.
- Environment values must not be added to normal tool result details, rendering output, progress output, or command-line arguments.
- Agent frontmatter remains limited to the currently documented optional fields; no per-agent `environment` support is introduced.
- Invalid settings should follow the current forgiving parser style: ignore unusable entries rather than failing subagent execution.

## Selected approach

Add `environment` as a package setting under the existing `pi-minimal-subagent` settings object. The resolved setting is a map of environment variable names to string values. Global and project `environment` maps are merged by key, with project values overriding global values for the same key. At child process spawn time, the runner builds the child environment from the inherited parent environment plus the resolved map, with configured values winning over inherited values.

This approach reuses the project’s existing configuration path instead of adding a new tool parameter, agent frontmatter field, or extension-specific configuration framework. It also aligns with Pi’s documented nested settings merge behavior while preserving the minimal scope chosen in `/shape`.

The settings value should be documented as a JSON object, for example:

```jsonc
{
  "pi-minimal-subagent": {
    "environment": {
      "MY_EXTENSION_MODE": "subagent",
      "SERVICE_BASE_URL": "https://example.test"
    }
  }
}
```

Values should be strings in the first version. Non-string values are ignored rather than stringified, treated as unset, or causing execution to fail. Empty string values are allowed because empty environment values can be intentional. Empty variable names are ignored. No special validation beyond that is required for the first version.

## Critical technical decision checkpoint

The user confirmed the most important user-facing contract decisions: global/project-only scope, merge/override behavior against inherited environment, minimal safety controls, JSON object shape, and the setting name `environment`.

Two remaining decisions are code- and docs-implied rather than separately user-confirmed:

- Global/project merge should be key-level merge with project values winning. Pi’s settings documentation says nested objects are merged, and the selected product shape says each object key is an environment variable. Treating the project `environment` object as a wholesale replacement would be more surprising and less consistent with Pi settings. Status: Code-implied/Cited.
- Values should be strings only, with non-string entries ignored. Process environments are string-based, and the existing settings parser already filters invalid `model`/`extensions` values instead of failing. Stringifying arbitrary JSON values or using `null` for deletion would add behavior outside the shaped solution. Status: Safely assumed.

No unresolved critical decision blocks `/plan`.

## Appetite fit and phasing

The design fits the shaped minimal appetite because it changes only the existing package settings contract, resolved settings data, child process environment merge, and README documentation. It avoids per-agent/per-invocation configuration, a secrets manager, isolated environment modes, validation UI, and extension-specific config plumbing. No phased rollout is required; rollback is removing the setting or reverting the code change.

## Alternatives considered

### Option A — Settings-level `environment` map, merged over inherited env

This is the selected approach. It uses existing global/project settings and the existing child-process boundary. It preserves today’s behavior by default, gives users a generic escape hatch for env-configured extensions, and keeps the tool invocation minimal. The tradeoff is that all subagents in the scope receive the same configured values; that is acceptable because per-agent/per-call control was explicitly excluded.

### Option B — Per-agent environment frontmatter

This would attach environment values to named agents and better support different setups per subagent. It was rejected at the product level because the user chose global/project configuration only. It would also expand `src/agents.ts` and the agent file contract, increasing scope.

### Option C — Per-invocation environment parameters

This would be the most flexible but would change the public tool contract from “agent + task” into runtime configuration per call. It was rejected at the product level and would make the minimal tool harder for parent agents to use predictably.

### Option D — Isolated environment or secrets/allowlist model

This would replace or constrain inherited environment variables and potentially add explicit secret controls. It was rejected for the first version because the chosen product behavior is minimal explicit control, not strong isolation or auditing. It would also be riskier because current users may rely on inherited environment variables.

### Option E — Documentation-only / no product change

Documentation could explain that subagents inherit parent environment, but it would not let users intentionally configure different subagent runtime context. It does not solve the near-term adoption and support-risk problem.

## Technical design

### Technical deltas

- **Current:** `Settings` contains only `model` and `extensions`.
  **Target:** `Settings` also contains a resolved `environment` map of string keys to string values.
  **Acceptance / verification anchor:** Typecheck confirms callers use the updated shape; settings resolution returns an empty map when no environment config exists and a populated map when valid string values are configured.

- **Current:** `readSettings(...)` ignores all package setting keys except `model` and `extensions`.
  **Target:** `readSettings(...)` parses `environment` when it is a plain JSON object, keeps string-valued entries, allows empty string values, ignores non-string values and empty keys, and leaves path resolution behavior unchanged for `extensions` only.
  **Acceptance / verification anchor:** A settings fixture with `environment` produces the expected map without affecting `model`/`extensions` parsing.

- **Current:** Global/project settings are combined by top-level object spread in this package, while Pi docs say nested objects are merged.
  **Target:** `environment` specifically follows Pi’s nested object convention: global environment entries are retained unless the project config overrides the same variable name.
  **Acceptance / verification anchor:** A global config with `{ A: "global", B: "global" }` and project config with `{ B: "project", C: "project" }` resolves to `{ A: "global", B: "project", C: "project" }`.

- **Current:** `runSubagent(...)` spawns the child with the parent environment directly.
  **Target:** `runSubagent(...)` spawns the child with inherited parent environment plus resolved `settings.environment`, with configured values winning.
  **Acceptance / verification anchor:** A configured variable is visible to the child process and overrides an inherited variable of the same name; omitted config preserves inherited environment behavior.

- **Current:** README Settings section documents `model` and `extensions` only.
  **Target:** README documents `environment`, global/project precedence, inherited environment merge behavior, string-only values, and the first-version safety boundary.
  **Acceptance / verification anchor:** A user can copy a documented settings example and understand that all subagents in that scope receive the configured values.

### Data and state

No database, migration, persisted runtime state, or session format changes are needed. The only data shape change is the in-memory `Settings` contract and the user-edited JSON settings shape under the existing `pi-minimal-subagent` key.

The resolved `environment` map should default to an empty object. It should not use `null` as a tri-state like `extensions`; unset/delete behavior is out of scope.

### APIs, contracts, events, or jobs

The public tool contract remains unchanged: calls still provide only `agent` and `task`. There are no API routes, background jobs, events, or model/provider contracts to change.

The user-facing settings contract changes by adding:

- `pi-minimal-subagent.environment`: optional JSON object.
- Object keys: environment variable names.
- Object values: strings.
- Precedence: project entries override global entries by key; resolved entries override inherited process environment by key.

### Integrations

The integration boundary is Node child process spawning in `src/runner.ts`. The child Pi subprocess and extensions loaded inside it receive the merged environment. This feature does not require Pi CLI flag changes and should not pass environment values through command-line arguments.

Failure behavior at the integration boundary should remain consistent with current runner behavior: if child spawn fails, the existing runner error path reports the spawn error. Invalid environment settings should be filtered before spawn so malformed JSON values do not create spawn-time type errors.

### Permissions, security, and privacy

Environment variables may contain secrets. The selected product shape intentionally does not add strong secret controls, auditing, or isolation. Technical safeguards for the first version are limited to avoiding unnecessary exposure:

- Do not include configured environment values in tool result details, renderer output, progress summaries, or CLI arguments.
- Do not mask or redact values printed by the child process or its extensions; if an extension prints an environment value to stdout/stderr, that is outside this feature’s control and should be documented as a general env/extension risk if mentioned.
- Inherited parent environment remains available to subagents; this is a user-confirmed behavior, not a security isolation feature.

### Error handling and failure behavior

- Missing settings file: keep existing behavior; resolve defaults and run normally.
- Invalid JSON settings file: keep existing behavior; `readJsonSafe` returns `{}` and the subagent runs with inherited environment.
- Missing `environment` key: resolve an empty map and run with inherited environment.
- `environment` is not an object: ignore it and run with inherited environment plus any other valid settings.
- Non-string environment values: ignore those entries; do not stringify, unset, or fail.
- Empty variable name: ignore that entry.
- Empty string value: preserve it as an intentional configured value.
- Spawn failure: use existing runner failure handling.

### Observability

No new logs, metrics, alerts, or result details are required. Runtime verification should avoid displaying configured values. If debug visibility is desired later, show variable names only and treat value display as a separate product decision; this is out of scope for the first version.

### Rollout and rollback

No migration is needed. The feature is enabled only when users add `environment` to settings. Rollback paths are simple:

- User rollback: remove `pi-minimal-subagent.environment` entries from global/project settings.
- Code rollback: revert the settings/type/runner/docs changes.

Removing configured values does not remove variables already present in the parent process environment; it only stops this extension from adding/overriding them.

## Validation strategy

Automated validation should cover the pure behavior if a test path is added or available during `/plan`:

- Settings parsing accepts string-valued `environment` entries and ignores invalid values.
- Global/project environment maps merge by key with project values winning.
- Runner environment construction preserves inherited variables and overrides/adds configured variables.
- Tool parameter schema remains unchanged.

Repository validation should include `npm run typecheck` after dependencies are installed. Current checkout has no `node_modules`, so typecheck cannot run until install.

Manual validation should configure a project `.pi/settings.json` with a test `environment` variable, run a subagent path that can observe an environment variable in the child process, and confirm the configured value is visible. Also verify that removing the setting returns to inherited-env behavior.

## Decision log

| Decision | Status | Rationale | Evidence |
| --- | --- | --- | --- |
| Configure environment globally/project-wide for all subagents only | User-confirmed | User explicitly chose option 2 only during `/shape`; per-agent and per-invocation were excluded. | Conversation; `.planning/subagent-env-injection/solution.md` |
| Use setting name `environment` | User-confirmed | User preferred `environment` over `env`. | Conversation |
| Use a JSON object keyed by environment variable name | User-confirmed | User explicitly wanted the configuration object to be a JSON object where each key is an environment variable. | Conversation; `.planning/subagent-env-injection/solution.md` |
| Merge configured values over inherited parent environment | User-confirmed | Preserves current behavior while adding/overriding named variables only. | Conversation; `src/runner.ts` currently uses `env: process.env` |
| Merge global/project `environment` maps by key, project values win | Code-implied / Cited | Pi settings docs say nested objects are merged; environment is a nested object keyed by variable name. | Pi `docs/settings.md`; selected JSON object shape |
| Accept string values only; ignore non-string values | Safely assumed | Environment variables are string-based and current settings parsing filters invalid values instead of failing. Stringification or deletion semantics would add scope. | `src/settings.ts` parser style; selected minimal scope |
| Do not add per-agent environment frontmatter | User-confirmed | Per-agent env was explicitly rejected in shape. | Conversation; `src/agents.ts` current frontmatter fields |
| Do not add per-invocation environment tool parameters | User-confirmed | Per-invocation env was explicitly rejected and would change the minimal tool contract. | Conversation; `src/index.ts` tool schema |
| Do not expose configured values in details/rendering | Code-implied / Safely assumed | Product chose minimal safety; existing flow does not expose settings values, and env values may be secrets. | `src/index.ts`, README/Pi extension security docs |
| No unset/delete semantics | Safely assumed | Product specified add/override named variables only; `null` deletion would expand behavior. | `.planning/subagent-env-injection/solution.md` |

## Spike needed?

No. The relevant code path is small and verified, and the remaining implementation details are low-risk enough for `/plan`. No unknown appears likely to change the architecture or product scope.

## Out of scope

- Per-agent environment configuration in Markdown frontmatter.
- Per-invocation environment configuration in the `subagent` tool call.
- Replacing inherited environment with an isolated environment.
- Allowlisting inherited variables or blocking inherited secrets.
- Secret masking, auditing, or value visibility features.
- Unset/delete semantics for inherited variables.
- Extension-specific configuration standards.
- Changes to child Pi CLI flags, model selection, extension selection, skills, thinking, rendering, or JSON event parsing.
- Fixing unrelated README path/name inconsistencies unless separately scoped.

## Assumptions and open questions

### Assumptions

- `environment` entries with non-string values can be ignored without user-facing error, consistent with the current forgiving settings style.
- Empty string values are legitimate and should be preserved.
- Environment variable name validation beyond non-empty keys is unnecessary for the first version.
- Project/global nested merge for `environment` should follow Pi’s documented settings behavior even though this package currently uses top-level object spread for existing settings.
- The child subprocess and loaded extensions are the only consumers that need the configured environment values.

### Open questions

- Whether future versions should support deleting inherited variables, per-agent overrides, or per-invocation overrides. These are intentionally deferred, not blockers.
- Whether a future debug view should show configured variable names. Values should remain out of normal output unless a later product decision changes that.
- Whether to add a formal test runner to this repository or rely on typecheck plus focused manual/runtime validation for this small change.

## Phase handoff

Ready for next phase: Yes

Recommended next phase: `/plan`

Why / blocker:

The selected technical approach is grounded in existing settings resolution and runner process-spawn boundaries. Product-impacting decisions have been user-confirmed or are low-risk/code-implied from Pi settings conventions. No spike or blocker remains.

Read first for `/plan`:

- `.planning/subagent-env-injection/problem.md`
- `.planning/subagent-env-injection/solution.md`
- `.planning/subagent-env-injection/specification.md`
- `README.md`
- `src/types.ts`
- `src/settings.ts`
- `src/runner.ts`
- `src/index.ts`
- `/home/whitman/.nvm/versions/node/v24.15.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/settings.md`

Implementation surfaces for `/plan` to consider:

- `src/types.ts` for the resolved settings type.
- `src/settings.ts` for parsing and global/project environment merge.
- `src/runner.ts` for applying merged environment at spawn time.
- `README.md` for documenting the `environment` settings object and behavior.
- `package.json` only if `/plan` chooses to add a test script or test dependency.

Validation anchors:

- Typecheck after installing dependencies.
- Settings resolution validation for string-only parsing and global/project key merge.
- Runner validation for inherited environment preservation plus configured override/add behavior.
- Manual subagent run proving a configured variable is visible in the child process.

What the next phase must verify:

- Whether existing code structure allows testing `resolveSettings` without intrusive refactoring.
- Whether introducing a small pure helper for environment parsing/merging improves testability without adding unnecessary abstraction.
- Whether TypeScript has the needed Node environment typings available after dependencies are installed.

Remaining uncertainty:

- Test harness choice is unresolved because the repository currently has no tests. This does not block planning, but `/plan` should decide the lightest validation path that gives confidence without overbuilding.
