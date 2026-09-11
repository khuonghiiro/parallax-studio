# Legacy engine source instructions

## Responsibility

`engine/` is the current Rust/native service draft. Treat it as transitional
until the approved desktop and service topology is implemented in its target
modules.

## Local rules

- Read `docs/ARCHITECTURE_DECISIONS.md`, `docs/COMMAND_BUS.md`,
  `docs/PROJECT_FORMAT.md`, and `docs/RENDER_PROFILES.md` before changing native
  behavior.
- Native code owns lifecycle, filesystem/process adapters, bounded I/O, and
  platform integration assigned by the module map.
- Do not duplicate project rules, rigging, timeline evaluation, or renderer
  algorithms owned by shared TypeScript domain modules.
- Treat paths, media, serialized projects, process arguments, and MCP-derived
  data as untrusted.
- Use structured process arguments and explicit resource cleanup. Do not build
  shell command strings from filenames or user content.
- Keep Rust modules cohesive and below the project source line limit.

## Verification

Run source limits and the relevant installed Cargo format, check, or test command.
Report when the Rust toolchain or required native binary is unavailable.
