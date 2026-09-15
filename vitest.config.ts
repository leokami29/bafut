import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "@bafut/venue-ops": fileURLToPath(
        new URL("./packages/venue-ops/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: [
      "lib/**/*.test.ts",
      "app/**/*.test.ts",
      "creative-assets/**/*.test.ts",
      "components/**/*.test.tsx",
      "packages/venue-ops/**/*.test.ts",
    ],
    environment: "node",
  },
});
