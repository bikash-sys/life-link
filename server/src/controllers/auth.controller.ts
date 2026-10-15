import { Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { userService } from '../services/user.service.js';
import { notificationService } from '../services/notification.service.js';
import { UnauthorizedError } from '../errors/appError.js';

export const registerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validated = registerSchema.parse(req.body);
    const result = await userService.register(validated);

    // Asynchronously dispatch WhatsApp welcome notification
    // Non-blocking: will never delay response, reject request, or roll back registration
    void notificationService
      .sendWelcomeNotification({
        id: result.user.id,
        fullName: result.user.fullName,
        phone: result.user.phone,
        email: result.user.email,
      })
      .catch((err) => {
        console.warn('[Auth] Notification background dispatch error:', err?.message || err);
      });

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validated = loginSchema.parse(req.body);
    const result = await userService.login(validated);

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = await userService.getUserProfile(req.user.id);

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
