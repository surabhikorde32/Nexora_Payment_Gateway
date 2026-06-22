import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwtToken.js";

type AdminUser = {
  isActive: boolean;
};

type AdminRequest = Request & {
  admin?: AdminUser;
};

const protectAdmin = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    let token;

    // Prefer HttpOnly cookie; fall back to Authorization header for non-browser clients
    if (req.cookies && req.cookies.adminToken) {
      token = req.cookies.adminToken;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route. Please login as admin.",
      });
    }

    try {
      // Verify token
      verifyToken(token);

      const admin = undefined as AdminUser | undefined;
      // Get admin from token
      // const admin = await Admin.findById(decoded.id).populate('roleId').select('-password');

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Admin not found. Please login again.",
        });
      }

      if (!admin.isActive) {
        return res.status(401).json({
          success: false,
          message: "Your account has been deactivated. Please contact support.",
        });
      }

      req.admin = admin;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please login again.",
      });
    }
  } catch (error) {
    console.error("Error in admin auth middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Server error in authentication",
    });
  }
};
