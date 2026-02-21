/* @ts-self-types="./regexp_wasm.d.ts" */

/**
 * This class builds regular expressions from user-provided test cases.
 */
export class RegExpBuilder {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RegExpBuilder.prototype);
        obj.__wbg_ptr = ptr;
        RegExpBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RegExpBuilderFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_regexpbuilder_free(ptr, 0);
    }
    /**
     * Builds the actual regular expression using the previously given settings.
     * @returns {string}
     */
    build() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.regexpbuilder_build(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Specifies the test cases to build the regular expression from.
     *
     * The test cases need not be sorted because `RegExpBuilder` sorts them internally.
     *
     * ⚠ Throws an error if `testCases` is empty.
     * @param {any[]} testCases
     * @returns {RegExpBuilder}
     */
    static from(testCases) {
        const ptr0 = passArrayJsValueToWasm0(testCases, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.regexpbuilder_from(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return RegExpBuilder.__wrap(ret[0]);
    }
    /**
     * Tells `RegExpBuilder` to replace non-capturing groups by capturing ones.
     * @returns {RegExpBuilder}
     */
    withCapturingGroups() {
        const ret = wasm.regexpbuilder_withCapturingGroups(this.__wbg_ptr);
        return RegExpBuilder.__wrap(ret);
    }
    /**
     * Tells `RegExpBuilder` to enable case-insensitive matching of test cases
     * so that letters match both upper and lower case.
     * @returns {RegExpBuilder}
     */
    withCaseInsensitiveMatching() {
        const ret = wasm.regexpbuilder_withCaseInsensitiveMatching(this.__wbg_ptr);
        return RegExpBuilder.__wrap(ret);
    }
    /**
     * Tells `RegExpBuilder` to convert any Unicode decimal digit to character class `\d`.
     *
     * This method takes precedence over `withConversionOfWords` if both are set.
     * Decimal digits are converted to `\d`, the remaining word characters to `\w`.
     *
     * This method takes precedence over `withConversionOfWhitespace` if both are set.
     * Decimal digits are converted to `\d`, the remaining non-whitespace characters to `\S`.
     * @returns {RegExpBuilder}
     */
    withConversionOfDigits() {
        const ret = wasm.regexpbuilder_withConversionOfDigits(this.__wbg_ptr);
        return RegExpBuilder.__wrap(ret);
    }
    /**
     * Tells `RegExpBuilder` to convert any character which is not
     * a Unicode decimal digit to character class `\D`.
     *
     * This method takes precedence over `withConversionOfNonWords` if both are set.
     * Non-digits which are also non-word characters are converted to `\D`.
     *
     * This method takes precedence over `withConversionOfNonWhitespace` if both are set.
     * Non-digits which are also non-space characters are converted to `\D`.
     * @returns {RegExpBuilder}
     */
    withConversionOfNonDigits() {
        const ret = wasm.regexpbuilder_withConversionOfNonDigits(this.__wbg_ptr);
        return RegExpBuilder.__wrap(ret);
    }
    /**
     * Tells `RegExpBuilder` to convert any character which is not
     * a Unicode whitespace character to character class `\S`.
     * @returns {RegExpBuilder}
     */
    withConversionOfNonWhitespace() {
        const ret = wasm.regexpbuilder_withConversionOfNonWhitespace(this.__wbg_ptr);
        return RegExpBuilder.__wrap(ret);
    }
    /**
     * Tells `RegExpBuilder` to convert any character which is not
     * a Unicode word character to character class `\W`.
     *
     * This method takes precedence over `withConversionOfNonWhitespace` if both are set.
     * Non-words which are also non-space characters are converted to `\W`.
     * @returns {RegExpBuilder}
     */
    withConversionOfNonWords() {
        const ret = wasm.regexpbuilder_withConversionOfNonWords(this.__wbg_ptr);
        return RegExpBuilder.__wrap(ret);
    }
    /**
     * Tells `RegExpBuilder` to detect repeated non-overlapping substrings and
     * to convert them to `{min,max}` quantifier notation.
     * @returns {RegExpBuilder}
     */
    withConversionOfRepetitions() {
        const ret = wasm.regexpbuilder_withConversionOfRepetitions(this.__wbg_ptr);
        return RegExpBuilder.__wrap(ret);
    }
    /**
     * Tells `RegExpBuilder` to convert any Unicode whitespace character to character class `\s`.
     *
     * This method takes precedence over `withConversionOfNonDigits` if both are set.
     * Whitespace characters are converted to `\s`, the remaining non-digit characters to `\D`.
     *
     * This method takes precedence over `withConversionOfNonWords` if both are set.
     * Whitespace characters are converted to `\s`, the remaining non-word characters to `\W`.
     * @returns {RegExpBuilder}
     */
    withConversionOfWhitespace() {
        const ret = wasm.regexpbuilder_withConversionOfWhitespace(this.__wbg_ptr);
        return RegExpBuilder.__wrap(ret);
    }
    /**
     * Tells `RegExpBuilder` to convert any Unicode word character to character class `\w`.
     *
     * This method takes precedence over `withConversionOfNonDigits` if both are set.
     * Word characters are converted to `\w`, the remaining non-digit characters to `\D`.
     *
     * This method takes precedence over `withConversionOfNonWhitespace` if both are set.
     * Word characters are converted to `\w`, the remaining non-space characters to `\S`.
     * @returns {RegExpBuilder}
     */
    withConversionOfWords() {
        const ret = wasm.regexpbuilder_withConversionOfWords(this.__wbg_ptr);
        return RegExpBuilder.__wrap(ret);
    }
    /**
     * Tells `RegExpBuilder` to convert non-ASCII characters to unicode escape sequences.
     * The parameter `useSurrogatePairs` specifies whether to convert astral code planes
     * (range `U+010000` to `U+10FFFF`) to surrogate pairs.
     * @param {boolean} useSurrogatePairs
     * @returns {RegExpBuilder}
     */
    withEscapingOfNonAsciiChars(useSurrogatePairs) {
        const ret = wasm.regexpbuilder_withEscapingOfNonAsciiChars(this.__wbg_ptr, useSurrogatePairs);
        return RegExpBuilder.__wrap(ret);
    }
    /**
     * Specifies the minimum quantity of substring repetitions to be converted
     * if `withConversionOfRepetitions` is set.
     *
     * If the quantity is not explicitly set with this method, a default value of 1 will be used.
     *
     * ⚠ Throws an error if `quantity` is zero.
     * @param {number} quantity
     * @returns {RegExpBuilder}
     */
    withMinimumRepetitions(quantity) {
        const ret = wasm.regexpbuilder_withMinimumRepetitions(this.__wbg_ptr, quantity);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return RegExpBuilder.__wrap(ret[0]);
    }
    /**
     * Specifies the minimum length a repeated substring must have in order to be converted
     * if `withConversionOfRepetitions` is set.
     *
     * If the length is not explicitly set with this method, a default value of 1 will be used.
     *
     * ⚠ Throws an error if `length` is zero.
     * @param {number} length
     * @returns {RegExpBuilder}
     */
    withMinimumSubstringLength(length) {
        const ret = wasm.regexpbuilder_withMinimumSubstringLength(this.__wbg_ptr, length);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return RegExpBuilder.__wrap(ret[0]);
    }
    /**
     * Tells `RegExpBuilder` to produce a nicer looking regular expression in verbose mode.
     * @returns {RegExpBuilder}
     */
    withVerboseMode() {
        const ret = wasm.regexpbuilder_withVerboseMode(this.__wbg_ptr);
        return RegExpBuilder.__wrap(ret);
    }
    /**
     * Tells `RegExpBuilder` to remove the caret and dollar sign anchors from the resulting
     * regular expression, thereby allowing to match the test cases also when they occur
     * within a larger string that contains other content as well.
     * @returns {RegExpBuilder}
     */
    withoutAnchors() {
        const ret = wasm.regexpbuilder_withoutAnchors(this.__wbg_ptr);
        return RegExpBuilder.__wrap(ret);
    }
    /**
     * Tells `RegExpBuilder` to remove the dollar sign anchor '$' from the resulting regular
     * expression, thereby allowing to match the test cases also when they do not occur
     * at the end of a string.
     * @returns {RegExpBuilder}
     */
    withoutEndAnchor() {
        const ret = wasm.regexpbuilder_withoutEndAnchor(this.__wbg_ptr);
        return RegExpBuilder.__wrap(ret);
    }
    /**
     * Tells `RegExpBuilder` to remove the caret anchor '^' from the resulting regular
     * expression, thereby allowing to match the test cases also when they do not occur
     * at the start of a string.
     * @returns {RegExpBuilder}
     */
    withoutStartAnchor() {
        const ret = wasm.regexpbuilder_withoutStartAnchor(this.__wbg_ptr);
        return RegExpBuilder.__wrap(ret);
    }
}
if (Symbol.dispose) RegExpBuilder.prototype[Symbol.dispose] = RegExpBuilder.prototype.free;

/**
 * @param {any} match_strings
 * @returns {string}
 */
export function generate_regex(match_strings) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.generate_regex(match_strings);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_8c4e43fe74559d73: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___wbindgen_boolean_get_bbbb1c18aa2f5e25: function(arg0) {
            const v = arg0;
            const ret = typeof(v) === 'boolean' ? v : undefined;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg___wbindgen_debug_string_0bc8482c6e3508ae: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_is_function_0095a73b8b156f76: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_object_5ae8e5880f2c1fbd: function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_jsval_loose_eq_9dd77d8cd6671811: function(arg0, arg1) {
            const ret = arg0 == arg1;
            return ret;
        },
        __wbg___wbindgen_number_get_8ff4255516ccad3e: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_string_get_72fb696202c56729: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_be289d5034ed271b: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_call_389efe28435a9388: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments); },
        __wbg_done_57b39ecd9addfe81: function(arg0) {
            const ret = arg0.done;
            return ret;
        },
        __wbg_get_9b94d73e6221f75c: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_b3ed3ad4be2bc8ac: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_instanceof_ArrayBuffer_c367199e2fa2aa04: function(arg0) {
            let result;
            try {
                result = arg0 instanceof ArrayBuffer;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Uint8Array_9b9075935c74707c: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Uint8Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_d314bb98fcf08331: function(arg0) {
            const ret = Array.isArray(arg0);
            return ret;
        },
        __wbg_iterator_6ff6560ca1568e55: function() {
            const ret = Symbol.iterator;
            return ret;
        },
        __wbg_length_32ed9a279acd054c: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_35a7bace40f36eac: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_new_dd2b680c8bf6ae29: function(arg0) {
            const ret = new Uint8Array(arg0);
            return ret;
        },
        __wbg_next_3482f54c49e8af19: function() { return handleError(function (arg0) {
            const ret = arg0.next();
            return ret;
        }, arguments); },
        __wbg_next_418f80d8f5303233: function(arg0) {
            const ret = arg0.next;
            return ret;
        },
        __wbg_prototypesetcall_bdcdcc5842e4d77d: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
        },
        __wbg_value_0546255b415e96c1: function(arg0) {
            const ret = arg0.value;
            return ret;
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./regexp_wasm_bg.js": import0,
    };
}

const RegExpBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_regexpbuilder_free(ptr >>> 0, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('regexp_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
