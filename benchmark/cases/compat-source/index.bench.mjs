/*
 * compat-source
 *
 * CompatSource wraps a SourceLike. Interesting paths: the direct delegation
 * (when the wrapped object provides buffer/size/map/updateHash) vs the
 * Source.prototype fallback (when it doesn't).
 *
 * Fixture lifetime policy: SourceLike instances are built per-task in
 * beforeAll hooks so their hidden-class state doesn't accumulate across
 * tasks. Only the immutable fixtureCode string lives at module scope.
 */

import { createHash } from "crypto";
import sources from "../../../lib/index.js";
import { fixtureCode } from "../../fixtures.mjs";

/** @typedef {import("../../../lib/CompatSource").SourceLike} SourceLike */

const fixtureBuffer = Buffer.from(fixtureCode, "utf8");

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	/** @type {SourceLike | undefined} */
	let sourceLike;
	const sourceLikeHooks = {
		beforeAll() {
			sourceLike = {
				source: () => fixtureCode,
				buffer: () => fixtureBuffer,
			};
		},
		afterAll() {
			sourceLike = undefined;
		},
	};

	/** @type {SourceLike | undefined} */
	let richSourceLike;
	const richHooks = {
		beforeAll() {
			richSourceLike = {
				source: () => fixtureCode,
				buffer: () => fixtureBuffer,
				size: () => fixtureCode.length,
				map: () => null,
				sourceAndMap: () => ({ source: fixtureCode, map: null }),
				updateHash: (hash) => {
					hash.update(fixtureCode);
				},
			};
		},
		afterAll() {
			richSourceLike = undefined;
		},
	};

	bench.add("compat-source: CompatSource.from(Source)", () => {
		const src = new sources.RawSource(fixtureCode);
		for (let i = 0; i < 100; i++) sources.CompatSource.from(src);
	});

	bench.add(
		"compat-source: CompatSource.from(SourceLike)",
		() => {
			const sl = /** @type {SourceLike} */ (sourceLike);
			for (let i = 0; i < 100; i++) sources.CompatSource.from(sl);
		},
		sourceLikeHooks,
	);

	bench.add(
		"compat-source: source() (wrapping SourceLike)",
		() => {
			const cs = new sources.CompatSource(
				/** @type {SourceLike} */ (sourceLike),
			);
			for (let i = 0; i < 500; i++) cs.source();
		},
		sourceLikeHooks,
	);

	bench.add("compat-source: buffer() (fallback via super)", () => {
		const cs = new sources.CompatSource({ source: () => fixtureCode });
		for (let i = 0; i < 50; i++) cs.buffer();
	});

	bench.add(
		"compat-source: buffer() (delegated)",
		() => {
			const cs = new sources.CompatSource(
				/** @type {SourceLike} */ (sourceLike),
			);
			for (let i = 0; i < 500; i++) cs.buffer();
		},
		sourceLikeHooks,
	);

	bench.add("compat-source: buffers() (fallback via super)", () => {
		const cs = new sources.CompatSource({ source: () => fixtureCode });
		for (let i = 0; i < 50; i++) cs.buffers();
	});

	/** @type {SourceLike | undefined} */
	let sourceLikeWithBuffers;
	const sourceLikeWithBuffersHooks = {
		beforeAll() {
			const bufferArray = [fixtureBuffer];
			sourceLikeWithBuffers = {
				source: () => fixtureCode,
				buffer: () => fixtureBuffer,
				buffers: () => bufferArray,
			};
		},
		afterAll() {
			sourceLikeWithBuffers = undefined;
		},
	};

	bench.add(
		"compat-source: buffers() (delegated)",
		() => {
			const cs = new sources.CompatSource(
				/** @type {SourceLike} */ (sourceLikeWithBuffers),
			);
			for (let i = 0; i < 500; i++) cs.buffers();
		},
		sourceLikeWithBuffersHooks,
	);

	bench.add("compat-source: size() (fallback via super)", () => {
		const cs = new sources.CompatSource({ source: () => fixtureCode });
		for (let i = 0; i < 50; i++) cs.size();
	});

	bench.add(
		"compat-source: size() (delegated)",
		() => {
			const cs = new sources.CompatSource(
				/** @type {SourceLike} */ (richSourceLike),
			);
			for (let i = 0; i < 500; i++) cs.size();
		},
		richHooks,
	);

	bench.add(
		"compat-source: map()",
		() => {
			const cs = new sources.CompatSource(
				/** @type {SourceLike} */ (richSourceLike),
			);
			for (let i = 0; i < 500; i++) cs.map({});
		},
		richHooks,
	);

	bench.add(
		"compat-source: sourceAndMap()",
		() => {
			const cs = new sources.CompatSource(
				/** @type {SourceLike} */ (richSourceLike),
			);
			for (let i = 0; i < 500; i++) cs.sourceAndMap({});
		},
		richHooks,
	);

	bench.add(
		"compat-source: updateHash() (delegated)",
		() => {
			const cs = new sources.CompatSource(
				/** @type {SourceLike} */ (richSourceLike),
			);
			for (let i = 0; i < 20; i++) cs.updateHash(createHash("sha256"));
		},
		richHooks,
	);

	bench.add("compat-source: updateHash() (fallback)", () => {
		const cs = new sources.CompatSource({ source: () => fixtureCode });
		for (let i = 0; i < 20; i++) cs.updateHash(createHash("sha256"));
	});

	bench.add("compat-source: wraps OriginalSource", () => {
		for (let i = 0; i < 20; i++) {
			const cs = new sources.CompatSource(
				new sources.OriginalSource(fixtureCode, "fix.js"),
			);
			cs.source();
			cs.buffer();
			cs.size();
			cs.map({});
		}
	});
}
