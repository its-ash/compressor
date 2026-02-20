import { EditorState } from "https://esm.sh/@codemirror/state";
import { EditorView, highlightActiveLineGutter, lineNumbers } from "https://esm.sh/@codemirror/view";
import { defaultHighlightStyle, indentOnInput, syntaxHighlighting } from "https://esm.sh/@codemirror/language";
import { history, historyKeymap } from "https://esm.sh/@codemirror/commands";
import { defaultKeymap, indentWithTab } from "https://esm.sh/@codemirror/commands";
import { keymap } from "https://esm.sh/@codemirror/view";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark";

const editorHost = document.getElementById("codeEditor");
const runBtn = document.getElementById("runBtn");
const resultEl = document.getElementById("result");
const statsEl = document.getElementById("stats");
const chart = document.getElementById("chart");
const chartCaption = document.getElementById("chartCaption");
const chartTime = document.getElementById("chartTime");
const chartHeap = document.getElementById("chartHeap");
const runSpinner = document.getElementById("runSpinner");
const runLabel = document.getElementById("runLabel");
let editorView = null;

const formatValue = (value) => {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch (_) {
    return String(value);
  }
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return "n/a";
  if (Math.abs(bytes) < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (Math.abs(kb) < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

const drawChart = (samples) => {
  if (!chart || !chart.getContext) return;
  const ctx = chart.getContext("2d");
  const w = chart.width;
  const h = chart.height;

  // Clear
  ctx.clearRect(0, 0, w, h);

  if (!samples || !samples.length) return;

  const max = Math.max(...samples);
  const min = Math.min(...samples);

  // Improved Graph Quality: Area Chart + Gradient + Smoothing
  const padding = 10;
  const graphW = w - (padding * 2);
  const graphH = h - (padding * 2);

  // Gradient
  const gradient = ctx.createLinearGradient(0, padding, 0, h - padding);
  gradient.addColorStop(0, "rgba(34, 211, 238, 0.6)"); // cyan
  gradient.addColorStop(1, "rgba(139, 92, 246, 0.1)"); // purple

  ctx.beginPath();
  ctx.moveTo(padding, h - padding);

  const stepX = graphW / (samples.length - 1);
  // Scale Y such that max is at top (padding) and 0 is at bottom (h-padding)
  // But usually execute times don't go to 0. Let's scale based on max.
  const scaleY = max === 0 ? 0 : graphH / (max * 1.1); // 10% headroom

  samples.forEach((val, i) => {
    const x = padding + i * stepX;
    const y = h - padding - (val * scaleY);
    ctx.lineTo(x, y);
  });

  ctx.lineTo(w - padding, h - padding);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Stroke Line
  ctx.beginPath();
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";

  samples.forEach((val, i) => {
    const x = padding + i * stepX;
    const y = h - padding - (val * scaleY);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw Mean Line
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  const avgY = h - padding - (avg * scaleY);
  ctx.beginPath();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.setLineDash([5, 5]);
  ctx.moveTo(padding, avgY);
  ctx.lineTo(w - padding, avgY);
  ctx.stroke();
  ctx.setLineDash([]);
};

const runCode = () => {
  if (!editorView || !runBtn || !resultEl) return;
  const code = editorView.state.doc.toString() || "";
  const runs = 500; // Fixed 500 iterations

  // UI Loading State
  runBtn.disabled = true;
  if (runSpinner) runSpinner.style.display = "inline-block";
  if (runLabel) runLabel.textContent = "Running 500x";
  resultEl.textContent = "Running...";
  if (statsEl) statsEl.textContent = "Running...";

  // Use Worker
  let worker;
  try {
    worker = new Worker("worker.js");
  } catch (e) {
    resultEl.textContent = "Error: Worker not supported or file missing.";
    cleanup();
    return;
  }

  worker.onmessage = (e) => {
    const { results, error, startHeap, endHeap } = e.data;

    if (error) {
      resultEl.textContent = `Error: ${error}`;
      if (statsEl) statsEl.textContent = "Error";
      drawChart([]);
    } else {
      const avg = results.reduce((a, b) => a + b, 0) / results.length;
      const min = Math.min(...results);
      const max = Math.max(...results);
      const heapDelta = (typeof startHeap === 'number' && typeof endHeap === 'number')
        ? endHeap - startHeap
        : null;

      resultEl.textContent = `Done.`;
      if (statsEl) {
        const timePart = `avg: ${avg.toFixed(2)}ms (min: ${min.toFixed(2)}ms, max: ${max.toFixed(2)}ms)`;
        const memPart = heapDelta !== null ? `heap Δ: ${formatBytes(heapDelta)}` : "";
        statsEl.textContent = `${timePart} ${memPart ? '• ' + memPart : ''}`;
      }

      drawChart(results);
      if (chartCaption) chartCaption.textContent = `${results.length} runs`;
      if (chartTime) chartTime.textContent = `avg ${avg.toFixed(2)} ms`;
      if (chartHeap) chartHeap.textContent = heapDelta !== null ? `heap Δ ${formatBytes(heapDelta)}` : "heap Δ n/a";
    }

    cleanup();
  };

  worker.onerror = (err) => {
    resultEl.textContent = `Worker Error: ${err.message}`;
    cleanup();
  };

  worker.postMessage({ code, iterations: runs });

  function cleanup() {
    runBtn.disabled = false;
    if (runSpinner) runSpinner.style.display = "none";
    if (runLabel) runLabel.textContent = "Run 500x";
    if (worker) worker.terminate();
  }
};

const initCodeMirror = () => {
  if (!editorHost) {
    throw new Error("Editor host element not found");
  }

  const startState = EditorState.create({
    doc: `// Example: Check Prime
function isPrime(num) {
  for(let i = 2, s = Math.sqrt(num); i <= s; i++)
    if(num % i === 0) return false;
  return num > 1;
}

// Find primes up to 1000
let count = 0;
for (let i = 0; i < 1000; i++) {      
    if (isPrime(i)) count++;
}
return count;`,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      indentOnInput(),
      syntaxHighlighting(oneDark),
      javascript(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
        {
          key: "Mod-Enter",
          run: () => {
            runCode();
            return true;
          }
        }
      ]),
      EditorView.theme({
        "&": {
          height: "400px",
          fontSize: "14px",
          fontFamily: "'IBM Plex Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
          backgroundColor: "#0b1220",
          color: "#e2e8f0"
        },
        ".cm-scroller": {
          fontFamily: "inherit"
        },
        ".cm-focused": {
          outline: "none"
        },
        ".cm-gutters": {
          backgroundColor: "#0f172a",
          color: "#94a3b8",
          border: "none"
        },
        ".cm-activeLineGutter": {
          backgroundColor: "#1e293b"
        },
        ".cm-line": {
          padding: "0 2px"
        },
        ".cm-activeLine": {
          backgroundColor: "rgba(14, 165, 233, 0.1)"
        },
        ".cm-selectionBackground": {
          backgroundColor: "rgba(14, 165, 233, 0.2) !important"
        },
        ".cm-cursor": {
          borderLeft: "2px solid #0ea5e9"
        }
      })
    ]
  });

  editorView = new EditorView({
    state: startState,
    parent: editorHost
  });

  return editorView;
};

const init = async () => {
  try {
    editorView = initCodeMirror();
  } catch (err) {
    if (resultEl) {
      resultEl.textContent = `Editor failed to load: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
};

runBtn?.addEventListener("click", runCode);
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "enter") {
    event.preventDefault();
    runCode();
  }
});

init();
