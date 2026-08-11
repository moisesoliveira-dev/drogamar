import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import type {
  AccessTokenPayload,
  TokenPair,
  TokenService,
} from '../../domain/ports/token.service';

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(private readonly jwt: JwtService) {}

  async issueForUser(
    user: { id: string; email: string },
    rememberMe: boolean,
  ): Promise<TokenPair> {
    const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
    const refreshExpiresIn = rememberMe
      ? (process.env.JWT_REFRESH_REMEMBER_EXPIRES_IN ?? '30d')
      : (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d');

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.accessSecret(),
        expiresIn: accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: randomBytes(16).toString('hex') },
      {
        secret: this.refreshSecret(),
        expiresIn: refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(
        Date.now() + this.parseDurationMs(accessExpiresIn),
      ),
      refreshTokenExpiresAt: new Date(
        Date.now() + this.parseDurationMs(refreshExpiresIn),
      ),
    };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const payload = await this.jwt.verifyAsync<{ sub: string; email: string }>(
      token,
      { secret: this.accessSecret() },
    );
    return { sub: payload.sub, email: payload.email };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async verifyRefreshToken(token: string): Promise<{ sub: string }> {
    const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
      secret: this.refreshSecret(),
    });
    return { sub: payload.sub };
  }

  private accessSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
    return secret;
  }

  private refreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    return secret;
  }

  private parseDurationMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) return 15 * 60 * 1000;
    const amount = Number(match[1]);
    const unit = match[2];
    const mult =
      unit === 's'
        ? 1000
        : unit === 'm'
          ? 60_000
          : unit === 'h'
            ? 3_600_000
            : 86_400_000;
    return amount * mult;
  }
}
