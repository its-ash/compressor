let pyodideReady = null;

const loadPyodideRuntime = async () => {
  if (!pyodideReady) {
    importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");
    pyodideReady = loadPyodide({
      stdin: () => "",
      stdout: (text) => self.postMessage({ type: "stdout", text: text + "\n" }),
      stderr: (text) => self.postMessage({ type: "stderr", text: text + "\n" }),
    });
  }
  return pyodideReady;
};

self.onmessage = async (event) => {
  const { type, code } = event.data || {};
  if (type !== "run") return;

  try {
    const pyodide = await loadPyodideRuntime();
    const result = await pyodide.runPythonAsync(code);
    if (result !== undefined) {
      self.postMessage({ type: "stdout", text: String(result) + "\n" });
    }
    self.postMessage({ type: "result", ok: true, exitCode: 0 });
  } catch (err) {
    self.postMessage({ type: "stderr", text: (err && err.stack) ? err.stack + "\n" : String(err) + "\n" });
    self.postMessage({ type: "result", ok: false, exitCode: 1 });
  }
};
