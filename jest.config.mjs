import { createDefaultEsmPreset } from "ts-jest";

const preset = createDefaultEsmPreset({
  tsconfig: {
    module: "NodeNext",
    target: "ES2022",
    isolatedModules: true,
    moduleResolution: "NodeNext",
  },
});

/** @type {import("jest").Config} **/
export default {
  ...preset,

  testEnvironment: "node",

  // Allows TypeScript source files to use imports such as "./logger.js"
  // while Jest resolves the actual "./logger.ts" source file.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
