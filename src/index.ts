import zustandRequireSelector from "./rules/zustand-require-selector";

export const rules = {
  "zustand-require-selector": zustandRequireSelector,
};

const plugin = {
  rules,
};

export const configs = {
  recommended: [
    {
      plugins: {
        "state-management": plugin,
      },
      rules: {
        "state-management/zustand-require-selector": "error",
      },
    },
  ],
};

export default plugin;
