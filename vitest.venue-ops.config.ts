import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@bafut/venue-ops": fileURLToPath(
        new URL("./packages/venue-ops/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["packages/venue-ops/**/*.test.ts"],
    environment: "node",
  },
});
