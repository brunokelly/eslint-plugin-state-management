import zustandPreferUseShallow from "./rules/zustand-prefer-use-shallow";
import zustandRequireSelector from "./rules/zustand-require-selector";

export const rules = {
  "zustand-require-selector": zustandRequireSelector,
  "zustand-prefer-use-shallow": zustandPreferUseShallow,
};

const plugin = {
  rules,
  configs: {
    recommended: [
      {
        plugins: {
          "state-management": { rules },
        },
        rules: {
          "state-management/zustand-require-selector": "error",
          "state-management/zustand-prefer-use-shallow": "warn",
        },
      },
    ],
  },
};

export default plugin;
