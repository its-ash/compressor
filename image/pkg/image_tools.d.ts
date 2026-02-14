/* tslint:disable */
/* eslint-disable */

export function compress_image(data: Uint8Array, quality: number, format: string): Uint8Array;

export function crop_image(data: Uint8Array, x: number, y: number, width: number, height: number): Uint8Array;

export function init_console_panic_hook(): void;

export function optimize_image(data: Uint8Array, max_width: number, max_height: number, quality: number, format: string, allow_upscale: boolean): Uint8Array;

export function perspective_crop(data: Uint8Array, points: Float32Array, out_width: number, out_height: number): Uint8Array;

export function resize_image(data: Uint8Array, width: number, height: number, filter: string): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly compress_image: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly crop_image: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly optimize_image: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number];
    readonly perspective_crop: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly resize_image: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly init_console_panic_hook: () => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
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
