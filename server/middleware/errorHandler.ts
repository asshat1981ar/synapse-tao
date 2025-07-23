import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  service?: string;
  context?: any;
}

/**
 * Global error handler middleware
 * Provides consistent error responses across all endpoints
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Default to 500 server error
  const statusCode = err.statusCode || 500;
  const service = err.service || 'Unknown';
  
  // Log the error with full context
  logger.error(`[${service}] ${err.message}`, err, {
    service,
    method: req.method,
    path: req.path,
    statusCode,
    context: err.context
  });

  // Prepare error response
  const errorResponse = {
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
      service,
      timestamp: new Date().toISOString()
    },
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      context: err.context
    })
  };

  res.status(statusCode).json(errorResponse);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create a standardized error
 */
export function createError(
  message: string,
  statusCode: number = 500,
  code?: string,
  service?: string,
  context?: any
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.service = service;
  error.context = context;
  return error;
}