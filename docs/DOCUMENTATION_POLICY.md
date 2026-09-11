# Bilingual documentation policy

## 1. Canonical content

`docs_vi/` is the canonical Parallax Studio specification. The user reads and
approves product scope, architecture decisions, data contracts, limits, and
acceptance criteria there.

`docs/` is the English translation for Codex, Antigravity, and other coding
agents. An English document must preserve the meaning of the same-named file in
`docs_vi/`; it is not an independent decision source.

If the copies disagree, `docs_vi/` applies. The agent must correct the English
copy in the same documentation task and report what was synchronized.

## 2. Change workflow

When a requirement or decision changes:

1. Confirm the user's direct request and identify affected documents.
2. Change the canonical file in `docs_vi/` first.
3. Keep `proposed`, `accepted`, `superseded`, or `implemented` status aligned
   with the real decision; do not mark a choice approved without evidence.
4. Translate the complete change into the same-named file in `docs/`.
5. Preserve numbers, command names, schema fields, invariants, limits, and
   acceptance criteria across both copies.
6. Update the sync manifest and run the documentation checks.

Do not edit only `docs/` to introduce a product requirement. English wording or
typography fixes are allowed, but the manifest must still be updated so the
change remains reviewable.

## 3. Sync manifest

`docs/DOC_SYNC_MANIFEST.json` records every document pair, revision, review
status, and the SHA-256 hash of both copies. Hashing removes a BOM and normalizes
line endings to LF, so any content change makes the manifest stale.

Review states:

- `synced`: the pair has been compared for semantic equivalence at the recorded
  revision.
- `needs-review`: the pair exists and its hashes are current, but semantic
  translation equivalence has not been confirmed.

Hashes detect changed files. A bilingual reviewer must still verify semantic
equivalence before changing a pair to `synced`.

Before implementing a feature, every document required by that feature must be
`synced`. Unrelated documentation still at `needs-review` does not block an
independent task.

## 4. Verification

Run:

```sh
node scripts/quality/check-doc-sync.mjs
node --test scripts/quality/doc-sync.test.mjs
```

The checker validates file pairs, paths, revisions, hashes, and review state. For
a `synced` pair it also compares heading structure, code-fence languages, link
targets, and inline code tokens. It does not translate content, increment
revisions, or claim semantic equivalence.

## 5. Team ownership

- `product-spec` owns requirements and decisions in `docs_vi/` when assigned by
  the Lead.
- `spec-translator` translates settled content into `docs/`; it does not add
  requirements or change ADR status.
- One writer owns a document pair at a time.
- `qa-reviewer` checks the diff, links, manifest, and checker result before the
  Lead integrates the change.
