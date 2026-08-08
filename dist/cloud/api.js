import { authClient } from "./authClient.js";
import { ApiClient } from "../helpers/apiClient.js";
import { assertAccessToken } from "../helpers/auth.js";
import { capitalize } from "../helpers/utils.js";
class AccountsClient extends ApiClient {
  async list() {
    const result = await authClient.listAccounts({
      fetchOptions: this.fetchOptions
    });
    return this.requireData(result, "Failed to fetch accounts:");
  }
  async accessToken(account) {
    const result = await authClient.getAccessToken({
      fetchOptions: this.fetchOptions,
      providerId: account.providerId,
      accountId: account.accountId
    });
    return this.requireData(
      result,
      `Failed to fetch ${capitalize(account.providerId)} account token:`,
      {
        callback: (data) => {
          assertAccessToken(data.accessToken);
          return data;
        }
      }
    );
  }
  async info(accountId) {
    const result = await authClient.accountInfo({
      fetchOptions: this.fetchOptions,
      query: { accountId }
    });
    return this.optionalData(result, "Failed to fetch account info");
  }
}
class PeakflowClient extends ApiClient {
  accounts;
  constructor(options) {
    super(options);
    this.accounts = new AccountsClient(options);
  }
}
export {
  AccountsClient,
  PeakflowClient
};
