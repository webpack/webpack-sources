export = getGeneratedSourceInfo;
/**
 * @typedef {object} GeneratedSourceInfo
 * @property {number=} generatedLine generated line
 * @property {number=} generatedColumn generated column
 * @property {string=} source source
 */
/**
 * @param {string | undefined} source source
 * @returns {GeneratedSourceInfo} source info
 */
declare function getGeneratedSourceInfo(
	source: string | undefined,
): GeneratedSourceInfo;
declare namespace getGeneratedSourceInfo {
	export { GeneratedSourceInfo };
}
type GeneratedSourceInfo = {
	/**
	 * generated line
	 */
	generatedLine?: number | undefined;
	/**
	 * generated column
	 */
	generatedColumn?: number | undefined;
	/**
	 * source
	 */
	source?: string | undefined;
};
