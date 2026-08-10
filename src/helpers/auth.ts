import { logger } from "./taskLogger.js";
import { capitalize, isPlainObject } from "./utils.js";
import { PeakflowClient } from "../cloud/api.js";
import { ApiError } from "./apiClient.js";
import {
  DotenvVariableMap,
  editDotenvContent,
  editDotenvFile,
  getDotenvPath,
} from "./dotenv.js";
import type { ApiClientOptions } from "../types/api.js";
import type {
  AccessToken,
  AccountInfo,
  ProviderId,
  UserAccount,
} from "../types/auth.js";

export const PEAKFLOW_ACCESS_TOKEN = "PEAKFLOW_ACCESS_TOKEN" as const;

/**
 * Check if `token` is a valid `AccessToken`
 * @param token The token to check
 * @returns `true` if valid, `false` otherwise
 */
export function isValidAccessToken(
  token?: string | null | undefined,
): token is AccessToken {
  return typeof token === "string" && /^[a-zA-Z0-9]+$/.test(token);
}

/**
 * Assert that `token` is a valid `AccessToken`
 * @param token The token to assert
 */
export function assertAccessToken(
  token?: string | null | undefined,
): asserts token is AccessToken {
  if (!isValidAccessToken(token)) {
    throw new TypeError(`Invalid access token`);
  }
}

/**
 * Get the bearer authorization headers
 * @throws `Error` on an invalid token
 */
export function getBearerHeaders(token?: string | null | undefined) {
  assertAccessToken(token);
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Gets the bearer token from the .env file
 * @throws `Error` on an invalid token
 */
export function getBearerToken(): AccessToken {
  const token = process.env[PEAKFLOW_ACCESS_TOKEN] || "";
  assertAccessToken(token);
  return token;
}

/**
 * Constructs the dotenv variable name of a stored provider token
 */
export function getTokenVarName(providerId: ProviderId): string {
  return `${providerId.toUpperCase()}_ACCESS_TOKEN`;
}

/**
 * Gets an integration token from the .env file
 * @throws `Error` on an invalid token
 */
export function getIntegrationToken(providerId: ProviderId): string {
  const token = process.env[getTokenVarName(providerId)] || "";
  assertAccessToken(token);
  return token;
}

export async function isAuthorized(): Promise<boolean> {
  let accessToken: AccessToken;

  try {
    accessToken = getBearerToken();
  } catch {
    return false;
  }

  const cloud = new PeakflowClient({ accessToken });

  try {
    await cloud.accounts.list();
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.code === "unauthorized") {
      return false;
    }

    throw err;
  }
}

export function greetAccount(
  account: UserAccount,
  accountInfo: AccountInfo | null,
): void {
  if (!accountInfo) return;

  const provider = capitalize(account.providerId);

  logger.success(
    "Authorization successful!",
    logger.newLine,
    logger.nextLine,
    `Welcome to Peakflow, ${logger.var(accountInfo.user.email ?? "")}! 👋`,
    logger.newLine,
    logger.nextLine,
    `✓ You are authenticated via Peakflow Cloud.`,
    logger.nextLine,
    `✓ Your ${logger.var(capitalize(provider))} account is connected and ready to go.`,
    logger.newLine,
  );
}

function storeCredentials(credentials: DotenvVariableMap): void {
  logger.info("Updating environment variables...");

  const dotenvPath = getDotenvPath();

  const { success, errors } = editDotenvFile(dotenvPath, credentials, {
    update: true,
  });

  if (!success) {
    for (const error of errors) {
      logger.warn(error);
    }

    logger.error(
      `Something went wrong while storing the access token.`,
      logger.nextLine,
      `You can store the token manually in your .env file:`,
      logger.newLine,
      logger.nextLine,
      logger.var(editDotenvContent("", credentials).content),
    );
    process.exit(1);
  }
}

export function selectAccount(
  accounts: UserAccount[],
  providerId: ProviderId,
): UserAccount {
  const filteredAccounts = accounts.filter(
    (acc) => acc.providerId === providerId,
  );
  const selectedAccount = filteredAccounts[0];

  if (!filteredAccounts.length || !selectedAccount) {
    logger.error(
      `Integration not found. Please connect a ${logger.var(providerId)} account in your Peakflow Cloud dashboard.`,
    );
    process.exit(1);
  } else if (filteredAccounts.length > 1) {
    logger.warn(
      `You have connected multiple ${logger.var(providerId)} accounts. This feature is not supported yet. You can continue with the first account`,
    );
  }

  return selectedAccount as UserAccount;
}

export async function connectIntegration(
  providerId: ProviderId,
  options: ApiClientOptions,
) {
  const cloud = new PeakflowClient(options);
  const accounts = await cloud.accounts.list();
  const selectedAccount = selectAccount(accounts, providerId);

  logger.info(`Fetching ${logger.var(capitalize(providerId))} token...`);

  const token = await cloud.accounts.accessToken(selectedAccount);

  storeCredentials({
    PEAKFLOW_ACCESS_TOKEN: options.accessToken,
    [getTokenVarName(providerId)]: token.accessToken,
  });

  const accountInfo = await cloud.accounts.info(selectedAccount.accountId);

  greetAccount(selectedAccount, accountInfo);
}
