---
"webpack-sources": minor
---

Add **experimental** support for the [TC39 Source Map Scopes Proposal](https://github.com/tc39/source-map/blob/main/proposals/scopes.md) (`originalScopes` / `generatedRanges`).

`SourceMapSource` now reads these fields from an input source map and forwards them through `streamChunks` via two new optional callbacks — `onOriginalScope` and `onGeneratedRange` — which `ConcatSource`, `CachedSource`, and `PrefixSource` propagate while shifting generated-range coordinates as needed. Maps produced via `getFromStreamChunks` / `streamAndGetSourceAndMap` round-trip `originalScopes` and `generatedRanges` when the inputs carry them.

All scope decoders, encoders, and the shared VLQ alphabet live in one place: `lib/helpers/scopes.js`. The decoders inline the VLQ state machine (no per-token closure) and the encoder has a single-sextet fast path for small values.

**⚠️ Experimental.** The proposal is still evolving in TC39 — the wire format, flag bits, callback shape, and helper names may change in future minor releases. See the "Source Map Scopes Proposal (experimental)" section of the README for details.
