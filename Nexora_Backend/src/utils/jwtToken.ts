import jwt from "jsonwebtoken";

export const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRE || "7d") as jwt.SignOptions["expiresIn"],
  });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};



