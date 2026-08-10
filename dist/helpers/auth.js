import { logger } from "./taskLogger.js";
import { capitalize } from "./utils.js";
import { PeakflowClient } from "../cloud/api.js";
import {
  editDotenvContent,
  editDotenvFile,
  getDotenvPath
} from "./dotenv.js";
const PEAKFLOW_ACCESS_TOKEN = "PEAKFLOW_ACCESS_TOKEN";
function isValidAccessToken(token) {
  return typeof token === "string" && /^[a-zA-Z0-9]+$/.test(token);
}
function assertAccessToken(token) {
  if (!isValidAccessToken(token)) {
    throw new TypeError(`Invalid access token`);
  }
}
function getBearerHeaders(token) {
  assertAccessToken(token);
  return {
    Authorization: `Bearer ${token}`
  };
}
function getBearerToken() {
  const token = process.env[PEAKFLOW_ACCESS_TOKEN] || "";
  assertAccessToken(token);
  return token;
}
function getTokenVarName(providerId) {
  return `${providerId.toUpperCase()}_ACCESS_TOKEN`;
}
function getIntegrationToken(providerId) {
  const token = process.env[getTokenVarName(providerId)] || "";
  assertAccessToken(token);
  return token;
}
function greetAccount(account, accountInfo) {
  if (!accountInfo) return;
  const provider = capitalize(account.providerId);
  logger.getLevel() <= 2 && console.log();
  logger.info(
    "Authorization successful!",
    logger.newLine,
    logger.nextLine,
    `Welcome to Peakflow, ${logger.var(accountInfo.user.email ?? "")}! \u{1F44B}`,
    logger.newLine,
    logger.nextLine,
    `\u2713 You are authenticated via Peakflow Cloud.`,
    logger.nextLine,
    `\u2713 Your ${logger.var(capitalize(provider))} account is connected and ready to go.`,
    logger.newLine
  );
}
function storeCredentials(credentials) {
  logger.info("Updating environment variables...");
  const dotenvPath = getDotenvPath();
  const { success, errors } = editDotenvFile(dotenvPath, credentials, {
    update: true
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
      logger.var(editDotenvContent("", credentials).content)
    );
    process.exit(1);
  }
}
function selectAccount(accounts, providerId) {
  const filteredAccounts = accounts.filter(
    (acc) => acc.providerId === providerId
  );
  const selectedAccount = filteredAccounts[0];
  if (!filteredAccounts.length || !selectedAccount) {
    logger.error(
      `Integration not found. Please connect a ${logger.var(providerId)} account in your Peakflow Cloud dashboard.`
    );
    process.exit(1);
  } else if (filteredAccounts.length > 1) {
    logger.warn(
      `You have connected multiple ${logger.var(providerId)} accounts. This feature is not supported yet. You can continue with the first account`
    );
  }
  return selectedAccount;
}
async function connectIntegration(providerId, options) {
  const cloud = new PeakflowClient(options);
  const accounts = await cloud.accounts.list();
  const selectedAccount = selectAccount(accounts, providerId);
  logger.info(`Fetching ${logger.var(capitalize(providerId))} token...`);
  const token = await cloud.accounts.accessToken(selectedAccount);
  storeCredentials({
    PEAKFLOW_ACCESS_TOKEN: options.accessToken,
    [getTokenVarName(providerId)]: token.accessToken
  });
  const accountInfo = await cloud.accounts.info(selectedAccount.accountId);
  greetAccount(selectedAccount, accountInfo);
}
export {
  PEAKFLOW_ACCESS_TOKEN,
  assertAccessToken,
  connectIntegration,
  getBearerHeaders,
  getBearerToken,
  getIntegrationToken,
  getTokenVarName,
  greetAccount,
  isValidAccessToken,
  selectAccount
};
