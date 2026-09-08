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
    rules: {
      // `_`-prefixed args/vars and object-rest siblings are deliberate "skip this"
      // markers, not dead code.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      // eslint-plugin-react-hooks v6 (bundled with Next 16 / React 19) adds this
      // rule; it fires on standard patterns throughout this app — SSR mount flags,
      // the loading-flag data-fetch pattern, prop→state sync. None are bugs here.
      // Revisit if data fetching moves to a library / `use()`.
      "react-hooks/set-state-in-effect": "off",
    },
  },
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
