// ESLint flat config for the whole monorepo.
// Prettier handles formatting; ESLint handles correctness.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "playwright-report/**",
      "test-results/**",
      "packages/solvers/vendor/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Root config files and vite.config.ts aren't in an app tsconfig;
          // they're type-checked with the tools project (Node types).
          allowDefaultProject: ["*.js", "*.ts", "apps/web/vite.config.ts"],
          defaultProject: "tools/tsconfig.json",
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      eqeqeq: ["error", "always"],
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["apps/web/src/**/*.tsx"],
    ...jsxA11y.flatConfigs.strict,
  },
  {
    // Packages are pure logic: no DOM globals allowed.
    files: ["packages/*/src/**/*.ts", "config/**/*.ts"],
    rules: {
      "no-restricted-globals": ["error", "window", "document", "localStorage", "navigator"],
    },
  },
  {
    files: [
      "tools/**/*.ts",
      "*.config.{js,ts}",
      "apps/web/*.config.ts",
      "apps/web/build/**/*.ts",
      "apps/web/e2e/**/*.ts",
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["**/*.js"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // The admin landing page's small script runs in the browser.
    files: ["deploy/admin-home/*.js"],
    languageOptions: { globals: globals.browser, sourceType: "script" },
  },
  prettier,
);
