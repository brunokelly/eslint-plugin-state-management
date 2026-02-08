import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/brunokelly/eslint-plugin-state-management/blob/main/README.md#zustand-prefer-use-shallow`,
);

type Options = [
  {
    hooks?: string[];
    shallowHookName?: string;

    checkObjectLiteral?: boolean;

    checkArrayLiteral?: boolean;
  },
];

type MessageIds = "preferUseShallow";

function isIdentifier(
  node: TSESTree.Node | null | undefined,
): node is TSESTree.Identifier {
  return !!node && node.type === "Identifier";
}

function isSelectorFunction(
  node: TSESTree.Node | null | undefined,
): node is TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression {
  return (
    !!node &&
    (node.type === "ArrowFunctionExpression" ||
      node.type === "FunctionExpression")
  );
}

function unwrapParenthesized(node: TSESTree.Node): TSESTree.Node {
  // @typescript-eslint parser usa "ParenthesizedExpression" em alguns cenários
  // quando `eslint` option `preserveParens`/etc. estiver ativa.
  let current: TSESTree.Node = node;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (current.type === "TSAsExpression") {
      current = current.expression;
      continue;
    }
    if (current.type === "TSTypeAssertion") {
      current = current.expression;
      continue;
    }
    if (current.type === "ChainExpression") {
      current = current.expression;
      continue;
    }
    // if (current.type === "ParenthesizedExpression") {
    //   current = current.expression;
    //   continue;
    // }
    break;
  }
  return current;
}

export default createRule<Options, MessageIds>({
  name: "zustand-prefer-use-shallow",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Recommend wrapping selectors that return object/array literals with useShallow to prevent unnecessary re-renders.",
    },
    schema: [
      {
        type: "object",
        properties: {
          hooks: { type: "array", items: { type: "string" } },
          shallowHookName: { type: "string" },
          checkObjectLiteral: { type: "boolean" },
          checkArrayLiteral: { type: "boolean" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferUseShallow:
        "Selector returns an {{kind}} literal. Consider wrapping it with {{shallow}}(...) to prevent unnecessary re-renders.",
    },
  },
  defaultOptions: [
    {
      hooks: ["useStore"],
      shallowHookName: "useShallow",
      checkObjectLiteral: true,
      checkArrayLiteral: true,
    },
  ],
  create(context, [opts]) {
    const options = opts ?? {};
    const hooks = new Set(options.hooks ?? ["useStore"]);
    const shallowName = options.shallowHookName ?? "useShallow";
    const checkObject = options.checkObjectLiteral ?? true;
    const checkArray = options.checkArrayLiteral ?? true;

    function isHookCall(node: TSESTree.CallExpression): boolean {
      return isIdentifier(node.callee) && hooks.has(node.callee.name);
    }

    function isUseShallowCall(
      node: TSESTree.Node,
    ): node is TSESTree.CallExpression {
      const unwrapped = unwrapParenthesized(node);
      return (
        unwrapped.type === "CallExpression" &&
        isIdentifier(unwrapped.callee) &&
        unwrapped.callee.name === shallowName
      );
    }

    function returnsObjectOrArrayLiteral(
      selectorFn:
        | TSESTree.ArrowFunctionExpression
        | TSESTree.FunctionExpression,
    ): { kind: "object" | "array" } | null {
      const body = selectorFn.body;

      if (body.type === "ObjectExpression" && checkObject)
        return { kind: "object" };
      if (body.type === "ArrayExpression" && checkArray)
        return { kind: "array" };

      if (body.type === "BlockStatement") {
        for (const stmt of body.body) {
          if (stmt.type !== "ReturnStatement" || !stmt.argument) continue;

          const returned = unwrapParenthesized(stmt.argument);
          if (returned.type === "ObjectExpression" && checkObject) {
            return { kind: "object" };
          }
          if (returned.type === "ArrayExpression" && checkArray) {
            return { kind: "array" };
          }
        }
      }

      return null;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isHookCall(node)) return;

        const selectorArg = node.arguments[0];
        if (!selectorArg) return;

        if (isUseShallowCall(selectorArg)) return;

        const unwrappedSelector = unwrapParenthesized(selectorArg);

        if (!isSelectorFunction(unwrappedSelector)) return;

        const hit = returnsObjectOrArrayLiteral(unwrappedSelector);
        if (!hit) return;

        context.report({
          node: selectorArg,
          messageId: "preferUseShallow",
          data: { kind: hit.kind, shallow: shallowName },
        });
      },
    };
  },
});
