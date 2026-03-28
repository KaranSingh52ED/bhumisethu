import { Router } from 'express';
import {
  requireApproved,
  requireAuth,
  requireRegistrationComplete,
  requireRole,
} from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireRegistrationComplete);

/** Land owners / builders need admin approval; admins use `/admin` without this gate. */
router.get('/builder', requireRole(['builder']), requireApproved, (req, res) => {
  return res.json({
    role: 'builder',
    welcome: `Welcome ${req.user?.name}, here is your builder dashboard.`,
  });
});

router.get('/land-owner', requireRole(['land_owner']), requireApproved, (req, res) => {
  return res.json({
    role: 'land_owner',
    welcome: `Welcome ${req.user?.name}, here is your land owner dashboard.`,
  });
});

router.get('/admin', requireRole(['admin']), (req, res) => {
  return res.json({
    role: 'admin',
    welcome: `Welcome ${req.user?.name}, here is your admin dashboard.`,
  });
});

export { router as dashboardRouter };
