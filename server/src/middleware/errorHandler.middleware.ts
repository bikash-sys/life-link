import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/appError.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: formattedErrors,
    });
    return;
  }

  // Handle Known Operational AppErrors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Handle Unknown / Internal Errors (Prevent Information Disclosure)
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    status: 'error',
    message: 'An unexpected internal error occurred. Please try again later.',
  });
};
