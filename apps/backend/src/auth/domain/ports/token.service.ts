export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
};

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface TokenService {
  issueForUser(
    user: { id: string; email: string },
    rememberMe: boolean,
  ): Promise<TokenPair>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;
  hashRefreshToken(token: string): string;
  verifyRefreshToken(token: string): Promise<{ sub: string }>;
}
