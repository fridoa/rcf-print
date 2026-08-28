import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./test/setup.js"],
    include: ["test/**/*.test.js"],

    /**
     * Semua file test berbagi satu database (rcf_print_test) dan saling
     * membersihkan collection, jadi tidak boleh jalan paralel.
     */
    fileParallelism: false,

    // koneksi Atlas bisa lambat saat cold start
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
