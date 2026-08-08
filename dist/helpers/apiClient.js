import logger from "../helpers/logger.js";
import { assertAccessToken, getBearerHeaders } from "../helpers/auth.js";
import { errorToString } from "./utils.js";
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
  requireData(result, errorMessage, options) {
    if (result.error || result.data === null || result.data === void 0) {
      logger.error(errorMessage, errorToString(result.error));
      result.data = null;
      process.exit(1);
    }
    return options?.callback && result.data !== null ? options.callback(result.data) : result.data;
  }
  optionalData(result, errorMessage, options) {
    if (result.error || result.data === null || result.data === void 0) {
      result.data = null;
      logger.error(errorMessage, errorToString(result.error));
    }
    return options?.callback && result.data !== null ? options.callback(result.data) : result.data;
  }
}
export {
  ApiClient
};
