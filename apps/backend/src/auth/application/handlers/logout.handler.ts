import { Inject, Injectable } from '@nestjs/common';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository';
import {
  TOKEN_SERVICE,
  type TokenService,
} from '../../domain/ports/token.service';

@Injectable()
export class LogoutHandler {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokens: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async execute(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const hash = this.tokens.hashRefreshToken(refreshToken);
      await this.refreshTokens.revokeByHash(hash);
    } catch {
      // Logout é idempotente — não vazar detalhes.
    }
  }
}
