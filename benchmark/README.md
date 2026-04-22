# Benchmarks

Performance benchmarks for `webpack-sources`, tracked over time via
[CodSpeed](https://codspeed.io/).

Runner stack: [tinybench](https://github.com/tinylibs/tinybench) +
[`@codspeed/core`](https://www.npmjs.com/package/@codspeed/core) with a local
`withCodSpeed()` wrapper ported from webpack's
`test/BenchmarkTestCases.benchmark.mjs` (also used by `enhanced-resolve`).
Locally it falls back to plain tinybench wall-clock measurements, and under
`CodSpeedHQ/action` in CI it automatically switches to CodSpeed's
instrumentation mode.

## Running locally

```sh
npm run benchmark
```

Optional substring filter to run only matching cases:

```sh
npm run benchmark -- replace-source
BENCH_FILTER=source-map npm run benchmark
```

Locally the runner uses tinybench's wall-clock measurements and prints a
table of ops/s, mean, p99, and relative margin of error per task. Under CI,
the wrapper detects the CodSpeed runner environment and switches to
instruction-counting mode automatically.

The V8 flags in `package.json` (`--no-opt --predictable --hash-seed=1` etc.)
are required by CodSpeed's instrumentation mode for deterministic results —
do not drop them.

### Optional: running real instruction counts locally

If you want to reproduce CI's exact instrument-count numbers on your own
machine (Linux only — the underlying Valgrind tooling has no macOS backend),
install the standalone CodSpeed CLI and wrap `npm run benchmark` with it:

```sh
curl -fsSL https://codspeed.io/install.sh | bash
codspeed run npm run benchmark
```

This is only useful if you want to debug an instruction-count regression
outside CI. Day-to-day benchmark iteration should use `npm run benchmark`
directly (wall-clock mode).

## Layout

```
benchmark/
├── run.mjs                     # entry point: discovers cases, runs bench
├── with-codspeed.mjs           # CodSpeed <-> tinybench bridge
├── fixtures.mjs                # shared fixture loaders
└── cases/
    └── <case-name>/
        ├── index.bench.mjs     # default export: register(bench, ctx)
        └── fixture/            # optional: per-case input files
```

Each case directory must contain `index.bench.mjs` exporting a default
function with the signature:

```js
export default function register(bench, { caseName, caseDir, fixtureDir }) {
	bench.add("my case: descriptive name", () => {
		// ... code to measure ...
	});
}
```

`fixtureDir` is the absolute path to the case's `fixture/` subdirectory
(which may or may not exist). `caseDir` is the parent directory containing
`index.bench.mjs`.

Each task body should loop over a small batch of operations rather than
performing a single call — tinybench decides its own iteration count, so
we want the measurement to reflect per-batch throughput, which is more
stable than per-call timing for sub-microsecond work.

## Existing cases

### Per source class

| Case                | What it measures                                                                 |
| ------------------- | -------------------------------------------------------------------------------- |
| `raw-source`        | `RawSource` constructor, string/buffer accessors, streamChunks, updateHash       |
| `original-source`   | `OriginalSource` map/sourceAndMap/streamChunks across columns on/off combos      |
| `replace-source`    | `ReplaceSource` source/map/streamChunks for no, few, and many replacements       |
| `concat-source`     | `ConcatSource` _optimize, source/buffer/map, nested flattening, hash             |
| `prefix-source`     | `PrefixSource` delegation + newline prefix rewriting                             |
| `source-map-source` | `SourceMapSource` full + lines-only streamChunks, including combined inner maps  |
| `cached-source`     | `CachedSource` cold vs warm, plus `getCachedData()` round-trip                   |
| `compat-source`     | `CompatSource` delegation vs `Source.prototype` fallback paths                   |
| `size-only-source`  | `SizeOnlySource` constructor, `size()`, and the throw paths for other accessors  |

### Per helper module

| Case                                  | What it measures                                                           |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `helpers-split-into-lines`            | `splitIntoLines` scanner on fixture / big / long-line / empty inputs       |
| `helpers-split-into-potential-tokens` | `splitIntoPotentialTokens` scanner used by column-aware OriginalSource     |
| `helpers-get-generated-source-info`   | `getGeneratedSourceInfo` final-line/column probe on various input shapes   |
| `helpers-read-mappings`               | VLQ decoder used by every source-map aware streamChunks path               |
| `helpers-create-mappings-serializer`  | VLQ encoder (full + lines-only) fed a representative event stream          |
| `helpers-string-buffer-utils`         | `internString` and enter/exitStringInterningRange                          |

### End-to-end

| Case                              | What it measures                                                              |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `realistic-source-map-pipeline`   | OriginalSource -> ReplaceSource -> ConcatSource -> CachedSource (cold + warm); also `buffer()` vs `buffers()` over the `CachedSource -> ConcatSource -> CachedSource -> ConcatSource` layering from issue #157 |

## Adding a new case

1. Create `benchmark/cases/<case-name>/index.bench.mjs`.
2. Export a default `register(bench, ctx)` function. Call `bench.add(name, fn)`
   for each task.
3. If the case needs input files, place them under
   `benchmark/cases/<case-name>/fixture/` and read them from `ctx.fixtureDir`.
4. Run `npm run benchmark -- <case-name>` to verify locally.

Each task name should start with the case directory name (e.g.
`raw-source: source()`) so CodSpeed's report groups tasks by module.
