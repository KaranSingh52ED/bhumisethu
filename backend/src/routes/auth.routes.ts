import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { createAuthToken } from '../lib/token';
import { publicUserFromLean, tokenPayloadFromUser, validateProfilePayload } from '../lib/userAuth';
import { requireAuth, requireRegistrationComplete, requireRole } from '../middleware/auth';
import { UserModel } from '../models/user.model';
import { UserRole } from '../types/auth';

const router = Router();
const googleClient = new OAuth2Client();
const allowedSignupRoles: UserRole[] = ['builder', 'land_owner'];

router.post('/google', async (req, res) => {
  const { idToken, role } = req.body ?? {};

  if (!idToken) {
    return res.status(400).json({ message: 'idToken is required.' });
  }

  // Role is only used for the initial account creation of non-admin users.
  // If not provided (or invalid), default to land_owner; the user can correct
  // it during the registration step (PATCH /api/auth/profile).
  const resolvedRole: UserRole = allowedSignupRoles.includes(role)
    ? (role as UserRole)
    : 'land_owner';

  if (!env.googleClientId) {
    return res
      .status(500)
      .json({ message: 'GOOGLE_CLIENT_ID is missing on the backend environment.' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      return res.status(401).json({ message: 'Google token payload is invalid.' });
    }

    const normalizedEmail = payload.email.toLowerCase();

    const existingUser = await UserModel.findOne({ googleId: payload.sub }).lean();

    const updateData =
      existingUser?.role === 'admin'
        ? {
            email: normalizedEmail,
            name: payload.name ?? payload.email,
            picture: payload.picture ?? '',
            role: 'admin' as UserRole,
            isApproved: true,
          }
        : {
            email: normalizedEmail,
            name: payload.name ?? payload.email,
            picture: payload.picture ?? '',
            // Only update role for brand-new accounts; preserve existing role on re-login.
            ...(existingUser ? {} : { role: resolvedRole }),
          };

    const user = await UserModel.findOneAndUpdate(
      { googleId: payload.sub },
      {
        googleId: payload.sub,
        ...updateData,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    if (!user) {
      return res.status(500).json({ message: 'Unable to create user session.' });
    }

    const token = createAuthToken(tokenPayloadFromUser(user));

    return res.json({
      token,
      user: publicUserFromLean(user),
    });
  } catch (error) {
    return res.status(401).json({
      message: 'Google authentication failed.',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const sessionUser = req.user;
  if (!sessionUser) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = await UserModel.findOne({ googleId: sessionUser.sub }).lean();
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json({
    user: publicUserFromLean(user),
  });
});

router.patch('/profile', requireAuth, async (req, res) => {
  const sessionUser = req.user;
  if (!sessionUser) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const existing = await UserModel.findOne({ googleId: sessionUser.sub }).lean();
  if (!existing) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const isAdmin = existing.role === 'admin';
  const validated = validateProfilePayload(req.body ?? {}, { requireRole: !isAdmin });
  if (!validated.ok) {
    return res.status(400).json({ message: validated.message });
  }

  const { role: profileRole, ...profileFields } = validated.data;
  const updatePayload = isAdmin
    ? { ...profileFields, registrationComplete: true }
    : { ...profileFields, role: profileRole as UserRole, registrationComplete: true };

  const updated = await UserModel.findOneAndUpdate({ googleId: sessionUser.sub }, updatePayload, {
    new: true,
  }).lean();

  if (!updated) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const token = createAuthToken(tokenPayloadFromUser(updated));

  return res.json({
    token,
    user: publicUserFromLean(updated),
  });
});

router.get(
  '/admin/pending-users',
  requireAuth,
  requireRegistrationComplete,
  requireRole(['admin']),
  async (_req, res) => {
    const users = await UserModel.find({
      role: { $in: ['builder', 'land_owner'] },
      registrationComplete: true,
      isApproved: false,
    })
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      users: users.map((user) => publicUserFromLean(user)),
    });
  },
);

router.patch(
  '/admin/approve-user/:googleId',
  requireAuth,
  requireRegistrationComplete,
  requireRole(['admin']),
  async (req, res) => {
    const { googleId } = req.params;

    if (!googleId) {
      return res.status(400).json({ message: 'googleId is required.' });
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      { googleId },
      { isApproved: true },
      { new: true },
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({
      message: 'User approved successfully.',
      user: publicUserFromLean(updatedUser),
    });
  },
);

export { router as authRouter };
