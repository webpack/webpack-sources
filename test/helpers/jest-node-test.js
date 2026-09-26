"use strict";

// Runs the tests, which are written for `node:test`, under Jest on Node.js
// versions without a usable `node:test` (mapped in `jest.config.js`). Only the
// parts of the `node:test` API that the tests use are provided.
//
// Snapshots are read from the `node:test` snapshot files, so there is a single
// set of snapshots. They can only be updated with `node --test`.

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

/** @typedef {{ name: string, fullName: string, assert: { snapshot: (value: unknown) => void } }} TestContext */

/** @type {string[]} */
const suiteNames = [];

/** @type {Record<string, string> | undefined} */
let snapshots;

/** @type {Map<string, number>} */
const snapshotCounts = new Map();

/**
 * @returns {Record<string, string>} snapshots of the running test file
 */
const readSnapshots = () => {
	if (snapshots === undefined) {
		const file = `${global.expect.getState().testPath}.snapshot`;
		snapshots = {};
		if (fs.existsSync(file)) {
			// A snapshot file is a CommonJS module assigning to `exports`.
			vm.runInNewContext(fs.readFileSync(file, "utf8"), {
				exports: snapshots,
			});
		}
	}
	return snapshots;
};

/**
 * Same key and serialization as the default `node:test` snapshot assertion.
 * @param {string} fullName full name of the test
 * @param {unknown} value value to compare with the snapshot
 */
const assertSnapshot = (fullName, value) => {
	const count = snapshotCounts.get(fullName) || 1;
	snapshotCounts.set(fullName, count + 1);
	const key = `${fullName} ${count}`;
	const expected = readSnapshots()[key];
	if (expected === undefined) {
		throw new Error(
			`Missing snapshot "${key}". Update snapshots with \`node --test --test-update-snapshots\`.`,
		);
	}
	assert.strictEqual(`\n${JSON.stringify(value, null, 2)}\n`, expected);
};

/**
 * @param {string} name suite name
 * @param {() => void} fn suite body
 */
const describe = (name, fn) => {
	global.describe(name, () => {
		suiteNames.push(name);
		try {
			fn();
		} finally {
			suiteNames.pop();
		}
	});
};

/**
 * @param {string} name test name
 * @param {(t: TestContext) => void | Promise<void>} fn test body
 */
const it = (name, fn) => {
	const fullName = [...suiteNames, name].join(" > ");
	/** @type {TestContext} */
	const context = {
		name,
		fullName,
		assert: {
			snapshot: (value) => assertSnapshot(fullName, value),
		},
	};
	// Jest treats a test function with a parameter as callback-style, so the
	// context is passed through a wrapper.
	global.it(name, () => fn(context));
};

module.exports = {
	describe,
	it,
	test: it,
	before: global.beforeAll,
	after: global.afterAll,
	beforeEach: global.beforeEach,
	afterEach: global.afterEach,
};
