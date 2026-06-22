import { Router } from "express";
import { getUserProfile, loginUser, logoutUser, registerUser } from "./user.controller.js";
import { protectUser } from "../../middleware/auth.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/me", protectUser, getUserProfile);

export default router;
