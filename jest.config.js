"use strict";

/** @type {import('jest').Config} */
const config = {
	prettierPath: require.resolve("prettier-2"),
	forceExit: true,
	testMatch: ["<rootDir>/test/*.js"],
	testPathIgnorePatterns: ["<rootDir>/test/helpers.js"],
	transformIgnorePatterns: ["<rootDir>"],
	testEnvironment: "node",
};

module.exports = config;
