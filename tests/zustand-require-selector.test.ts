import tsParser from "@typescript-eslint/parser";
import { RuleTester } from "@typescript-eslint/rule-tester";
import * as vitest from "vitest";
import rule from "../src/rules/zustand-require-selector";

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

const setup = `
  import { create } from "zustand";

  const useStore = create(() => ({
    count: 0,
    checkout: { total: 0 },
  }));

  const useZustandStore = create(() => ({
    total: 0,
    checkout: { total: 0 },
  }));

  const selectTotal = (s: any) => s.total;
`;

ruleTester.run("zustand-require-selector", rule, {
  valid: [
    { code: `${setup} useStore((s) => s.count);` },

    { code: `${setup} useZustandStore((s) => s.total);` },

    {
      code: `${setup} useZustandStore(selectTotal);`,
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
    {
      code: `${setup} useStore();`,
      errors: [{ messageId: "missingSelector" }],
    },
    {
      code: `${setup} useZustandStore();`,
      options: [{ hooks: ["useZustandStore"] }],
      errors: [{ messageId: "missingSelector" }],
    },
    {
      code: `${setup} useStore((s) => s);`,
      errors: [{ messageId: "identity" }],
    },
    {
      code: `${setup} useZustandStore((s) => s.checkout);`,
      options: [{ hooks: ["useZustandStore"], forbidDirectSlice: true }],
      errors: [{ messageId: "directSlice" }],
    },
  ],
});
