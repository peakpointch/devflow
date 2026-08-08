import { authClient } from "./authClient.js";
import { ApiClient } from "../helpers/apiClient.js";
import { assertAccessToken } from "../helpers/auth.js";
import { capitalize } from "../helpers/utils.js";
import type { ApiClientOptions } from "../types/api.js";
import type {
  AccessTokenContext,
  AccountInfo,
  UserAccount,
} from "../types/auth.js";
import type { PickRequired } from "../types/utils.js";

export class AccountsClient extends ApiClient {
  public async list(): Promise<UserAccount[]> {
    const result = await authClient.listAccounts({
      fetchOptions: this.fetchOptions,
    });

    return this.requireData(result, "Failed to fetch accounts:");
  }

  public async accessToken(
    account: PickRequired<UserAccount, "accountId" | "providerId">,
  ): Promise<AccessTokenContext> {
    const result = await authClient.getAccessToken({
      fetchOptions: this.fetchOptions,
      providerId: account.providerId,
      accountId: account.accountId,
    });

    return this.requireData(
      result,
      `Failed to fetch ${capitalize(account.providerId)} account token:`,
      {
        callback: (data) => {
          assertAccessToken(data.accessToken);
          return data as AccessTokenContext;
        },
      },
    );
  }

  public async info(accountId: string): Promise<AccountInfo | null> {
    const result = await authClient.accountInfo({
      fetchOptions: this.fetchOptions,
      query: { accountId },
    });

    return this.optionalData(result, "Failed to fetch account info");
  }
}

export class PeakflowClient extends ApiClient {
  public accounts: AccountsClient;

  constructor(options: ApiClientOptions) {
    super(options);
    this.accounts = new AccountsClient(options);
  }
}
