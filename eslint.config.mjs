import { defineConfig } from "eslint/config";
import config from "eslint-config-webpack";

export default defineConfig([
	{
		extends: [config],
		rules: {
			"n/prefer-node-protocol": "off",
		},
	},
	{
		// Benchmarks run only on a modern LTS Node (see .github/workflows/codspeed.yml)
		// so we disable the engine-version-aware rules and other style checks
		// that don't make sense for benchmark entry points.
		files: ["benchmark/**/*.{js,mjs}"],
		languageOptions: {
			sourceType: "module",
			ecmaVersion: "latest",
		},
		rules: {
			"no-console": "off",
			"no-new": "off",
			"n/hashbang": "off",
			"n/no-unsupported-features/es-syntax": "off",
			"n/no-unsupported-features/es-builtins": "off",
			"n/no-unsupported-features/node-builtins": "off",
			"n/no-process-exit": "off",
			"jsdoc/require-jsdoc": "off",
			"jsdoc/require-param-description": "off",
			"jsdoc/require-param-type": "off",
			"jsdoc/require-returns": "off",
			"jsdoc/no-blank-blocks": "off",
			"jsdoc/tag-lines": "off",
		},
	},
]);
