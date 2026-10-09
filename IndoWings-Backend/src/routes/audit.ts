import { Router } from 'express';
import { dbService } from '../supabase.js';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET audit logs (Admin only)
router.get('/', authenticateToken, requireRoles('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const logs = await dbService.getAuditLogs();
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
