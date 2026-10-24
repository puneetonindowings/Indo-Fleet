import { getClientDetails } from '../utils/clientInfo.js';
import { sendLoginAlertEmail } from '../emailService.js';
import '../env.js';
import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { dbService } from '../supabase.js';
import { authenticateToken, AuthenticatedRequest, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

import { createRateLimiter } from '../middleware/rateLimiter.js';

const authLimiter = createRateLimiter(15 * 60 * 1000, 15, 'Too many login attempts. Please wait 15 minutes before retrying.');

import { fileDB } from '../db.js';
const DUMMY_HASH = 'scrypt:c2VjdXJpdHlzYWx0:7b49463c6c10b42c4bca28014022830ad1675276eab883ee1097ecdc9851613ea2f63ee18d7f4be47078e0ad19a7101859be615488a05c7471900bfca559ad39';


router.get('/demo-accounts', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Demo accounts listing is disabled in production.' });
    return;
  }
  const profiles = await dbService.getAllProfiles();
  res.json({ accounts: profiles });
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanPass = password.toString().replace(/\s+/g, '');

  const user = await fileDB.findUserByEmail(cleanEmail);
  if (!user || !user.password_hash) {
    await fileDB.verifyPassword(cleanPass, DUMMY_HASH).catch(() => {});
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  if (user.status !== 'active') {
    res.status(403).json({ error: 'This account has been restricted. Contact Administrator.' });
    return;
  }

  const validPassword = await fileDB.verifyPassword(cleanPass, user.password_hash);
  if (!validPassword) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      station: user.station,
      organization: user.organization
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const clientInfo = getClientDetails(req);
  if (user.email) {
    sendLoginAlertEmail(user.email, user.name, user.role, clientInfo.displayIp, clientInfo.device).catch((err) => console.error('Login alert error:', err));
  }
  await dbService.logAudit({
    user_email: user.email,
    role: user.role,
    action: 'USER_LOGIN',
    resource: 'Web Command Center GCS',
    ip_address: clientInfo.displayIp,
    severity: 'INFO'
  }).catch(() => {});

  const { password: _p, password_hash: _ph, ...safeUser } = user;

  res.json({
    message: 'Authentication successful',
    token,
    user: safeUser
  });
});

router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;

