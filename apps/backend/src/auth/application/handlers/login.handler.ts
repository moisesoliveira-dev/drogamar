import { Inject, Injectable } from '@nestjs/common';
import {
  AccountUnavailableError,
  InvalidCredentialsError,
} from '../../domain/errors';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../domain/ports/password-hasher';
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
import { LoginCommand } from '../commands/login.command';

export type LoginResult = {
  user: { id: string; email: string; name: string };
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
};

@Injectable()
export class LoginHandler {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwords: PasswordHasher,
    @Inject(TOKEN_SERVICE)
    private readonly tokens: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const email = command.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);

    // Comparação constante aproximada: sempre hash mesmo se usuário não existir
    const hashToCompare =
      user?.passwordHash ??
      '$2b$10$X5AvS6i3iFf8RDclRdvXBe3M/tpfMUh3HBvqIp8IkrmedO9d9AB96';

    const passwordMatches = await this.passwords.compare(
      command.password,
      hashToCompare,
    );

    if (!user || !passwordMatches) {
      throw new InvalidCredentialsError();
    }

    if (user.isDisabledOrBlocked) {
      throw new AccountUnavailableError();
    }

    const pair = await this.tokens.issueForUser(
      { id: user.id, email: user.email },
      command.rememberMe,
    );

    await this.refreshTokens.save({
      userId: user.id,
      tokenHash: this.tokens.hashRefreshToken(pair.refreshToken),
      expiresAt: pair.refreshTokenExpiresAt,
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      accessTokenExpiresAt: pair.accessTokenExpiresAt,
      refreshTokenExpiresAt: pair.refreshTokenExpiresAt,
    };
  }
}
