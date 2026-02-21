/* tslint:disable */
/* eslint-disable */

export class ConversationManager {
    free(): void;
    [Symbol.dispose](): void;
    appendAssistant(content: string): void;
    appendUser(content: string): void;
    context(): string;
    conversationMessages(): any;
    history(): any;
    is_empty(): boolean;
    length(): number;
    constructor(system_context: string);
    reset(): void;
    setContext(context: string): void;
}

export function init_panic_hook(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_conversationmanager_free: (a: number, b: number) => void;
    readonly conversationmanager_appendAssistant: (a: number, b: number, c: number, d: number) => void;
    readonly conversationmanager_appendUser: (a: number, b: number, c: number, d: number) => void;
    readonly conversationmanager_context: (a: number, b: number) => void;
    readonly conversationmanager_conversationMessages: (a: number, b: number) => void;
    readonly conversationmanager_history: (a: number, b: number) => void;
    readonly conversationmanager_is_empty: (a: number) => number;
    readonly conversationmanager_length: (a: number) => number;
    readonly conversationmanager_new: (a: number, b: number) => number;
    readonly conversationmanager_reset: (a: number) => void;
    readonly conversationmanager_setContext: (a: number, b: number, c: number) => void;
    readonly init_panic_hook: () => void;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
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
