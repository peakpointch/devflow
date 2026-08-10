import { logger } from "../helpers/taskLogger.js";
import { assertAccessToken, getBearerHeaders } from "../helpers/auth.js";
import { errorToString } from "./utils.js";
import type { ApiResponse, ApiClientOptions } from "../types/api.js";

export interface ReturnDataOptions<TData, TResult> {
  /**
   * A callback to transform the returned data
   */
  callback?: (data: TData) => TResult;
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
    errorMessage: string,
    options?: ReturnDataOptions<TData, TResult>,
  ): TResult {
    if (result.error || result.data === null || result.data === undefined) {
      throw new Error(`${errorMessage} ${errorToString(result.error)}`);
    }

    return options?.callback && result.data !== null
      ? options.callback(result.data)
      : (result.data as TResult);
  }

  protected optionalData<TData, TResult = TData>(
    result: ApiResponse<TData>,
    errorMessage: string,
    options?: ReturnDataOptions<TData, TResult>,
  ): TResult | null {
    if (result.error || result.data === null || result.data === undefined) {
      result.data = null;
      logger.error(errorMessage, errorToString(result.error));
    }

    return options?.callback && result.data !== null
      ? options.callback(result.data)
      : (result.data as TResult);
  }
}
