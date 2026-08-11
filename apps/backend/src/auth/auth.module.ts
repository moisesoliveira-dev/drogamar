import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { LoginHandler } from './application/handlers/login.handler';
import { LogoutHandler } from './application/handlers/logout.handler';
import { RefreshSessionHandler } from './application/handlers/refresh-session.handler';
import { GetCurrentUserHandler } from './application/handlers/get-current-user.handler';
import { PASSWORD_HASHER } from './domain/ports/password-hasher';
import { REFRESH_TOKEN_REPOSITORY } from './domain/ports/refresh-token.repository';
import { TOKEN_SERVICE } from './domain/ports/token.service';
import { USER_REPOSITORY } from './domain/ports/user.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/prisma-refresh-token.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    LoginHandler,
    LogoutHandler,
    RefreshSessionHandler,
    GetCurrentUserHandler,
    JwtAuthGuard,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
  ],
  exports: [JwtAuthGuard, TOKEN_SERVICE, USER_REPOSITORY],
})
export class AuthModule {}
