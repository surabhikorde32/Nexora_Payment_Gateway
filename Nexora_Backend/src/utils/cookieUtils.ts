import type { CookieOptions, Response } from "express";

const isProd = process.env.NODE_ENV === "production";
const cookieSameSite = (process.env.COOKIE_SAME_SITE || (isProd ? "none" : "lax")).toLowerCase() as CookieOptions["sameSite"];
const cookieSecure = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === "true"
  : isProd || cookieSameSite === "none";

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: cookieSameSite,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

const CLEAR_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: cookieSameSite,
  path: "/",
};

export const setAuthCookie = (res: Response, name: string, token: string) => {
  res.cookie(name, token, COOKIE_OPTIONS);
};

export const clearAuthCookie = (res: Response, name: string) => {
  res.clearCookie(name, CLEAR_OPTIONS);
};
