import type { PeakflowConfig } from "peakflow/config";

export type DevUrlMode =
  | { type: "localhost" }
  | { type: "relative" }
  | { baseUrl: string; type: "base" };

export interface DevUrlOptions {
  devUrlMode?: DevUrlMode;
}

export interface DevUrlInputOptions {
  baseUrl?: string;
  relativeUrls?: boolean;
}

export function normalizeDevBaseUrl(baseUrl: string): string {
  let url: URL;

  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("--base-url must be an absolute HTTP(S) origin.");
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.href !== `${url.origin}/`
  ) {
    throw new Error("--base-url must be an absolute HTTP(S) origin.");
  }

  return url.origin;
}

export function resolveDevUrlMode({
  baseUrl,
  relativeUrls = false,
}: DevUrlInputOptions = {}): DevUrlMode {
  if (baseUrl !== undefined && relativeUrls) {
    throw new Error("--base-url cannot be used with --relative-urls.");
  }

  if (baseUrl !== undefined) {
    return { baseUrl: normalizeDevBaseUrl(baseUrl), type: "base" };
  }

  return relativeUrls ? { type: "relative" } : { type: "localhost" };
}

export function getDevServerUrl(
  config: PeakflowConfig,
  path: string,
  { devUrlMode = { type: "localhost" } }: DevUrlOptions = {},
): string {
  switch (devUrlMode.type) {
    case "relative":
      return path;
    case "base":
      return `${devUrlMode.baseUrl}${path}`;
    case "localhost":
      return `http://localhost:${config.devServer.port}${path}`;
  }
}
