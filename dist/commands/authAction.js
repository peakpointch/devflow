import { authClient } from "../cloud/authClient.js";
import { authLogger } from "../helpers/taskLogger.js";
import {
  assertAccessToken,
  connectIntegration,
  getBearerToken
} from "../helpers/auth.js";
import { errorToString } from "../helpers/utils.js";
async function authLoginAction() {
  authLogger.setScope("Login");
  try {
    const accessToken = getBearerToken();
    await connectIntegration("webflow", { accessToken });
    process.exit(0);
  } catch (err) {
  }
  try {
    const { data, error } = await authClient.device.code({
      client_id: "peakflow-cli",
      scope: "openid profile email webflow"
    });
    if (error || !data) {
      authLogger.error("Error fetching device code:", error?.error_description);
      process.exit(1);
    }
    const {
      device_code,
      user_code,
      verification_uri,
      verification_uri_complete,
      interval = 5
    } = data;
    authLogger.info(
      "Device Authorization in Progress",
      authLogger.nextLine,
      `Please visit: ${verification_uri_complete}`,
      authLogger.nextLine,
      `Enter code: ${authLogger.var(user_code)}`
    );
    const onSuccess = async (data2) => {
      await connectIntegration("webflow", { accessToken: data2.access_token });
    };
    await pollForToken(device_code, interval, onSuccess);
  } catch (err) {
    authLogger.error(errorToString(err));
    process.exit(1);
  }
}
async function pollForToken(deviceCode, interval, onSuccess) {
  let pollingInterval = interval;
  return new Promise((resolve) => {
    const poll = async () => {
      try {
        const { data, error } = await authClient.device.token({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: deviceCode,
          client_id: "peakflow-cli"
        });
        if (data?.access_token) {
          assertAccessToken(data?.access_token);
          onSuccess(data);
          return resolve();
        } else if (error) {
          switch (error.error) {
            case "authorization_pending":
              break;
            case "slow_down":
              pollingInterval += 5;
              authLogger.warn(`Slowing down polling to ${authLogger.num(pollingInterval)}s`);
              break;
            case "access_denied":
              authLogger.error("Access was denied by the user");
              process.exit(1);
            case "expired_token":
              authLogger.error("The device code has expired. Please try again.");
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
      setTimeout(poll, pollingInterval * 1e3);
    };
    setTimeout(poll, pollingInterval * 1e3);
  });
}
async function authLogoutAction() {
  authLogger.setScope("Logout");
  authLogger.error("This command has not yet been implemented.");
}
async function authStatusAction() {
  authLogger.setScope("Status");
  authLogger.error("This command has not yet been implemented.");
}
export {
  authLoginAction,
  authLogoutAction,
  authStatusAction
};
