import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { LoginCommand } from '../application/commands/login.command';
import { GetCurrentUserHandler } from '../application/handlers/get-current-user.handler';
import { LoginHandler } from '../application/handlers/login.handler';
import { LogoutHandler } from '../application/handlers/logout.handler';
import { RefreshSessionHandler } from '../application/handlers/refresh-session.handler';
import {
  AccountUnavailableError,
  InvalidCredentialsError,
} from '../domain/errors';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from './decorators/current-user.decorator';
import { LoginBodyDto } from './dto/login-body.dto';
import { JwtAuthGuard, REFRESH_COOKIE } from './guards/jwt-auth.guard';
import { clearAuthCookies, setAuthCookies } from './http/auth-cookies';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginHandler: LoginHandler,
    private readonly refreshHandler: RefreshSessionHandler,
    private readonly logoutHandler: LogoutHandler,
    private readonly currentUserHandler: GetCurrentUserHandler,
  ) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() body: LoginBodyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.loginHandler.execute(
        new LoginCommand(body.email, body.password, body.rememberMe ?? false),
      );

      setAuthCookies(res, result);

      return {
        user: result.user,
      };
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException({
          code: 'INVALID_CREDENTIALS',
          message: 'Não foi possível entrar. Verifique seu e-mail e senha.',
        });
      }
      if (error instanceof AccountUnavailableError) {
        throw new ForbiddenException({
          code: 'ACCOUNT_UNAVAILABLE',
          message: 'Você não possui permissão para acessar este sistema.',
        });
      }
      throw new ServiceUnavailableException({
        code: 'AUTH_UNAVAILABLE',
        message: 'Não foi possível concluir o login. Tente novamente.',
      });
    }
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!refreshToken) {
      clearAuthCookies(res);
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'Sua sessão expirou. Entre novamente.',
      });
    }

    try {
      const result = await this.refreshHandler.execute(refreshToken);
      setAuthCookies(res, result);
      return { user: result.user };
    } catch {
      clearAuthCookies(res);
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'Sua sessão expirou. Entre novamente.',
      });
    }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await this.logoutHandler.execute(refreshToken);
    clearAuthCookies(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedRequestUser) {
    const profile = await this.currentUserHandler.execute(user.id);
    if (!profile) {
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'Sua sessão expirou. Entre novamente.',
      });
    }
    return { user: profile };
  }
}
