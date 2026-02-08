import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/brunokelly/eslint-plugin-state-management/blob/main/README.md#zustand-require-selector`,
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

function unwrapExpression(expr: TSESTree.Expression): TSESTree.Expression {
  let cur = expr;
  while (true) {
    if (cur.type === "TSAsExpression") cur = cur.expression;
    else if (cur.type === "TSTypeAssertion") cur = cur.expression;
    else if (cur.type === "TSNonNullExpression") cur = cur.expression;
    else if (cur.type === "ChainExpression") cur = cur.expression;
    else break;
  }
  return cur;
}

function getReturnedExpression(
  fn: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
): TSESTree.Expression | null {
  if (fn.body.type !== "BlockStatement") return unwrapExpression(fn.body);

  if (fn.body.body.length !== 1) return null;
  const only = fn.body.body[0];
  if (only.type !== "ReturnStatement") return null;
  if (!only.argument) return null;

  return unwrapExpression(only.argument);
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
      hooks: [],
      forbidIdentitySelector: true,
      forbidDirectSlice: false,
    },
  ],
  create(context, [opts]) {
    const options = opts ?? {};
    const manualHooks = new Set(options.hooks ?? []);
    const forbidIdentity = options.forbidIdentitySelector ?? true;
    const forbidDirectSlice = options.forbidDirectSlice ?? false;

    const sourceCode = context.getSourceCode();

    const parserServices = context.parserServices;
    const hasTypeInfo =
      !!parserServices &&
      !!parserServices.program &&
      !!parserServices.esTreeNodeToTSNodeMap;

    const checker = hasTypeInfo
      ? parserServices.program.getTypeChecker()
      : null;

    function looksLikeZustandHookType(expr: TSESTree.Expression): boolean {
      if (!checker || !parserServices) return false;

      const tsNode = parserServices.esTreeNodeToTSNodeMap.get(expr);
      const type = checker.getTypeAtLocation(tsNode);

      const isUnion = (type.flags & ts.TypeFlags.Union) !== 0;
      const isIntersection = (type.flags & ts.TypeFlags.Intersection) !== 0;
      const types =
        isUnion || isIntersection
          ? (type as ts.UnionOrIntersectionType).types
          : [type];

      return types.some((t) => {
        const apparent = checker.getApparentType(t);

        // Zustand hooks are callable:
        if (apparent.getCallSignatures().length === 0) return false;

        const requiredProps = ["getState", "setState", "subscribe"] as const;
        return requiredProps.every((p) => !!apparent.getProperty(p));
      });
    }

    // ===== AST-only fallback (same-file auto-detect) =====
    const localZustandHooks = new Set<string>();
    const zustandCreateFns = new Set<string>();

    function registerZustandCreateImports(node: TSESTree.ImportDeclaration) {
      const mod = node.source.value;

      if (mod !== "zustand" && mod !== "zustand/traditional") return;

      for (const spec of node.specifiers) {
        if (spec.type === "ImportSpecifier" && isIdentifier(spec.imported)) {
          const imported = spec.imported.name;
          if (mod === "zustand" && imported === "create") {
            zustandCreateFns.add(spec.local.name);
          }
          if (
            mod === "zustand/traditional" &&
            imported === "createWithEqualityFn"
          ) {
            zustandCreateFns.add(spec.local.name);
          }
        }

        if (mod === "zustand" && spec.type === "ImportDefaultSpecifier") {
          zustandCreateFns.add(spec.local.name);
        }
      }
    }

    function isCallChainRootedInCreate(expr: TSESTree.Expression): boolean {
      const unwrapped = unwrapExpression(expr);
      if (unwrapped.type !== "CallExpression") return false;

      let callee: TSESTree.Expression = unwrapExpression(unwrapped.callee);

      while (callee.type === "CallExpression") {
        callee = unwrapExpression(callee.callee);
      }

      if (callee.type === "Identifier" && zustandCreateFns.has(callee.name)) {
        return true;
      }

      if (
        callee.type === "MemberExpression" &&
        !callee.computed &&
        callee.property.type === "Identifier" &&
        zustandCreateFns.has(callee.property.name)
      ) {
        return true;
      }

      return false;
    }

    function registerLocalHookDeclarator(node: TSESTree.VariableDeclarator) {
      if (node.id.type !== "Identifier") return;
      if (!node.init) return;

      const init = unwrapExpression(node.init);
      if (isCallChainRootedInCreate(init)) {
        localZustandHooks.add(node.id.name);
      }
    }

    function getHookLabel(callee: TSESTree.Expression): string {
      const unwrapped = unwrapExpression(callee);
      if (unwrapped.type === "Identifier") return unwrapped.name;
      return sourceCode.getText(callee);
    }

    function isZustandHookCall(node: TSESTree.CallExpression): boolean {
      const callee = unwrapExpression(node.callee);

      if (hasTypeInfo && looksLikeZustandHookType(node.callee)) return true;

      if (callee.type === "Identifier") {
        return (
          manualHooks.has(callee.name) || localZustandHooks.has(callee.name)
        );
      }

      return false;
    }

    function checkSelector(
      selector: TSESTree.Expression | undefined,
      callee: TSESTree.Expression,
      callNode: TSESTree.CallExpression,
    ) {
      const hookLabel = getHookLabel(callee);

      if (!selector) {
        context.report({
          node: callNode,
          messageId: "missingSelector",
          data: { hook: hookLabel },
        });
        return;
      }

      const sel = unwrapExpression(selector);
      if (
        sel.type !== "ArrowFunctionExpression" &&
        sel.type !== "FunctionExpression"
      ) {
        return;
      }

      const param = sel.params[0];
      if (!isIdentifier(param)) return;

      const returned = getReturnedExpression(sel);
      if (!returned) return;

      if (
        forbidIdentity &&
        returned.type === "Identifier" &&
        returned.name === param.name
      ) {
        context.report({ node: sel, messageId: "identity" });
        return;
      }

      if (
        forbidDirectSlice &&
        returned.type === "MemberExpression" &&
        !returned.computed &&
        returned.object.type === "Identifier" &&
        returned.object.name === param.name &&
        returned.property.type === "Identifier"
      ) {
        context.report({ node: sel, messageId: "directSlice" });
      }
    }

    return {
      ImportDeclaration(node) {
        if (hasTypeInfo) return;
        registerZustandCreateImports(node);
      },
      VariableDeclarator(node) {
        if (hasTypeInfo) return;
        registerLocalHookDeclarator(node);
      },
      CallExpression(node) {
        if (!isZustandHookCall(node)) return;

        const selector = node.arguments[0] as TSESTree.Expression | undefined;
        checkSelector(selector, node.callee, node);
      },
    };
  },
});
