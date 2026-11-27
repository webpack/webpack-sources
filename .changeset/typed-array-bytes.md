---
"webpack-sources": minor
---

Use typed arrays internally instead of `Buffer`. Strings are encoded with `TextEncoder` and decoded with `TextDecoder`, with a `Buffer` fallback for Node.js versions that lack them. Every source now also accepts a plain `Uint8Array` wherever a `Buffer` was accepted. A new `util.stringBufferUtils.setBufferOutputType("buffer" | "uint8array")` option chooses what `buffer()`, `buffers()` and related methods return. The default stays `"buffer"`, so existing consumers are unaffected.
