import { Inject, Injectable } from '@nestjs/common';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository';
import {
  TOKEN_SERVICE,
  type TokenService,
} from '../../domain/ports/token.service';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository';
import { InvalidCredentialsError } from '../../domain/errors';

@Injectable()
export class RefreshSessionHandler {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokens: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new InvalidCredentialsError();
    }

    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    const stored = await this.refreshTokens.findValidByHash(tokenHash);
    if (!stored || stored.userId !== payload.sub) {
      throw new InvalidCredentialsError();
    }

    const user = await this.users.findById(stored.userId);
    if (!user || !user.isActive) {
      throw new InvalidCredentialsError();
    }

    await this.refreshTokens.revokeByHash(tokenHash);

    const pair = await this.tokens.issueForUser(
      { id: user.id, email: user.email },
      false,
    );

    await this.refreshTokens.save({
      userId: user.id,
      tokenHash: this.tokens.hashRefreshToken(pair.refreshToken),
      expiresAt: pair.refreshTokenExpiresAt,
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      ...pair,
    };
  }
}
