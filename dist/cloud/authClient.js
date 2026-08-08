import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [deviceAuthorizationClient()]
});
export {
  authClient
};
