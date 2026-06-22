// import { Router } from "express";
// import { login, logout, me, register, roleCheck } from "./auth.controller.js";
// import { authorizeRoles, requireAuth } from "../../middleware/auth.middleware.js";

// const router = Router();

// router.post("/register", register);
// router.post("/login", login);
// router.post("/logout", logout);
// router.get("/me", requireAuth, me);

// router.get("/admin", requireAuth, authorizeRoles("admin"), roleCheck);
// router.get("/user", requireAuth, authorizeRoles("admin", "user"), roleCheck);
// router.get("/contractor", requireAuth, authorizeRoles("admin", "contractor", "contracter"), roleCheck);

// export default router;
