import { NextFunction, Request, Response } from 'express';
import { verifyAuthToken } from '../lib/token';
import { UserModel } from '../models/user.model';
import { UserRole } from '../types/auth';

export const requireAuth = (req: Request, res: Response, next: NextFunction): Response | void => {
  const authHeader = req.header('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ message: 'Missing or invalid authorization token.' });
  }

  try {
    req.user = verifyAuthToken(token);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Session expired or invalid token.' });
  }
};

export const requireRole =
  (roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): Response | void => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ message: 'You do not have access to this resource.' });
    }
    return next();
  };

/**
 * Ensures land owners / builders are approved by an admin.
 * Reads `isApproved` from the database (not the JWT) so approval takes effect without re-login.
 */
export const requireApproved = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (user.role === 'admin') {
      next();
      return;
    }

    const dbUser = await UserModel.findOne({ googleId: user.sub }).lean();
    if (!dbUser) {
      res.status(401).json({ message: 'User not found.' });
      return;
    }

    if (!dbUser.isApproved) {
      res.status(403).json({
        message: 'Your account is pending admin approval.',
        code: 'ACCOUNT_PENDING_APPROVAL',
      });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
};

export const requireRegistrationComplete = (
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void => {
  if (!req.user?.registrationComplete) {
    return res.status(403).json({
      message: 'Complete your registration before using this feature.',
      code: 'REGISTRATION_INCOMPLETE',
    });
  }
  return next();
};
