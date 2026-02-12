/* tslint:disable */
/* eslint-disable */

/**
 * Analyze video file header to detect format and codec
 */
export function analyze_video_header(file_name: string, header_bytes: Uint8Array): any;

/**
 * Build complete video processing parameters
 */
export function build_processing_params(trim_js: any, crop_js: any, scale_width?: number | null, scale_height?: number | null): any;

/**
 * Calculate optimal crop dimensions maintaining aspect ratio
 */
export function calculate_crop_with_aspect_ratio(original_width: number, original_height: number, target_aspect_num: number, target_aspect_den: number): any;

/**
 * Convert bytes to human-readable size
 */
export function format_file_size(bytes: number): string;

/**
 * Format time in seconds to HH:MM:SS.mmm
 */
export function format_timestamp(seconds: number): string;

/**
 * Generate FFmpeg filter string for crop and trim
 */
export function generate_ffmpeg_filters(crop_js: any, scale_width?: number | null, scale_height?: number | null): string;

/**
 * Get recommended output format based on codec support
 */
export function get_recommended_format(has_h264: boolean, has_vp9: boolean, has_av1: boolean): string;

export function init_console_panic_hook(): void;

/**
 * Check if video format is web-compatible (can be played in browser)
 */
export function is_web_compatible(extension: string): boolean;

/**
 * Parse timestamp string (HH:MM:SS.mmm or MM:SS.mmm or SS.mmm) to seconds
 */
export function parse_timestamp(timestamp: string): number;

/**
 * Validate and normalize crop parameters
 */
export function validate_crop(x: number, y: number, width: number, height: number, video_width: number, video_height: number): any;

/**
 * Validate and normalize trim parameters
 */
export function validate_trim(start: number, end: number, video_duration: number): any;

/**
 * Validate a batch of video files
 */
export function validate_video_batch(files_js: any): any;

/**
 * Validate a single video file's name and basic metadata
 */
export function validate_video_file(name: string, size: number, mime_type: string): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly analyze_video_header: (a: number, b: number, c: number) => number;
    readonly build_processing_params: (a: number, b: number, c: number, d: number) => number;
    readonly calculate_crop_with_aspect_ratio: (a: number, b: number, c: number, d: number) => number;
    readonly format_file_size: (a: number, b: number) => void;
    readonly format_timestamp: (a: number, b: number) => void;
    readonly generate_ffmpeg_filters: (a: number, b: number, c: number, d: number) => void;
    readonly get_recommended_format: (a: number, b: number, c: number, d: number) => void;
    readonly init_console_panic_hook: () => void;
    readonly is_web_compatible: (a: number, b: number) => number;
    readonly parse_timestamp: (a: number, b: number) => number;
    readonly validate_crop: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly validate_trim: (a: number, b: number, c: number) => number;
    readonly validate_video_batch: (a: number) => number;
    readonly validate_video_file: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number) => void;
    readonly __wbindgen_export4: (a: number, b: number, c: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
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
