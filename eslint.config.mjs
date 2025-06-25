import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  prettierConfig,
  {
    ignores: ["**/*.js", "dist/**", "eslint.config.mjs", "vitest.config.ts"],
  },
  {
    files: ["**/*.{ts}"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        sourceType: "module",
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: "latest",
      },
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    files: ["dist/*"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
