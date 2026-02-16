self.onmessage = (event) => {
  const { type, code } = event.data || {};
  if (type !== "run") return;

  const startHeap = self.performance?.memory?.usedJSHeapSize;

  const postStdout = (text) => {
    self.postMessage({ type: "stdout", text });
  };

  const postStderr = (text) => {
    self.postMessage({ type: "stderr", text });
  };

  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  console.log = (...args) => {
    postStdout(args.map(String).join(" ") + "\n");
  };
  console.warn = (...args) => {
    postStdout(args.map(String).join(" ") + "\n");
  };
  console.error = (...args) => {
    postStderr(args.map(String).join(" ") + "\n");
  };

  try {
    const fn = new Function("input", "console", "return (async () => {" + code + "\n})();");
    Promise.resolve(fn(undefined, console)).then((result) => {
      if (result !== undefined) {
        postStdout(String(result) + "\n");
      }
      const endHeap = self.performance?.memory?.usedJSHeapSize;
      self.postMessage({
        type: "result",
        ok: true,
        exitCode: 0,
        memoryBytes: endHeap ?? startHeap,
      });
    }).catch((err) => {
      postStderr((err && err.stack) ? err.stack + "\n" : String(err) + "\n");
      self.postMessage({ type: "result", ok: false, exitCode: 1 });
    });
  } catch (err) {
    postStderr((err && err.stack) ? err.stack + "\n" : String(err) + "\n");
    self.postMessage({ type: "result", ok: false, exitCode: 1 });
  } finally {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  }
};
