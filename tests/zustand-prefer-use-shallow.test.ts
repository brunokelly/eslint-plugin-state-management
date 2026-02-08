import tsParser from "@typescript-eslint/parser";
import { RuleTester } from "@typescript-eslint/rule-tester";
import * as vitest from "vitest";

import rule from "../src/rules/zustand-prefer-use-shallow";

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

ruleTester.run("zustand-prefer-use-shallow", rule, {
  valid: [
    {
      code: `useStore((s) => s.count);`,
    },
    {
      code: `useStore(useShallow((s) => ({ a: s.a, b: s.b })));`,
    },
    {
      code: `useZustand(useShallow((s) => [s.a, s.b]));`,
      options: [{ hooks: ["useZustand"] }],
    },
    {
      code: `
        useStore((s) => {
          return s.count;
        });
      `,
    },
    {
      code: `
        useStore((s) => s.user);
      `,
    },
  ],
  invalid: [
    {
      code: `useStore((s) => ({ a: s.a, b: s.b }));`,
      errors: [{ messageId: "preferUseShallow" }],
    },
    {
      code: `useStore((s) => [s.a, s.b]);`,
      errors: [{ messageId: "preferUseShallow" }],
    },
    {
      code: `
        useStore((s) => {
          return { a: s.a };
        });
      `,
      errors: [{ messageId: "preferUseShallow" }],
    },
    {
      code: `
        useZustand((s) => ({ total: s.total, items: s.items }));
      `,
      options: [{ hooks: ["useZustand"] }],
      errors: [{ messageId: "preferUseShallow" }],
    },
    {
      code: `
        useZustand((s) => [s.total, s.items]);
      `,
      options: [{ hooks: ["useZustand"], checkArrayLiteral: true }],
      errors: [{ messageId: "preferUseShallow" }],
    },
  ],
});
