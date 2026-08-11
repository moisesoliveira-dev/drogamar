import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type AuthenticatedRequestUser = {
  id: string;
  email: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedRequestUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedRequestUser }>();
    return request.user;
  },
);
