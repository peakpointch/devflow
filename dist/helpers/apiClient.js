import { logger } from "../helpers/taskLogger.js";
import { assertAccessToken, getBearerHeaders } from "../helpers/auth.js";
import { getErrorCode, errorToString } from "./utils.js";
class ApiError extends Error {
  /**
   * Lower case error code
   */
  code;
  constructor(message, code) {
    super(message);
    this.name = "ApiError";
    this.code = code?.toLowerCase() || "unknown";
  }
}
class ApiClient {
  opts;
  constructor(options) {
    assertAccessToken(options.accessToken);
    this.opts = options;
  }
  get headers() {
    return {
      ...getBearerHeaders(this.opts.accessToken)
    };
  }
  get fetchOptions() {
    return {
      headers: this.headers
    };
  }
  requireData(result, errorPrefix, options) {
    const { data, error } = result;
    if (error || data === null || data === void 0) {
      throw new ApiError(
        [errorPrefix, errorToString(error)].join(" "),
        getErrorCode(error)
      );
    }
    return options?.callback && data !== null ? options.callback(data) : data;
  }
  optionalData(result, errorPrefix, options) {
    let { data, error } = result;
    if (error || data === null || data === void 0) {
      data = null;
      logger.error(errorPrefix, errorToString(error));
    }
    return options?.callback && data !== null ? options.callback(data) : data;
  }
}
export {
  ApiClient,
  ApiError
};
