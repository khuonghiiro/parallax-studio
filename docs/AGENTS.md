# Instructions for English documentation

## Responsibility

This directory is the AI-facing English translation of the canonical Vietnamese
specification. Content must be translated from `docs/` counterpart before
implementation. It does not independently own product requirements,
architecture decisions, limits, or acceptance criteria.

## Change rules

- Read `DOCUMENTATION_POLICY.md` and the relevant canonical Vietnamese file.
- Translate meaning faithfully while retaining technical names, schemas,
  commands, formulas, numbers, and decision status.
- Do not introduce a requirement or mark an ADR `accepted` only in English.
- Update the same-named pair in `docs/` and sync manifest in one documentation task.
- One agent owns a document pair at a time; hand translation to
  `spec-translator` after Vietnamese content is stable.
- If code and documentation disagree, report the mismatch. Do not rewrite the
  specification merely to legitimize incorrect code behavior.

## Verification

Run the documentation sync checker and inspect local links. Mark a pair `synced`
only after comparing semantic meaning, numbers, statuses, and acceptance
criteria in both languages.
