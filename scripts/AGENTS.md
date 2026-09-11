# Repository tooling instructions

## Responsibility

`scripts/` owns deterministic repository maintenance and quality gates. Scripts
must expose real problems clearly and remain usable before application
dependencies are installed when practical.

## Local rules

- Prefer Node standard-library implementations for bootstrap quality checks.
- Keep scanners deterministic across Windows and Linux; normalize paths and line
  endings only when the contract requires it.
- Print actionable file-specific errors and use a non-zero exit code for failed
  invariants.
- Do not add exclusions that hide compressed legacy source or stale documents.
- Separate reusable checking logic from the CLI entrypoint so behavior-free tests
  can exercise it with temporary fixtures.
- Do not let a checker rewrite user files unless it is an explicitly named fix
  command with reviewable output.

## Verification

Run the changed script and its dedicated `node --test` suite. Exercise success,
failure, malformed input, and Windows-style path or line-ending cases when they
affect the logic.
