---
"webpack-sources": patch
---

Keep a `RawSource` created from a `Buffer` with `convertToString` intact after `clearCache()`. Its only copy of the content was dropped, so `size()` and `updateHash()` threw on sources webpack restored from the filesystem cache. Bytes that are not valid UTF-8 are now kept as they were.
