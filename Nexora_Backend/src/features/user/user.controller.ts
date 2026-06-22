import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../middleware/error.middleware.js";
import { clearAuthCookie, setAuthCookie } from "../../utils/cookieUtils.js";
import { generateToken, verifyToken } from "../../utils/jwtToken.js";
import { createUser, findUserByEmail, findUserById } from "./user.model.js";
import { serializeUser } from "./user.types.js";

type RegisterBody = {
  full_name?: string;
  email?: string;
  password?: string;
  publicKey?: string;
  publickey?: string;
  public_key?: string;
  privateKey?: string;
  privatekey?: string;
  private_key?: string;
};

type LoginBody = {
  email?: string;
  password?: string;
};

const USER_TOKEN_COOKIE = "userToken";

const getAuthToken = (req: Request) => {
  let token: string | undefined;

  // Prefer HttpOnly cookie; fall back to Authorization header for non-browser clients
  if (req.cookies && req.cookies[USER_TOKEN_COOKIE]) {
    console.log("Token from cookie:", req.cookies[USER_TOKEN_COOKIE]); // Debugging line
    token = req.cookies[USER_TOKEN_COOKIE];
  } else if (req.headers.authorization?.startsWith("Bearer ")) {
    console.log("Token from header:", req.headers.authorization); // Debugging line
    token = req.headers.authorization.split(" ")[1];
  }

  return token;
};

export const registerUser = async (
  req: Request<object, object, RegisterBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { full_name, email, password } = req.body;
    const publicKey = req.body.publicKey ?? req.body.publickey ?? req.body.public_key ?? null;
    const privateKey = req.body.privateKey ?? req.body.privatekey ?? req.body.private_key ?? null;

    if (!full_name || !email || !password) {
      throw new AppError("full_name, email, and password are required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await findUserByEmail(normalizedEmail);

    if (existingUser) {
      throw new AppError("Email is already registered", 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await createUser({
      full_name: full_name.trim(),
      email: normalizedEmail,
      passwordHash,
      publicKey,
      privateKey,
    });

    const token = generateToken(String(user.id));
    setAuthCookie(res, USER_TOKEN_COOKIE, token);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (
  req: Request<object, object, LoginBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    const user = await findUserByEmail(email.trim().toLowerCase());
    const isValidPassword = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isValidPassword) {
      throw new AppError("Invalid email or password", 401);
    }

    const token = generateToken(String(user.id));
    setAuthCookie(res, USER_TOKEN_COOKIE, token);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const logoutUser = (req: Request, res: Response) => {
  clearAuthCookie(res, USER_TOKEN_COOKIE);

  res.json({
    success: true,
    message: "Logout successful",
  });
};
export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getAuthToken(req);
    console.log("Token from request:", token); // Debugging line

    if (!token) {
      throw new AppError("Not authorized. Please login.", 401);
    }

    let decoded: { id?: string };

    try {
      decoded = verifyToken(token) as { id?: string };
    } catch (error) {
      throw new AppError("Invalid or expired token. Please login again.", 401);
    }

    if (!decoded.id) {
      throw new AppError("Invalid token payload", 401);
    }

    const user = await findUserById(decoded.id);

    if (!user) {
      throw new AppError("User not found. Please login again.", 401);
    }

    res.json({
      success: true,
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
};



