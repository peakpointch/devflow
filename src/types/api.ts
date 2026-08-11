import type { AccessToken } from "../types/auth.js";

export type ApiError = {
  code?: string | undefined;
  message?: string | undefined;
  statusCode?: number;
  statusText?: string;
};

export type ApiResponse<T> = {
  data: T | null;
  error?: ApiError | null | undefined;
};

export interface ApiClientOptions {
  accessToken?: AccessToken;
}
