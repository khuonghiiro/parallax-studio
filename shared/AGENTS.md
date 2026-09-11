# Legacy shared source instructions

## Responsibility

`shared/` contains transitional contracts and pure domain logic. New target
ownership is defined by `packages/contracts/` and `packages/core/` in the module
map; do not expand this directory into a permanent catch-all.

## Local rules

- Keep contracts serializable and free from React, DOM, Three.js, MCP, Tauri,
  storage, and process dependencies.
- Keep pure animation or validation algorithms deterministic and free of browser
  or native I/O.
- Search for an existing owner before adding a type, template, validator, or
  algorithm.
- Do not expose mutable singleton state or create broad `utils` modules.
- When Milestone 0 assigns a target package, move the logic once and update all
  callers instead of retaining compatibility copies indefinitely.

## Verification

Run source limits, relevant type checks, and deterministic domain tests for the
invariants changed.
