import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';
import { Router, Request, Response } from 'express';
import {
  registerDeviceToken,
  unregisterDeviceToken,
  sendPushNotification,
  sendPushToUser,
  broadcastPushToPilots
} from '../firebaseService.js';

const router = Router();

router.post('/register-token', (req: Request, res: Response) => {
  const { userId, token, role } = req.body;
  if (!token) {
    res.status(400).json({ error: 'Device token is required' });
    return;
  }

  registerDeviceToken(userId || 'anonymous', token, role);
  res.json({ success: true, message: 'Device push notification token registered successfully' });
});

router.post('/unregister-token', (req: Request, res: Response) => {
  const { userId, token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'Device token is required' });
    return;
  }

  unregisterDeviceToken(userId || 'anonymous', token);
  res.json({ success: true, message: 'Device token unregistered successfully' });
});

router.post('/send-test', authenticateToken, requireRoles('admin'), async (req: AuthenticatedRequest, res: Response) => {
  const { token, userId, title, body, data } = req.body;

  if (token) {
    const success = await sendPushNotification({
      token,
      title: title || 'IndoFleet Notification',
      body: body || 'Push notification service is active and operational.',
      data: data || { type: 'test' }
    });
    res.json({ success, message: success ? 'Push delivered' : 'Push delivery failed (check logs or token)' });
    return;
  }

  if (userId) {
    const count = await sendPushToUser(
      userId,
      title || 'IndoFleet Notification',
      body || 'Direct push notification to user devices.',
      data
    );
    res.json({ success: count > 0, count, message: `Sent to ${count} devices` });
    return;
  }

  res.status(400).json({ error: 'Either token or userId is required' });
});

export default router;
