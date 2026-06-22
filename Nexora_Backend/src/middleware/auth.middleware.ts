import type { NextFunction, Request, Response } from "express";
import { findUserById } from "../features/user/user.model.js";
import type { UserRecord } from "../features/user/user.types.js";
import { verifyToken } from "../utils/jwtToken.js";

type AuthenticatedUserRequest = Request & {
  user?: UserRecord;
};

type TokenPayload = {
  id?: string;
};

const USER_TOKEN_COOKIE = "userToken";

const getAuthToken = (req: Request) => {
  let token: string | undefined;

  // Prefer HttpOnly cookie; fall back to Authorization header for non-browser clients
  if (req.cookies && req.cookies[USER_TOKEN_COOKIE]) {
    token = req.cookies[USER_TOKEN_COOKIE];
  } else if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  return token;
};

export const protectUser = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = getAuthToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route. Please login.",
      });
    }

    const decoded = verifyToken(token) as TokenPayload;

    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload. Please login again.",
      });
    }

    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please login again.",
    });
  }
};
