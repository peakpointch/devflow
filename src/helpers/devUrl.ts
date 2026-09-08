import type { PeakflowConfig } from "peakflow/config";

export interface DevUrlOptions {
  relativeUrls?: boolean;
}

export function getDevServerUrl(
  config: PeakflowConfig,
  path: string,
  { relativeUrls = false }: DevUrlOptions = {},
): string {
  return relativeUrls
    ? path
    : `http://localhost:${config.devServer.port}${path}`;
}
