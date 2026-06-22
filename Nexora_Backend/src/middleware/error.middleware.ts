import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "development";
  const request = req as Request & { id?: string };

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && isProduction ? "Internal server error" : err.message,
    requestId: request.id,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
