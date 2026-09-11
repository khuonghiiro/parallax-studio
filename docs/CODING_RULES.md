# Parallax Studio source-code rules

This is the shared rule source for AI agents and people who edit code in the
project. User-requested rules take effect immediately; the product architecture
remains a proposal awaiting approval.

This file is the English translation of the canonical Vietnamese file at
`docs_vi/CODING_RULES.md`; changes must remain synchronized according to the
[documentation policy](DOCUMENTATION_POLICY.md).

## 1. File limits and responsibilities

- A handwritten source file must not exceed **800 physical lines**.
- Blank lines and comments count. A final newline does not create a phantom blank
  line; actual blank lines still count.
- This applies to the app, backend, MCP, tests, scripts, shaders, and handwritten
  configuration.
- Dependencies, build output, lockfiles, and generated code are not edited by hand.
  An exclusion must identify its generator and location; it must not hide business
  logic.
- Around 400–500 lines is a signal to review responsibilities, not a target size.
- Split by responsibility: `camera-controller.ts`, `shadow-pass.ts`,
  `texture-cache.ts`. Do not split into `part1.ts` and `part2.ts` merely to reduce
  line count.
- A large shared file must be split further by domain and public API. Do not collect
  unrelated concerns in `utils.ts`, `helpers.ts`, `common.ts`, or `manager.ts`.

## 2. Readability is mandatory

- Put each statement on its own line; function bodies, if/else branches, and loops
  use multiline blocks.
- A pure single-operation callback such as `(node) => node.id` may be concise. A
  callback with multiple steps must use a multiline block or a named function.
- Do not place multiple state declarations, variables, or hooks on one line.
- JSX with multiple elements must be multiline, with components split by
  responsibility.
- Do not nest ternaries. Use guard clauses or named variables for complex
  conditions.
- Do not place a long object type inside a generic or call site. A type used in
  multiple places belongs to its owning contract or domain and must not be
  redeclared by each caller.
- Names describe meaning: `asset`, `sceneNode`, `frameIndex`, `requestBody`; avoid
  `a`, `n`, `s`, and `p` in business logic. Short names are acceptable in
  mathematical code or loops when the context is clear.
- Comments explain rationale, units, coordinate systems, ownership, or limits;
  they do not merely restate an instruction.
- Public APIs have explicit return types. Do not use `any`, casts, or non-null
  assertions to conceal design errors. Handle missing-data states explicitly.

Example of acceptable style (illustrative, not an implemented API):

```ts
import type { SessionInfo } from '@parallax/contracts/session';
import type { HttpClient } from '../transport/http-client';

export class SessionClient {
  private token: string | null = null;

  constructor(private readonly httpClient: HttpClient) {}

  async connect(): Promise<SessionInfo> {
    const session = await this.httpClient.get<SessionInfo>('/api/session');

    this.token = session.token;

    return session;
  }

  getToken(): string | null {
    return this.token;
  }
}
```

`SessionInfo` has one definition in contracts. `HttpClient` owns HTTP behavior,
error parsing, and timeouts. `SessionClient` keeps a token per instance rather than
using a global token shared by multiple sessions. If the HTTP file grows, split it
by function into `response-parser.ts` and `request-errors.ts`; do not create multiple
HTTP-client implementations.

The usual layout is imports → local types → constants → public API → private helpers.
A component keeps props/state/effects/handlers/render sections easy to find. Helpers
may follow the public API when the declaration mechanism permits; avoid an order that
causes initialization errors.

## 3. Ownership of shared logic

Before writing, use `rg` to find similar implementations, behavior, and callers.

| Logic | Intended owner |
| --- | --- |
| Schema/DTO/protocol enum | `packages/contracts/src/<domain>/` |
| Bone math, weights, IK | `packages/core/src/rig/` |
| Keyframes, easing, clip sampling | `packages/core/src/animation/` |
| View selection and topology compatibility | `packages/core/src/views/` |
| Warp/morph and pose composition | `packages/core/src/deformation/` |
| Mesh/material/shadow/GPU resources | `packages/runtime/src/<domain>/` |
| Commands, revisions, transactions, undo | `packages/application/src/` |
| HTTP/session and API transport | `apps/editor/src/services/` |
| UI specific to one feature | `apps/editor/src/features/<feature>/` |
| Pure UI shared by several features | `apps/editor/src/ui/` |
| MCP schema mapping/tool handler | `apps/mcp/src/tools/` |
| File, process, and service adapters | `apps/service/src/adapters/` |

Dependency relationships are defined in the [module map](MODULE_MAP.md). These are
proposed paths; do not create empty folders or move files when the task is only
planning.

## 4. Do not duplicate business logic

- A business rule or algorithm has one implementation; callers use its public API
  or transport.
- Browser preview and export use the same pose evaluator, easing, and deformation
  order.
- Do not manually copy a TypeScript schema into Rust. When native code needs a
  schema, generate it from the same source and test compatibility.
- Extract parts that genuinely have the same meaning. Do not force two different
  behaviors into a helper with many Boolean flags merely because several lines look
  similar.
- A helper lives in the narrowest scope with real callers. Promote it to a package
  only when there is a clear shared need.
- Adapters may differ by OS or transport, but they do not contain copies of rig or
  timeline logic.
- A clone detector is only supporting evidence; review must also find semantic
  duplication. Do not claim "0 duplicate" based on one scan alone.

## 5. Boundaries and invariants

- Core does not import React, DOM, Three.js, Node I/O, MCP, or Tauri.
- Runtime does not call UI/MCP. UI/MCP do not modify a project through a separate
  path.
- Modify scenes through the application command bus; confirm only after persistence
  succeeds.
- Schemas do not replace checks for revisions, ID references, bone cycles,
  weights/topology, and job states.
- Units, axis directions, local/world/UV spaces, and deformation order must be
  explicit.
- Textures, geometry, workers, listeners, and sessions have explicit lifecycle and
  disposal behavior.
- Do not rebuild geometry or the entire React tree every frame when data has not
  changed.
- Export has a revision snapshot, progress, cancellation, and readable errors.

## 6. Formatting and automated gates

Prepared configuration: `.editorconfig`, `.prettierrc.json`, `rustfmt.toml`.
Prettier print width 100 is a formatting target, not a hard limit. Source lines over
120 characters must be corrected; a special literal that cannot be reasonably
wrapped needs a narrow reviewed exemption, not a whole-file exclusion.

Current tools, requiring no dependencies:

```sh
node scripts/quality/check-source-limits.mjs
node --test scripts/quality/source-limits.test.mjs
node scripts/quality/check-doc-sync.mjs
node --test scripts/quality/doc-sync.test.mjs
```

- More than 800 lines per file makes the check fail.
- A source line longer than 120 characters is reported and makes the check fail.
- Doc-sync checks that all file pairs exist and that revisions, review status, and
  current hashes match.
- These checks do not validate syntax, semantic duplication, import boundaries, or
  every style rule.

When implementing Milestone 0, add version-locked dependencies and these gates:

1. Prettier check for TS/TSX/JS/JSON/CSS, rustfmt for Rust, and a Python formatter
   when needed.
2. ESLint, TypeScript strict mode, control-flow checks, and unused-code checks.
3. Import graph/module-boundary and dependency-cycle checks.
4. Clone detection for copied code blocks, accompanied by semantic review.
5. Tests appropriate to the change; integration coverage for UI/MCP using the same
   commands and preview/export using the same pose.
6. CI runs gates before accepting a change; do not disable a rule merely to make CI
   green.

Formatters, linters, clone detectors, and complete CI integration have not been
installed in this planning turn. Do not report that these tools were run. The legacy
draft still fails readability checks; a planning task reports that result instead of
silently turning into an application-wide refactor.

## 7. AI workflow

1. Read `AGENTS.md`, the plan, and the module map; identify the assigned scope.
2. Find the logic owner and callers before creating a file.
3. Choose the public API and dependency direction; split responsibilities before a
   file grows too large.
4. Update callers of shared logic without leaving two parallel implementations.
5. Format, run relevant checks, and review the diff as the person who will maintain
   the code.
6. Report changes, checks run, remaining failures, and observed limitations.

Rules and skills do not replace gates. If a client has not discovered a new skill,
read the file linked from `AGENTS.md` directly rather than ignoring the guidance.
