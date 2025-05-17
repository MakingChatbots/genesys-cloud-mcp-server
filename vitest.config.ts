// import { defineConfig } from "vitest/config";
//
// export default defineConfig({
//   test: {
//     environment: "node",
//     include: ["tests/*.test.ts"],
//     globals: true,
//     coverage: {
//       provider: "v8",
//     },
//   },
// });

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/*.test.ts"],
    isolate: false,
    watch: false,
  },
});
