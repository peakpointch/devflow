import { logger } from "../helpers/taskLogger.js";
import { assertAccessToken, getBearerHeaders } from "../helpers/auth.js";
import { getErrorCode, errorToString } from "./utils.js";
import type { ApiResponse, ApiClientOptions } from "../types/api.js";

export interface ReturnDataOptions<TData, TResult> {
  /**
   * A callback to transform the returned data
   */
  callback?: (data: TData) => TResult;
}

export class ApiError extends Error {
  /**
   * Lower case error code
   */
  public readonly code?: string;

  constructor(message: string, code?: string | null | undefined) {
    super(message);
    this.name = "ApiError";
    this.code = code?.toLowerCase() || "unknown";
  }
}

export abstract class ApiClient {
  protected opts: ApiClientOptions;

  constructor(options: ApiClientOptions) {
    assertAccessToken(options.accessToken);
    this.opts = options;
  }

  protected get headers() {
    return {
      ...getBearerHeaders(this.opts.accessToken),
    };
  }

  protected get fetchOptions() {
    return {
      headers: this.headers,
    };
  }

  protected requireData<TData, TResult = TData>(
    result: ApiResponse<TData>,
    errorPrefix: string,
    options?: ReturnDataOptions<TData, TResult>,
  ): TResult {
    const { data, error } = result;
    if (error || data === null || data === undefined) {
      throw new ApiError(
        [errorPrefix, errorToString(error)].join(" "),
        getErrorCode(error),
      );
    }

    return options?.callback && data !== null
      ? options.callback(data)
      : (data as TResult);
  }

  protected optionalData<TData, TResult = TData>(
    result: ApiResponse<TData>,
    errorPrefix: string,
    options?: ReturnDataOptions<TData, TResult>,
  ): TResult | null {
    let { data, error } = result;
    if (error || data === null || data === undefined) {
      data = null;
      logger.error(errorPrefix, errorToString(error));
    }

    return options?.callback && data !== null
      ? options.callback(data)
      : (data as TResult);
  }
}
