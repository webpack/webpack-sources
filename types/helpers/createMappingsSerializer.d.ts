export = createMappingsSerializer;
/**
 * @param {{ columns?: boolean }=} options options
 * @returns {MappingsSerializer} mappings serializer
 */
declare function createMappingsSerializer(
	options?:
		| {
				columns?: boolean;
		  }
		| undefined,
): MappingsSerializer;
declare namespace createMappingsSerializer {
	export { createMappingsWriter, MappingsSerializer, MappingsWriter };
}
/**
 * @param {{ columns?: boolean }=} options options
 * @returns {MappingsWriter} push-based mappings writer
 */
declare function createMappingsWriter(
	options?:
		| {
				columns?: boolean;
		  }
		| undefined,
): MappingsWriter;
type MappingsSerializer = (
	generatedLine: number,
	generatedColumn: number,
	sourceIndex: number,
	originalLine: number,
	originalColumn: number,
	nameIndex: number,
) => string;
/**
 * A push-based serializer: `add()` appends one mapping to an internal
 * byte buffer, `finish()` materialises the whole `mappings` string in a
 * single allocation. Compared to the string-returning
 * {@link MappingsSerializer} this avoids every per-mapping intermediate
 * string (each VLQ digit concatenation) plus the caller-side
 * `mappings += str` cons chain — together the dominant allocation site
 * of `map()` / `sourceAndMap()`.
 */
type MappingsWriter = {
	/**
	 * append one mapping
	 */
	add: (
		generatedLine: number,
		generatedColumn: number,
		sourceIndex: number,
		originalLine: number,
		originalColumn: number,
		nameIndex: number,
	) => void;
	/**
	 * materialise the mappings string
	 */
	finish: () => string;
};
