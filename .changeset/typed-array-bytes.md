---
"webpack-sources": minor
---

Accept `Uint8Array` everywhere a `Buffer` was accepted, and run without `Buffer` (e.g. in browsers, no polyfills needed). A new `util.stringBufferUtils.setBufferOutputType("buffer" | "uint8array")` option chooses what `buffer()`, `buffers()` and related methods return. The default stays `"buffer"` in Node.js, which keeps using `Buffer` for its fast paths, so CPU and memory use are unchanged for existing consumers.
