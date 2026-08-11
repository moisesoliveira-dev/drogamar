import type { Response } from 'express';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../guards/jwt-auth.guard';

const isProd = process.env.NODE_ENV === 'production';

export function setAuthCookies(
  res: Response,
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  },
): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    expires: tokens.accessTokenExpiresAt,
  });

  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    expires: tokens.refreshTokenExpiresAt,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
}
