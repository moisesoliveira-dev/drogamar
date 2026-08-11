import { LoginHandler } from './login.handler';
import { LoginCommand } from '../commands/login.command';
import { InvalidCredentialsError } from '../../domain/errors';
import { User } from '../../domain/user';

describe('LoginHandler', () => {
  const users = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
  };
  const passwords = {
    hash: jest.fn(),
    compare: jest.fn(),
  };
  const tokens = {
    issueForUser: jest.fn(),
    verifyAccessToken: jest.fn(),
    hashRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };
  const refreshTokens = {
    save: jest.fn(),
    findValidByHash: jest.fn(),
    revokeByHash: jest.fn(),
    revokeAllForUser: jest.fn(),
  };

  const handler = new LoginHandler(users, passwords, tokens, refreshTokens);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejeita credenciais inválidas com erro genérico', async () => {
    users.findByEmail.mockResolvedValue(null);
    passwords.compare.mockResolvedValue(false);

    await expect(
      handler.execute(new LoginCommand('a@b.com', 'x', false)),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('autentica usuário ativo e persiste refresh token', async () => {
    users.findByEmail.mockResolvedValue(
      User.rehydrate({
        id: 'u1',
        email: 'a@b.com',
        passwordHash: 'hash',
        name: 'Ana',
        status: 'ACTIVE',
      }),
    );
    passwords.compare.mockResolvedValue(true);
    tokens.issueForUser.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      accessTokenExpiresAt: new Date(),
      refreshTokenExpiresAt: new Date(),
    });
    tokens.hashRefreshToken.mockReturnValue('hashed');

    const result = await handler.execute(
      new LoginCommand('a@b.com', 'secret', true),
    );

    expect(result.user.email).toBe('a@b.com');
    expect(refreshTokens.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', tokenHash: 'hashed' }),
    );
  });
});
