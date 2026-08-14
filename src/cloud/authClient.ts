import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
// import { getBearerToken } from "../helpers/auth.js";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [deviceAuthorizationClient()],
});
