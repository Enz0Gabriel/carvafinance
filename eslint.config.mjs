import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "react/no-danger": "error",
      "no-restricted-properties": [
        "error",
        {
          property: "$queryRawUnsafe",
          message:
            "Use $queryRaw with tagged template literal instead of $queryRawUnsafe.",
        },
        {
          property: "$executeRawUnsafe",
          message:
            "Use $executeRaw with tagged template literal instead of $executeRawUnsafe.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
]);

export default eslintConfig;
