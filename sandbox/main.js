import { EditorState } from "https://esm.sh/@codemirror/state";
import { EditorView, highlightActiveLineGutter, lineNumbers } from "https://esm.sh/@codemirror/view";
import { defaultHighlightStyle, indentOnInput, syntaxHighlighting } from "https://esm.sh/@codemirror/language";
import { history, historyKeymap } from "https://esm.sh/@codemirror/commands";
import { defaultKeymap, indentWithTab } from "https://esm.sh/@codemirror/commands";
import { keymap } from "https://esm.sh/@codemirror/view";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript";
import { python } from "https://esm.sh/@codemirror/lang-python";
import { rust } from "https://esm.sh/@codemirror/lang-rust";
import { cpp } from "https://esm.sh/@codemirror/lang-cpp";

const languageSelect = document.getElementById("languageSelect");
const timeoutSelect = document.getElementById("timeoutSelect");
const runBtn = document.getElementById("runBtn");
const stopBtn = document.getElementById("stopBtn");
const consoleOutput = document.getElementById("consoleOutput");
const errorOutput = document.getElementById("errorOutput");
const compileOutput = document.getElementById("compileOutput");
const timingEl = document.getElementById("timing");
const memoryEl = document.getElementById("memory");
const exitCodeEl = document.getElementById("exitCode");
const statusEl = document.getElementById("status");
const runtimeStatus = document.getElementById("runtimeStatus");
const editorHost = document.getElementById("codeEditor");
const stdinInput = document.getElementById("stdinInput");
const copyConsoleBtn = document.getElementById("copyConsoleBtn");
const copyErrorBtn = document.getElementById("copyErrorBtn");

let editorView = null;
let activeWorker = null;
let runTimeoutId = null;
let currentLanguage = "javascript";

const LANGUAGE_CONFIG = {
  javascript: {
    label: "JavaScript",
    worker: "./workers/js-runner.js",
    starter: `// JS: Worker sandbox\nfunction fib(n) {\n  if (n < 2) return n;\n  return fib(n - 1) + fib(n - 2);\n}\n\nconst result = fib(12);\nconsole.log("fib(12)", result);\nresult;`
  },
  python: {
    label: "Python",
    worker: "./workers/python-runner.js",
    starter: `# Python via Pyodide\nimport math\n\nvalues = [math.sqrt(x) for x in range(1, 8)]\nprint("sqrt", values)\nvalues` 
  },
  rust: {
    label: "Rust",
    worker: "./workers/rust-runner.js",
    starter: `// Rust (WASI)\nuse std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).ok();\n    println!("Hello from Rust!");\n    println!("stdin bytes: {}", input.len());\n}`
  },
  cpp: {
    label: "C/C++",
    worker: "./workers/clang-runner.js",
    starter: `// C++ (WASI)\n#include <iostream>\n#include <string>\n\nint main() {\n    std::string name = "WASM";\n    std::cout << "Hello " << name << " from C++!" << std::endl;\n    return 0;\n}`
  }
};

const editedKey = (lang) => `sandbox.edited.${lang}`;

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return "n/a";
  if (Math.abs(bytes) < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (Math.abs(kb) < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

const editorTheme = EditorView.theme({
  "&": {
    color: "var(--text)",
    backgroundColor: "var(--panel-strong)",
    height: "100%"
  },
  ".cm-content": {
    fontFamily: "\"IBM Plex Mono\", monospace",
    fontSize: "13px"
  },
  ".cm-gutters": {
    backgroundColor: "var(--panel-strong)",
    color: "var(--muted)",
    borderRight: "1px solid var(--border)"
  },
  ".cm-activeLineGutter": {
    color: "var(--accent)"
  },
  ".cm-cursor": {
    borderLeftColor: "var(--accent)"
  },
  ".cm-line": {
    paddingLeft: "2px",
    paddingRight: "4px"
  },
  ".cm-selectionBackground": {
    backgroundColor: "rgba(45, 212, 191, 0.2)"
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255, 255, 255, 0.04)"
  }
}, { dark: true });

const scrollChaining = EditorView.domEventHandlers({
  wheel: (event, view) => {
    const scroller = view.scrollDOM;
    const atTop = scroller.scrollTop === 0;
    const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
    if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
      return false;
    }
    return false;
  }
});

const setStatus = (text, isError = false) => {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#f87171" : "";
};

const clearOutputs = () => {
  consoleOutput.textContent = "";
  errorOutput.textContent = "";
  compileOutput.textContent = "";
  timingEl.textContent = "time: --";
  memoryEl.textContent = "--";
  exitCodeEl.textContent = "--";
};

const saveDraft = (lang = languageSelect.value) => {
  if (!editorView) return;
  localStorage.setItem(`sandbox.code.${lang}`, editorView.state.doc.toString());
  localStorage.setItem("sandbox.lang", lang);
};

const loadDraft = (lang) => {
  const edited = localStorage.getItem(editedKey(lang)) === "true";
  if (!edited) return LANGUAGE_CONFIG[lang].starter;
  const draft = localStorage.getItem(`sandbox.code.${lang}`);
  return draft || LANGUAGE_CONFIG[lang].starter;
};

const baseExtensions = [
  lineNumbers(),
  highlightActiveLineGutter(),
  history(),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
  editorTheme,
  scrollChaining,
  EditorView.updateListener.of((update) => {
    if (!update.docChanged) return;
    const lang = currentLanguage;
    localStorage.setItem(editedKey(lang), "true");
    localStorage.setItem(`sandbox.code.${lang}`, update.state.doc.toString());
  })
];

const languageExtension = (lang) => {
  switch (lang) {
    case "python":
      return python();
    case "rust":
      return rust();
    case "cpp":
      return cpp();
    case "javascript":
    default:
      return javascript();
  }
};

const createEditorState = (lang, doc) =>
  EditorState.create({
    doc,
    extensions: [...baseExtensions, languageExtension(lang)]
  });

const initEditor = () => {
  if (!editorHost) {
    throw new Error("Editor host not found");
  }
  const lang = languageSelect.value;
  const state = createEditorState(lang, loadDraft(lang));
  editorView = new EditorView({
    state,
    parent: editorHost
  });
};

const switchLanguage = (lang) => {
  if (!editorView) return;
  saveDraft(currentLanguage);
  currentLanguage = lang;
  const state = createEditorState(lang, loadDraft(lang));
  editorView.setState(state);
  runtimeStatus.textContent = `Ready: ${LANGUAGE_CONFIG[lang].label}`;
  editorView.focus();
};

const stopRun = () => {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
  if (runTimeoutId) {
    clearTimeout(runTimeoutId);
    runTimeoutId = null;
  }
  runBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus("Stopped", true);
  runtimeStatus.textContent = "Idle";
};

const runCode = () => {
  if (!editorView) return;
  const lang = languageSelect.value;
  const config = LANGUAGE_CONFIG[lang];
  const code = editorView.state.doc.toString() || "";
  const timeoutMs = Number(timeoutSelect.value);

  clearOutputs();
  setStatus("Running...");
  runtimeStatus.textContent = `Executing: ${config.label}`;
  runBtn.disabled = true;
  stopBtn.disabled = false;

  activeWorker = new Worker(config.worker);
  const startTime = performance.now();

  activeWorker.onmessage = (event) => {
    const msg = event.data || {};
    if (msg.type === "stdout") {
      consoleOutput.textContent += msg.text;
      return;
    }
    if (msg.type === "stderr") {
      errorOutput.textContent += msg.text;
      return;
    }
    if (msg.type === "compile") {
      compileOutput.textContent += msg.text;
      return;
    }
    if (msg.type === "result") {
      const duration = performance.now() - startTime;
      timingEl.textContent = `time: ${duration.toFixed(1)} ms`;
      memoryEl.textContent = formatBytes(msg.memoryBytes);
      exitCodeEl.textContent = msg.exitCode ?? "--";
      setStatus(msg.ok ? "Completed" : "Failed", !msg.ok);
      runtimeStatus.textContent = "Idle";
      stopBtn.disabled = true;
      runBtn.disabled = false;
      activeWorker.terminate();
      activeWorker = null;
      if (runTimeoutId) {
        clearTimeout(runTimeoutId);
        runTimeoutId = null;
      }
    }
  };

  activeWorker.onerror = (err) => {
    errorOutput.textContent += `Worker error: ${err.message}\n`;
    setStatus("Failed", true);
    runtimeStatus.textContent = "Idle";
    runBtn.disabled = false;
    stopBtn.disabled = true;
  };

  activeWorker.postMessage({ type: "run", code, language: lang, input: stdinInput.value });

  runTimeoutId = setTimeout(() => {
    errorOutput.textContent += `Timeout: exceeded ${timeoutMs} ms\n`;
    stopRun();
  }, timeoutMs);
};

runBtn?.addEventListener("click", runCode);
stopBtn?.addEventListener("click", stopRun);

languageSelect?.addEventListener("change", (event) => {
  const lang = event.target.value;
  switchLanguage(lang);
});

window.addEventListener("beforeunload", saveDraft);

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "enter") {
    event.preventDefault();
    runCode();
  }
});

copyConsoleBtn?.addEventListener("click", () => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(consoleOutput.textContent).catch(err => {
      console.error("Failed to copy console output:", err);
    });
  } else {
    // Fallback for browsers that don't support Clipboard API
    const textArea = document.createElement("textarea");
    textArea.value = consoleOutput.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Failed to copy console output:", err);
    }
    document.body.removeChild(textArea);
  }
});

copyErrorBtn?.addEventListener("click", () => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(errorOutput.textContent).catch(err => {
      console.error("Failed to copy error output:", err);
    });
  } else {
    // Fallback for browsers that don't support Clipboard API
    const textArea = document.createElement("textarea");
    textArea.value = errorOutput.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Failed to copy error output:", err);
    }
    document.body.removeChild(textArea);
  }
});

const init = async () => {
  try {
    const savedLang = localStorage.getItem("sandbox.lang");
    if (savedLang && LANGUAGE_CONFIG[savedLang]) {
      languageSelect.value = savedLang;
    }
    initEditor();
    currentLanguage = languageSelect.value;
    runtimeStatus.textContent = `Ready: ${LANGUAGE_CONFIG[currentLanguage].label}`;
  } catch (err) {
    errorOutput.textContent = `Editor failed to load: ${err instanceof Error ? err.message : String(err)}`;
  }
};

init();
