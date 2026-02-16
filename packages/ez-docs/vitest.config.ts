import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@config": path.resolve(__dirname, "../../website/ezdoc.config.ts"),
      "@overrides": path.resolve(__dirname, "../../website/overrides"),
    },
  },
});
