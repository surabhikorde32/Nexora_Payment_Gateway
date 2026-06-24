import type { CookieOptions, Response } from "express";

const isProd = process.env.NODE_ENV === 'development';

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

const CLEAR_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'strict' : 'lax',
  path: '/',
};

export const setAuthCookie = (res: Response, name: string, token: string) => {
  res.cookie(name, token, COOKIE_OPTIONS);
};

export const clearAuthCookie = (res: Response, name: string) => {
  res.clearCookie(name, CLEAR_OPTIONS);
};


