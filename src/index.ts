import zustandPreferUseShallow from "./rules/zustand-prefer-use-shallow";
import zustandRequireSelector from "./rules/zustand-require-selector";

export const rules = {
  "zustand-require-selector": zustandRequireSelector,
  "zustand-prefer-use-shallow": zustandPreferUseShallow,
};

const plugin = {
  rules,
};

const recommended = [
  {
    plugins: {
      "state-management": plugin as any,
    },
    rules: {
      "state-management/zustand-require-selector": 2,
      "state-management/zustand-prefer-use-shallow": 1,
    },
  },
] as any[];

export const configs = {
  recommended,
};

export default {
  ...plugin,
  configs,
} as any;
