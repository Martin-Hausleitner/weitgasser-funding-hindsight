# ADR-0001: Evidence-backed funding index with Hindsight summaries

## Status

Proposed

## Context

Funding information is distributed across government portals, chamber pages and programme-specific documents. Conditions change, PDFs can be replaced, and a summary without a source trail is not reliable enough for an application decision. The system therefore needs an auditable index, deterministic document checks and a separate Hindsight knowledge layer.

## Decision

Maintain one structured funding index in `funding/index.json`. Each programme must point to an authoritative source page and every relevant conditions document must be downloaded into a controlled evidence store, hashed, and linked from the record. Hindsight receives only reviewed, source-linked summaries; it is not the source of truth.

## Record contract

Each programme record must contain:

- stable `id`, title, jurisdiction and responsible authority;
- authoritative `sourceUrl` and `lastVerifiedAt`;
- `documents[]` with URL, local path, SHA-256, retrieval timestamp and content type;
- structured conditions: eligibility, deadline, amount, co-funding, required evidence and exclusions;
- `hindsightNotePath` and review status.

## QA gate

The funding QA gate fails if a programme has no authoritative source, a referenced document is missing, a file hash is absent or the Hindsight note is not linked. It must also report stale records and never mark an empty index as complete. PDF retrieval is limited to explicitly approved authoritative sources and must respect robots, access controls and licensing.

## Consequences

Positive: reproducible evidence, change detection, source-aware RAG and clear human review points.

Negative: maintaining the index requires periodic retrieval and review; a PDF can be inaccessible or ambiguous and must remain blocked rather than guessed.

## Scope boundary

The initial scope is Austria. “All funding” is not considered complete until the responsible authorities and source catalogue are explicitly enumerated.
