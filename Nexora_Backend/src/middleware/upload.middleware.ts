import multer from "multer";
import path from "node:path";
import { AppError } from "./error.middleware.js";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, process.env.uploadDir as string);
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();

    cb(
      null,
      `${file.fieldname}-${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${ext}`
    );
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 20,
  },
  fileFilter(req, file, cb) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new AppError("Unsupported file type", 400));
    }

    cb(null, true);
  },
});
