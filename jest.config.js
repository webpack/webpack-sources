"use strict";

// Jest runs the tests on Node.js versions without a usable `node:test` (see
// `test:legacy` in package.json); newer versions use `node --test`.

/** @type {import("jest").Config} */
const config = {
	forceExit: true,
	testMatch: ["<rootDir>/test/*.js"],
	transformIgnorePatterns: ["<rootDir>"],
	testEnvironment: "node",
	// checks every mapping the library writes; `node --test` loads it with
	// `--require` (see package.json)
	setupFiles: ["<rootDir>/test/helpers/validate-mappings.js"],
	moduleNameMapper: {
		"^node:test$": "<rootDir>/test/helpers/jest-node-test.js",
	},
};

module.exports = config;
