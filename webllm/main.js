import initWasm, { ConversationManager, init_panic_hook as installPanicHook } from "./pkg/webllm_wasm.js";
import * as webllm from "https://esm.run/@mlc-ai/web-llm";
import { EditorState } from "https://esm.sh/@codemirror/state";
import { EditorView, highlightActiveLineGutter, lineNumbers } from "https://esm.sh/@codemirror/view";
import { defaultHighlightStyle, indentOnInput, syntaxHighlighting } from "https://esm.sh/@codemirror/language";
import { history, historyKeymap } from "https://esm.sh/@codemirror/commands";
import { defaultKeymap, indentWithTab } from "https://esm.sh/@codemirror/commands";
import { keymap } from "https://esm.sh/@codemirror/view";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript";
import { markdown } from "https://esm.sh/@codemirror/lang-markdown";
import { python } from "https://esm.sh/@codemirror/lang-python";
import { rust } from "https://esm.sh/@codemirror/lang-rust";
import { json as jsonLang } from "https://esm.sh/@codemirror/lang-json";

// Some browsers omit the Cache Storage API on non-secure origins. Provide a no-op fallback
// so WebLLM can still initialize when served via file:// or basic HTTP servers.
if (!("caches" in globalThis)) {
        const noopCache = {
                async match() {
                        return undefined;
                },
                async put() {
                        return undefined;
                },
                async add() {
                        return undefined;
                }
        };
        globalThis.caches = {
                async open() {
                        return noopCache;
                }
        };
}

// Point to the parent directory of the model folder.
const LOCAL_MODEL_ROOT = new URL("./", window.location.href).href;
const MODEL_ID = "Llama-3.2-1B-Instruct-q4f32_1-MLC";

// Use the prebuilt config but intercept fetches to serve files locally
const localAppConfig = webllm.prebuiltAppConfig;


function createRequest(targetUrl, resource, init) {
        const base = resource instanceof Request ? resource : null;
        const headers = new Headers(init?.headers || base?.headers || {});
        // Auth removed


        const options = {
                method: base?.method || init?.method || "GET",
                headers,
                body: base?.body || init?.body || null,
                mode: base?.mode || init?.mode,
                credentials: base?.credentials || init?.credentials,
                cache: base?.cache || init?.cache,
                redirect: base?.redirect || init?.redirect,
                referrer: base?.referrer || init?.referrer,
                referrerPolicy: base?.referrerPolicy || init?.referrerPolicy,
                integrity: base?.integrity || init?.integrity,
                keepalive: base?.keepalive || init?.keepalive,
                signal: base?.signal || init?.signal,
                priority: base?.priority || init?.priority,
                duplex: base?.duplex || init?.duplex
        };

        return new Request(targetUrl, options);
}

function resolveLocalModelUrl(urlString) {
        // No-op; we use direct local URLs now.
        return null;
}

// Re-enable fetch patching to intercept Hugging Face URLs and serve local files
const originalFetch = globalThis.fetch?.bind(globalThis);
if (originalFetch) {
        globalThis.fetch = async function patchedFetch(resource, init) {
                const urlString = typeof resource === "string" ? resource : resource?.url;

                // Guard: only process if we have a valid URL string
                if (urlString && typeof urlString === "string") {
                        // Intercept Hugging Face model URLs and map to local directory
                        const hfMatch = urlString.match(/huggingface\.co\/mlc-ai\/Llama-3\.2-1B-Instruct-q4f32_1-MLC\/resolve\/main\/(.+)$/);
                        if (hfMatch) {
                                const [, artifactPath] = hfMatch;
                                const localUrl = `${LOCAL_MODEL_ROOT}Llama-3.2-1B-Instruct-q4f32_1-MLC/${artifactPath}`;
                                console.log(`Serving locally: ${artifactPath}`);
                                return originalFetch(localUrl, init);
                        }
                }

                return originalFetch(resource, init);
        };
}

const statusPill = document.getElementById("status-indicator");
const progressBar = document.getElementById("model-progress");
const progressLabel = document.getElementById("progress-label");
const form = document.getElementById("prompt-form");
const contextInput = document.getElementById("context-input");
const promptInput = document.getElementById("prompt-input");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");
const contextPreview = document.getElementById("context-preview");

let manager = null;
let engine = null;
let enginePromise = null;
let isBusy = false;
let loadedModelId = null;
let codeMirrorViews = [];
const baseExtensions = [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
];

async function bootstrap() {
        await initWasm();
        if (typeof installPanicHook === "function") {
                installPanicHook();
        }

        setStatus("Downloading model…", "loading");
        try {
                await ensureEngine();
                setStatus("Model ready", "ready");
                updateProgress(1, "WebLLM initialized. Prompt away.");
        } catch (err) {
                console.error(err);
                setStatus("Failed to load model", "error");
                updateProgress(0, "Retry by refreshing the page.");
        }
}

async function ensureEngine() {
        if (engine && loadedModelId === MODEL_ID) return engine;
        if (!enginePromise) {
                enginePromise = webllm.CreateMLCEngine(MODEL_ID, {
                        appConfig: localAppConfig,
                        initProgressCallback: info => {
                                const fraction = clamp01(info?.progress ?? 0);
                                updateProgress(fraction, info?.text ?? "Preparing weights…");
                        },
                }).then(instance => {
                        engine = instance;
                        loadedModelId = MODEL_ID;
                        return instance;
                })
                        .catch(err => {
                                enginePromise = null;
                                throw err;
                        });
        }
        return enginePromise;
}

function clamp01(value) {
        return Math.max(0, Math.min(1, value));
}

form.addEventListener("submit", event => {
        event.preventDefault();
        handleSubmit();
});

resetBtn.addEventListener("click", () => {
        if (manager) {
                manager.reset();
        }
        promptInput.value = "";
        setContextPreview(contextInput.value.trim());
        renderHistory();
        setStatus("Conversation reset", "ready");
});

contextInput.addEventListener("input", () => {
        setContextPreview(contextInput.value.trim());
});


async function handleSubmit() {
        const context = contextInput.value.trim();
        const prompt = promptInput.value.trim();

        if (!prompt) {
                setStatus("Enter a prompt", "error");
                promptInput.focus();
                return;
        }

        if (isBusy) return;

        try {
                isBusy = true;
                toggleInputs(true);
                setStatus("Generating response…", "loading");

                if (!manager) {
                        manager = new ConversationManager(context);
                } else {
                        manager.setContext(context);
                }

                await manager.appendUser(prompt);
                renderHistory();
                promptInput.value = "";

                const engineInstance = await ensureEngine();
                const conversation = await manager.conversationMessages();
                const completion = await engineInstance.chat.completions.create({
                        messages: conversation,
                        temperature: 0.6,
                        max_tokens: 512,
                        stream: false,
                });

                const reply = extractTextFromCompletion(completion);
                await manager.appendAssistant(reply);
                renderHistory();
                setStatus("Ready for the next prompt", "ready");
        } catch (err) {
                console.error(err);
                setStatus(err?.message || "Something went wrong", "error");
        } finally {
                isBusy = false;
                toggleInputs(false);
        }
}

function extractTextFromCompletion(completion) {
        const choice = completion?.choices?.[0];
        if (!choice) {
                throw new Error("No completion returned by WebLLM");
        }

        const content = choice.message?.content;
        if (Array.isArray(content)) {
                return content.map(part => part?.text ?? "").join("").trim() || "(empty response)";
        }
        if (typeof content === "string") {
                return content.trim() || "(empty response)";
        }
        return "(no content)";
}

function parseContentParts(raw) {
        const content = raw || "";
        const parts = [];
        const regex = /```(\w+)?\n([\s\S]*?)```/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(content)) !== null) {
                if (match.index > lastIndex) {
                        parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
                }
                parts.push({ type: "code", language: match[1] || "", value: match[2] });
                lastIndex = regex.lastIndex;
        }

        if (lastIndex < content.length) {
                parts.push({ type: "text", value: content.slice(lastIndex) });
        }

        return parts.length ? parts : [{ type: "text", value: content }];
}

function resolveLanguageExtension(lang) {
        const key = (lang || "").toLowerCase();
        if (["js", "javascript", "jsx"].includes(key)) return javascript();
        if (["ts", "tsx", "typescript"].includes(key)) return javascript({ typescript: true, jsx: key === "tsx" });
        if (["md", "markdown"].includes(key)) return markdown();
        if (["py", "python"].includes(key)) return python();
        if (["rs", "rust"].includes(key)) return rust();
        if (key === "json") return jsonLang();
        return null;
}

function destroyCodeMirrorViews() {
        codeMirrorViews.forEach(view => view.destroy());
        codeMirrorViews = [];
}

function renderMessageContent(container, content) {
        container.innerHTML = "";
        const parts = parseContentParts(content);

        parts.forEach(part => {
                if (part.type === "code") {
                        const block = document.createElement("div");
                        block.className = "code-block";
                        const editorHost = document.createElement("div");
                        block.appendChild(editorHost);
                        container.appendChild(block);

                        const extensions = [
                                ...baseExtensions,
                                oneDark,
                                EditorView.editable.of(false),
                                EditorState.readOnly.of(true),
                                EditorView.theme({
                                        "&": { backgroundColor: "transparent" },
                                        ".cm-scroller": { fontFamily: "JetBrains Mono, monospace" },
                                }),
                        ];

                        const langExt = resolveLanguageExtension(part.language);
                        if (langExt) extensions.push(langExt);

                        const state = EditorState.create({
                                doc: (part.value || "").trimEnd(),
                                extensions,
                        });

                        const view = new EditorView({ state, parent: editorHost });
                        codeMirrorViews.push(view);
                } else {
                        const text = part.value || "";
                        text.split(/\n{2,}/).forEach(chunk => {
                                if (!chunk.trim()) return;
                                const paragraph = document.createElement("p");
                                paragraph.textContent = chunk.trim();
                                container.appendChild(paragraph);
                        });
                }
        });
}

async function renderHistory() {
        if (!manager) {
                destroyCodeMirrorViews();
                historyList.hidden = true;
                historyEmpty.hidden = false;
                contextPreview.textContent = contextInput.value.trim() || "No context captured yet.";
                return;
        }

        try {
                destroyCodeMirrorViews();
                const snapshot = await manager.history();
                const { context, messages } = snapshot || {};
                setContextPreview(context || "");

                if (!messages || messages.length === 0) {
                        historyList.hidden = true;
                        historyEmpty.hidden = false;
                        return;
                }

                historyList.innerHTML = "";
                messages.forEach(message => {
                        const item = document.createElement("li");
                        item.className = "message";
                        item.dataset.role = message.role;

                        const header = document.createElement("div");
                        header.className = "message-header";
                        if (message.role !== "user") {
                                const role = document.createElement("span");
                                role.textContent = message.role;
                                header.appendChild(role);
                        }

                        const time = document.createElement("span");
                        time.textContent = formatTimestamp(message.timestamp);
                        header.appendChild(time);

                        const body = document.createElement("div");
                        body.className = "message-content";
                        renderMessageContent(body, message.content);

                        item.appendChild(header);
                        item.appendChild(body);
                        historyList.appendChild(item);
                });

                historyEmpty.hidden = true;
                historyList.hidden = false;
                historyList.scrollTop = historyList.scrollHeight;
        } catch (err) {
                console.error("Failed to render history", err);
                setStatus("Unable to render history", "error");
        }
}

function formatTimestamp(ts) {
        if (!ts) return "SYSTEM";
        const date = new Date(ts);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function setContextPreview(text) {
        contextPreview.textContent = text?.trim() ? text : "No context captured yet.";
}

function toggleInputs(disabled) {
        contextInput.disabled = disabled;
        promptInput.disabled = disabled;
        submitBtn.disabled = disabled;
        resetBtn.disabled = disabled;
}

function setStatus(text, state = "loading") {
        statusPill.textContent = text;
        statusPill.dataset.state = state;
}

function updateProgress(value, label) {
        const percent = clamp01(value) * 100;
        progressBar.style.width = `${percent}%`;
        if (label) {
                progressLabel.textContent = label;
        }
}

if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
                // Skip registering SW for local development to avoid caching stale assets
                // navigator.serviceWorker.register("./sw.js").catch(err => {
                //         console.warn("Service worker registration failed", err);
                // });
        });
}

bootstrap().then(() => renderHistory());
