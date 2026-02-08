# eslint-plugin-state-management

A small ESLint plugin focused on **state management hooks** (Zustand-first) to prevent accidental **over-subscription** and **unnecessary React re-renders**.

It provides rules to:
- enforce **granular selectors** when using store hooks (e.g. `useStore((s) => s.count)` instead of `useStore()`).
- recommend `useShallow` when selectors return **object/array literals**, which are often **unstable by reference** and can trigger extra re-renders.

---

## Table of contents

- [What is this package?](#what-is-this-package)
- [Motivation](#motivation)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Configuration](#configuration)
  - [ESLint v9+ Flat Config](#eslint-v9-flat-config)
  - [ESLint v8 legacy config (.eslintrc)](#eslint-v8-legacy-config-eslintrc)
- [Rules](#rules)
  - [`zustand-require-selector`](#zustand-require-selector)
  - [`zustand-prefer-use-shallow`](#zustand-prefer-use-shallow)
- [Understanding “unstable by reference”](#understanding-unstable-by-reference)
- [React examples (how re-renders happen)](#react-examples-how-re-renders-happen)
- [Publishing to npm](#publishing-to-npm)
- [Changelog](#changelog)
- [License](#license)

---

## What is this package?

`eslint-plugin-state-management` is an ESLint plugin that helps React teams avoid common pitfalls when using Zustand-like hooks:

1. **Subscribing to the entire store by accident** (calling `useStore()` without a selector).
2. Returning **new references** in selectors (e.g. `{ ... }` or `[ ... ]`) which can cause **extra re-renders**.

The plugin ships with:
- rules under the namespace: `state-management/*`
- an optional `recommended` config you can enable quickly

---

## Motivation

### Why selectors matter in Zustand

In Zustand, the typical usage is:

```ts
const count = useStore((s) => s.count);
```

If you do:

```ts
const store = useStore();
```

your component is effectively subscribed to **everything**. Any update anywhere in the store can trigger re-renders.

### Why `useShallow` matters

A selector like:

```ts
useStore((s) => ({ a: s.a, b: s.b }));
```

returns a **new object** every time the selector runs — even when `a` and `b` did not change. Because the returned object is a new reference, equality checks typically treat it as changed and your component may re-render more often than necessary.

Zustand provides `useShallow` to solve the common “selector returns object/array” case by applying a shallow comparison:

```ts
import { useShallow } from "zustand/react/shallow";

useStore(useShallow((s) => ({ a: s.a, b: s.b })));
```

---

## Installation

### npm
```bash
npm i -D eslint-plugin-state-management
```

### yarn
```bash
yarn add -D eslint-plugin-state-management
```

### pnpm
```bash
pnpm add -D eslint-plugin-state-management
```

**Peer dependency**: ESLint `^8 || ^9`

---

## Quick start

Enable the rules in your ESLint config.

### ESLint v9 (flat config)

`eslint.config.js` / `eslint.config.mjs`:

```js
import stateManagement from "eslint-plugin-state-management";

export default [
  {
    plugins: {
      "state-management": stateManagement,
    },
    rules: {
      "state-management/zustand-require-selector": "error",
      "state-management/zustand-prefer-use-shallow": "warn",
    },
  },
];
```

### ESLint v8 (.eslintrc)

```json
{
  "plugins": ["state-management"],
  "rules": {
    "state-management/zustand-require-selector": "error",
    "state-management/zustand-prefer-use-shallow": "warn"
  }
}
```

---

## Configuration

### ESLint v9 flat config

You can pass rule options like:

```js
import stateManagement from "eslint-plugin-state-management";

export default [
  {
    plugins: {
      "state-management": stateManagement,
    },
    rules: {
      "state-management/zustand-require-selector": ["error", {
        hooks: ["useStore", "useZustandStore"],
        forbidIdentitySelector: true,
        forbidDirectSlice: false,
      }],

      "state-management/zustand-prefer-use-shallow": ["warn", {
        hooks: ["useStore", "useZustandStore"],
        shallowHookName: "useShallow",
        checkObjectLiteral: true,
        checkArrayLiteral: true,
      }],
    },
  },
];
```

### ESLint v8 legacy config (.eslintrc)

```json
{
  "plugins": ["state-management"],
  "rules": {
    "state-management/zustand-require-selector": ["error", {
      "hooks": ["useStore", "useZustandStore"],
      "forbidIdentitySelector": true,
      "forbidDirectSlice": false
    }],
    "state-management/zustand-prefer-use-shallow": ["warn", {
      "hooks": ["useStore", "useZustandStore"],
      "shallowHookName": "useShallow",
      "checkObjectLiteral": true,
      "checkArrayLiteral": true
    }]
  }
}
```

---

## Rules

### `zustand-require-selector`

**Goal:** Prevent subscribing to the entire store and enforce granular selection.

#### ✅ Good

```ts
const count = useStore((s) => s.count);
const name = useStore((s) => s.user.name);
```

#### ❌ Bad

```ts
const store = useStore();          // missing selector
const store2 = useStore((s) => s); // identity selector (whole store)
```

#### Options

```ts
type Options = [{
  hooks?: string[];
  forbidIdentitySelector?: boolean;
  forbidDirectSlice?: boolean;
}];
```

- `hooks`: hook names that should be checked (default: `["useStore"]`)
- `forbidIdentitySelector`: reports `(s) => s` (default: `true`)
- `forbidDirectSlice`: reports `(s) => s.someSlice` (default: `false`)

> Note: `forbidDirectSlice` is a heuristic. Sometimes selecting a slice is OK if it is stable and intentionally memoized. Use it if your team prefers strictness.

---

### `zustand-prefer-use-shallow`

**Goal:** Warn when selectors return object/array literals, recommending wrapping with `useShallow`.

#### ✅ Good

```ts
import { useShallow } from "zustand/react/shallow";

const a = useStore((s) => s.a);

const picked = useStore(
  useShallow((s) => ({ a: s.a, b: s.b }))
);

const tuple = useStore(
  useShallow((s) => [s.a, s.b])
);
```

#### ❌ Bad

```ts
const picked = useStore((s) => ({ a: s.a, b: s.b }));
const tuple = useStore((s) => [s.a, s.b]);
```

#### Options

```ts
type Options = [{
  hooks?: string[];
  shallowHookName?: string;
  checkObjectLiteral?: boolean;
  checkArrayLiteral?: boolean;
}];
```

- `hooks`: which hook calls should be analyzed (default: `["useStore"]`)
- `shallowHookName`: wrapper name to detect (default: `"useShallow"`)
- `checkObjectLiteral`: warn if selector returns `{ ... }` (default: `true`)
- `checkArrayLiteral`: warn if selector returns `[ ... ]` (default: `true`)

#### What this rule *does* (and doesn’t) detect

This rule **only** warns for selectors that return **object/array literals** directly, like:

- `useStore((s) => ({ ... }))`
- `useStore((s) => [ ... ])`
- `useStore((s) => { return { ... } })`
- `useStore((s) => { return [ ... ] })`

It does **not** attempt deep/static analysis, for example it won’t flag:

```ts
useStore((s) => new Map([...]))  // also unstable by reference, but harder to detect safely
useStore((s) => buildObject(s))  // could be stable or not — depends on buildObject
```

---

## Understanding “unstable by reference”

In JavaScript, **objects and arrays are compared by reference**, not by value.

```ts
const a = { x: 1 };
const b = { x: 1 };

a === b; // false (different references)
```

So if your selector creates a new object on each run:

```ts
useStore((s) => ({ x: s.x }));
```

then the returned value is **almost always a different reference**, even when `s.x` hasn’t changed.

That can cause the hook to think “the selected value changed” and trigger a re-render (depending on the equality strategy being used).

### How `useShallow` helps

`useShallow` wraps your selector so the returned object/array is compared with a **shallow equality check** (it checks each property/index), which is usually what you intended:

```ts
useStore(useShallow((s) => ({ a: s.a, b: s.b })));
```

If `a` and `b` are the same values as last time, the shallow check treats the selection as “unchanged”, preventing unnecessary re-renders.

---

## React examples (how re-renders happen)

Consider a store:

```ts
type State = {
  a: number;
  b: number;
  incA: () => void;
  incB: () => void;
};
```

### Example 1: Object literal selector without `useShallow`

```tsx
function Component() {
  const picked = useStore((s) => ({ a: s.a, b: s.b }));

  console.log("render Component");
  return (
    <div>
      {picked.a} / {picked.b}
    </div>
  );
}
```

Even if only `incA()` runs, the selector still returns a **new object** `{ a, b }`. Without shallow equality, it may cause re-renders more often than necessary.

### Example 2: Fix using `useShallow`

```tsx
import { useShallow } from "zustand/react/shallow";

function Component() {
  const picked = useStore(
    useShallow((s) => ({ a: s.a, b: s.b }))
  );

  console.log("render Component");
  return (
    <div>
      {picked.a} / {picked.b}
    </div>
  );
}
```

Now if neither `a` nor `b` changed, the shallow comparison keeps the selection “stable”, and your component avoids redundant renders.

### Example 3: Prefer single primitive selection (when possible)

Often the simplest solution is selecting a primitive directly:

```tsx
function OnlyA() {
  const a = useStore((s) => s.a);
  return <div>{a}</div>;
}
```

This is naturally stable because numbers/strings/booleans are compared by value.

---