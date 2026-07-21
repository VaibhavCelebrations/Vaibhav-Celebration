import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Pages must go through src/lib/data/<module>.ts repos, never the mock
    // store directly — that's what keeps the mock→API swap a one-file change.
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/mock/*", "@/lib/mock"],
              message: "Import the repo from @/lib/data/<module> instead of the mock store directly.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
