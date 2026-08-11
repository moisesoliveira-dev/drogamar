export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface RefreshTokenRepository {
  save(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findValidByHash(
    tokenHash: string,
  ): Promise<{ id: string; userId: string } | null>;
  revokeByHash(tokenHash: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}
