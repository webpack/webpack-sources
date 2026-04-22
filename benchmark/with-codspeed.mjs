/*
 * CodSpeed <-> tinybench bridge for webpack-sources benchmarks.
 *
 * Ported from webpack's test/BenchmarkTestCases.benchmark.mjs and the
 * equivalent wrapper in enhanced-resolve. The webpack version additionally
 * handles baseline comparison, MongoDB profiling, and git-root detection —
 * none of which apply here.
 *
 * Why not @codspeed/tinybench-plugin?
 * That package accesses tinybench Task internals (task.fn, task.fnOpts)
 * that were made private in tinybench v6, causing a TypeError in
 * simulation mode. We follow webpack and enhanced-resolve in using
 * @codspeed/core directly.
 *
 * Modes (via getCodspeedRunnerMode() from @codspeed/core):
 *   "disabled"   — returns the bench untouched (local runs)
 *   "simulation" — overrides bench.run/runSync for CodSpeed instrumentation
 *   "walltime"   — left untouched; tinybench's built-in timing is used
 */

import path from "path";
import { fileURLToPath } from "url";
import {
	InstrumentHooks,
	getCodspeedRunnerMode,
	setupCore,
	teardownCore,
} from "@codspeed/core";

/** @typedef {import("tinybench").Bench} Bench */
/** @typedef {import("tinybench").Task} Task */
/** @typedef {() => unknown | Promise<unknown>} Fn */
/** @typedef {{ beforeAll?: Fn, afterAll?: Fn, beforeEach?: Fn, afterEach?: Fn }} HookOpts */

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

/**
 * Capture the file that invoked bench.add() so we can build a stable URI
 * for CodSpeed to identify the benchmark.
 * @returns {string} calling file path relative to the repo root
 */
function getCallingFile() {
	const dummy = {};
	const prev = Error.prepareStackTrace;
	const prevLimit = Error.stackTraceLimit;
	Error.stackTraceLimit = 10;
	Error.prepareStackTrace = (_err, trace) => trace;
	Error.captureStackTrace(dummy, getCallingFile);
	const trace = /** @type {NodeJS.CallSite[]} */ (
		/** @type {{ stack: unknown }} */ (dummy).stack
	);
	Error.prepareStackTrace = prev;
	Error.stackTraceLimit = prevLimit;

	let file = /** @type {string} */ (trace[1].getFileName() || "");
	if (file.startsWith("file://")) file = fileURLToPath(file);
	if (!file) return "<unknown>";
	return path.relative(repoRoot, file);
}

// eslint-disable-next-line jsdoc/require-property
/** @typedef {object} EXPECTED_OBJECT */

/**
 * @typedef {{ uri: string, fn: Fn, opts: EXPECTED_OBJECT | undefined }} TaskMeta
 * @type {WeakMap<Bench, Map<string, TaskMeta>>}
 */
const metaMap = new WeakMap();

/**
 * @param {Bench} bench bench
 * @returns {Map<string, TaskMeta>} meta map
 */
function getOrCreateMeta(bench) {
	let m = metaMap.get(bench);
	if (!m) {
		m = new Map();
		metaMap.set(bench, m);
	}
	return m;
}

/**
 * Wrap a tinybench Bench so that CodSpeed simulation mode instruments each
 * task. In "disabled" and "walltime" modes the bench is returned as-is.
 * @param {Bench} bench bench
 * @returns {Bench} bench
 */
export function withCodSpeed(bench) {
	const mode = getCodspeedRunnerMode();
	if (mode === "disabled" || mode === "walltime") return bench;

	// --- simulation mode ---

	const meta = getOrCreateMeta(bench);
	const rawAdd = bench.add.bind(bench);

	bench.add = (name, fn, opts) => {
		const callingFile = getCallingFile();
		const uri = `${callingFile}::${name}`;
		meta.set(name, { uri, fn, opts });
		return rawAdd(name, fn, opts);
	};

	const setup = () => {
		setupCore();
		console.log("[CodSpeed] running in simulation mode");
	};

	const teardown = () => {
		teardownCore();
		console.log(`[CodSpeed] Done running ${bench.tasks.length} benches.`);
		return bench.tasks;
	};

	/**
	 * @param {Fn} fn fn
	 * @param {boolean} isAsync is async
	 * @returns {Fn} wrapped
	 */
	const wrapFrame = (fn, isAsync) => {
		if (isAsync) {
			// eslint-disable-next-line camelcase
			return async function __codspeed_root_frame__() {
				await fn();
			};
		}
		// eslint-disable-next-line camelcase
		return function __codspeed_root_frame__() {
			fn();
		};
	};

	bench.run = async () => {
		setup();
		for (const task of bench.tasks) {
			const m = /** @type {TaskMeta} */ (meta.get(task.name));
			const hooks = /** @type {HookOpts | undefined} */ (m.opts) || {};

			if (hooks.beforeAll) await hooks.beforeAll.call(task);

			// Warm-up: run the body a few times to stabilise caches / JIT.
			// Honor beforeEach/afterEach so the measured iteration sees the
			// same fixture state as the warmup iterations.
			for (let i = 0; i < bench.iterations - 1; i++) {
				if (hooks.beforeEach) await hooks.beforeEach.call(task);
				await m.fn();
				if (hooks.afterEach) await hooks.afterEach.call(task);
			}

			// Instrumented run.
			if (hooks.beforeEach) await hooks.beforeEach.call(task);
			global.gc?.();
			InstrumentHooks.startBenchmark();
			await wrapFrame(m.fn, true)();
			InstrumentHooks.stopBenchmark();
			if (hooks.afterEach) await hooks.afterEach.call(task);
			InstrumentHooks.setExecutedBenchmark(process.pid, m.uri);

			if (hooks.afterAll) await hooks.afterAll.call(task);

			console.log(
				`[CodSpeed] ${
					InstrumentHooks.isInstrumented() ? "Measured" : "Checked"
				} ${m.uri}`,
			);
		}
		return teardown();
	};

	bench.runSync = () => {
		setup();
		for (const task of bench.tasks) {
			const m = /** @type {TaskMeta} */ (meta.get(task.name));
			const hooks = /** @type {HookOpts | undefined} */ (m.opts) || {};

			if (hooks.beforeAll) hooks.beforeAll.call(task);

			for (let i = 0; i < bench.iterations - 1; i++) {
				if (hooks.beforeEach) hooks.beforeEach.call(task);
				m.fn();
				if (hooks.afterEach) hooks.afterEach.call(task);
			}

			if (hooks.beforeEach) hooks.beforeEach.call(task);
			global.gc?.();
			InstrumentHooks.startBenchmark();
			wrapFrame(m.fn, false)();
			InstrumentHooks.stopBenchmark();
			if (hooks.afterEach) hooks.afterEach.call(task);
			InstrumentHooks.setExecutedBenchmark(process.pid, m.uri);

			if (hooks.afterAll) hooks.afterAll.call(task);

			console.log(
				`[CodSpeed] ${
					InstrumentHooks.isInstrumented() ? "Measured" : "Checked"
				} ${m.uri}`,
			);
		}
		return teardown();
	};

	return bench;
}
