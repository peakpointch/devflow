import { authClient } from "../cloud/authClient.js";
import logger from "../helpers/logger.js";
import {
  assertAccessToken,
  connectIntegration,
  getBearerToken,
} from "../helpers/auth.js";
import type { TokenResponse } from "../types/auth.js";
import { errorToString } from "../helpers/utils.js";

export async function authLoginAction() {
  logger.setScope("Login");

  try {
    // Check if we are already authenticated
    const accessToken = getBearerToken();
    await connectIntegration("webflow", { accessToken });
    process.exit(0);
  } catch (err) {
    // Continue with authentication
  }

  try {
    const { data, error } = await authClient.device.code({
      client_id: "peakflow-cli",
      scope: "openid profile email webflow",
    });

    if (error || !data) {
      logger.error("Error fetching device code:", error?.error_description);
      process.exit(1);
    }

    const {
      device_code,
      user_code,
      verification_uri,
      verification_uri_complete,
      interval = 5,
    } = data;

    logger.info(
      "Device Authorization in Progress",
      logger.nextLine,
      `Please visit: ${verification_uri_complete}`,
      logger.nextLine,
      `Enter code: ${logger.var(user_code)}`,
    );

    const onSuccess = async (data: TokenResponse) => {
      await connectIntegration("webflow", { accessToken: data.access_token });
    };

    await pollForToken(device_code, interval, onSuccess);
  } catch (err) {
    logger.error(errorToString(err));
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
              logger.warn(`Slowing down polling to ${logger.num(pollingInterval)}s`);
              break;
            case "access_denied":
              logger.error("Access was denied by the user");
              process.exit(1);
            case "expired_token":
              logger.error("The device code has expired. Please try again.");
              process.exit(1);
            default:
              logger.error(error.error_description);
              process.exit(1);
          }
        }
      } catch (err) {
        logger.error(errorToString(err))
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
  logger.setScope("Logout");
  logger.error("This command has not yet been implemented.");
}

export async function authStatusAction() {
  logger.setScope("Status");
  logger.error("This command has not yet been implemented.");
}
