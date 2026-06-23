import { Router } from "express";
import { protectUser } from "../../middleware/auth.middleware.js";
import { getUserProfile, loginUser, logoutUser, recoverUser, registerUser } from "./user.controller.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/recover", recoverUser);
router.post("/logout", logoutUser);
router.get("/me", protectUser, getUserProfile);

export default router;
