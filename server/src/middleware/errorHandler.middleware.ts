import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
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

  // Handle Prisma ORM Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta.target as string[]).join(', ')
        : 'field';
      res.status(409).json({
        status: 'error',
        message: `Unique constraint violated on ${target}`,
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        status: 'error',
        message: 'The requested record was not found in database',
      });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({
        status: 'error',
        message: 'Foreign key constraint violated',
      });
      return;
    }
  }

  // Handle Unknown / Internal Errors (Prevent Information Disclosure)
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    status: 'error',
    message: 'An unexpected internal error occurred. Please try again later.',
  });
};
