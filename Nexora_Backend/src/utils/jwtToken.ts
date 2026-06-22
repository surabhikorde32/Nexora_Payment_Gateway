import jwt from "jsonwebtoken";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required in .env to create auth tokens.");
  }

  return process.env.JWT_SECRET;
};

export const generateToken = (id: string) => {
  return jwt.sign({ id }, getJwtSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE || "7d") as jwt.SignOptions["expiresIn"],
  });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};
