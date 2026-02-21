self.compileCToWasm = async (source, log) => {
  log = log || (() => {});
  log("C/C++ toolchain adapter loaded.\n");

  if (!self.clangWasmToolchain) {
    throw new Error("clangWasmToolchain not found. Place toolchain files in compilers/clang and expose compile() as clangWasmToolchain.compile");
  }

  const result = await self.clangWasmToolchain.compile(source, log);
  if (!result || !result.wasmBytes) {
    throw new Error("Toolchain compile did not return wasmBytes");
  }
  return result.wasmBytes;
};
