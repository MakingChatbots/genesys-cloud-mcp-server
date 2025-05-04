import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  prettierConfig,
  {
    ignores: ["**/*.js"],
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
    files: ["dist/*"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
