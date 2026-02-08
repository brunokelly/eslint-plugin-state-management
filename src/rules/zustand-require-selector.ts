import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://example.com/rules/${name}`,
);

type Options = [
  {
    hooks?: string[];

    forbidIdentitySelector?: boolean;

    forbidDirectSlice?: boolean;
  },
];

type MessageIds = "missingSelector" | "identity" | "directSlice";

function isIdentifier(
  node: TSESTree.Node | null | undefined,
): node is TSESTree.Identifier {
  return !!node && node.type === "Identifier";
}

export default createRule<Options, MessageIds>({
  name: "zustand-require-selector",
  meta: {
    type: "problem",
    docs: {
      description: "Require granular selectors when using Zustand store hooks.",
    },
    schema: [
      {
        type: "object",
        properties: {
          hooks: { type: "array", items: { type: "string" } },
          forbidIdentitySelector: { type: "boolean" },
          forbidDirectSlice: { type: "boolean" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingSelector:
        "Do not call {{hook}}() without a selector. Use {{hook}}((s) => s.someField).",
      identity: "Selector must not return the entire store (s => s).",
      directSlice:
        "Avoid selecting a full slice (s => s.someSlice). Select specific fields instead.",
    },
  },
  defaultOptions: [
    {
      hooks: ["useStore"],
      forbidIdentitySelector: true,
      forbidDirectSlice: false,
    },
  ],
  create(context, [opts]) {
    const options = opts ?? {};
    const hooks = new Set(options.hooks ?? ["useStore"]);
    const forbidIdentity = options.forbidIdentitySelector ?? true;
    const forbidDirectSlice = options.forbidDirectSlice ?? false;

    function isHookCall(node: TSESTree.CallExpression): boolean {
      return isIdentifier(node.callee) && hooks.has(node.callee.name);
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isHookCall(node)) return;

        const hookName = (node.callee as TSESTree.Identifier).name;
        const selector = node.arguments[0];

        if (!selector) {
          context.report({
            node,
            messageId: "missingSelector",
            data: { hook: hookName },
          });
          return;
        }

        if (
          selector.type !== "ArrowFunctionExpression" &&
          selector.type !== "FunctionExpression"
        ) {
          return;
        }

        const param = selector.params[0];

        if (
          forbidIdentity &&
          isIdentifier(param) &&
          selector.body.type === "Identifier"
        ) {
          if (selector.body.name === param.name) {
            context.report({ node: selector, messageId: "identity" });
            return;
          }
        }

        if (
          forbidDirectSlice &&
          isIdentifier(param) &&
          selector.body.type === "MemberExpression" &&
          selector.body.object.type === "Identifier" &&
          selector.body.object.name === param.name &&
          selector.body.property.type === "Identifier"
        ) {
          context.report({ node: selector, messageId: "directSlice" });
        }
      },
    };
  },
});
