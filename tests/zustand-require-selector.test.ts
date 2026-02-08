import tsParser from "@typescript-eslint/parser";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { createRequire } from "node:module";
import * as vitest from "vitest";
import rule from "../src/rules/zustand-require-selector";

const require = createRequire(import.meta.url);

RuleTester.afterAll = vitest.afterAll;
RuleTester.describe = vitest.describe;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
  },
});

ruleTester.run("zustand-require-selector", rule, {
  valid: [
    { code: `useStore((s) => s.count);` },
    {
      code: `useZustandStore((s) => s.total);`,
      options: [{ hooks: ["useZustandStore"] }],
    },
    {
      code: `useZustandStore(selectTotal);`,
      options: [
        {
          hooks: ["useZustandStore"],
          forbidIdentitySelector: true,
          forbidDirectSlice: true,
        },
      ],
    },
  ],
  invalid: [
    { code: `useStore();`, errors: [{ messageId: "missingSelector" }] },
    {
      code: `useZustandStore();`,
      options: [{ hooks: ["useZustandStore"] }],
      errors: [{ messageId: "missingSelector" }],
    },
    { code: `useStore((s) => s);`, errors: [{ messageId: "identity" }] },
    {
      code: `useZustandStore((s) => s.checkout);`,
      options: [{ hooks: ["useZustandStore"], forbidDirectSlice: true }],
      errors: [{ messageId: "directSlice" }],
    },
  ],
});
