# Legacy editor source instructions

## Responsibility

`src/` is the current compressed React/Three.js editor draft. Treat it as
transitional source until Milestone 0 moves real editor work to `apps/editor/`.

## Local rules

- Read `docs/UI_SPECIFICATION.md`, `docs/COMMAND_BUS.md`, and
  `docs/MODULE_MAP.md` for editor work.
- Components render state and translate user intent; they do not own project
  business rules, transport parsing, or a second animation sampler.
- Keep durable project mutations separate from selection, panels, playhead, and
  other ephemeral editor state.
- Pointer gestures may preview continuously but create one coherent commit at
  the gesture boundary.
- Reuse the design system and icon catalog. Preserve keyboard, focus, loading,
  error, empty, and disabled states when the changed UI needs them.
- Do not copy compressed one-line style from this draft. Refactor touched logic
  into readable cohesive modules under the 800-line limit.

## Verification

Run the source quality gate plus installed type, UI, or behavior checks relevant
to the changed editor flow. Do not claim visual validation without inspecting
the rendered interface.
