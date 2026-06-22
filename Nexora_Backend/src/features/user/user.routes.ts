import { Router } from "express";
import { getUserProfile, loginUser, logoutUser, registerUser } from "./user.controller.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/me", getUserProfile);

export default router;
