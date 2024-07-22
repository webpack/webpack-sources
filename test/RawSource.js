const RawSource = require("../").RawSource;
const {
	enableDualStringBufferCaching,
	enterStringInterningRange,
	exitStringInterningRange,
	disableDualStringBufferCaching
} = require("../lib/helpers/stringBufferUtils");

const CODE_STRING =
	"console.log('test');\nconsole.log('test2');\nconsole.log('test22');\n";

describe("RawSource", () => {
	it("converts to buffer correctly", () => {
		const source = new RawSource(Buffer.from(CODE_STRING), true);
		expect(source.isBuffer()).toEqual(false);
		expect(source.buffer().toString("utf-8")).toEqual(CODE_STRING);
		// The buffer conversion should be cached.
		expect(source.buffer() === source.buffer()).toEqual(true);
	});

	it("stream chunks works correctly", () => {
		const source = new RawSource(CODE_STRING, true);
		source.streamChunks(null, (line, lineNum) => {
			expect(line).toEqual(`console.log('test${"2".repeat(lineNum - 1)}');\n`);
		});
		expect.assertions(3);
	});

	describe("memory optimizations are enabled", () => {
		beforeEach(() => {
			disableDualStringBufferCaching();
			enterStringInterningRange();
		});

		afterEach(() => {
			enableDualStringBufferCaching();
			exitStringInterningRange();
		});

		it("should create new buffers when caching is not enabled", () => {
			const source = new RawSource(CODE_STRING, true);
			expect(source.buffer().toString("utf-8")).toEqual(CODE_STRING);
			// The buffer conversion should not be cached.
			expect(source.buffer() === source.buffer()).toEqual(false);
		});

		it("should not create new buffers when original value is a buffer", () => {
			const originalValue = Buffer.from(CODE_STRING);
			const source = new RawSource(originalValue, true);
			expect(source.buffer().toString("utf-8")).toEqual(CODE_STRING);
			// The same buffer as the original value should always be returned.
			expect(originalValue === source.buffer()).toEqual(true);
			expect(source.buffer() === source.buffer()).toEqual(true);
		});

		it("stream chunks works correctly", () => {
			const source = new RawSource(CODE_STRING, true);
			source.streamChunks(null, (line, lineNum) => {
				expect(line).toEqual(
					`console.log('test${"2".repeat(lineNum - 1)}');\n`
				);
			});
			expect.assertions(3);
		});
	});
});
