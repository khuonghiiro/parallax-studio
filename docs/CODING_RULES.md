# Parallax Studio — Source Code & Engineering Rules

This document is the canonical technical rulebook for AI agents and human contributors
working in this repository. Mandatory engineering rules take effect immediately.

## 1. File Size Limits & Separation of Concerns

- Every handwritten source file must not exceed **800 physical lines**, including
  comments, docstrings, and blank lines.
- The trailing newline does not create a phantom line; all actual blank lines are counted.
- This applies strictly to web app code, backend services, MCP tools, unit tests,
  utility scripts, GLSL shaders, and handwritten configurations.
- Generated code, build artifacts, lockfiles, and external vendor dependencies are exempt.
  Exemptions must have documented origins and must never be used to conceal business logic.
- A line count of **400–500 physical lines** serves as a proactive signal to inspect and
  decouple responsibilities before file bloat occurs.
- Modularize by cohesive concern (e.g., `camera-controller.ts`, `shadow-pass.ts`, `texture-cache.ts`).
  Never split arbitrarily into `part1.ts` or `part2.ts` solely to bypass line limits.
- Large shared files must be decomposed into domain-specific modules. Never aggregate
  unrelated domain logic into monolithic dumpsters like `utils.ts`, `helpers.ts`, or `common.ts`.

## 2. Mandatory Readability Standards

- One statement per line. Function bodies, if/else branches, and loops must use multiline blocks.
- Single-expression callbacks like `(node) => node.id` are permitted inline. Complex,
  multi-step callbacks must use multiline blocks or named functions.
- Do not compress multiple variable declarations, state hooks, or exports onto a single line.
- Complex JSX structures must be multiline with decoupled sub-components.
- Nested ternary expressions are prohibited. Use early return guard clauses or descriptive variables.
- Avoid bulky inline object types in generic call sites. Reusable types belong in contracts or domain definitions.
- Use explicit, descriptive naming: `asset`, `sceneNode`, `frameIndex`, `requestBody`. Avoid cryptic abbreviations
  like `a`, `n`, `s`, `p` in business logic (short variable names are allowed only in concise mathematical loops).
- Comments must provide technical rationale, physical units, coordinate spaces, ownership, or boundary constraints—not
  just repeat what the code obviously does.
- Public APIs must declare explicit return types. Do not use `any`, forced type casts, or non-null assertions
  (`!`) to conceal incomplete architectural designs. Handle null and empty states explicitly.

### Canonical Style Example

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

Standard file organization:
`imports` → `local types/interfaces` → `constants` → `public API/classes` → `private helpers`.

## 3. Domain Ownership of Shared Logic

Before authoring new logic, search existing implementations with `rg` / grep.

| Domain Logic | Target Module Ownership |
| --- | --- |
| Schemas, DTOs, protocol enums | `packages/contracts/src/<domain>/` |
| Skeleton math, weights, IK, landmarks | `packages/core/src/rig/` |
| Keyframe interpolation, easing, clip sampling | `packages/core/src/animation/` |
| View switching & topology compatibility | `packages/core/src/views/` |
| Warp grids, morph targets, pose composition | `packages/core/src/deformation/` |
| Triangulation, contour extraction, edge loops | `packages/core/src/geometry/` |
| Mesh, material, shadow pass, GPU resources | `packages/runtime/src/<domain>/` |
| Command bus, revisions, transactions, undo/redo | `packages/application/src/` |
| HTTP, session, client transport | `apps/editor/src/services/` |
| Feature-specific UI components | `apps/editor/src/features/<feature>/` |
| Pure UI design system & shared widgets | `apps/editor/src/ui/` |
| Icon catalog (Lucide + custom inline SVG) | `apps/editor/src/ui/icons/` |
| MCP tool handlers & schema adapters | `apps/mcp/src/tools/` |
| Native I/O, subprocesses, service adapters | `apps/service/src/adapters/` |

Detailed module boundaries are codified in [MODULE_MAP.md](MODULE_MAP.md).

## 4. Prohibition of Duplicate Business Logic

- A single domain rule or algorithm must have exactly one authoritative implementation.
- Browser preview and export pipeline must share identical pose evaluation, easing, and deformation logic.
- Do not duplicate TypeScript contracts into Rust by hand. Native bridges must be auto-generated or contract-tested.
- Extract common logic only when the semantic meaning is identical. Do not force disparate behaviors into one bloated
  helper overloaded with boolean flags.
- Desktop and web adapters may vary in transport, but must never maintain duplicate copies of rigging or timeline reducers.

## 5. Architectural Boundaries & Invariants

- **`core`** must never import React, DOM, Three.js, Node I/O, MCP SDK, or Tauri.
- **`runtime`** must never call UI or MCP. UI and MCP must never bypass the Command Bus to mutate state.
- All scene and asset modifications must pass through the **Application Command Bus**. State mutations are confirmed
  only upon successful commit.
- Contracts and Zod schemas do not replace invariant checks for revision sequencing, ID referential integrity,
  acyclic skeletons, or normalized bone weights.
- Coordinate spaces (local, rest-space, world, UV), axes directions, and transformation orders must remain explicit.
- Textures, geometries, web workers, and event listeners must have deterministic lifecycle teardown (`dispose()`).
- Never rebuild Three.js geometry or re-render entire component trees every frame if underlying data is unchanged.

## 6. Automated Formatting & Quality Verification Gates

Formatting configurations: `.editorconfig`, `.prettierrc.json`, `rustfmt.toml`.
Lines exceeding 120 columns trigger warnings and fail strict checks.

Current local verification commands (require no external dependencies):

```sh
node scripts/quality/check-source-limits.mjs
node --test scripts/quality/source-limits.test.mjs
```

- Any file exceeding 800 physical lines fails the gate.
- Long source lines (>120 columns) are reported as readability violations.

Full CI gates in Milestone 0 include:
1. Prettier formatting for TS/JS/JSON/CSS, rustfmt for Rust.
2. ESLint with strict TypeScript checks.
3. Dependency boundary analysis (dependency-cruiser) to prevent circular imports.
4. Clone detection (jscpd) paired with semantic review.
5. Automated test suite for invariants and deformation contracts.

## 7. AI Agent Operational Workflow

1. Read `AGENTS.md`, [PLAN.md](PLAN.md), and [MODULE_MAP.md](MODULE_MAP.md); establish task boundary.
2. Locate existing code owners and callers prior to creating files (`REUSE → EXTEND → REFACTOR → CREATE NEW`).
3. Define strict public API types; decouple responsibilities before exceeding 400 lines.
4. Update callers of refactored logic; never leave parallel duplicate implementations.
5. Format and run verification scripts (`scripts/quality/check-source-limits.mjs`).
6. Report concise summaries: plan, progress, problems, and verification results.
