import { authClient } from "./authClient.js";
import { ApiClient } from "../helpers/apiClient.js";
import { assertAccessToken, getBearerHeaders } from "../helpers/auth.js";
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
class AuthClient extends ApiClient {
  async deviceCode() {
    const result = await authClient.device.code({
      client_id: "peakflow-cli",
      scope: "openid profile email webflow"
    });
    return this.requireData(result, "Error fetching device code:");
  }
  async signOut(accessToken) {
    const result = await authClient.signOut({
      fetchOptions: {
        headers: {
          ...this.headers,
          ...getBearerHeaders(accessToken)
        }
      }
    });
    return this.requireData(result, "Failed to sign out");
  }
}
class PeakflowClient extends ApiClient {
  accounts;
  auth;
  constructor(options) {
    super(options);
    this.accounts = new AccountsClient(options);
    this.auth = new AuthClient(options);
  }
}
export {
  AccountsClient,
  AuthClient,
  PeakflowClient
};
