---
"webpack-sources": minor
---

Add initial support for the [Source Map Scopes Proposal](https://github.com/tc39/source-map/blob/main/proposals/scopes.md) (`originalScopes` / `generatedRanges`). `SourceMapSource` now reads these fields from an input source map and forwards them through `streamChunks` via two new optional callbacks — `onOriginalScope` and `onGeneratedRange` — which `ConcatSource`, `CachedSource`, and `PrefixSource` propagate while shifting generated-range coordinates as needed. Maps produced via `getFromStreamChunks` / `streamAndGetSourceAndMap` round-trip `originalScopes` and `generatedRanges` when the inputs carry them, and a few new helpers (`vlq`, `readOriginalScopes`, `readGeneratedRanges`, `createOriginalScopesSerializer`, `createGeneratedRangesSerializer`) are exposed internally for decoding/encoding the scope VLQ payloads.
