/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Source = require("./Source");
const streamChunksOfSourceMap = require("./helpers/streamChunksOfSourceMap");
const streamChunksOfCombinedSourceMap = require("./helpers/streamChunksOfCombinedSourceMap");
const { getMap, getSourceAndMap } = require("./helpers/getFromStreamChunks");
const {
	isDualStringBufferCachingEnabled
} = require("./helpers/stringBufferUtils");

class SourceMapSource extends Source {
	constructor(
		value,
		name,
		sourceMap,
		originalSource,
		innerSourceMap,
		removeOriginalSource
	) {
		super();
		const valueIsBuffer = Buffer.isBuffer(value);
		this._valueAsString = valueIsBuffer ? undefined : value;
		this._valueAsBuffer = valueIsBuffer ? value : undefined;

		this._name = name;

		this._hasSourceMap = !!sourceMap;
		const sourceMapIsBuffer = Buffer.isBuffer(sourceMap);
		const sourceMapIsString = typeof sourceMap === "string";
		this._sourceMapAsObject =
			sourceMapIsBuffer || sourceMapIsString ? undefined : sourceMap;
		this._sourceMapAsString = sourceMapIsString ? sourceMap : undefined;
		this._sourceMapAsBuffer = sourceMapIsBuffer ? sourceMap : undefined;

		this._hasOriginalSource = !!originalSource;
		const originalSourceIsBuffer = Buffer.isBuffer(originalSource);
		this._originalSourceAsString = originalSourceIsBuffer
			? undefined
			: originalSource;
		this._originalSourceAsBuffer = originalSourceIsBuffer
			? originalSource
			: undefined;

		this._hasInnerSourceMap = !!innerSourceMap;
		const innerSourceMapIsBuffer = Buffer.isBuffer(innerSourceMap);
		const innerSourceMapIsString = typeof innerSourceMap === "string";
		this._innerSourceMapAsObject =
			innerSourceMapIsBuffer || innerSourceMapIsString
				? undefined
				: innerSourceMap;
		this._innerSourceMapAsString = innerSourceMapIsString
			? innerSourceMap
			: undefined;
		this._innerSourceMapAsBuffer = innerSourceMapIsBuffer
			? innerSourceMap
			: undefined;

		this._removeOriginalSource = removeOriginalSource;
	}

	getArgsAsBuffers() {
		return [
			this.buffer(),
			this._name,
			this._sourceMapBuffer(),
			this._originalSourceBuffer(),
			this._innerSourceMapBuffer(),
			this._removeOriginalSource
		];
	}

	buffer() {
		if (this._valueAsBuffer === undefined) {
			const value = Buffer.from(this._valueAsString, "utf-8");
			if (isDualStringBufferCachingEnabled()) {
				this._valueAsBuffer = value;
			}
			return value;
		}
		return this._valueAsBuffer;
	}

	source() {
		if (this._valueAsString === undefined) {
			const value = this._valueAsBuffer.toString("utf-8");
			if (isDualStringBufferCachingEnabled()) {
				this._valueAsString = value;
			}
			return value;
		}
		return this._valueAsString;
	}

	_originalSourceBuffer() {
		if (this._originalSourceAsBuffer === undefined && this._hasOriginalSource) {
			const value = Buffer.from(this._originalSourceAsString, "utf-8");
			if (isDualStringBufferCachingEnabled()) {
				this._originalSourceAsBuffer = value;
			}
			return value;
		}
		return this._originalSourceAsBuffer;
	}

	_originalSourceString() {
		if (this._originalSourceAsString === undefined && this._hasOriginalSource) {
			const value = this._originalSourceAsBuffer.toString("utf-8");
			if (isDualStringBufferCachingEnabled()) {
				this._originalSourceAsString = value;
			}
			return value;
		}
		return this._originalSourceAsString;
	}

	_innerSourceMapObject() {
		if (this._innerSourceMapAsObject === undefined && this._hasInnerSourceMap) {
			const value = JSON.parse(this._innerSourceMapString());
			if (isDualStringBufferCachingEnabled()) {
				this._innerSourceMapAsObject = value;
			}
			return value;
		}
		return this._innerSourceMapAsObject;
	}

	_innerSourceMapBuffer() {
		if (this._innerSourceMapAsBuffer === undefined && this._hasInnerSourceMap) {
			const value = Buffer.from(this._innerSourceMapString(), "utf-8");
			if (isDualStringBufferCachingEnabled()) {
				this._innerSourceMapAsBuffer = value;
			}
			return value;
		}
		return this._innerSourceMapAsBuffer;
	}

	_innerSourceMapString() {
		if (this._innerSourceMapAsString === undefined && this._hasInnerSourceMap) {
			if (this._innerSourceMapAsBuffer !== undefined) {
				const value = this._innerSourceMapAsBuffer.toString("utf-8");
				if (isDualStringBufferCachingEnabled()) {
					this._innerSourceMapAsString = value;
				}
				return value;
			} else {
				const value = JSON.stringify(this._innerSourceMapAsObject);
				if (isDualStringBufferCachingEnabled()) {
					this._innerSourceMapAsString = value;
				}
				return value;
			}
		}
		return this._innerSourceMapAsString;
	}

	_sourceMapObject() {
		if (this._sourceMapAsObject === undefined) {
			const value = JSON.parse(this._sourceMapString());
			if (isDualStringBufferCachingEnabled()) {
				this._sourceMapAsObject = value;
			}
			return value;
		}
		return this._sourceMapAsObject;
	}

	_sourceMapBuffer() {
		if (this._sourceMapAsBuffer === undefined) {
			const value = Buffer.from(this._sourceMapString(), "utf-8");
			if (isDualStringBufferCachingEnabled()) {
				this._sourceMapAsBuffer = value;
			}
			return value;
		}
		return this._sourceMapAsBuffer;
	}

	_sourceMapString() {
		if (this._sourceMapAsString === undefined) {
			if (this._sourceMapAsBuffer !== undefined) {
				const value = this._sourceMapAsBuffer.toString("utf-8");
				if (isDualStringBufferCachingEnabled()) {
					this._sourceMapAsString = value;
				}
				return value;
			} else {
				const value = JSON.stringify(this._sourceMapAsObject);
				if (isDualStringBufferCachingEnabled()) {
					this._sourceMapAsString = value;
				}
				return value;
			}
		}
		return this._sourceMapAsString;
	}

	map(options) {
		if (!this._hasInnerSourceMap) {
			return this._sourceMapObject();
		}
		return getMap(this, options);
	}

	sourceAndMap(options) {
		if (!this._hasInnerSourceMap) {
			return {
				source: this.source(),
				map: this._sourceMapObject()
			};
		}
		return getSourceAndMap(this, options);
	}

	streamChunks(options, onChunk, onSource, onName) {
		if (this._hasInnerSourceMap) {
			return streamChunksOfCombinedSourceMap(
				this.source(),
				this._sourceMapObject(),
				this._name,
				this._originalSourceString(),
				this._innerSourceMapObject(),
				this._removeOriginalSource,
				onChunk,
				onSource,
				onName,
				!!(options && options.finalSource),
				!!(options && options.columns !== false)
			);
		} else {
			return streamChunksOfSourceMap(
				this.source(),
				this._sourceMapObject(),
				onChunk,
				onSource,
				onName,
				!!(options && options.finalSource),
				!!(options && options.columns !== false)
			);
		}
	}

	updateHash(hash) {
		hash.update("SourceMapSource");
		hash.update(this.buffer());
		hash.update(this._sourceMapBuffer());

		if (this._hasOriginalSource) {
			hash.update(this._originalSourceBuffer());
		}

		if (this._hasInnerSourceMap) {
			hash.update(this._innerSourceMapBuffer());
		}

		hash.update(this._removeOriginalSource ? "true" : "false");
	}
}

module.exports = SourceMapSource;
