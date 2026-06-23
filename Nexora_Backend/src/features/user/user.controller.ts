import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../middleware/error.middleware.js";
import { clearAuthCookie, setAuthCookie } from "../../utils/cookieUtils.js";
import { generateToken, verifyToken } from "../../utils/jwtToken.js";
import { createWallet, findWalletByUserId, updateWalletForUser } from "../wallet/wallet.model.js";
import { createUser, findUserByEmail, findUserById, updateUserRecoveryCredentials } from "./user.model.js";
import { serializeUser } from "./user.types.js";

type WalletBody = {
  publicKey?: string;
  publickey?: string;
  public_key?: string;
  privateKey?: string;
  privatekey?: string;
  private_key?: string;
  walletAddress?: string;
  walletaddress?: string;
  wallet_address?: string;
};

type RegisterBody = WalletBody & {
  full_name?: string;
  email?: string;
  password?: string;
};

type LoginBody = {
  email?: string;
  password?: string;
};

type RecoverBody = WalletBody & {
  email?: string;
  password?: string;
};

const USER_TOKEN_COOKIE = "userToken";

const getWalletFields = (body: WalletBody) => ({
  publicKey: body.publicKey ?? body.publickey ?? body.public_key ?? null,
  privateKey: body.privateKey ?? body.privatekey ?? body.private_key ?? null,
  walletAddress: body.walletAddress ?? body.walletaddress ?? body.wallet_address ?? null,
});

const getAuthToken = (req: Request) => {
  let token: string | undefined;

  if (req.cookies && req.cookies[USER_TOKEN_COOKIE]) {
    token = req.cookies[USER_TOKEN_COOKIE];
  } else if (req.headers.authorization?.startsWith("Bearer ")) {
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
    const { publicKey, privateKey, walletAddress } = getWalletFields(req.body);

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
    });

    const wallet = walletAddress || publicKey || privateKey
      ? await createWallet({
          userId: user.id,
          walletAddress,
          publicKey,
          privateKey,
        })
      : null;

    const token = generateToken(String(user.id));
    setAuthCookie(res, USER_TOKEN_COOKIE, token);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: serializeUser(user, wallet),
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

    const wallet = await findWalletByUserId(user.id);
    const token = generateToken(String(user.id));
    setAuthCookie(res, USER_TOKEN_COOKIE, token);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: serializeUser(user, wallet),
    });
  } catch (error) {
    next(error);
  }
};

export const recoverUser = async (
  req: Request<object, object, RecoverBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;
    const { publicKey, privateKey, walletAddress } = getWalletFields(req.body);

    if (!email || !password || !publicKey || !privateKey || !walletAddress) {
      throw new AppError("email, password, public_key, private_key, and wallet_address are required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      throw new AppError("Recovery details are invalid", 401);
    }

    const wallet = await findWalletByUserId(user.id);
    const registeredWalletAddress = wallet?.wallet_address ?? null;

    if (!registeredWalletAddress) {
      throw new AppError("No recovery wallet is registered for this account", 400);
    }

    if (registeredWalletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new AppError("Recovery details are invalid", 401);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const updatedUser = await updateUserRecoveryCredentials({
      id: user.id,
      passwordHash,
    });

    const updatedWallet = await updateWalletForUser({
      userId: user.id,
      walletAddress,
      publicKey,
      privateKey,
    });

    if (!updatedUser) {
      throw new AppError("Unable to recover account", 500);
    }

    res.json({
      success: true,
      message: "Account recovered successfully. Please login with your new password.",
      user: serializeUser(updatedUser, updatedWallet),
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

    if (!token) {
      throw new AppError("Not authorized. Please login.", 401);
    }

    let decoded: { id?: string };

    try {
      decoded = verifyToken(token) as { id?: string };
    } catch {
      throw new AppError("Invalid or expired token. Please login again.", 401);
    }

    if (!decoded.id) {
      throw new AppError("Invalid token payload", 401);
    }

    const user = await findUserById(decoded.id);

    if (!user) {
      throw new AppError("User not found. Please login again.", 401);
    }

    const wallet = await findWalletByUserId(user.id);

    res.json({
      success: true,
      user: serializeUser(user, wallet),
    });
  } catch (error) {
    next(error);
  }
};
