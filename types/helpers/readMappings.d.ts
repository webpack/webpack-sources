export = readMappings;
/** @typedef {(generatedLine: number, generatedColumn: number, sourceIndex: number, originalLine: number, originalColumn: number, nameIndex: number) => void} OnMapping */
/**
 * @param {string} mappings the mappings string
 * @param {OnMapping} onMapping called for each mapping
 * @returns {void}
 */
declare function readMappings(mappings: string, onMapping: OnMapping): void;
declare namespace readMappings {
	export { OnMapping };
}
type OnMapping = (
	generatedLine: number,
	generatedColumn: number,
	sourceIndex: number,
	originalLine: number,
	originalColumn: number,
	nameIndex: number,
) => void;
