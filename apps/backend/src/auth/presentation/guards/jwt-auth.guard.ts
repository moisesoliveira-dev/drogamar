import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { Request } from 'express';
import {
  TOKEN_SERVICE,
  type TokenService,
} from '../../domain/ports/token.service';
import type { AuthenticatedRequestUser } from '../decorators/current-user.decorator';

export const ACCESS_COOKIE = 'drogamar_access';
export const REFRESH_COOKIE = 'drogamar_refresh';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedRequestUser }>();
    const token = request.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.tokens.verifyAccessToken(token);
      request.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
