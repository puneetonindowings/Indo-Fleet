import '../env.js';
import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { dbService } from '../supabase.js';
import { authenticateToken, AuthenticatedRequest, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

import { createRateLimiter } from '../middleware/rateLimiter.js';

const authLimiter = createRateLimiter(15 * 60 * 1000, 15, 'Too many login attempts. Please wait 15 minutes before retrying.');

import { fileDB } from '../db.js';

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
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials. User not found.' });
    return;
  }

  if (user.status !== 'active') {
    res.status(403).json({ error: 'This account has been restricted. Contact Administrator.' });
    return;
  }

  if (!user.password_hash) {
    res.status(401).json({ error: 'Account credentials not provisioned. Contact Administrator.' });
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

  await dbService.logAudit({
    user_email: user.email,
    role: user.role,
    action: 'USER_LOGIN',
    resource: 'Web Command Center GCS',
    ip_address: req.ip || '127.0.0.1',
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

