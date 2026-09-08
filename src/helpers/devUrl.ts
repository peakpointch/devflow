import type { PeakflowConfig } from "peakflow/config";

export type DevUrlMode =
  | { type: "localhost" }
  | { type: "relative" }
  | { baseUrl: string; type: "base" };

export interface DevUrlOptions {
  devUrlMode?: DevUrlMode;
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
