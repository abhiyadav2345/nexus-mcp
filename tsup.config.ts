import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "cli/index": "src/cli/index.ts",
    index: "src/index.ts",
  },
  format: ["esm"],
  target: "node20",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  shims: true,
});
