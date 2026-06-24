import express from "express";
import { connectDB } from "./src/config/connetDatabase.js";
// import authRoutes from "./src/features/user/auth.routes.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./src/config/swagger.js";
import { errorHandler, notFound } from "./src/middleware/error.middleware.js";
import { upload } from "./src/middleware/upload.middleware.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

const app = ex
dotenv.config();
connectDB();
// app.set("trust proxy", 1);
// app.disable("x-powered-by");

const ALLOWED_ORIGINS = [process.env.FRONTEND_URL];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, mobile apps, server-to-server)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: "PC Demo API Docs",
  }),
);

app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// app.use("/api/auth", authRoutes);

app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  // Close server and exit process
  server.close(() => process.exit(1));
});

export default app;
