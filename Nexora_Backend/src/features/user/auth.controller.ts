// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import { env } from "../../config/env.js";
// import { AppError } from "../../middleware/error.middleware.js";
// import { normalizeRole } from "../../middleware/auth.middleware.js";
// import { User } from "./auth.model.js";

// const publicRegistrationRoles = new Set(["user", "contractor"]);

// const signToken = (user) =>
//   jwt.sign(
//     {
//       sub: user._id.toString(),
//       email: user.email,
//       role: user.role,
//     },
//     env.jwtSecret,
//     { expiresIn: env.jwtExpiresIn }
//   );

// const setAccessCookie = (res, token) => {
//   res.cookie("accessToken", token, {
//     httpOnly: true,
//     signed: true,
//     sameSite: "strict",
//     secure: env.nodeEnv === "production",
//     maxAge: 7 * 24 * 60 * 60 * 1000,
//   });
// };

// const serializeUser = (user) => ({
//   id: user._id,
//   name: user.name,
//   email: user.email,
//   role: user.role,
// });

// export const register = async (req, res, next) => {
//   try {
//     const { name, email, password } = req.body;
//     const requestedRole = normalizeRole(req.body.role || "user");

//     if (!name || !email || !password) {
//       throw new AppError("Name, email, and password are required", 400);
//     }

//     if (!publicRegistrationRoles.has(requestedRole)) {
//       throw new AppError("Invalid registration role", 400);
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       throw new AppError("Email is already registered", 409);
//     }

//     const hashedPassword = await bcrypt.hash(password, 12);
//     const user = await User.create({
//       name,
//       email,
//       password: hashedPassword,
//       role: requestedRole,
//     });
//     const token = signToken(user);
//     setAccessCookie(res, token);

//     res.status(201).json({
//       success: true,
//       token,
//       user: serializeUser(user),
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// export const login = async (req, res, next) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       throw new AppError("Email and password are required", 400);
//     }

//     const user = await User.findOne({ email }).select("+password");
//     const isValidPassword = user && (await bcrypt.compare(password, user.password));

//     if (!isValidPassword) {
//       throw new AppError("Invalid email or password", 401);
//     }

//     const token = signToken(user);
//     setAccessCookie(res, token);

//     res.json({
//       success: true,
//       token,
//       user: serializeUser(user),
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// export const logout = (req, res) => {
//   res.clearCookie("accessToken");
//   res.json({ success: true });
// };

// export const me = (req, res) => {
//   res.json({ success: true, user: req.user });
// };

// export const roleCheck = (req, res) => {
//   res.json({
//     success: true,
//     message: `${req.user.role} access granted`,
//     user: req.user,
//   });
// };
