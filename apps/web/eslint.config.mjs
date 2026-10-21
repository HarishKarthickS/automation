import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
export default [
  { ignores: [".next/**", "node_modules/**", "test-results/**", "playwright-report/**"] },
  { files: ["src/**/*.{ts,tsx}", "e2e/**/*.ts"], languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } } },
    rules: { ...js.configs.recommended.rules, "no-undef": "off", "no-unused-vars": "off", "no-empty": ["error", { allowEmptyCatch: true }] } }
];
