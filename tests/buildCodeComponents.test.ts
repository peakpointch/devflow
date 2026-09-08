import { describe, expect, test } from "@jest/globals";
import path from "node:path";

import { getPublicPath } from "../src/buildCodeComponents.js";

const config = {
  devServer: { port: 4000 },
} as Parameters<typeof getPublicPath>[0];

describe(getPublicPath.name, () => {
  test("returns a root-relative Code Component asset path", () => {
    const projectDirectory = path.resolve("project");
    const clientDirectory = path.join(projectDirectory, "dist", "Client");

    expect(
      getPublicPath(config, projectDirectory, clientDirectory, {
        devUrlMode: { type: "relative" },
      }),
    ).toBe("/__app/dist/Client/");
  });

  test("uses localhost by default", () => {
    const projectDirectory = path.resolve("project");
    const clientDirectory = path.join(projectDirectory, "dist", "Client");

    expect(getPublicPath(config, projectDirectory, clientDirectory)).toBe(
      "http://localhost:4000/__app/dist/Client/",
    );
  });
});
