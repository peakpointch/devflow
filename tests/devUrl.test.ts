import { describe, expect, test } from "@jest/globals";

import {
  normalizeDevBaseUrl,
  resolveDevUrlMode,
} from "../src/helpers/devUrl.js";

describe(normalizeDevBaseUrl.name, () => {
  test.each([
    ["https://preview.example.com", "https://preview.example.com"],
    ["https://preview.example.com/", "https://preview.example.com"],
    ["http://preview.example.com:8080/", "http://preview.example.com:8080"],
  ])("normalizes the origin %s", (input, expected) => {
    expect(normalizeDevBaseUrl(input)).toBe(expected);
  });

  test.each([
    "preview.example.com",
    "https://preview.example.com/path",
    "https://preview.example.com/?query=value",
    "https://preview.example.com/#fragment",
    "https://user:password@preview.example.com",
    "ftp://preview.example.com",
  ])("rejects %s", (input) => {
    expect(() => normalizeDevBaseUrl(input)).toThrow(
      "--base-url must be an absolute HTTP(S) origin.",
    );
  });
});

describe(resolveDevUrlMode.name, () => {
  test("uses localhost by default", () => {
    expect(resolveDevUrlMode()).toEqual({ type: "localhost" });
  });

  test("selects relative URLs", () => {
    expect(resolveDevUrlMode({ relativeUrls: true })).toEqual({
      type: "relative",
    });
  });

  test("selects and normalizes an explicit base URL", () => {
    expect(
      resolveDevUrlMode({ baseUrl: "https://preview.example.com/" }),
    ).toEqual({
      baseUrl: "https://preview.example.com",
      type: "base",
    });
  });

  test("rejects conflicting URL flags", () => {
    expect(() =>
      resolveDevUrlMode({
        baseUrl: "https://preview.example.com",
        relativeUrls: true,
      }),
    ).toThrow("--base-url cannot be used with --relative-urls.");
  });
});
