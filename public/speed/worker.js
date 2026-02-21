self.onmessage = async function(e) {
    const { code, iterations } = e.data;
    const results = [];
    let error = null;
    let startHeap = null;
    let endHeap = null;

    try {
        if (performance && performance.memory) {
            startHeap = performance.memory.usedJSHeapSize;
        }

        // Create the function once
        const userFunction = new Function(code);

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            try {
                const result = userFunction();
                if (result instanceof Promise) {
                    await result;
                }
            } catch (err) {
                throw err;
            }
            const end = performance.now();
            results.push(end - start);
        }

        if (performance && performance.memory) {
            endHeap = performance.memory.usedJSHeapSize;
        }

    } catch (err) {
        error = err.toString();
    }

    self.postMessage({ results, error, startHeap, endHeap });
};
