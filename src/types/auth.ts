import type { OAuth2UserInfo } from "better-auth";
import type { Brand } from "./utils.js";

export type AccessToken = Brand<string, "access_token">;

export type TokenResponse = {
  access_token: AccessToken;
  token_type: string;
  expires_in: number;
  scope: string;
};

export type ErrorResponse = {
  error: string;
  error_description: string;
};

export type BuiltinProviderId = "github";
export type GenericProviderId = "webflow";
export type ProviderId = BuiltinProviderId | GenericProviderId;

export type UserAccount = {
  scopes: string[];
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  providerId: ProviderId;
  accountId: string;
};

export type AccessTokenContext = {
  accessToken: AccessToken;
  accessTokenExpiresAt: Date | undefined;
  scopes: string[];
  idToken: string | undefined;
};

export type AccountInfo = {
  user: OAuth2UserInfo;
  data: Record<string, any>;
};
