/* tslint:disable */
/* eslint-disable */

/**
 * This class builds regular expressions from user-provided test cases.
 */
export class RegExpBuilder {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Builds the actual regular expression using the previously given settings.
     */
    build(): string;
    /**
     * Specifies the test cases to build the regular expression from.
     *
     * The test cases need not be sorted because `RegExpBuilder` sorts them internally.
     *
     * ⚠ Throws an error if `testCases` is empty.
     */
    static from(testCases: any[]): RegExpBuilder;
    /**
     * Tells `RegExpBuilder` to replace non-capturing groups by capturing ones.
     */
    withCapturingGroups(): RegExpBuilder;
    /**
     * Tells `RegExpBuilder` to enable case-insensitive matching of test cases
     * so that letters match both upper and lower case.
     */
    withCaseInsensitiveMatching(): RegExpBuilder;
    /**
     * Tells `RegExpBuilder` to convert any Unicode decimal digit to character class `\d`.
     *
     * This method takes precedence over `withConversionOfWords` if both are set.
     * Decimal digits are converted to `\d`, the remaining word characters to `\w`.
     *
     * This method takes precedence over `withConversionOfWhitespace` if both are set.
     * Decimal digits are converted to `\d`, the remaining non-whitespace characters to `\S`.
     */
    withConversionOfDigits(): RegExpBuilder;
    /**
     * Tells `RegExpBuilder` to convert any character which is not
     * a Unicode decimal digit to character class `\D`.
     *
     * This method takes precedence over `withConversionOfNonWords` if both are set.
     * Non-digits which are also non-word characters are converted to `\D`.
     *
     * This method takes precedence over `withConversionOfNonWhitespace` if both are set.
     * Non-digits which are also non-space characters are converted to `\D`.
     */
    withConversionOfNonDigits(): RegExpBuilder;
    /**
     * Tells `RegExpBuilder` to convert any character which is not
     * a Unicode whitespace character to character class `\S`.
     */
    withConversionOfNonWhitespace(): RegExpBuilder;
    /**
     * Tells `RegExpBuilder` to convert any character which is not
     * a Unicode word character to character class `\W`.
     *
     * This method takes precedence over `withConversionOfNonWhitespace` if both are set.
     * Non-words which are also non-space characters are converted to `\W`.
     */
    withConversionOfNonWords(): RegExpBuilder;
    /**
     * Tells `RegExpBuilder` to detect repeated non-overlapping substrings and
     * to convert them to `{min,max}` quantifier notation.
     */
    withConversionOfRepetitions(): RegExpBuilder;
    /**
     * Tells `RegExpBuilder` to convert any Unicode whitespace character to character class `\s`.
     *
     * This method takes precedence over `withConversionOfNonDigits` if both are set.
     * Whitespace characters are converted to `\s`, the remaining non-digit characters to `\D`.
     *
     * This method takes precedence over `withConversionOfNonWords` if both are set.
     * Whitespace characters are converted to `\s`, the remaining non-word characters to `\W`.
     */
    withConversionOfWhitespace(): RegExpBuilder;
    /**
     * Tells `RegExpBuilder` to convert any Unicode word character to character class `\w`.
     *
     * This method takes precedence over `withConversionOfNonDigits` if both are set.
     * Word characters are converted to `\w`, the remaining non-digit characters to `\D`.
     *
     * This method takes precedence over `withConversionOfNonWhitespace` if both are set.
     * Word characters are converted to `\w`, the remaining non-space characters to `\S`.
     */
    withConversionOfWords(): RegExpBuilder;
    /**
     * Tells `RegExpBuilder` to convert non-ASCII characters to unicode escape sequences.
     * The parameter `useSurrogatePairs` specifies whether to convert astral code planes
     * (range `U+010000` to `U+10FFFF`) to surrogate pairs.
     */
    withEscapingOfNonAsciiChars(useSurrogatePairs: boolean): RegExpBuilder;
    /**
     * Specifies the minimum quantity of substring repetitions to be converted
     * if `withConversionOfRepetitions` is set.
     *
     * If the quantity is not explicitly set with this method, a default value of 1 will be used.
     *
     * ⚠ Throws an error if `quantity` is zero.
     */
    withMinimumRepetitions(quantity: number): RegExpBuilder;
    /**
     * Specifies the minimum length a repeated substring must have in order to be converted
     * if `withConversionOfRepetitions` is set.
     *
     * If the length is not explicitly set with this method, a default value of 1 will be used.
     *
     * ⚠ Throws an error if `length` is zero.
     */
    withMinimumSubstringLength(length: number): RegExpBuilder;
    /**
     * Tells `RegExpBuilder` to produce a nicer looking regular expression in verbose mode.
     */
    withVerboseMode(): RegExpBuilder;
    /**
     * Tells `RegExpBuilder` to remove the caret and dollar sign anchors from the resulting
     * regular expression, thereby allowing to match the test cases also when they occur
     * within a larger string that contains other content as well.
     */
    withoutAnchors(): RegExpBuilder;
    /**
     * Tells `RegExpBuilder` to remove the dollar sign anchor '$' from the resulting regular
     * expression, thereby allowing to match the test cases also when they do not occur
     * at the end of a string.
     */
    withoutEndAnchor(): RegExpBuilder;
    /**
     * Tells `RegExpBuilder` to remove the caret anchor '^' from the resulting regular
     * expression, thereby allowing to match the test cases also when they do not occur
     * at the start of a string.
     */
    withoutStartAnchor(): RegExpBuilder;
}

export function generate_regex(match_strings: any): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly generate_regex: (a: any) => [number, number];
    readonly __wbg_regexpbuilder_free: (a: number, b: number) => void;
    readonly regexpbuilder_build: (a: number) => [number, number];
    readonly regexpbuilder_from: (a: number, b: number) => [number, number, number];
    readonly regexpbuilder_withCapturingGroups: (a: number) => number;
    readonly regexpbuilder_withCaseInsensitiveMatching: (a: number) => number;
    readonly regexpbuilder_withConversionOfDigits: (a: number) => number;
    readonly regexpbuilder_withConversionOfNonDigits: (a: number) => number;
    readonly regexpbuilder_withConversionOfNonWhitespace: (a: number) => number;
    readonly regexpbuilder_withConversionOfNonWords: (a: number) => number;
    readonly regexpbuilder_withConversionOfRepetitions: (a: number) => number;
    readonly regexpbuilder_withConversionOfWhitespace: (a: number) => number;
    readonly regexpbuilder_withConversionOfWords: (a: number) => number;
    readonly regexpbuilder_withEscapingOfNonAsciiChars: (a: number, b: number) => number;
    readonly regexpbuilder_withMinimumRepetitions: (a: number, b: number) => [number, number, number];
    readonly regexpbuilder_withMinimumSubstringLength: (a: number, b: number) => [number, number, number];
    readonly regexpbuilder_withVerboseMode: (a: number) => number;
    readonly regexpbuilder_withoutAnchors: (a: number) => number;
    readonly regexpbuilder_withoutEndAnchor: (a: number) => number;
    readonly regexpbuilder_withoutStartAnchor: (a: number) => number;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
