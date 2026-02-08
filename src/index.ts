import zustandPreferUseShallow from "./rules/zustand-prefer-use-shallow";
import zustandRequireSelector from "./rules/zustand-require-selector";

type RuleLevel = 0 | 1 | 2;
type RuleEntry = RuleLevel | [RuleLevel, ...unknown[]];

type FlatConfig = {
  plugins?: Record<string, { rules: Record<string, unknown> }>;
  rules?: Record<string, RuleEntry>;
};

type Plugin = {
  rules: Record<string, unknown>;
  configs?: Record<string, FlatConfig[]>;
};

export const rules = {
  "zustand-require-selector": zustandRequireSelector,
  "zustand-prefer-use-shallow": zustandPreferUseShallow,
} satisfies Record<string, unknown>;

const pluginCore = {
  rules,
};

const recommended: FlatConfig[] = [
  {
    plugins: {
      "state-management": pluginCore,
    },
    rules: {
      "state-management/zustand-require-selector": 2,
      "state-management/zustand-prefer-use-shallow": 1,
    },
  },
];

const plugin: Plugin = {
  ...pluginCore,
  configs: {
    recommended,
  },
};

export const configs = plugin.configs!;
export default plugin;
