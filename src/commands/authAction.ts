import { authClient } from "../cloud/authClient.js";
import { authLogger } from "../helpers/taskLogger.js";
import {
  assertAccessToken,
  connectIntegration,
  isAuthorized,
  getBearerToken,
} from "../helpers/auth.js";
import { getErrorMessage, errorToString } from "../helpers/utils.js";
import type { TokenResponse } from "../types/auth.js";
import { PeakflowClient } from "../cloud/api.js";

export async function authLoginAction() {
  authLogger.setScope("Login");

  let isAlreadyAuthorized = false;

  try {
    isAlreadyAuthorized = await isAuthorized();
  } catch (err) {
    authLogger.error(
      "Could not verify your authentication status.",
      authLogger.nextLine,
      getErrorMessage(err),
    );
    process.exit(1);
  }

  if (isAlreadyAuthorized) {
    const accessToken = getBearerToken();
    await connectIntegration("webflow", { accessToken });
    process.exit(0);
  }

  try {
    const client = new PeakflowClient();
    const data = await client.auth.deviceCode();

    const {
      device_code,
      user_code,
      verification_uri,
      verification_uri_complete,
      interval = 5,
    } = data;

    authLogger.info(
      "Device Authorization in Progress",
      authLogger.nextLine,
      `Please visit: ${verification_uri_complete}`,
      authLogger.nextLine,
      `Enter code: ${authLogger.var(user_code)}`,
    );

    const onSuccess = async (data: TokenResponse) => {
      await connectIntegration("webflow", { accessToken: data.access_token });
    };

    await pollForToken(device_code, interval, onSuccess);
  } catch (err) {
    authLogger.error(errorToString(err));
    process.exit(1);
  }
}

/**
 * Poll the server for the approved access token
 */
async function pollForToken(
  deviceCode: string,
  interval: number,
  onSuccess: (data: TokenResponse) => void,
) {
  let pollingInterval = interval;

  return new Promise<void>((resolve) => {
    const poll = async () => {
      try {
        const { data, error } = await authClient.device.token({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: deviceCode,
          client_id: "peakflow-cli",
        });
        if (data?.access_token) {
          assertAccessToken(data?.access_token);
          onSuccess(data as TokenResponse);
          return resolve();
        } else if (error) {
          switch (error.error) {
            case "authorization_pending":
              // Continue polling silently
              break;
            case "slow_down":
              pollingInterval += 5;
              authLogger.warn(
                `Slowing down polling to ${authLogger.num(pollingInterval)}s`,
              );
              break;
            case "access_denied":
              authLogger.error("Access was denied by the user");
              process.exit(1);
            case "expired_token":
              authLogger.error(
                "The device code has expired. Please try again.",
              );
              process.exit(1);
            default:
              authLogger.error(error.error_description);
              process.exit(1);
          }
        }
      } catch (err) {
        authLogger.error(errorToString(err));
        process.exit(1);
      }

      // Schedule next poll
      setTimeout(poll, pollingInterval * 1000);
    };

    // Start polling
    setTimeout(poll, pollingInterval * 1000);
  });
}

export async function authLogoutAction() {
  authLogger.setScope("Logout");
  authLogger.error("This command has not yet been implemented.");
}

export async function authStatusAction() {
  authLogger.setScope("Status");

  authLogger.info("Checking authentication status...");

  try {
    getBearerToken();
  } catch {
    authLogger.warn("You are not authenticated.");
    process.exit(0);
  }

  try {
    if (!(await isAuthorized())) {
      authLogger.warn(
        "Your stored credentials have expired or are no longer valid.",
        authLogger.nextLine,
        `Run ${authLogger.var("peakflow auth login")} to authenticate again.`,
      );
      process.exit(0);
    }

    authLogger.success("You are currently authenticated via Peakflow Cloud.");
  } catch (err) {
    authLogger.error(
      "Could not verify your authentication status.",
      authLogger.nextLine,
      getErrorMessage(err),
    );
    process.exit(1);
  }
}
