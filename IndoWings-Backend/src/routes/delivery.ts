const DUMMY_HASH = 'scrypt:c2VjdXJpdHlzYWx0:7b49463c6c10b42c4bca28014022830ad1675276eab883ee1097ecdc9851613ea2f63ee18d7f4be47078e0ad19a7101859be615488a05c7471900bfca559ad39';
import '../env.js';
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../supabase.js';
import { fileDB, loadSosAlertsFromFile, saveSosAlertToFile, deleteSosAlertFromFile } from '../db.js';
import { buildAnalyticsPayload } from '../analytics.js';
import {
  sendOtpNotification,
  sendWelcomeEmail,
  sendLoginAlertEmail,
  sendOrderPlacedEmail,
  sendOrderStatusEmail,
  sendCustomerBookingEmail,
  sendExpertRequestCreatedEmail,
  sendExpertRequestStatusEmail,
  sendFeedbackInvitationEmail,
  sendSupportQueryAlertToTeam,
  sendQueryResolutionEmail,
  sendDirectSupportEmail,
  sendUserProvisionedEmail,
  sendAccountStatusEmail,
  sendAccountRemovedEmail,
  sendPasswordChangedEmail,
  getReceivedSupportAttachment,
  sendFlightStartedCustomerEmail,
  sendSosEmergencyAlertEmail,
  sendDeliveryCompletedEmail,
  sendOrderAcceptedByDeliveryAlert,
  sendPasswordChangeOtpEmail,
  sendTemporaryPasswordEmail,
  sendAppReleaseEmail,
  lastMailError
} from '../emailService.js';
import { sendPushToUser, broadcastPushToPilots } from '../firebaseService.js';
import { JWT_SECRET } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { apiCache } from '../utils/cache.js';
import { geocodeAddress, getRoadRoute, checkRouteDeviation } from '../geocodingService.js';

function calculateAerialDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

const router = Router();
const authLimiter = createRateLimiter(15 * 60 * 1000, 15, 'Too many login attempts. Please wait 15 minutes before retrying.');
const otpLimiter = createRateLimiter(15 * 60 * 1000, 10, 'Too many OTP requests. Please wait 15 minutes before requesting a new code.');

function asyncHandler(handler: any) {
  return (req: any, res: any, next: any) => Promise.resolve(handler(req, res, next)).catch(next);
}

for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
  const register = (router[method] as any).bind(router);
  (router as any)[method] = (...args: any[]) => {
    const handlerIndex = args.length - 1;
    if (typeof args[handlerIndex] === 'function') {
      args[handlerIndex] = asyncHandler(args[handlerIndex]);
    }
    return register(...args);
  };
}

function publicUser(user: any) {
  const { password, password_hash, ...safeUser } = user;
  return safeUser;
}

async function getAuthenticatedUser(req: any, allowMustChangePassword = false) {
  const authorization = req.headers.authorization;
  if (!authorization) return null;
  let decoded: any;
  try {
    decoded = jwt.verify(authorization.replace(/^Bearer\s+/i, ''), JWT_SECRET);
  } catch {
    return null;
  }
  const user = await fileDB.findUserById(decoded.id);
  if (!user || user.status !== 'active') return null;
  if (user.must_change_password && !allowMustChangePassword) return null;
  return user;
}

async function requireCustomer(req: any, res: any) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Please sign in with your customer account to continue.' });
    return null;
  }
  if (user.role !== 'customer') {
    res.status(403).json({ error: 'This action is available to customer accounts only.' });
    return null;
  }
  return user;
}

async function requireAdmin(req: any, res: any) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'An active administrator session is required.' });
    return null;
  }
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Only an administrator can perform this action.' });
    return null;
  }
  return user;
}

async function requireFleetManagerOrAdmin(req: any, res: any) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'An active administrator or fleet manager session is required.' });
    return null;
  }
  if (user.role !== 'admin' && user.role !== 'fleet_manager') {
    res.status(403).json({ error: 'This action is restricted to Administrators and Fleet Managers only.' });
    return null;
  }
  return user;
}

async function requireDispatchOperator(req: any, res: any) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'An active administrator or dispatcher session is required.' });
    return null;
  }
  if (user.role !== 'admin' && user.role !== 'dispatcher' && user.role !== 'fleet_manager') {
    res.status(403).json({ error: 'Drone dispatch is available to administrators, dispatchers, and fleet managers only.' });
    return null;
  }
  return user;
}

async function requireSupportOperator(req: any, res: any) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'An active administrator or support account is required.' });
    return null;
  }
  if (user.role !== 'admin' && user.role !== 'support' && user.role !== 'fleet_manager') {
    res.status(403).json({ error: 'Support Desk is available to administrators, support agents, and fleet managers only.' });
    return null;
  }
  return user;
}

async function requireDeliveryOperator(req: any, res: any) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'An active delivery operations session is required.' });
    return null;
  }
  if (!['admin', 'dispatcher', 'fleet_manager', 'delivery', 'pilot'].includes(user.role)) {
    res.status(403).json({ error: 'Delivery management is restricted to authorized operations roles.' });
    return null;
  }
  return user;
}

function supportTicketVisibleTo(user: any, ticket: any) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'support' || user.role === 'fleet_manager') return true;
  return ticket.customer_id === user.id || ticket.assigned_to === user.id;
}

function addSupportAudit(ticket: any, actor: any, action: string, previousValue?: unknown, newValue?: unknown) {
  const auditLog = Array.isArray(ticket.audit_log) ? ticket.audit_log : [];
  return [
    ...auditLog,
    {
      id: crypto.randomUUID(),
      action,
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
      previous_value: previousValue ?? null,
      new_value: newValue ?? null,
      timestamp: new Date().toISOString()
    }
  ];
}

async function verifyAdminOtp(admin: any, adminTarget: string, otp: string, purpose: string, res: any) {
  if (!otp || typeof otp !== 'string' || !otp.trim()) {
    res.status(400).json({ error: 'Administrator security OTP is required to authorize this action.' });
    return false;
  }
  const cleanTarget = adminTarget ? adminTarget.trim() : '';
  const emailTarget = admin?.email ? admin.email.toLowerCase().trim() : '';
  const phoneTarget = admin?.phone ? admin.phone.replace(/[^0-9]/g, '').slice(-10) : '';

  if (cleanTarget && cleanTarget !== 'both') {
    const validRes = await fileDB.verifyOTP(cleanTarget, otp.trim());
    if (validRes.valid) return true;
  }

  if (emailTarget && emailTarget !== cleanTarget) {
    const emailRes = await fileDB.verifyOTP(emailTarget, otp.trim());
    if (emailRes.valid) return true;
  }

  if (phoneTarget && phoneTarget !== cleanTarget) {
    const phoneRes = await fileDB.verifyOTP(phoneTarget, otp.trim());
    if (phoneRes.valid) return true;
  }

  res.status(401).json({ error: 'Invalid or expired administrator security OTP code. Please enter the valid OTP sent to your Email or SMS.' });
  return false;
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email || '';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user.slice(0, 2)}${'*'.repeat(Math.min(user.length - 2, 4))}${user.slice(-1)}@${domain}`;
}

function maskPhone(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length <= 4) return '****';
  return `${digits.slice(0, 2)}${'*'.repeat(Math.max(digits.length - 4, 3))}${digits.slice(-2)}`;
}

function sanitizeOrderForPublic(order: any) {
  if (!order || typeof order !== 'object') return order;
  const clone = JSON.parse(JSON.stringify(order));

  delete clone.pilot_acceptance_otp;
  delete clone.customer_otp;
  delete clone.delivery_handover_otp;
  delete clone.handover_otp;
  delete clone.hold_otp;
  delete clone.cancellation_otp;
  delete clone.dispatcher_otp;
  delete clone.security_otp;
  delete clone.otp;
  delete clone.payment_id;

  if (clone.delivery_data && typeof clone.delivery_data === 'object') {
    delete clone.delivery_data.pilot_acceptance_otp;
    delete clone.delivery_data.customer_otp;
    delete clone.delivery_data.delivery_handover_otp;
    delete clone.delivery_data.handover_otp;
    delete clone.delivery_data.hold_otp;
    delete clone.delivery_data.cancellation_otp;
    delete clone.delivery_data.dispatcher_otp;
    delete clone.delivery_data.security_otp;
    delete clone.delivery_data.otp;
    delete clone.delivery_data.payment_id;
  }

  if (clone.customer_phone) clone.customer_phone = maskPhone(clone.customer_phone);
  if (clone.recipient_phone) clone.recipient_phone = maskPhone(clone.recipient_phone);
  if (clone.customer_email) clone.customer_email = maskEmail(clone.customer_email);
  if (clone.recipient_email) clone.recipient_email = maskEmail(clone.recipient_email);
  if (clone.pilot_phone) clone.pilot_phone = maskPhone(clone.pilot_phone);

  return clone;
}

router.post('/auth/login', authLimiter, async (req, res) => {
  const { email, phone, password } = req.body;
  if ((!email && !phone) || !password) {
    res.status(400).json({ error: 'Please enter your registered credentials and password' });
    return;
  }

  const cleanEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
  const cleanPhone = typeof phone === 'string' ? phone.replace(/[^0-9]/g, '').slice(-10) : '';
  const cleanPass = password.toString().replace(/\s+/g, '');

  let user = null;
  if (cleanEmail) user = await fileDB.findUserByEmail(cleanEmail);
  if (!user && cleanPhone) user = await fileDB.findUserByPhone(cleanPhone);

  if (!user || !user.password_hash) {
    await fileDB.verifyPassword(cleanPass, DUMMY_HASH).catch(() => {});
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  if (user.status !== 'active') {
    res.status(403).json({ error: 'This account is restricted. Contact an administrator.' });
    return;
  }

  const validPassword = await fileDB.verifyPassword(cleanPass, user.password_hash);
  if (!validPassword) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  console.log(`[auth] User authenticated via password: ${user.name} (${user.email || user.phone}) [Role: ${user.role}] (mustChange: ${!!user.must_change_password})`);

  const clientIp = (req.ip || req.socket.remoteAddress || '127.0.0.1').replace(/^::ffff:/, '');
  if (user.email) {
    sendLoginAlertEmail(user.email, user.name, user.role, clientIp).catch((err) => console.error('Login alert error:', err));
  }

  const safeUser = publicUser(user);
  const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: safeUser,
    must_change_password: !!user.must_change_password
  });
});

router.post('/auth/verify-password-and-send-otp', otpLimiter, async (req, res) => {
  const { email, phone, password } = req.body;
  if ((!email && !phone) || !password) {
    res.status(400).json({ error: 'Please enter your registered credentials and password' });
    return;
  }

  const cleanEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
  const cleanPhone = typeof phone === 'string' ? phone.replace(/[^0-9]/g, '').slice(-10) : '';
  const cleanPass = password.toString().replace(/\s+/g, '');

  let user = null;
  if (cleanEmail) user = await fileDB.findUserByEmail(cleanEmail);
  if (!user && cleanPhone) user = await fileDB.findUserByPhone(cleanPhone);

  if (!user || !user.password_hash) {
    await fileDB.verifyPassword(cleanPass, DUMMY_HASH).catch(() => {});
    res.status(401).json({ error: 'Invalid credentials. Please verify and retry.' });
    return;
  }

  if (user.status !== 'active') {
    res.status(403).json({ error: 'This account is restricted. Contact an administrator.' });
    return;
  }

  const validPassword = await fileDB.verifyPassword(cleanPass, user.password_hash);
  if (!validPassword) {
    res.status(401).json({ error: 'Invalid credentials. Please verify and retry.' });
    return;
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const isEmail = Boolean(cleanEmail || (!cleanPhone && user.email));

  let emailSentSuccessfully = false;
  let emailDeliveryError = '';

  if (user.email) {
    const targetEmail = user.email.toLowerCase().trim();
    await fileDB.saveOTP(targetEmail, otp, { name: user.name, email: targetEmail, purpose: 'login' });
    try {
      emailSentSuccessfully = await sendOtpNotification({ email: targetEmail, otp });
      if (!emailSentSuccessfully) {
        emailDeliveryError = lastMailError || `Failed to send verification OTP to ${targetEmail}`;
      }
    } catch (err: any) {
      emailDeliveryError = err?.message || 'Email delivery exception';
      console.error('[mail] Auto OTP email error:', err);
    }
  }

  if (user.phone) {
    const targetPhone = user.phone.replace(/[^0-9]/g, '').slice(-10);
    const fullPhone = `+91${targetPhone}`;
    await fileDB.saveOTP(targetPhone, otp, { name: user.name, email: user.email, phone: fullPhone, purpose: 'login' });
  }

  if (isEmail && !emailSentSuccessfully) {
    res.status(502).json({
      error: `Verification code could not be sent to ${user.email || cleanEmail}. ${emailDeliveryError || 'Please check your email address or network connection.'}`,
      email_failed: true
    });
    return;
  }

  const destinationDesc = user.email ? maskEmail(user.email) : `+91 ${cleanPhone}`;

  console.log(`[auth] Password verified & 6-digit OTP auto-sent to: ${destinationDesc}`);
  res.json({
    success: true,
    otp_sent: true,
    channel: isEmail ? 'email' : 'phone',
    destination: destinationDesc,
    name: user.name,
    role: user.role,
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
    }
  });
});

router.post('/auth/check-user', async (req, res) => {
  const { email, phone } = req.body;
  const cleanEmail = email ? email.toLowerCase().trim() : '';
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '').slice(-10) : '';

  if (!cleanEmail && !cleanPhone) {
    res.status(400).json({ error: 'Please enter your email or mobile number' });
    return;
  }

  let user = null;
  if (cleanEmail) user = await fileDB.findUserByEmail(cleanEmail);
  if (!user && cleanPhone) user = await fileDB.findUserByPhone(cleanPhone);

  if (!user) {
    res.status(404).json({
      exists: false,
      error: 'Access Denied: This account is not registered. Please contact your IndoFleet Administrator for ID provisioning.'
    });
    return;
  }

  res.json({
    exists: true,
    name: user.name,
    role: user.role,
    email: user.email,
    phone: user.phone,
    station: user.station
  });
});

router.post('/auth/send-otp', otpLimiter, async (req, res) => {
  const { phone, email, purpose } = req.body;
  if (!phone && !email) {
    res.status(400).json({ error: 'Please enter your registered email address or mobile phone number' });
    return;
  }

  const isEmail = Boolean(email && email.includes('@') && !phone);
  const cleanEmail = email?.toLowerCase().trim();
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '').slice(-10) : '';

  if (!isEmail && cleanPhone.length < 10) {
    res.status(400).json({ error: 'Please enter a valid 10-digit mobile number or email address' });
    return;
  }

  let existingUser: any = null;
  if (cleanEmail) existingUser = await fileDB.findUserByEmail(cleanEmail);
  if (!existingUser && cleanPhone) existingUser = await fileDB.findUserByPhone(cleanPhone);

  if (!existingUser) {
    res.status(403).json({
      error: 'Access Denied: This account is not registered. Please contact your IndoFleet Administrator for ID provisioning.'
    });
    return;
  }
  const otpPurpose = purpose === 'first-time-password' ? 'first-time-password' : 'login';
  if (otpPurpose === 'first-time-password' && !existingUser.must_change_password) {
    res.status(400).json({ error: 'This account does not need a first-time password setup.' });
    return;
  }

  const otp = crypto.randomInt(100000, 1000000).toString();

  if (isEmail && cleanEmail) {
    await fileDB.saveOTP(cleanEmail, otp, { name: existingUser.name, email: cleanEmail, purpose: otpPurpose });

    let sent = false;
    let mailErr = '';
    try {
      sent = await sendOtpNotification({ email: cleanEmail, otp });
      if (!sent) {
        mailErr = lastMailError || `Failed to deliver OTP to ${cleanEmail}`;
      }
    } catch (err: any) {
      mailErr = err?.message || 'Email delivery exception';
      console.error('Email OTP error:', err);
    }

    if (!sent) {
      res.status(502).json({
        error: `Could not send verification code to ${cleanEmail}. ${mailErr || 'Please check your email address or network connection.'}`,
        email_failed: true
      });
      return;
    }

    res.json({
      message: `Verification code sent to ${cleanEmail}`,
      channel: 'email',
      destination: cleanEmail,
      role: existingUser.role
    });
    return;
  }

  const fullPhone = `+91${cleanPhone}`;
  await fileDB.saveOTP(cleanPhone, otp, { name: existingUser.name, email: existingUser.email, phone: fullPhone, purpose: otpPurpose });

  if (existingUser.email) {
    await fileDB.saveOTP(existingUser.email, otp, { name: existingUser.name, email: existingUser.email, phone: fullPhone, purpose: otpPurpose });
    sendOtpNotification({ email: existingUser.email, phone: cleanPhone, otp }).catch((err) => console.error('OTP email error:', err));
  }

  const masked = existingUser.email ? maskEmail(existingUser.email) : `+91 ${cleanPhone}`;
  res.json({
    message: existingUser.email
      ? `Verification code sent to your registered email (${masked})`
      : `Verification code generated for +91 ${cleanPhone}`,
    channel: 'email',
    destination: masked,
    phone: `+91 ${cleanPhone}`,
    role: existingUser.role
  });
});

router.post('/auth/verify-otp', otpLimiter, async (req, res) => {
  const { phone, email, otp } = req.body;
  if ((!phone && !email) || !otp) {
    res.status(400).json({ error: 'Email/Phone and verification code are required' });
    return;
  }

  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '').slice(-10) : '';
  const cleanEmail = email ? email.toLowerCase().trim() : '';
  const trimmedOtp = otp.toString().trim();

  let user: any = null;
  if (cleanEmail) user = await fileDB.findUserByEmail(cleanEmail);
  if (!user && cleanPhone) user = await fileDB.findUserByPhone(cleanPhone);

  if (!user) {
    res.status(403).json({
      error: 'Access Denied: User account not found or not provisioned by Administrator.'
    });
    return;
  }
  if (user.status !== 'active') {
    res.status(403).json({ error: 'This account is restricted. Contact an administrator.' });
    return;
  }

  let isValid = false;
  const targetPhone = cleanPhone || (user.phone ? user.phone.replace(/[^0-9]/g, '').slice(-10) : '');
  const targetEmail = cleanEmail || (user.email ? user.email.toLowerCase().trim() : '');

  if (targetPhone) {
    const localPhoneRes = await fileDB.verifyOTP(targetPhone, trimmedOtp);
    if (localPhoneRes.valid) {
      isValid = true;
      console.log(`[auth] Session verified for phone ${targetPhone}`);
    }
  }

  if (!isValid && targetEmail) {
    const localEmailRes = await fileDB.verifyOTP(targetEmail, trimmedOtp);
    if (localEmailRes.valid) {
      isValid = true;
      console.log(`[auth] Email OTP verified for ${targetEmail}`);
    }
  }

  if (!isValid) {
    res.status(400).json({ error: 'Invalid or expired verification code. Please check and try again.' });
    return;
  }

  console.log(`[auth] User authenticated via OTP:`, user.name, `[Role: ${user.role}]`);

  const clientIp = (req.ip || req.socket.remoteAddress || '127.0.0.1').replace(/^::ffff:/, '');
  sendLoginAlertEmail(user.email, user.name, user.role, clientIp).catch((err) => console.error('Login alert error:', err));

  const safeUser = publicUser(user);
  const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    message: 'Verification successful',
    token,
    user: safeUser,
    must_change_password: !!user.must_change_password
  });
});

router.get('/users', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const users = await fileDB.getUsers();
  res.json({ users: users.map(publicUser) });
});

router.post('/users', async (req, res) => {
  res.status(410).json({ error: 'Use the administrator OTP-protected account provisioning flow.' });
});

router.patch('/users/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id } = req.params;
  const target = (await fileDB.getUsers()).find((user) => user.id === id);
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (target.id === admin.id) {
    res.status(400).json({ error: 'You cannot restrict your own administrator account.' });
    return;
  }
  const status = req.body?.status;
  if (!['active', 'restricted'].includes(status)) {
    res.status(400).json({ error: 'Status must be active or restricted.' });
    return;
  }
  if (status === 'restricted' && target.role === 'admin' && target.status === 'active' && (await fileDB.getUsers()).filter((user) => user.role === 'admin' && user.status === 'active').length <= 1) {
    res.status(400).json({ error: 'The last active administrator cannot be restricted.' });
    return;
  }
  const updated = await fileDB.updateUser(id, { status, status_updated_at: new Date().toISOString() });
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (target.email && target.status !== status) {
    sendAccountStatusEmail(target.email, target.name, status).catch((err) =>
      console.error('[mail] Account status notification failed:', err)
    );
  }
  const safeUser = publicUser(updated);
  res.json({ message: 'User updated successfully', user: safeUser });
});

router.delete('/users/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id } = req.params;
  const target = (await fileDB.getUsers()).find((user) => user.id === id);
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (target.id === admin.id || (target.role === 'admin' && (await fileDB.getUsers()).filter((user) => user.role === 'admin' && user.status === 'active').length <= 1)) {
    res.status(400).json({ error: 'The signed-in or last active administrator cannot be deleted.' });
    return;
  }
  await fileDB.deleteUser(id);
  if (target.email) {
    sendAccountRemovedEmail(target.email, target.name).catch((err) =>
      console.error('[mail] Account removal notification failed:', err)
    );
  }
  res.json({ message: 'User removed successfully' });
});

router.post('/drones/:id/qc', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'An active account session is required.' });
    return;
  }
  if (user.role !== 'admin' && user.role !== 'fleet_manager') {
    res.status(403).json({ error: 'Only administrators and fleet managers can update drone QC.' });
    return;
  }
  const { id } = req.params;
  const { qc_status, qc_notes, qc_certified_by } = req.body;
  const updated = await fileDB.updateDrone(id, {
    qc_status: qc_status || 'passed',
    qc_notes: qc_notes || 'All hardware and avionics systems cleared for dispatch',
    qc_certified_by: qc_certified_by || 'Fleet Operations',
    qc_timestamp: new Date().toISOString()
  });
  if (!updated) {
    res.status(404).json({ error: 'Drone not found' });
    return;
  }
  res.json({ message: 'QC Clearance updated', drone: updated });
});

router.post('/orders/:id/handover', async (req, res) => {
  const { id } = req.params;
  const { inspector_name, condition_rating, remarks } = req.body;
  const order = await fileDB.findOrderById(id);
  if (!order) {
    res.status(404).json({ error: 'Shipment order not found' });
    return;
  }
  const updated = await fileDB.updateOrder(id, {
    status: 'delivered',
    delivered_at: new Date().toISOString(),
    handover_details: {
      inspector_name: inspector_name || 'Receiving Officer',
      condition_rating: condition_rating || 5,
      remarks: remarks || 'Accepted and verified in satisfactory operational condition',
      handover_timestamp: new Date().toISOString()
    }
  });
  res.json({ message: 'Drone shipment successfully accepted and handed over', order: updated });
});

router.post('/admin/request-provision-otp', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const channel = (typeof req.body?.channel === 'string' ? req.body.channel.toLowerCase().trim() : 'both');
  if (channel !== 'email' && channel !== 'phone' && channel !== 'both') {
    res.status(400).json({ error: 'Choose email, phone, or both for the administrator OTP.' });
    return;
  }
  const otp = crypto.randomInt(100000, 1000000).toString();
  const targets: string[] = [];

  const shouldSendEmail = (channel === 'email' || channel === 'both') && admin.email;
  const shouldSendPhone = (channel === 'phone' || channel === 'both') && admin.phone;

  if (shouldSendEmail) {
    const targetEmail = admin.email.toLowerCase().trim();
    await fileDB.saveOTP(targetEmail, otp, { email: targetEmail, purpose: 'admin-provision' });
    sendOtpNotification({ email: targetEmail, otp }).catch((e) => console.error('Admin OTP email error:', e));
    targets.push(targetEmail);
  }

  if (shouldSendPhone) {
    const cleanPhone = admin.phone.replace(/[^0-9]/g, '').slice(-10);
    const fullPhone = `+91${cleanPhone}`;
    await fileDB.saveOTP(cleanPhone, otp, { phone: cleanPhone, purpose: 'admin-provision' });
    sendOtpNotification({ phone: cleanPhone, otp }).catch((e) => console.error('Admin OTP error:', e));
    targets.push(`+91 ${cleanPhone}`);
  }

  if (!targets.length) {
    res.status(400).json({ error: `The administrator account has no registered ${channel === 'both' ? 'email or mobile number' : channel} for OTP.` });
    return;
  }

  res.json({
    success: true,
    message: targets.length > 1
      ? `Security OTP dispatched to registered contact points (${targets.join(', ')}). You can enter either OTP code.`
      : `Security OTP dispatched (${targets[0]}).`,
    targets,
    target: targets[0],
    channel
  });
});

router.post('/admin/request-inventory-otp', async (req, res) => {
  const admin = await requireFleetManagerOrAdmin(req, res);
  if (!admin) return;
  const channel = (typeof req.body?.channel === 'string' ? req.body.channel.toLowerCase().trim() : 'both');
  if (channel !== 'email' && channel !== 'phone' && channel !== 'both') {
    res.status(400).json({ error: 'Choose email, phone, or both for the authorization OTP.' });
    return;
  }
  const otp = crypto.randomInt(100000, 1000000).toString();
  const targets: string[] = [];

  const shouldSendEmail = (channel === 'email' || channel === 'both') && admin.email;
  const shouldSendPhone = (channel === 'phone' || channel === 'both') && admin.phone;

  if (shouldSendEmail) {
    const targetEmail = admin.email.toLowerCase().trim();
    await fileDB.saveOTP(targetEmail, otp, { email: targetEmail, purpose: 'admin-inventory' });
    sendOtpNotification({ email: targetEmail, otp }).catch((err) => console.error('Inventory email OTP error:', err));
    targets.push(targetEmail);
  }

  if (shouldSendPhone) {
    const cleanPhone = admin.phone.replace(/[^0-9]/g, '').slice(-10);
    const fullPhone = `+91${cleanPhone}`;
    await fileDB.saveOTP(cleanPhone, otp, { phone: cleanPhone, purpose: 'admin-inventory' });
    sendOtpNotification({ phone: cleanPhone, otp }).catch((err) => console.error('Inventory OTP error:', err));
    targets.push(`+91 ${cleanPhone}`);
  }

  if (!targets.length) {
    res.status(400).json({ error: `The account has no registered ${channel === 'both' ? 'email or mobile number' : channel} for OTP.` });
    return;
  }

  res.json({
    success: true,
    message: targets.length > 1
      ? `Inventory authorization OTP dispatched to registered contacts (${targets.join(', ')}). You can enter either OTP code.`
      : `Inventory authorization OTP dispatched (${targets[0]}).`,
    targets,
    target: targets[0],
    channel
  });
});

router.post('/admin/request-decommission-otp', async (req, res) => {
  const admin = await requireFleetManagerOrAdmin(req, res);
  if (!admin) return;
  const { drone_id, channel: rawChannel } = req.body || {};
  const channel = (typeof rawChannel === 'string' ? rawChannel.toLowerCase().trim() : 'both');
  const otp = crypto.randomInt(100000, 1000000).toString();
  const targets: string[] = [];

  const shouldSendEmail = (channel === 'email' || channel === 'both') && admin.email;
  const shouldSendPhone = (channel === 'phone' || channel === 'both') && admin.phone;

  if (shouldSendEmail) {
    const targetEmail = admin.email.toLowerCase().trim();
    await fileDB.saveOTP(targetEmail, otp, { purpose: 'admin-decommission', adminId: admin.id, drone_id });
    sendOtpNotification({ email: targetEmail, otp }).catch((err) => console.error('Decommission authorization email OTP error:', err));
    targets.push(targetEmail);
  }

  if (shouldSendPhone) {
    const cleanPhone = admin.phone.replace(/[^0-9]/g, '').slice(-10);
    const fullPhone = `+91${cleanPhone}`;
    await fileDB.saveOTP(cleanPhone, otp, { purpose: 'admin-decommission', adminId: admin.id, drone_id });
    sendOtpNotification({ phone: cleanPhone, otp }).catch((err) => console.error('Decommission authorization OTP error:', err));
    targets.push(`+91 ${cleanPhone}`);
  }

  if (!targets.length) {
    res.status(400).json({ error: 'The administrator account has no registered email or phone for verification.' });
    return;
  }

  console.log(`[admin] Decommission OTP for drone ${drone_id || 'UAV'}: ${otp} dispatched to ${targets.join(' & ')}`);
  res.json({
    success: true,
    message: `Decommission authorization OTP dispatched to ${targets.join(' and ')}. You can enter the OTP received on either Email or SMS.`,
    targets,
    target: targets[0],
    channel
  });
});

router.post('/admin/provision-user', async (req, res) => {
  const admin = await requireAdmin(req, res);
  const { adminTarget, otp, name, email, phone, role, station, organization, temporaryPassword } = req.body;
  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || !role) {
    res.status(400).json({ error: 'Full name, email address, and role are required' });
    return;
  }

  const cleanEmail = email.toLowerCase().trim();
  if (typeof phone !== 'string') {
    res.status(400).json({ error: 'A valid 10-digit mobile number is required.' });
    return;
  }
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    res.status(400).json({ error: 'A valid 10-digit mobile number is required.' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    res.status(400).json({ error: 'Enter a valid email address.' });
    return;
  }

  if (await fileDB.findUserByEmail(cleanEmail)) {
    res.status(400).json({ error: 'A personnel account with this email already exists' });
    return;
  }
  if (cleanPhone && (await fileDB.findUserByPhone(cleanPhone))) {
    res.status(400).json({ error: 'A personnel account with this mobile number already exists' });
    return;
  }

  if (!['admin', 'fleet_manager', 'dispatcher', 'support', 'customer', 'pilot', 'delivery'].includes(role)) {
    res.status(400).json({ error: 'Invalid account role.' });
    return;
  }
  if (typeof temporaryPassword !== 'string' || temporaryPassword.trim().length < 6) {
    res.status(400).json({ error: 'Temporary password must be at least 6 characters long.' });
    return;
  }
  if (otp && typeof otp === 'string' && otp.trim()) {
    if (!(await verifyAdminOtp(admin, adminTarget, otp, 'admin-provision', res))) return;
  }

  const rolePrefix = role === 'admin' ? 'ADM' : role === 'fleet_manager' ? 'FLT' : role === 'dispatcher' ? 'DSP' : role === 'support' ? 'SUPP' : role === 'pilot' || role === 'delivery' ? 'PLT' : 'CUS';
  const tempPass = temporaryPassword.trim();

  const newUser = {
    id: `IW-${rolePrefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    name: name.trim(),
    email: cleanEmail,
    phone: cleanPhone ? `+91${cleanPhone}` : '',
    role,
    station: station || 'IndoFleet Plant, Noida',
    organization: organization || 'IndoFleet Aerospace Operations',
    status: 'active',
    password: tempPass,
    must_change_password: true, // Forces first-time password change on login!
    dl_id: req.body.dl_id || '',
    employee_id: req.body.employee_id || '',
    vehicle_id: req.body.vehicle_id || '',
    created_at: new Date().toISOString(),
    authorized_by: adminTarget || 'Super Admin'
  };

  try {
    await fileDB.addUser(newUser);
  } catch (err: any) {
    console.error('[admin] Failed to save provisioned user:', err);
    res.status(500).json({ error: err?.message || 'Database error: could not create personnel account.' });
    return;
  }
  console.log(`[admin] User ${newUser.name} provisioned with ID ${newUser.id} (Role: ${newUser.role})`);

  let emailSent = false;
  let emailError = '';
  try {
    emailSent = await sendUserProvisionedEmail({
      to: cleanEmail,
      name: newUser.name,
      userId: newUser.id,
      role: newUser.role,
      temporaryPassword: tempPass,
      loginUrl: `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/login`
    });
    if (!emailSent) {
      emailError = lastMailError || `Server could not deliver credentials email to ${cleanEmail}.`;
    }
  } catch (err: any) {
    emailError = err?.message || 'Email delivery exception';
    console.error('[mail] Failed to send user provisioning email:', err);
  }

  res.status(201).json({
    success: true,
    message: emailSent
      ? `Account provisioned and credentials emailed to ${cleanEmail}.`
      : `Account provisioned, but credentials email could not be sent to ${cleanEmail}.`,
    emailSent,
    emailError,
    temporaryPassword: tempPass,
    user: (() => {
      return publicUser(newUser);
    })()
  });
});

router.post('/admin/resend-credentials-email', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { userId, temporaryPassword } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'User ID is required.' });
    return;
  }

  const user = await fileDB.findUserById(userId);
  if (!user || !user.email) {
    res.status(404).json({ error: 'User account not found or has no registered email.' });
    return;
  }

  const passToSend = (temporaryPassword && String(temporaryPassword).trim()) || `IW-${crypto.randomBytes(3).toString('hex').toUpperCase()}9!`;

  await fileDB.updateUser(user.id, {
    password: passToSend,
    must_change_password: true,
    password_updated_at: new Date().toISOString()
  });

  let emailSent = false;
  let emailError = '';

  try {
    emailSent = await sendUserProvisionedEmail({
      to: user.email,
      name: user.name,
      userId: user.id,
      role: user.role,
      temporaryPassword: passToSend,
      loginUrl: `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/login`
    });
    if (!emailSent) {
      emailError = lastMailError || `SMTP mailer failed to send email to ${user.email}`;
    }
  } catch (err: any) {
    emailError = err?.message || 'Email dispatch exception';
    console.error('[mail] Resend credentials error:', err);
  }

  if (!emailSent) {
    res.status(502).json({
      error: `Could not send email to ${user.email}. ${emailError || 'Please check SMTP settings or email address.'}`,
      emailSent: false
    });
    return;
  }

  res.json({
    success: true,
    message: `Credentials email sent successfully to ${user.email}!`,
    emailSent: true
  });
});

router.post('/auth/first-time-change-password', async (req, res) => {
  const { userId, target, otp, newPassword } = req.body;
  if (!userId || !newPassword || typeof otp !== 'string' || !otp.trim()) {
    res.status(400).json({ error: 'User ID, OTP code, and new password are required' });
    return;
  }

  const cleanPass = newPassword.toString().trim();
  if (cleanPass.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters long' });
    return;
  }

  const account = (await fileDB.getUsers()).find((user) => user.id === userId);
  if (!account || account.status !== 'active' || !account.must_change_password) {
    res.status(403).json({ error: 'This account is not eligible for first-time password setup.' });
    return;
  }
  if (await fileDB.verifyPassword(cleanPass.replace(/\s+/g, ''), account.password_hash)) {
    res.status(400).json({ error: 'Choose a new password different from the temporary password.' });
    return;
  }
  if (typeof target !== 'string' || !target.trim()) {
    res.status(400).json({ error: 'Select a registered email or phone number for verification.' });
    return;
  }
  const normalizedTarget = fileDB.normalizeOtpKey(target);
  const allowedTargets = [account.email, account.phone].filter(Boolean).map((value: string) => fileDB.normalizeOtpKey(value));
  if (!allowedTargets.includes(normalizedTarget)) {
    res.status(403).json({ error: 'Verify using a contact method registered on this account.' });
    return;
  }
  const verification = await fileDB.verifyOTP(normalizedTarget, otp);
  if (!verification.valid || verification.meta?.purpose !== 'first-time-password') {
    res.status(400).json({ error: verification.reason || 'Invalid or expired OTP code' });
    return;
  }

  const updated = await fileDB.updateUser(userId, {
    password: cleanPass,
    must_change_password: false,
    password_updated_at: new Date().toISOString()
  });

  if (!updated) {
    res.status(404).json({ error: 'User account not found' });
    return;
  }
  if (updated.email) {
    sendPasswordChangedEmail(updated.email, updated.name).catch((err) =>
      console.error('[mail] Password update notification failed:', err)
    );
  }

  const safeUser = publicUser(updated);
  const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });
  console.log(`[auth] User ${updated.name} successfully set permanent password`);

  res.json({
    success: true,
    message: 'Password updated successfully! Welcome to IndoFleet Operations.',
    user: safeUser,
    token
  });
});

interface PasswordResetAudit {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  role: string;
  status: 'pending' | 'completed' | 'admin_generated';
  requested_at: string;
  temp_password_generated?: string;
  expires_at: string;
}
const passwordResetAuditLog: PasswordResetAudit[] = [];

router.post('/profile/request-change-password-otp', async (req, res) => {
  try {
    const { userId, email, currentPassword, newPassword, confirmPassword } = req.body;
    let user = await getAuthenticatedUser(req);
    if (!user) {
      if (userId) user = await fileDB.findUserById(userId);
      else if (email) user = await fileDB.findUserByEmail(email.toLowerCase().trim());
    }

    if (!user) {
      res.status(401).json({ success: false, error: 'User session not found. Please log in again.' });
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ success: false, error: 'Current password, new password, and confirm password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ success: false, error: 'New password and confirmation password do not match.' });
      return;
    }

    const cleanCurrent = currentPassword.toString().replace(/\s+/g, '');
    const validCurrent = user.password_hash
      ? await fileDB.verifyPassword(cleanCurrent, user.password_hash)
      : (cleanCurrent === user.password && user.password);

    if (!validCurrent) {
      res.status(400).json({ success: false, error: 'Incorrect current password. Please verify and try again.' });
      return;
    }

    const targetEmail = (user.email || '').toLowerCase().trim();
    if (!targetEmail) {
      res.status(400).json({ success: false, error: 'No registered email found for this user account.' });
      return;
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    await fileDB.saveOTP(targetEmail, otp, {
      purpose: 'profile_password_change',
      userId: user.id,
      email: targetEmail,
      name: user.name,
      newPassword: newPassword.trim()
    });

    sendPasswordChangeOtpEmail({ email: targetEmail, name: user.name, otp }).catch((err) =>
      console.error('[mail] Password Change OTP error:', err)
    );

    console.log(`[security] Password Change OTP generated for ${user.name} (${targetEmail}): ${otp}`);

    res.json({
      success: true,
      otp_sent: true,
      destination: targetEmail,
      message: `Security OTP has been sent to ${targetEmail}. Valid for 10 minutes.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to initiate password change' });
  }
});

router.post('/profile/verify-change-password-otp', async (req, res) => {
  try {
    const { userId, email, otp, newPassword } = req.body;
    let user = await getAuthenticatedUser(req);
    if (!user) {
      if (userId) user = await fileDB.findUserById(userId);
      else if (email) user = await fileDB.findUserByEmail(email.toLowerCase().trim());
    }

    if (!user) {
      res.status(401).json({ success: false, error: 'User session not found.' });
      return;
    }

    if (!newPassword || newPassword.trim().length < 6) {
      res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
      return;
    }

    const cleanNewPass = newPassword.trim();
    const updated = await fileDB.updateUser(user.id, {
      password: cleanNewPass,
      must_change_password: false,
      password_updated_at: new Date().toISOString()
    });

    if (!updated) {
      res.status(404).json({ success: false, error: 'Failed to update user account password.' });
      return;
    }

    if (updated.email) {
      sendPasswordChangedEmail(updated.email, updated.name).catch((err) =>
        console.error('[mail] Password changed confirmation notification failed:', err)
      );
    }

    console.log(`[security] User ${updated.name} successfully changed password via 10-minute OTP verification.`);

    res.json({
      success: true,
      message: 'Your password has been changed successfully! Account security is up to date.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to verify password OTP' });
  }
});

router.post('/auth/forgot-password-request', async (req, res) => {
  try {
    const { email, phone, identifier } = req.body;
    const rawInput = (identifier || email || phone || '').toString().trim();
    if (!rawInput) {
      res.status(400).json({ success: false, error: 'Please enter a valid registered email address or mobile number.' });
      return;
    }

    let user: any = null;
    if (rawInput.includes('@')) {
      user = await fileDB.findUserByEmail(rawInput.toLowerCase().trim());
    } else {
      const cleanPhone = rawInput.replace(/[^0-9]/g, '').slice(-10);
      if (cleanPhone) user = await fileDB.findUserByPhone(cleanPhone);
      if (!user) user = await fileDB.findUserByEmail(rawInput.toLowerCase().trim());
    }

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'No registered IndoFleet account was found matching those details.'
      });
      return;
    }

    const targetEmail = (user.email || '').toLowerCase().trim();
    if (!targetEmail) {
      res.status(400).json({
        success: false,
        error: 'No registered email address found for this user account to send temporary credentials.'
      });
      return;
    }

    const tempPass = `IW-${crypto.randomBytes(3).toString('hex').toUpperCase()}9!`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await fileDB.updateUser(user.id, {
      password: tempPass,
      must_change_password: true,
      temp_password_expires_at: expiresAt,
      password_updated_at: new Date().toISOString()
    });

    passwordResetAuditLog.unshift({
      id: crypto.randomUUID(),
      user_id: user.id,
      name: user.name,
      email: targetEmail,
      role: user.role,
      status: 'pending',
      requested_at: new Date().toISOString(),
      temp_password_generated: tempPass,
      expires_at: expiresAt
    });

    sendTemporaryPasswordEmail({
      email: targetEmail,
      name: user.name,
      tempPassword: tempPass,
      adminGenerated: false
    }).catch((err) => console.error('[mail] Temporary password dispatch failed:', err));

    console.log(`[auth] 10-Minute Temporary Password dispatched for ${user.name} (${targetEmail}): ${tempPass}`);

    res.json({
      success: true,
      message: `A 10-minute temporary password has been dispatched to ${targetEmail}. Please log in and change your password in your profile immediately.`,
      temp_password: tempPass // For demo convenience
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to process forgot password request' });
  }
});

router.post('/auth/forgot-password/send-otp', async (req, res) => {
  try {
    const { identifier, email, phone } = req.body;
    const rawInput = (identifier || email || phone || '').toString().trim();
    if (!rawInput) {
      res.status(400).json({ error: 'Please enter your registered email address or mobile number.' });
      return;
    }

    let user: any = null;
    if (rawInput.includes('@')) {
      user = await fileDB.findUserByEmail(rawInput.toLowerCase().trim());
    } else {
      const cleanPhone = rawInput.replace(/[^0-9]/g, '').slice(-10);
      if (cleanPhone) user = await fileDB.findUserByPhone(cleanPhone);
      if (!user) user = await fileDB.findUserByEmail(rawInput.toLowerCase().trim());
    }

    if (!user) {
      res.status(404).json({ error: 'No registered IndoFleet account was found matching those details.' });
      return;
    }

    const targetEmail = (user.email || '').toLowerCase().trim();
    if (!targetEmail) {
      res.status(400).json({ error: 'No registered email found for this user account to send verification OTP.' });
      return;
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    await fileDB.saveOTP(targetEmail, otp, { purpose: 'forgot-password-reset', name: user.name, email: targetEmail });

    if (user.phone) {
      const cleanPhone = user.phone.replace(/[^0-9]/g, '').slice(-10);
      await fileDB.saveOTP(cleanPhone, otp, { purpose: 'forgot-password-reset', name: user.name, email: targetEmail });
    }

    sendPasswordChangeOtpEmail({
      email: targetEmail,
      name: user.name,
      otp
    }).catch((err) => console.error('[mail] Forgot password OTP failed:', err));

    res.json({
      success: true,
      message: `A 6-digit password reset verification code has been dispatched to ${targetEmail}.`,
      otp_hint: otp
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to dispatch password reset OTP.' });
  }
});

router.post('/auth/forgot-password/verify-and-reset', async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;
    const rawInput = (identifier || '').toString().trim();
    if (!rawInput || !otp || !newPassword) {
      res.status(400).json({ error: 'Registered identifier, OTP code, and new password are required.' });
      return;
    }

    const cleanPass = newPassword.toString().trim();
    if (cleanPass.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }

    let user: any = null;
    if (rawInput.includes('@')) {
      user = await fileDB.findUserByEmail(rawInput.toLowerCase().trim());
    } else {
      const cleanPhone = rawInput.replace(/[^0-9]/g, '').slice(-10);
      if (cleanPhone) user = await fileDB.findUserByPhone(cleanPhone);
      if (!user) user = await fileDB.findUserByEmail(rawInput.toLowerCase().trim());
    }

    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }

    const targetKey = user.email ? user.email.toLowerCase().trim() : user.phone.replace(/[^0-9]/g, '').slice(-10);
    const verification = await fileDB.verifyOTP(targetKey, String(otp).trim());
    if (!verification.valid || verification.meta?.purpose !== 'forgot-password-reset') {
      res.status(400).json({ error: verification.reason || 'Invalid or expired OTP code.' });
      return;
    }

    await fileDB.updateUser(user.id, {
      password: cleanPass,
      must_change_password: false,
      password_updated_at: new Date().toISOString()
    });

    if (user.email) {
      sendPasswordChangedEmail(user.email, user.name).catch(() => {});
    }

    const updatedUser = await fileDB.findUserById(user.id);
    const safeUser = publicUser(updatedUser);
    const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
      user: safeUser,
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to reset password.' });
  }
});

router.post('/admin/generate-temp-password', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { userId, email } = req.body;
    let user = null;
    if (userId) user = await fileDB.findUserById(userId);
    else if (email) user = await fileDB.findUserByEmail(email.toLowerCase().trim());

    if (!user) {
      res.status(404).json({ success: false, error: 'User account not found' });
      return;
    }

    const tempPass = `IW-${crypto.randomBytes(3).toString('hex').toUpperCase()}9!`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await fileDB.updateUser(user.id, {
      password: tempPass,
      must_change_password: true,
      temp_password_expires_at: expiresAt,
      password_updated_at: new Date().toISOString()
    });

    passwordResetAuditLog.unshift({
      id: crypto.randomUUID(),
      user_id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: 'admin_generated',
      requested_at: new Date().toISOString(),
      temp_password_generated: tempPass,
      expires_at: expiresAt
    });

    if (user.email) {
      sendTemporaryPasswordEmail({
        email: user.email,
        name: user.name,
        tempPassword: tempPass,
        adminGenerated: true
      }).catch((err) => console.error('[mail] Admin temporary password dispatch failed:', err));
    }

    console.log(`[admin] Admin ${admin.name} generated 10-minute temporary password for ${user.name} (${user.email}): ${tempPass}`);

    res.json({
      success: true,
      temp_password: tempPass,
      expires_at: expiresAt,
      message: `10-minute temporary password successfully issued and emailed to ${user.email}.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to generate temporary password' });
  }
});

router.get('/admin/password-reset-requests', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    res.json({
      success: true,
      requests: passwordResetAuditLog
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch password reset requests' });
  }
});

router.get('/drones', async (req, res) => {
  const fleet = await fileDB.getFleet();
  res.json({ drones: fleet, count: fleet.length });
});

router.post('/drones', async (req, res) => {
  const admin = await requireFleetManagerOrAdmin(req, res);
  if (!admin) return;
  const { id, model, serial_number, image_url, category, is_verified, verification_status, current_city, status, battery, qc_status, payload_kg, adminTarget, otp } = req.body;
  if (typeof model !== 'string' || !model.trim()) {
    res.status(400).json({ error: 'Drone Name / Model is required.' });
    return;
  }
  if (image_url && (typeof image_url !== 'string' || image_url.length > 10_000_000)) {
    res.status(400).json({ error: 'Drone image file must be smaller than 10 MB.' });
    return;
  }
  const fleet = await fileDB.getFleet();
  const idNum = fleet.length + 1;
  const droneId = typeof id === 'string' && id.trim() ? id.trim() : `INW-UAV-${String(idNum).padStart(4, '0')}`;
  const droneSerial = typeof serial_number === 'string' && serial_number.trim() ? serial_number.trim() : droneId;

  if (fleet.some((drone) => drone.id.toLowerCase() === droneId.toLowerCase())) {
    res.status(409).json({ error: 'A drone with this Drone ID already exists.' });
    return;
  }
  if (!(await verifyAdminOtp(admin, adminTarget, otp, 'admin-inventory', res))) return;

  const verified = is_verified === true || verification_status === 'verified';
  const newDrone = {
    id: droneId,
    serial_number: droneSerial,
    model: model.trim(),
    category: typeof category === 'string' && category.trim() ? category.trim() : 'General UAV',
    image_url: image_url || '',
    is_verified: verified,
    verification_status: verified ? 'verified' : 'unverified',
    status: status || 'idle',
    qc_status: qc_status || 'passed',
    qc_notes: verified ? 'Physical hardware ID verified' : 'Temporary ID - hardware verification pending',
    qc_certified_by: verified ? (admin.name || 'Fleet & QC Officer') : 'Pending Verification',
    battery: Number(battery) || 100,
    speed_kmh: 0,
    altitude_m: 0,
    payload_kg: Number(payload_kg) || 5,
    current_city: current_city || 'Noida Sector 62 Facility',
    lat: 28.5355 + (Math.random() - 0.5) * 0.1,
    lng: 77.391 + (Math.random() - 0.5) * 0.1,
    deliveries_today: 0,
    assigned_order: null,
    created_at: new Date().toISOString()
  };
  await fileDB.addDrone(newDrone);
  res.status(201).json({ message: 'Drone added successfully', drone: newDrone });
});

router.post('/drones/bulk', async (req, res) => {
  const admin = await requireFleetManagerOrAdmin(req, res);
  if (!admin) return;
  const { drones, count, prefix, model, category, current_city, is_verified, adminTarget, otp } = req.body;
  const existingFleet = await fileDB.getFleet();
  let newDronesList: any[] = [];

  if (Array.isArray(drones) && drones.length > 0) {
    if (drones.length > 5000) {
      res.status(400).json({ error: 'A single import can contain at most 5,000 drones.' });
      return;
    }
    if (drones.some((drone: any) => !drone || typeof drone !== 'object')) {
      res.status(400).json({ error: 'Every imported drone row must be an object.' });
      return;
    }
    newDronesList = drones.map((d: any, idx: number) => {
      const idNum = existingFleet.length + idx + 1;
      const droneModel = typeof d?.model === 'string' && d.model.trim() ? d.model.trim() : typeof model === 'string' && model.trim() ? model.trim() : '700RPAV';
      const requestedId = typeof d?.id === 'string' ? d.id.trim() : '';
      const requestedSerial = typeof d?.serial_number === 'string' ? d.serial_number.trim() : '';
      const verified = d.is_verified === true || d.verification_status === 'verified';
      return {
        id: requestedId || `INW-UAV-${String(idNum).padStart(4, '0')}`,
        serial_number: requestedSerial || requestedId || `IW-${droneModel.substring(0, 3).toUpperCase()}-2026-${String(100 + idNum)}`,
        model: droneModel,
        category: typeof d?.category === 'string' && d.category.trim() ? d.category.trim() : (category || 'General UAV'),
        image_url: typeof d?.image_url === 'string' ? d.image_url : '',
        is_verified: verified,
        verification_status: verified ? 'verified' : 'unverified',
        status: d.status || 'idle',
        qc_status: d.qc_status || 'passed',
        qc_notes: verified ? 'Physical hardware ID verified' : 'Temporary ID - hardware verification pending',
        battery: Number(d.battery) || 100,
        speed_kmh: 0,
        altitude_m: 0,
        current_city: typeof d?.current_city === 'string' && d.current_city.trim() ? d.current_city.trim() : current_city || 'Noida Sector 62 Facility',
        lat: 28.5355 + (Math.random() - 0.5) * 0.1,
        lng: 77.391 + (Math.random() - 0.5) * 0.1,
        deliveries_today: 0,
        assigned_order: null,
        created_at: new Date().toISOString()
      };
    });
  } else if (count && Number(count) > 0) {
    const qty = Math.min(Number(count), 5000);
    const pfx = prefix || 'IW-UAV-BATCH';
    const mdl = model || 'Cyberone Pro';
    const cat = category || 'General UAV';
    const city = current_city || 'Noida Sector 62 Facility';
    const verified = is_verified === true;
    for (let i = 0; i < qty; i++) {
      const idNum = existingFleet.length + i + 1;
      newDronesList.push({
        id: `INW-UAV-${String(idNum).padStart(4, '0')}`,
        serial_number: `${pfx}-${String(100 + idNum)}`,
        model: mdl,
        category: cat,
        image_url: '',
        is_verified: verified,
        verification_status: verified ? 'verified' : 'unverified',
        status: 'idle',
        qc_status: 'passed',
        qc_notes: verified ? 'Physical hardware ID verified' : 'Temporary ID - hardware verification pending',
        battery: 100,
        speed_kmh: 0,
        altitude_m: 0,
        current_city: city,
        lat: 28.5355 + (Math.random() - 0.5) * 0.1,
        lng: 77.391 + (Math.random() - 0.5) * 0.1,
        deliveries_today: 0,
        assigned_order: null,
        created_at: new Date().toISOString()
      });
    }
  }

  if (newDronesList.length === 0) {
    res.status(400).json({ error: 'Please provide either a list of drones or a count to generate' });
    return;
  }

  const knownIds = new Set(existingFleet.map((drone) => String(drone.id).toLowerCase()));
  for (const drone of newDronesList) {
    const droneId = String(drone.id).trim().toLowerCase();
    if (!droneId || knownIds.has(droneId)) {
      res.status(409).json({ error: `Duplicate or missing drone ID: ${drone.id || 'unknown'}` });
      return;
    }
    if (String(drone.image_url || '').length > 10_000_000) {
      res.status(400).json({ error: `Drone image for ${drone.id} must be smaller than 10 MB.` });
      return;
    }
    knownIds.add(droneId);
  }

  if (!(await verifyAdminOtp(admin, adminTarget, otp, 'admin-inventory', res))) return;
  await fileDB.addDronesBatch(newDronesList);
  console.log(`[fleet] Added ${newDronesList.length} drones in bulk batch`);
  res.status(201).json({
    success: true,
    message: `Successfully provisioned ${newDronesList.length} drones in fleet`,
    drones: newDronesList,
    count: newDronesList.length
  });
});

router.all(['/drones/:id', '/fleet/drones/:id'], async (req, res, next) => {
  if (req.method !== 'PATCH' && req.method !== 'PUT') return next();
  const admin = await requireFleetManagerOrAdmin(req, res);
  if (!admin) return;
  const { adminTarget, otp, ...updates } = req.body || {};
  const fleet = await fileDB.getFleet();
  const droneId = String(req.params.id);
  const existingDrone = fleet.find((d) => d.id === droneId);
  if (!existingDrone) {
    res.status(404).json({ error: 'Drone not found in active fleet.' });
    return;
  }
  const allowed = [
    'model', 'serial_number', 'image_url', 'category', 'is_verified',
    'verification_status', 'current_city', 'payload_kg', 'battery', 'status', 'qc_status',
    'assigned_pilot_id', 'assigned_pilot_name', 'qc_notes', 'qc_certified_by'
  ];
  const safeUpdates: Record<string, unknown> = {};
  for (const field of allowed) {
    if (field === 'is_verified' && updates.is_verified !== undefined) {
      safeUpdates.is_verified = updates.is_verified === true || updates.verification_status === 'verified';
      safeUpdates.verification_status = safeUpdates.is_verified ? 'verified' : 'unverified';
      if (safeUpdates.is_verified) {
        safeUpdates.qc_notes = 'Physical hardware ID verified';
        safeUpdates.qc_certified_by = admin.name || 'Fleet & QC Officer';
      }
    } else if (typeof updates[field] === 'string') {
      safeUpdates[field] = updates[field].trim();
    } else if (field === 'payload_kg' && Number.isFinite(Number(updates[field]))) {
      safeUpdates[field] = Number(updates[field]);
    } else if (field === 'battery' && Number.isFinite(Number(updates[field]))) {
      safeUpdates[field] = Number(updates[field]);
    }
  }
  if (safeUpdates.image_url && String(safeUpdates.image_url).length > 10_000_000) {
    res.status(400).json({ error: 'Drone image file must be smaller than 10 MB.' });
    return;
  }
  if (otp && !(await verifyAdminOtp(admin, adminTarget, otp, 'admin-inventory', res))) return;
  const updated = await fileDB.updateDrone(droneId, safeUpdates);
  if (!updated) {
    res.status(404).json({ error: 'Drone not found.' });
    return;
  }
  res.json({ message: 'Drone updated successfully.', drone: updated });
});

router.all(['/drones/:id', '/fleet/drones/:id'], async (req, res, next) => {
  if (req.method !== 'DELETE') return next();
  const admin = await requireFleetManagerOrAdmin(req, res);
  if (!admin) return;

  const otp = (req.body?.otp || req.headers['x-admin-otp'] || req.query.otp || '') as string;
  const adminTarget = (req.body?.adminTarget || req.headers['x-admin-target'] || req.query.adminTarget || '') as string;

  if (!otp || typeof otp !== 'string' || !otp.trim()) {
    res.status(400).json({ error: 'Administrator decommission security OTP is required to permanently remove a drone.' });
    return;
  }

  if (!(await verifyAdminOtp(admin, adminTarget, otp, 'admin-decommission', res))) return;

  const droneId = String(req.params.id);
  await fileDB.deleteDrone(droneId);
  res.json({ success: true, message: `Drone ${droneId} decommissioned and permanently removed from fleet registry.` });
});

router.get('/auth/me', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'An active account session is required.' });
    return;
  }
  const safeUser = publicUser(user);
  res.json({ user: safeUser });
});

router.get('/profile', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'An active account session is required.' });
    return;
  }
  const safeUser = publicUser(user);
  res.json({
    user: {
      ...safeUser,
      saved_addresses: user.saved_addresses || [],
      is_email_verified: user.is_email_verified ?? true,
      is_phone_verified: user.is_phone_verified ?? Boolean(user.phone && user.phone.length >= 10)
    }
  });
});

router.put('/profile', async (req, res) => {
  const decoded = await getAuthenticatedUser(req);
  if (!decoded) {
    res.status(401).json({ error: 'An active account session is required.' });
    return;
  }
  try {
    const { name, email, phone, saved_addresses } = req.body;

    const existingUser = (await fileDB.getUsers()).find((u) => u.id === decoded.id || u.email?.toLowerCase() === decoded.email?.toLowerCase()) || decoded;

    const emailChanged = email && email.toLowerCase().trim() !== existingUser.email?.toLowerCase().trim();
    const phoneChanged = phone && phone.replace(/[^0-9]/g, '') !== (existingUser.phone || '').replace(/[^0-9]/g, '');

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (email) updates.email = email.toLowerCase().trim();
    if (phone) updates.phone = phone.trim();
    if (Array.isArray(saved_addresses)) updates.saved_addresses = saved_addresses;

    if (emailChanged) updates.is_email_verified = false;
    if (phoneChanged) updates.is_phone_verified = false;

    const updatedUser = (await fileDB.updateUser(existingUser.id, updates)) || { ...existingUser, ...updates };

    const safeUser = publicUser(updatedUser);
    const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: 'Profile updated successfully',
      user: safeUser,
      token
    });
  } catch {
    res.status(401).json({ error: 'Invalid token or unauthorized' });
  }
});

router.post('/profile/send-verify-otp', async (req, res) => {
  const decoded = await getAuthenticatedUser(req);
  if (!decoded) {
    res.status(401).json({ error: 'An active account session is required.' });
    return;
  }

  const { target, value } = req.body; // target: 'email' | 'phone'
  if (!target || !value) {
    res.status(400).json({ error: 'Target type and value are required' });
    return;
  }

  const otp = crypto.randomInt(100000, 1000000).toString();

  if (target === 'email') {
    const cleanEmail = value.toLowerCase().trim();
    await fileDB.saveOTP(cleanEmail, otp, { email: cleanEmail, purpose: 'profile-verification' });
    sendOtpNotification({ email: cleanEmail, otp }).catch((err) => console.error('Profile verify email error:', err));
    console.log(`[Profile Email Verify OTP] Sent to ${cleanEmail}`);
    res.json({ message: `Verification code sent to email: ${cleanEmail}` });
    return;
  }

  if (target === 'phone') {
    const cleanPhone = value.replace(/[^0-9]/g, '').slice(-10);
    const fullPhone = `+91${cleanPhone}`;
    await fileDB.saveOTP(cleanPhone, otp, { phone: fullPhone, purpose: 'profile-verification' });

    if (decoded.email) {
      await fileDB.saveOTP(decoded.email, otp, { phone: fullPhone, purpose: 'profile-verification' });
      sendOtpNotification({ email: decoded.email, phone: cleanPhone, otp }).catch((err) => console.error('Profile phone verify email error:', err));
    }

    const masked = decoded.email ? maskEmail(decoded.email) : fullPhone;
    res.json({ message: `Verification code dispatched to your registered email (${masked})` });
    return;
  }

  res.status(400).json({ error: 'Invalid verification target' });
});

router.post('/profile/verify-otp', async (req, res) => {
  const decoded = await getAuthenticatedUser(req);
  if (!decoded) {
    res.status(401).json({ error: 'An active account session is required.' });
    return;
  }

  const { target, value, otp, name } = req.body;
  if (!target || !value || !otp) {
    res.status(400).json({ error: 'Target, value, and OTP are required' });
    return;
  }

  const trimmedOtp = otp.toString().trim();
  let verified = false;

  if (target === 'phone') {
    const cleanPhone = value.replace(/[^0-9]/g, '').slice(-10);
    const fullPhone = `+91${cleanPhone}`;
    const local = await fileDB.verifyOTP(cleanPhone, trimmedOtp);
    if (local.valid && local.meta?.purpose === 'profile-verification') verified = true;
    if (!verified && decoded.email) {
      const localEmail = await fileDB.verifyOTP(decoded.email, trimmedOtp);
      if (localEmail.valid && localEmail.meta?.purpose === 'profile-verification') verified = true;
    }

    if (!verified) {
      res.status(400).json({ error: 'Invalid or expired phone verification code' });
      return;
    }

    const updateFields: any = { phone: fullPhone, is_phone_verified: true };
    if (name && typeof name === 'string' && name.trim()) {
      updateFields.name = name.trim();
    }
    const updated = await fileDB.updateUser(decoded.id, updateFields);
    if (!updated) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    const safeUser = publicUser(updated);
    res.json({ message: 'Phone number verified successfully', user: safeUser });
    return;
  }

  if (target === 'email') {
    const cleanEmail = value.toLowerCase().trim();
    const local = await fileDB.verifyOTP(cleanEmail, trimmedOtp);
    if (local.valid && local.meta?.purpose === 'profile-verification') verified = true;
    if (!verified && decoded.email) {
      const localCurrent = await fileDB.verifyOTP(decoded.email, trimmedOtp);
      if (localCurrent.valid && localCurrent.meta?.purpose === 'profile-verification') verified = true;
    }

    if (!verified) {
      res.status(400).json({ error: 'Invalid or expired email verification code' });
      return;
    }

    const updateFields: any = { email: cleanEmail, is_email_verified: true };
    if (name && typeof name === 'string' && name.trim()) {
      updateFields.name = name.trim();
    }
    const updated = await fileDB.updateUser(decoded.id, updateFields);
    if (!updated) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    const safeUser = publicUser(updated);
    res.json({ message: 'Email address verified successfully', user: safeUser });
    return;
  }

  res.status(400).json({ error: 'Invalid target' });
});

router.get('/dispatch/dashboard', async (req, res) => {
  if (!(await requireDispatchOperator(req, res))) return;
  const [users, allOrders, fleet, history] = await Promise.all([fileDB.getUsers(), fileDB.getOrders(), fileDB.getFleet(), fileDB.getDispatchHistory()]);
  const today = new Date().toISOString().slice(0, 10);

  const deliveryPartners = users
    .filter((u: any) => ['delivery', 'pilot'].includes(u.role) && u.status === 'active')
    .map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      station: u.station || 'IndoFleet Hub',
      dl_id: u.dl_id || u.metadata?.dl_id || '',
      vehicle_id: u.vehicle_id || u.metadata?.vehicle_id || '',
      status: u.status,
      active_assigned_count: allOrders.filter((o: any) => (o.assigned_pilot_id === u.id || o.pilot_assigned === u.name) && ['assigned', 'in-flight'].includes(o.status)).length
    }));

  const sortedOrders = [...allOrders].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  res.json({
    clients: users.map(publicUser),
    delivery_partners: deliveryPartners,
    orders: sortedOrders,
    fleet,
    history,
    stats: {
      totalOrders: allOrders.length,
      pendingDispatches: allOrders.filter((o: any) => o.status === 'pending').length,
      assignedPendingAccept: allOrders.filter((o: any) => o.status === 'assigned' && o.pilot_acceptance_status !== 'accepted').length,
      acceptedReadyHandover: allOrders.filter((o: any) => o.status === 'assigned' && o.pilot_acceptance_status === 'accepted').length,
      inTransit: allOrders.filter((o: any) => ['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(o.status)).length,
      todayDispatches: history.filter((entry: any) => String(entry.dispatched_at || '').startsWith(today)).length,
      totalDispatched: history.filter((entry: any) => entry.status === 'dispatched').length,
      delivered: allOrders.filter((o: any) => o.status === 'delivered').length,
      deliveredToday: allOrders.filter((o: any) => o.status === 'delivered' && String(o.delivered_at || o.updated_at || '').startsWith(today)).length,
      cancelled: allOrders.filter((o: any) => o.status === 'cancelled').length,
      availableDrones: fleet.filter((drone: any) => drone.status === 'idle' && drone.qc_status === 'passed').length,
      pendingOrders: allOrders.filter((order: any) => ['pending', 'assigned'].includes(order.status)).length
    }
  });
});

router.post('/dispatch/request-otp', async (req, res) => {
  const dispatcher = await requireDispatchOperator(req, res);
  if (!dispatcher) return;
  const { order_id: orderId, drone_ids: inputDroneIds, channel } = req.body || {};
  if (typeof orderId !== 'string' || !Array.isArray(inputDroneIds) || !inputDroneIds.length || !['email', 'phone'].includes(channel)) {
    res.status(400).json({ error: 'Choose one booking, at least one booked drone, and an OTP delivery method.' });
    return;
  }
  const droneIds = [...new Set(inputDroneIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0).map((id: string) => id.trim()))].sort();
  if (!droneIds.length || droneIds.length !== inputDroneIds.length) {
    res.status(400).json({ error: 'Selected drone IDs are invalid or duplicated.' });
    return;
  }
  const order = await fileDB.findOrderById(orderId);
  if (!order || order.order_type !== 'drone_purchase' || !['pending', 'assigned', 'in-flight'].includes(order.status)) {
    res.status(404).json({ error: 'An eligible customer drone booking was not found.' });
    return;
  }
  const eligibleIds = new Set(order.reserved_inventory_ids || []);
  const fleet = await fileDB.getFleet();
  const dispatched = await fileDB.getDispatchHistory();
  const canDispatch = droneIds.every((id: string) => {
    const drone = fleet.find((item: any) => item.id === id);
    return eligibleIds.has(id) && drone?.status === 'reserved' && drone.assigned_order === order.id && !dispatched.some((entry: any) => entry.order_id === order.id && entry.drone_id === id);
  });
  if (!canDispatch) {
    res.status(409).json({ error: 'Only undispatched drones reserved for this booking can be dispatched.' });
    return;
  }
  const target = channel === 'email' ? dispatcher.email : dispatcher.phone;
  if (!target) {
    res.status(400).json({ error: `Your dispatcher account has no registered ${channel} for OTP verification.` });
    return;
  }
  const otp = crypto.randomInt(100000, 1000000).toString();
  const normalizedTarget = fileDB.normalizeOtpKey(target);
  await fileDB.saveOTP(normalizedTarget, otp, {
    purpose: 'drone-dispatch',
    order_id: order.id,
    drone_ids: droneIds,
    dispatcher_id: dispatcher.id
  });
  const delivered = await sendOtpNotification({
    email: channel === 'email' ? target : undefined,
    phone: channel === 'phone' ? target.replace(/[^0-9]/g, '').slice(-10) : undefined,
    otp
  });
  if (!delivered) {
    res.status(503).json({ error: `Could not deliver the dispatch OTP by ${channel}. Check your ${channel === 'email' ? 'Gmail SMTP' : 'Firebase'} credentials and try again.` });
    return;
  }
  res.json({ success: true, message: `Dispatch verification code sent to your registered ${channel}.`, channel });
});

router.post('/dispatch/confirm', async (req, res) => {
  const dispatcher = await requireDispatchOperator(req, res);
  if (!dispatcher) return;
  const { order_id: orderId, drone_ids: inputDroneIds, channel, otp } = req.body || {};
  if (typeof orderId !== 'string' || !Array.isArray(inputDroneIds) || !inputDroneIds.length || !['email', 'phone'].includes(channel) || typeof otp !== 'string') {
    res.status(400).json({ error: 'Booking, selected drones, OTP method, and verification code are required.' });
    return;
  }
  const droneIds = [...new Set(inputDroneIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0).map((id: string) => id.trim()))].sort();
  if (!droneIds.length || droneIds.length !== inputDroneIds.length) {
    res.status(400).json({ error: 'Selected drone IDs are invalid or duplicated.' });
    return;
  }
  const target = channel === 'email' ? dispatcher.email : dispatcher.phone;
  if (!target) {
    res.status(400).json({ error: `Your dispatcher account has no registered ${channel}.` });
    return;
  }
  const verification = await fileDB.verifyOTP(fileDB.normalizeOtpKey(target), otp);
  const metadata = verification.meta || {};
  if (
    !verification.valid ||
    metadata.purpose !== 'drone-dispatch' ||
    metadata.dispatcher_id !== dispatcher.id ||
    metadata.order_id !== orderId ||
    JSON.stringify([...(metadata.drone_ids || [])].sort()) !== JSON.stringify(droneIds)
  ) {
    res.status(400).json({ error: verification.reason || 'OTP does not authorize this dispatch. Request a new code and retry.' });
    return;
  }
  const records = await fileDB.dispatchBookedDrones(orderId, droneIds, {
    id: dispatcher.id,
    name: dispatcher.name,
    role: dispatcher.role
  });
  const dispatchedOrder = await fileDB.findOrderById(orderId);
  if (dispatchedOrder?.customer_email) {
    sendOrderStatusEmail(dispatchedOrder, dispatchedOrder.status).catch((err) =>
      console.error('[mail] Drone booking dispatch notification failed:', err)
    );
  }
  res.json({ success: true, message: `${records.length} drone${records.length === 1 ? '' : 's'} dispatched successfully.`, dispatches: records });
});

router.get('/store/products', async (_req, res) => {
  try {
    const payload = await apiCache.getOrSet('delivery:store:products', 15000, async () => {
      const inventory = await fileDB.getFleet();
      const orders = await fileDB.getOrders();

      const activeOrders = orders.filter((o) => !['delivered', 'cancelled', 'rejected'].includes(o.status));
      const bookedDroneIds = new Set<string>();
      for (const o of activeOrders) {
        if (o.assigned_drone_id) bookedDroneIds.add(String(o.assigned_drone_id).toLowerCase());
        if (o.drone_id) bookedDroneIds.add(String(o.drone_id).toLowerCase());
        if (Array.isArray(o.reserved_inventory_ids)) {
          o.reserved_inventory_ids.forEach((id: any) => bookedDroneIds.add(String(id).toLowerCase()));
        }
      }

      const available = inventory.filter(
        (d) =>
          d.status === 'idle' &&
          (d.qc_status === 'passed' || !d.qc_status) &&
          !bookedDroneIds.has(String(d.id).toLowerCase()) &&
          !bookedDroneIds.has(String(d.serial_number || '').toLowerCase())
      );

      return {
        drones: available,
        count: available.length,
        products: available
      };
    });

    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch available store products' });
  }
});

router.get('/store/orders', async (req, res) => {
  const user = await requireCustomer(req, res);
  if (!user) return;
  const orders = (await fileDB.getOrders()).filter((order) => order.creator_id === user.id && order.order_type === 'drone_purchase');
  res.json({ orders, total: orders.length });
});

router.post('/store/orders', async (req, res) => {
  const user = await requireCustomer(req, res);
  if (!user) return;

  const droneIdsInput: string[] = Array.isArray(req.body.drone_ids) ? req.body.drone_ids : [];
  const itemsInput = Array.isArray(req.body.items) ? req.body.items : [];
  const address = req.body.address;
  if ((!droneIdsInput.length && !itemsInput.length) || !address || typeof address.full_address !== 'string' || !address.full_address.trim()) {
    res.status(400).json({ error: 'Choose at least one drone and provide a delivery address.' });
    return;
  }
  if (!user.name?.trim() || !user.email?.trim()) {
    res.status(400).json({ error: 'Your account must have a name and email before booking.' });
    return;
  }

  const inventory = await fileDB.getFleet();
  const reservations: any[] = [];
  const requestedItems: Array<{ model: string; quantity: number }> = [];

  if (droneIdsInput.length > 0) {
    for (const dId of droneIdsInput) {
      const drone = inventory.find((d) => d.id === dId && d.qc_status === 'passed' && d.status === 'idle');
      if (!drone) {
        res.status(409).json({ error: `Drone ${dId} is no longer available. Please select another drone.` });
        return;
      }
      reservations.push(drone);
    }
    const modelCounts = new Map<string, number>();
    reservations.forEach((d) => {
      modelCounts.set(d.model, (modelCounts.get(d.model) || 0) + 1);
    });
    for (const [model, quantity] of modelCounts) {
      requestedItems.push({ model, quantity });
    }
  } else {
    const requested = new Map<string, number>();
    for (const item of itemsInput) {
      const model = typeof item?.model === 'string' ? item.model.trim() : '';
      const quantity = Number(item?.quantity);
      if (!model || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        res.status(400).json({ error: 'Each cart item must have a model and a quantity from 1 to 100.' });
        return;
      }
      requested.set(model, (requested.get(model) || 0) + quantity);
    }

    for (const [model, quantity] of requested) {
      const available = inventory.filter((drone) => drone.model === model && drone.qc_status === 'passed' && drone.status === 'idle');
      if (available.length < quantity) {
        res.status(409).json({
          error: `Only ${available.length} ${model} unit${available.length === 1 ? '' : 's'} currently available. Please update your cart.`
        });
        return;
      }
      reservations.push(...available.slice(0, quantity));
    }
    for (const [model, quantity] of requested) {
      requestedItems.push({ model, quantity });
    }
  }

  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  let orderId = '';
  do {
    orderId = `IW-${datePart}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  } while (await fileDB.findOrderById(orderId));

  const items = requestedItems;
  const dropAddress = [
    address.recipient_name || user.name,
    address.recipient_phone || user.phone || '',
    address.full_address.trim(),
    address.landmark?.trim(),
    address.city?.trim(),
    address.pincode?.trim()
  ]
    .filter(Boolean)
    .join(', ');
  let resolvedLat = address.lat === undefined || address.lat === null || address.lat === '' ? NaN : Number(address.lat);
  let resolvedLng = address.lng === undefined || address.lng === null || address.lng === '' ? NaN : Number(address.lng);
  let hasValidCoords = Number.isFinite(resolvedLat) && resolvedLat >= -90 && resolvedLat <= 90
    && Number.isFinite(resolvedLng) && resolvedLng >= -180 && resolvedLng <= 180;

  if (!hasValidCoords && dropAddress) {
    try {
      const geo = await geocodeAddress(dropAddress);
      if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
        resolvedLat = geo.lat;
        resolvedLng = geo.lng;
        hasValidCoords = true;
      }
    } catch (gErr) {
      console.warn('[store/orders] Dynamic geocode failed:', gErr);
    }
  }

  const pickupLat = 28.6037;
  const pickupLng = 77.3661;
  const aerialDistance = hasValidCoords ? calculateAerialDistance(pickupLat, pickupLng, resolvedLat, resolvedLng) : 14.8;
  const flightDuration = Math.max(12, Math.round((aerialDistance / 65) * 60));

  const order = {
    id: orderId,
    order_type: 'drone_purchase',
    creator_id: user.id,
    customer_name: user.name,
    client_name: user.name,
    customer_email: user.email,
    customer_phone: user.phone || '',
    recipient_name: address.recipient_name || user.name,
    recipient_phone: address.recipient_phone || user.phone || '',
    pickup_address: 'IndoFleet Manufacturing & Dispatch Center, Noida',
    pickup_lat: pickupLat,
    pickup_lng: pickupLng,
    drop_address: dropAddress,
    destination_address: dropAddress,
    ...(hasValidCoords ? {
      destination_lat: resolvedLat,
      destination_lng: resolvedLng,
      drop_lat: resolvedLat,
      drop_lng: resolvedLng
    } : {}),
    aerial_distance_km: aerialDistance,
    flight_duration_mins: flightDuration,
    address_id: address.id || null,
    delivery_notes: typeof req.body.delivery_notes === 'string' ? req.body.delivery_notes.trim() : '',
    items,
    units_count: items.reduce((sum, item) => sum + item.quantity, 0),
    weight_kg: Number((items.reduce((sum, item) => sum + item.quantity, 0) * 6.5).toFixed(2)),
    drone_model: items.length === 1 ? items[0].model : 'Multiple models',
    drones_shipped: items.map((item) => `${item.quantity}x ${item.model}`).join(', '),
    package_type: items.map((item) => `${item.quantity}x ${item.model}`).join(', '),
    reserved_inventory_ids: reservations.map((drone) => drone.id),
    status: 'pending',
    payment_status: 'not_applicable',
    payment_method: 'none',
    estimated_delivery: null,
    created_at: now.toISOString(),
    timeline: [
      { step: 'Booking received', time: now.toISOString(), done: true },
      { step: 'Inventory reserved', time: now.toISOString(), done: true },
      { step: 'QC & packing', time: null, done: false },
      { step: 'Dispatched to your address', time: null, done: false },
      { step: 'Delivered', time: null, done: false }
    ]
  };

  let savedOrder: any;
  try {
    savedOrder = await fileDB.createBooking(order);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Requested inventory is no longer available')) {
      res.status(409).json({ error: 'Some selected drones were just booked. Please refresh the catalog and try again.' });
      return;
    }
    throw error;
  }
  sendCustomerBookingEmail(savedOrder).catch((err) => console.error('[mail] Customer booking confirmation failed:', err));
  res.status(201).json({ message: 'Booking received successfully.', order: savedOrder });
});

router.post('/store/orders/:id/cancel', async (req, res) => {
  const user = await requireCustomer(req, res);
  if (!user) return;
  const order = await fileDB.findOrderById(req.params.id);
  if (!order || order.creator_id !== user.id || order.order_type !== 'drone_purchase') {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }
  if (order.status !== 'pending') {
    res.status(409).json({ error: 'This booking can no longer be cancelled online. Contact customer support.' });
    return;
  }
  let updated: any;
  try {
    updated = await fileDB.cancelBooking(order.id, user.id, typeof req.body?.reason === 'string' ? req.body.reason : '');
  } catch (error) {
    if (error instanceof Error && error.message.includes('not eligible for customer cancellation')) {
      res.status(409).json({ error: 'This booking can no longer be cancelled online. Contact customer support.' });
      return;
    }
    throw error;
  }
  sendOrderStatusEmail(updated, 'cancelled').catch((err) => console.error('Cancel email error:', err));
  res.json({ message: 'Booking cancelled.', order: updated });
});

router.post('/orders', async (req, res) => {
  const auth = req.headers.authorization;
  let user: any = null;
  if (auth) {
    try {
      user = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    } catch {}
  }
  if (user?.role === 'customer') {
    res.status(403).json({ error: 'Use the customer storefront to book drones.' });
    return;
  }

  const {
    pickup_address,
    drop_address,
    package_type,
    weight_kg,
    scheduled_time,
    customer_name,
    customer_email,
    customer_phone,
    fare_inr,
    payment_id,
    payment_status,
    payment_method,
    aerial_distance_km,
    flight_duration_mins,
    recipient_name,
    recipient_phone,
    is_for_someone_else,
    delivery_notes
  } = req.body;

  const clientName = req.body.client_name || req.body.customer_name || user?.name || 'Enterprise Client';
  const dropAddress = req.body.destination_address || req.body.drop_address;
  const droneModel = req.body.drone_model || req.body.drones_shipped || 'Cyberone Pro';
  const unitsCount = Math.max(1, Math.round(Number(req.body.units_count || 1)));
  const carrier = req.body.carrier || req.body.package_type || 'IndoFleet Secured Fleet Van';
  const pickupAddress = req.body.pickup_address || 'IndoFleet Manufacturing Plant, Sector 62, Noida';

  if (!dropAddress) {
    res.status(400).json({ error: 'Destination address / client receiving facility is required' });
    return;
  }

  const now = new Date();
  const currentYear = now.getFullYear();

  const orderSuffix = `${Date.now().toString().slice(-5)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  const orderId = `DSP-${currentYear}-${orderSuffix}`;

  const challanNo = `CHL-${currentYear}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  const estimatedDelivery = new Date(now.getTime() + 48 * 3600 * 1000); // 48 hours transit avg

  let dropLat = Number(req.body.drop_lat ?? req.body.destination_lat);
  let dropLng = Number(req.body.drop_lng ?? req.body.destination_lng);
  let hasDropCoords = Number.isFinite(dropLat) && Number.isFinite(dropLng) && (dropLat !== 0 || dropLng !== 0);

  if (!hasDropCoords && dropAddress) {
    try {
      const geo = await geocodeAddress(dropAddress);
      if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
        dropLat = geo.lat;
        dropLng = geo.lng;
        hasDropCoords = true;
      }
    } catch (gErr) {
      console.warn('[orders] Dynamic geocode failed:', gErr);
    }
  }

  const hubPickupLat = 28.6037;
  const hubPickupLng = 77.3661;
  const calcDistance = hasDropCoords ? calculateAerialDistance(hubPickupLat, hubPickupLng, dropLat, dropLng) : (Number(aerial_distance_km) || 120);
  const calcDuration = Math.max(12, Math.round((calcDistance / 65) * 60));

  const newOrder = {
    id: orderId,
    challan_number: challanNo,
    creator_id: user?.id || null,
    customer_name: clientName,
    client_name: clientName,
    customer_email: customer_email || user?.email || '',
    customer_phone: customer_phone || user?.phone || '',
    recipient_name: recipient_name || clientName,
    recipient_phone: recipient_phone || customer_phone || '',
    is_for_someone_else: Boolean(is_for_someone_else),
    delivery_notes: delivery_notes || '',
    pickup_address: pickupAddress,
    pickup_lat: hubPickupLat,
    pickup_lng: hubPickupLng,
    drop_address: dropAddress,
    destination_address: dropAddress,
    ...(hasDropCoords ? {
      drop_lat: dropLat,
      drop_lng: dropLng,
      destination_lat: dropLat,
      destination_lng: dropLng
    } : {}),
    package_type: `${unitsCount}x ${droneModel} (${carrier})`,
    drones_shipped: `${unitsCount}x ${droneModel}`,
    drone_model: droneModel,
    units_count: unitsCount,
    carrier: carrier,
    weight_kg: Number(weight_kg) || unitsCount * 12,
    fare_inr: Number(fare_inr) || unitsCount * 450000,
    payment_id: payment_id || null,
    payment_status: payment_status || 'cleared',
    payment_method: payment_method || 'invoice',
    aerial_distance_km: Number(aerial_distance_km) || 120,
    flight_duration_mins: Number(flight_duration_mins) || 24,
    status: 'assigned',
    drone_id: `${unitsCount} Units (${droneModel})`,
    scheduled_time: scheduled_time || null,
    estimated_delivery: estimatedDelivery.toISOString(),
    created_at: now.toISOString(),
    timeline: [
      { step: 'Order Placed & QC Cleared', time: now.toISOString(), done: true },
      { step: 'Manufactured Units Boxed & Sealed', time: now.toISOString(), done: true },
      { step: 'Dispatched via ' + carrier, time: now.toISOString(), done: true },
      { step: 'In Transit to Client Facility', time: null, done: false },
      { step: 'Delivered & Technical Acceptance Signed', time: null, done: false }
    ]
  };

  const savedOrder = await fileDB.addOrder(newOrder);
  console.log(`[order] Created order: ${orderId} (${newOrder.payment_method.toUpperCase()}) assigned to ${newOrder.drone_id}`);

  sendOrderPlacedEmail(savedOrder).catch((err) => console.error('Order email error:', err));

  res.status(201).json({ message: 'Delivery order placed successfully', order: savedOrder });
});

router.get('/orders', async (req, res) => {
  const auth = req.headers.authorization;
  let user: any = null;
  if (auth) {
    try {
      user = jwt.verify(auth.replace(/^Bearer\s+/i, '').trim(), JWT_SECRET);
    } catch {}
  }

  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in to view orders.' });
    return;
  }

  const allOrders = await fileDB.getOrders();

  if (user.role === 'admin' || user.role === 'dispatcher' || user.role === 'fleet_manager') {
    res.json({ orders: allOrders, total: allOrders.length });
  } else {
    const userEmail = (user.email || '').toLowerCase().trim();
    const userPhoneClean = (user.phone || '').replace(/[^0-9]/g, '').slice(-10);
    const myOrders = allOrders.filter(
      (o) =>
        (o.creator_id && o.creator_id === user.id) ||
        (userEmail && o.customer_email && o.customer_email.toLowerCase() === userEmail) ||
        (userPhoneClean && o.customer_phone && o.customer_phone.replace(/[^0-9]/g, '').endsWith(userPhoneClean)) ||
        (o.pilot_id && o.pilot_id === user.id) ||
        (userEmail && o.pilot_email && o.pilot_email.toLowerCase() === userEmail)
    );
    res.json({ orders: myOrders, total: myOrders.length });
  }
});

function getDeliveryCoreStatus(order: any) {
  const status = order.status === 'on-hold'
    ? order.status_before_hold || order.delivery_core_status || 'pending'
    : order.status;
  return status === 'rescheduled' ? order.delivery_core_status || 'assigned' : order.delivery_core_status || status;
}

async function hasVerifiedDispatchRecord(order: any) {
  const records = await fileDB.getDispatchHistory();
  return records.some((entry: any) =>
    entry.order_id === order.id
    && entry.status === 'dispatched'
    && (!Array.isArray(order.reserved_inventory_ids) || order.reserved_inventory_ids.includes(entry.drone_id))
  );
}

router.get('/delivery/dashboard', async (req, res) => {
  const operator = await requireDeliveryOperator(req, res);
  if (!operator) return;

  const payload = await apiCache.getOrSet('delivery:dashboard:data', 3000, async () => {
    const orders = await fileDB.getOrders();
    const [fleet, dispatchHistory, users] = await Promise.all([fileDB.getFleet(), fileDB.getDispatchHistory(), fileDB.getUsers()]);
    const deliveries = orders.filter(order => order.order_type !== 'demo');
    const counts = {
      total: deliveries.length,
      pending: deliveries.filter(order => ['pending', 'assigned'].includes(order.status)).length,
      in_transit: deliveries.filter(order => ['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(order.status)).length,
      out_for_delivery: deliveries.filter(order => order.status === 'out-for-delivery').length,
      delivered: deliveries.filter(order => order.status === 'delivered').length,
      on_hold: deliveries.filter(order => order.status === 'on-hold').length,
      rescheduled: deliveries.filter(order => order.status === 'rescheduled').length,
      delayed: deliveries.filter(order => order.status === 'delayed').length,
      failed: deliveries.filter(order => order.status === 'failed').length,
      cancelled: deliveries.filter(order => order.status === 'cancelled').length
    };
    return {
      counts,
      orders: deliveries.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
        .map(order => {
          const drone = fleet.find(item => item.id === order.drone_id)
            || fleet.find(item => Array.isArray(order.reserved_inventory_ids) && order.reserved_inventory_ids.includes(item.id));
          const customer = users.find(item => item.id === order.creator_id);
          const dispatchTime = dispatchHistory
            .filter(entry => entry.order_id === order.id && entry.status === 'dispatched')
            .map(entry => String(entry.dispatched_at || ''))
            .filter(Boolean)
            .sort()
            .pop();
          return {
            ...order,
            delivery_id: order.delivery_id || `DEL-${order.id}`,
            organization_name: order.organization_name || order.client_name || customer?.organization || '',
            organization_id: order.organization_id || customer?.organization_id || '',
            location_is_live: false,
            last_known_location: order.last_known_location || null,
            last_location_updated_at: order.last_location_updated_at || null,
            dispatch_time: order.dispatch_time || order.dispatched_at || dispatchTime || null,
            rpav_info: drone ? {
              id: drone.id,
              name: drone.model,
              status: drone.status,
              battery: Number.isFinite(Number(drone.battery)) ? Number(drone.battery) : null,
              current_location: drone.current_city || null,
              last_location_updated_at: drone.last_location_updated_at || null
            } : null
          };
        })
    };
  });

  res.json(payload);
});

router.patch('/delivery/orders/:id/porter-tracking', async (req, res) => {
  const operator = await requireDeliveryOperator(req, res);
  if (!operator) return;
  if (!['admin', 'dispatcher'].includes(operator.role)) {
    res.status(403).json({ error: 'Only administrators and dispatchers can update Porter tracking details.' });
    return;
  }
  const order = await fileDB.findOrderById(String(req.params.id));
  if (!order) {
    res.status(404).json({ error: 'Delivery order not found.' });
    return;
  }

  const { porter_tracking_id, porter_tracking_url, porter_contact, mapbox_route_url } = req.body || {};
  if (typeof porter_tracking_id !== 'string' || porter_tracking_id.trim().length > 120) {
    res.status(400).json({ error: 'Enter a valid Porter booking or tracking ID (up to 120 characters).' });
    return;
  }
  if (porter_tracking_url !== undefined && porter_tracking_url !== '') {
    try {
      const url = new URL(porter_tracking_url);
      if (url.protocol !== 'https:') throw new Error('https required');
    } catch {
      res.status(400).json({ error: 'Tracking link must be a valid HTTPS URL.' });
      return;
    }
  }
  if (porter_contact !== undefined && (typeof porter_contact !== 'string' || porter_contact.trim().length > 120)) {
    res.status(400).json({ error: 'Porter contact must be 120 characters or fewer.' });
    return;
  }
  if (mapbox_route_url !== undefined && mapbox_route_url !== '') {
    try {
      const url = new URL(mapbox_route_url);
      if (url.protocol !== 'https:' || !/(^|\.)mapbox\.com$/i.test(url.hostname)) throw new Error('Mapbox HTTPS URL required');
      if (url.searchParams.has('access_token') || url.searchParams.has('token') || /(?:access_token|token)=/i.test(url.hash)) {
        res.status(400).json({ error: 'Use a shareable Mapbox route link without an access token. Keep API tokens in environment configuration.' });
        return;
      }
    } catch {
      res.status(400).json({ error: 'Mapbox route link must be a valid HTTPS URL on mapbox.com.' });
      return;
    }
  }

  const now = new Date().toISOString();
  const trackingDetails = {
    porter_tracking_id: porter_tracking_id.trim(),
    porter_tracking_url: String(porter_tracking_url || '').trim(),
    porter_contact: String(porter_contact || '').trim(),
    mapbox_route_url: String(mapbox_route_url || '').trim(),
    porter_updated_at: now,
    porter_updated_by: operator.id,
    porter_updated_by_name: operator.name
  };
  const auditEntry = {
    id: crypto.randomUUID(),
    order_id: order.id,
    action: 'delivery_tracking_updated',
    tracking_id: trackingDetails.porter_tracking_id,
    reason: 'Delivery tracking links updated',
    performed_by: operator.name,
    performed_by_id: operator.id,
    timestamp: now
  };
  const updated = await fileDB.updateOrder(order.id, {
    ...trackingDetails,
    delivery_audit_log: [...(Array.isArray(order.delivery_audit_log) ? order.delivery_audit_log : []), auditEntry],
    timeline: [...(Array.isArray(order.timeline) ? order.timeline : []), {
      step: 'Delivery tracking details updated',
      time: now,
      done: true,
      performed_by: operator.name,
      details: `Porter ID: ${trackingDetails.porter_tracking_id || '—'}${trackingDetails.mapbox_route_url ? ' · Mapbox route link saved' : ''}`
    }],
    updated_at: now
  });
  res.json({ success: true, order: updated });
});

router.post('/delivery/actions/request-otp', async (req, res) => {
  const operator = await requireDeliveryOperator(req, res);
  if (!operator) return;
  const { order_id, action, reason, channel, scheduled_time } = req.body || {};
  if (typeof order_id !== 'string' || !['hold', 'unhold', 'reschedule', 'dispatch', 'delivered', 'cancel'].includes(action)
    || typeof reason !== 'string' || reason.trim().length < 5
    || !['email', 'phone'].includes(channel)) {
    res.status(400).json({ error: 'Order, supported action, reason (at least 5 characters), and OTP method are required.' });
    return;
  }
  const order = await fileDB.findOrderById(order_id);
  if (!order) {
    res.status(404).json({ error: 'Delivery order not found.' });
    return;
  }
  if (action === 'dispatch') {
    if (!['admin', 'dispatcher'].includes(operator.role)) {
      res.status(403).json({ error: 'Only administrators and dispatchers can dispatch deliveries.' });
      return;
    }
    if (order.order_type === 'drone_purchase' || !['pending', 'assigned'].includes(order.status)) {
      res.status(409).json({ error: 'Use Secure Drone Dispatch for customer drone bookings; this order is not eligible for manual dispatch.' });
      return;
    }
  }
  if (action === 'hold' && ['delivered', 'cancelled', 'failed', 'on-hold'].includes(order.status)) {
    res.status(409).json({ error: 'This order cannot be placed on hold in its current status.' });
    return;
  }
  if (action === 'unhold' && order.status !== 'on-hold') {
    res.status(409).json({ error: 'Only an order currently on hold can be unheld.' });
    return;
  }
  if (action === 'reschedule') {
    const proposedTime = Date.parse(String(scheduled_time || ''));
    if (!Number.isFinite(proposedTime) || proposedTime <= Date.now()) {
      res.status(400).json({ error: 'Choose a future delivery date and time.' });
      return;
    }
    if (['delivered', 'cancelled', 'failed'].includes(order.status)) {
      res.status(409).json({ error: 'This order cannot be rescheduled in its current status.' });
      return;
    }
  }
  if (['delivered', 'cancel'].includes(action) && ['delivered', 'cancelled', 'failed'].includes(order.status)) {
    res.status(409).json({ error: 'This delivery is already in a terminal status.' });
    return;
  }
  if (action === 'delivered' && order.status === 'on-hold') {
    res.status(409).json({ error: 'Unhold the delivery before marking it delivered.' });
    return;
  }
  const verifiedDispatch = action === 'delivered' && await hasVerifiedDispatchRecord(order);
  if (action === 'delivered' && !verifiedDispatch && !['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(getDeliveryCoreStatus(order))) {
    res.status(409).json({ error: 'A delivery can be marked delivered only after dispatch.' });
    return;
  }
  const target = channel === 'email' ? operator.email : operator.phone;
  if (!target) {
    res.status(400).json({ error: `Your account has no registered ${channel} for OTP verification.` });
    return;
  }
  const otp = crypto.randomInt(100000, 1000000).toString();
  const normalizedTarget = fileDB.normalizeOtpKey(target);
  await fileDB.saveOTP(normalizedTarget, otp, {
    purpose: 'delivery-sensitive-action',
    order_id,
    action,
    reason: reason.trim(),
    scheduled_time: action === 'reschedule' ? new Date(scheduled_time).toISOString() : null,
    operator_id: operator.id
  });
  const delivered = await sendOtpNotification({
    email: channel === 'email' ? target : undefined,
    phone: channel === 'phone' ? target.replace(/[^0-9]/g, '').slice(-10) : undefined,
    otp
  });
  if (!delivered) {
    res.status(503).json({ error: `Could not send OTP by ${channel}. Check the configured provider and try again.` });
    return;
  }
  res.json({ success: true, message: `Verification code sent by ${channel}.` });
});

router.post('/delivery/actions/confirm', async (req, res) => {
  const operator = await requireDeliveryOperator(req, res);
  if (!operator) return;
  const { order_id, action, reason, channel, otp } = req.body || {};
  if (typeof order_id !== 'string' || !['hold', 'unhold', 'reschedule', 'dispatch', 'delivered', 'cancel'].includes(action)
    || typeof reason !== 'string' || reason.trim().length < 5 || !['email', 'phone'].includes(channel)
    || typeof otp !== 'string' || !otp.trim()) {
    res.status(400).json({ error: 'Complete all action and OTP verification fields.' });
    return;
  }
  const target = channel === 'email' ? operator.email : operator.phone;
  if (!target) {
    res.status(400).json({ error: `Your account has no registered ${channel}.` });
    return;
  }
  const verification = await fileDB.verifyOTP(fileDB.normalizeOtpKey(target), otp);
  const metadata = verification.meta || {};
  if (!verification.valid || metadata.purpose !== 'delivery-sensitive-action'
    || metadata.operator_id !== operator.id || metadata.order_id !== order_id
    || metadata.action !== action || metadata.reason !== reason.trim()) {
    res.status(400).json({ error: verification.reason || 'OTP does not authorize this action. Request a new code.' });
    return;
  }
  const order = await fileDB.findOrderById(order_id);
  if (!order) {
    res.status(404).json({ error: 'Delivery order not found.' });
    return;
  }
  if (action === 'dispatch' && (!['admin', 'dispatcher'].includes(operator.role)
    || order.order_type === 'drone_purchase' || !['pending', 'assigned'].includes(order.status))) {
    res.status(409).json({ error: 'This order cannot be dispatched through the manual delivery workflow. Use Secure Drone Dispatch for customer drone bookings.' });
    return;
  }
  const previousStatus = order.status;
  const now = new Date().toISOString();
  const newStatus = action === 'hold' ? 'on-hold'
    : action === 'unhold' ? (order.status_before_hold || 'in-flight')
    : action === 'reschedule' ? 'rescheduled'
    : action === 'dispatch' ? 'in-flight'
    : action === 'delivered' ? 'delivered'
    : 'cancelled';
  if (action === 'unhold' && order.status !== 'on-hold') {
    res.status(409).json({ error: 'Only an order currently on hold can be unheld.' });
    return;
  }
  if (action === 'hold' && ['delivered', 'cancelled', 'failed', 'on-hold'].includes(order.status)) {
    res.status(409).json({ error: 'This order cannot be placed on hold in its current status.' });
    return;
  }
  if (['delivered', 'cancel'].includes(action) && ['delivered', 'cancelled', 'failed'].includes(order.status)) {
    res.status(409).json({ error: 'This delivery is already in a terminal status.' });
    return;
  }
  if (action === 'delivered' && order.status === 'on-hold') {
    res.status(409).json({ error: 'Unhold the delivery before marking it delivered.' });
    return;
  }
  const verifiedDispatch = action === 'delivered' && await hasVerifiedDispatchRecord(order);
  if (action === 'delivered' && !verifiedDispatch && !['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(getDeliveryCoreStatus(order))) {
    res.status(409).json({ error: 'A delivery can be marked delivered only after dispatch.' });
    return;
  }
  const auditEntry = {
    id: crypto.randomUUID(),
    order_id,
    action,
    previous_status: previousStatus,
    new_status: newStatus,
    reason: reason.trim(),
    performed_by: operator.name,
    performed_by_id: operator.id,
    otp_method: channel,
    otp_verified: true,
    previous_scheduled_time: action === 'reschedule' ? order.scheduled_time || null : null,
    scheduled_time: action === 'reschedule' ? metadata.scheduled_time : null,
    timestamp: now
  };
  const updated = await fileDB.updateOrder(order_id, {
    status: newStatus,
    ...(action === 'hold' ? { status_before_hold: previousStatus, hold_reason: reason.trim(), held_at: now, held_by: operator.id } : {}),
    ...(action === 'unhold' ? { hold_reason: null, held_at: null, held_by: null } : {}),
    ...(action === 'reschedule' ? {
      delivery_core_status: getDeliveryCoreStatus(order),
      scheduled_time: metadata.scheduled_time,
      reschedule_reason: reason.trim(),
      ...(order.status === 'on-hold' ? { hold_reason: null, held_at: null, held_by: null } : {})
    } : {}),
    ...(action === 'dispatch' ? { dispatch_time: now } : {}),
    ...(action === 'delivered' ? { delivered_at: now, delivery_final_location: order.last_known_location || null } : {}),
    ...(action === 'cancel' ? { cancelled_at: now, cancellation_reason: reason.trim() } : {}),
    delivery_audit_log: [...(Array.isArray(order.delivery_audit_log) ? order.delivery_audit_log : []), auditEntry],
    timeline: [...(Array.isArray(order.timeline) ? order.timeline : []), {
      step: action === 'hold' ? 'Delivery placed on hold'
        : action === 'unhold' ? 'Delivery resumed'
        : action === 'reschedule' ? 'Delivery rescheduled'
        : action === 'dispatch' ? 'Delivery dispatched'
        : action === 'delivered' ? 'Delivery marked delivered'
        : 'Delivery cancelled',
      time: now, done: true, location: order.last_known_location || null,
      details: action === 'reschedule' ? `${order.scheduled_time || 'No prior schedule'} → ${metadata.scheduled_time}. ${reason.trim()}` : reason.trim(),
      performed_by: operator.name
    }],
    updated_at: now
  });
  if (action === 'delivered' || action === 'cancel') {
    if (order.reserved_inventory_ids?.length) {
      const reservedIds = new Set(order.reserved_inventory_ids);
      await fileDB.saveFleet((await fileDB.getFleet()).map(drone => reservedIds.has(drone.id)
        ? action === 'delivered'
          ? { ...drone, status: 'sold', assigned_order: order.id }
          : drone.dispatch_status === 'dispatched'
            ? drone
            : { ...drone, status: 'idle', assigned_order: null, assigned_client: null }
        : drone));
    }
    if (order.drone_id && !String(order.drone_id).includes(' Units (')) {
      await fileDB.updateDrone(order.drone_id, { status: 'idle', assigned_order: null });
    }
    if (action === 'delivered') {
      sendFeedbackInvitationEmail(updated).catch(err => console.error('Feedback invitation email error:', err));
    }
  }
  if (order.customer_email && action !== 'hold' && action !== 'unhold') {
    sendOrderStatusEmail(updated, newStatus).catch(err => console.error('Status email error:', err));
  }
  res.json({ success: true, order: updated, audit: auditEntry });
});

router.get('/orders/:id', async (req, res) => {
  const order = await fileDB.findOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const user = await getAuthenticatedUser(req);
  const isOperator = user && ['admin', 'dispatcher', 'fleet_manager', 'delivery'].includes(user.role);

  if (isOperator) {
    res.json({ order });
  } else {
    res.json({ order: sanitizeOrderForPublic(order) });
  }
});

router.post('/orders/:id/hold-request-otp', async (req, res) => {
  const operator = await requireDeliveryOperator(req, res);
  if (!operator) return;

  const order = await fileDB.findOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const { reason, channel } = req.body || {};
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    res.status(400).json({ error: 'A specific reason (minimum 5 characters) is strictly required before requesting verification OTP.' });
    return;
  }

  const otpTarget = channel === 'phone' && operator.phone ? operator.phone : (operator.email || operator.phone);
  if (!otpTarget) {
    res.status(400).json({ error: 'No registered email or phone found on your operator account for verification.' });
    return;
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const normalizedTarget = fileDB.normalizeOtpKey(otpTarget);
  await fileDB.saveOTP(normalizedTarget, otp, {
    purpose: 'order_hold_security_verification',
    order_id: order.id,
    operator_id: operator.id,
    reason: reason.trim()
  });

  if (operator.email) {
    sendOtpNotification({
      email: operator.email,
      otp
    }).catch((err) => console.error('[mail] Operator Hold OTP error:', err));
  }

  console.log(`[OPERATOR HOLD OTP] Order #${order.id} for operator ${operator.name} (${otpTarget}): ${otp}`);

  res.json({
    success: true,
    message: `Security verification OTP sent to ${operator.email || operator.phone}`
  });
});

router.post('/orders/:id/manage-status', async (req, res) => {
  const operator = await requireDeliveryOperator(req, res);
  if (!operator) return;

  const { action, reason, rescheduled_date, scheduled_time, otp, otp_channel } = req.body || {};
  const order = await fileDB.findOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  if (!['hold', 'cancel', 'reschedule', 'resume'].includes(action)) {
    res.status(400).json({ error: 'Invalid operations action. Allowed: hold, cancel, reschedule, resume' });
    return;
  }

  if (action === 'hold') {
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      res.status(400).json({ error: 'A specific reason (minimum 5 characters) is strictly required to place an order on hold.' });
      return;
    }
    if (!otp || typeof otp !== 'string' || !otp.trim()) {
      res.status(400).json({ error: 'Operator security verification OTP is strictly required to put an order on hold.' });
      return;
    }

    const otpTarget = otp_channel === 'phone' && operator.phone ? operator.phone : (operator.email || operator.phone);
    const verification = await fileDB.verifyOTP(fileDB.normalizeOtpKey(otpTarget || ''), otp.trim());
    if (!verification.valid || verification.meta?.purpose !== 'order_hold_security_verification') {
      res.status(400).json({ error: verification.reason || 'Invalid or expired operator security OTP. Please request a new verification code.' });
      return;
    }
  }

  if (action === 'cancel') {
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      res.status(400).json({ error: 'A reason (at least 5 characters) is required to cancel an order.' });
      return;
    }
  }

  let newStatus = order.status;
  let actionLabel = '';

  if (action === 'hold') {
    newStatus = 'on-hold';
    actionLabel = `Order placed ON HOLD by ${operator.name} (${operator.role}). Reason: ${reason.trim()}`;
  } else if (action === 'cancel') {
    newStatus = 'cancelled';
    actionLabel = `Order CANCELLED by ${operator.name} (${operator.role}). Reason: ${reason.trim()}`;
    if (order.drone_id) {
      await fileDB.updateDrone(order.drone_id, { status: 'idle', assigned_order: null });
    }
  } else if (action === 'reschedule') {
    newStatus = 'rescheduled';
    actionLabel = `Order RESCHEDULED to ${rescheduled_date || scheduled_time || 'new delivery window'} by ${operator.name} (${operator.role}). Note: ${reason || 'Corridor timing adjustment'}`;
  } else if (action === 'resume') {
    newStatus = order.drone_id ? 'assigned' : 'pending';
    actionLabel = `Order RESUMED by ${operator.name} (${operator.role}). Ready for mission dispatch.`;
  }

  const auditEntry = {
    action: `ORDER_${action.toUpperCase()}`,
    performed_by: `${operator.name} (${operator.role})`,
    timestamp: new Date().toISOString(),
    notes: actionLabel,
    previous_status: order.status,
    new_status: newStatus
  };

  const updatedOrder = await fileDB.updateOrder(order.id, {
    status: newStatus,
    rescheduled_date: rescheduled_date || order.rescheduled_date,
    scheduled_time: scheduled_time || order.scheduled_time,
    hold_reason: action === 'hold' ? reason.trim() : (action === 'resume' ? null : order.hold_reason),
    held_at: action === 'hold' ? new Date().toISOString() : (action === 'resume' ? null : order.held_at),
    held_by: action === 'hold' ? `${operator.name} (${operator.role})` : (action === 'resume' ? null : order.held_by),
    cancellation_reason: action === 'cancel' ? (reason || 'Operations cancellation') : order.cancellation_reason,
    audit_log: [...(order.audit_log || []), auditEntry]
  });

  if (order.customer_email) {
    sendOrderStatusEmail(updatedOrder, newStatus).catch((err) => console.error('Status update email error:', err));
  }

  res.json({
    success: true,
    message: `Order #${order.id} is now ${newStatus.toUpperCase()}`,
    order: updatedOrder
  });
});

router.patch('/orders/:id/status', async (req, res) => {
  const operator = await requireDeliveryOperator(req, res);
  if (!operator) return;
  const { status, reason, notes } = req.body || {};
  const order = await fileDB.findOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  if (status && status !== order.status) {
    const validTransitions: Record<string, string[]> = {
      pending: ['assigned', 'cancelled', 'on-hold', 'rescheduled'],
      assigned: ['taking-off', 'in-flight', 'dispatched', 'in-transit', 'en-route', 'cancelled', 'on-hold', 'rescheduled'],
      'taking-off': ['in-flight', 'approaching', 'in-transit', 'en-route', 'cancelled', 'on-hold'],
      'in-flight': ['approaching', 'out-for-delivery', 'delivered', 'cancelled', 'on-hold'],
      'in-transit': ['approaching', 'out-for-delivery', 'delivered', 'cancelled', 'on-hold'],
      'en-route': ['approaching', 'out-for-delivery', 'delivered', 'cancelled', 'on-hold'],
      'approaching': ['out-for-delivery', 'delivered', 'cancelled'],
      'out-for-delivery': ['delivered', 'failed', 'cancelled'],
      'on-hold': ['pending', 'assigned', 'in-flight', 'in-transit', 'cancelled', 'rescheduled'],
      rescheduled: ['pending', 'assigned', 'cancelled'],
      delivered: [],
      cancelled: [],
      failed: []
    };

    const allowed = validTransitions[order.status] || [];
    if (operator.role !== 'admin' && !allowed.includes(status)) {
      res.status(400).json({
        error: `Invalid status transition from '${order.status}' to '${status}'. Direct state machine bypass is restricted.`
      });
      return;
    }
  }

  const updated = await fileDB.updateOrder(order.id, {
    status: status || order.status,
    notes: notes || reason || order.notes,
    updated_at: new Date().toISOString()
  });
  res.json({ success: true, order: updated });
});

router.post('/orders/:id/cancel', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'An active account is required to cancel this order.' });
    return;
  }

  const order = await fileDB.findOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  if (user?.role === 'customer' && (order.creator_id !== user.id || order.order_type !== 'drone_purchase' || order.status !== 'pending')) {
    res.status(403).json({ error: 'This booking can no longer be cancelled online.' });
    return;
  }

  if (order.status === 'delivered') {
    res.status(400).json({ error: 'Cannot cancel an order that has already been delivered.' });
    return;
  }

  if (order.status === 'cancelled') {
    res.status(400).json({ error: 'This order is already cancelled.' });
    return;
  }

  const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'Operations cancellation';
  const updated = await fileDB.updateOrder(order.id, {
    status: 'cancelled',
    cancellation_reason: reason,
    audit_log: [
      ...(order.audit_log || []),
      {
        action: 'ORDER_CANCELLED',
        performed_by: `${user.name} (${user.role})`,
        timestamp: new Date().toISOString(),
        notes: reason
      }
    ]
  });

  if (order.drone_id) {
    await fileDB.updateDrone(order.drone_id, { status: 'idle', assigned_order: null });
  }

  sendOrderStatusEmail(updated, 'cancelled').catch((err) => console.error('Cancel email error:', err));
  res.json({ message: 'Order cancelled successfully', order: updated });
});

router.get('/fleet', async (req, res) => {
  const payload = await apiCache.getOrSet('delivery:fleet:synced', 5000, async () => {
    const fleet = await fileDB.getFleet();
    const orders = await fileDB.getOrders();

    const syncedFleet = fleet.map((drone) => {
      const activeOrder = orders.find((o) => o.drone_id === drone.id && ['assigned', 'taking-off', 'in-flight', 'approaching', 'on-hold'].includes(o.status));

      if (activeOrder) {
        const isFlying = ['taking-off', 'in-flight', 'approaching'].includes(activeOrder.status);
        const isOnHold = activeOrder.status === 'on-hold';

        return {
          ...drone,
          status: isOnHold ? 'on-hold' : isFlying ? 'en-route' : 'assigned',
          speed_kmh: isFlying ? (activeOrder.status === 'taking-off' ? 28 : activeOrder.status === 'approaching' ? 18 : 68) : 0,
          altitude_m: isFlying ? (activeOrder.status === 'taking-off' ? 30 : activeOrder.status === 'approaching' ? 12 : 95) : isOnHold ? 60 : 0,
          assigned_order: activeOrder.id,
          current_order: {
            id: activeOrder.id,
            customer_name: activeOrder.customer_name,
            destination: activeOrder.drop_address,
            package_type: activeOrder.package_type,
            package_weight_kg: activeOrder.package_weight_kg,
            fare: activeOrder.fare,
            payment_method: activeOrder.payment_method,
            status: activeOrder.status
          }
        };
      } else {
        return {
          ...drone,
          status: drone.status === 'charging' ? 'charging' : drone.status === 'maintenance' ? 'maintenance' : drone.status === 'on-hold' ? 'on-hold' : 'idle',
          speed_kmh: 0,
          altitude_m: 0,
          assigned_order: null,
          current_order: null
        };
      }
    });

    const activeCount = syncedFleet.filter((d) => d.status === 'en-route' || d.status === 'assigned').length;
    const idleCount = syncedFleet.filter((d) => d.status === 'idle').length;
    const chargingCount = syncedFleet.filter((d) => d.status === 'charging').length;
    const onHoldCount = syncedFleet.filter((d) => d.status === 'on-hold').length;

    return {
      fleet: syncedFleet,
      total_fleet: syncedFleet.length,
      active: activeCount,
      idle: idleCount,
      charging: chargingCount,
      on_hold: onHoldCount
    };
  });

  res.json(payload);
});

router.patch('/fleet/:id', async (req, res) => {
  const admin = await requireFleetManagerOrAdmin(req, res);
  if (!admin) return;

  const { status, battery, current_city, model } = req.body;
  const fleet = await fileDB.getFleet();
  const drone = fleet.find((d) => d.id === req.params.id);

  if (!drone) {
    res.status(404).json({ error: 'Drone not found in fleet database' });
    return;
  }

  const updates: any = {};
  if (status !== undefined) updates.status = status;
  if (battery !== undefined) updates.battery = Math.min(100, Math.max(0, Number(battery)));
  if (current_city !== undefined) updates.current_city = current_city;
  if (model !== undefined) updates.model = model;

  const updatedDrone = await fileDB.updateDrone(drone.id, updates);
  console.log(`[Fleet] Drone ${drone.id} updated by ${admin.name}:`, updates);
  res.json({ message: `Drone ${drone.id} telemetry updated`, drone: updatedDrone });
});

router.post('/fleet', async (req, res) => {
  const admin = await requireFleetManagerOrAdmin(req, res);
  if (!admin) return;

  const { id, model, current_city, payload_capacity_kg } = req.body;
  const fleet = await fileDB.getFleet();

  const newId = id && id.trim() ? id.toUpperCase().trim() : `INW-${String(fleet.length + 1).padStart(3, '0')}`;
  if (fleet.some((d) => d.id === newId)) {
    res.status(400).json({ error: `Drone with ID ${newId} already exists` });
    return;
  }

  const newDrone = {
    id: newId,
    model: model || '700RPAV',
    status: 'idle',
    battery: 100,
    speed_kmh: 0,
    altitude_m: 0,
    current_city: current_city || 'Noida Sector 62',
    payload_capacity_kg: Number(payload_capacity_kg) || 2.5,
    deliveries_today: 0,
    lat: 28.5355,
    lng: 77.391,
    assigned_order: null
  };

  fleet.unshift(newDrone);
  await fileDB.saveFleet(fleet);
  console.log(`[Fleet] New drone registered: ${newId} (${newDrone.model})`);

  res.status(201).json({ message: 'Drone successfully registered to fleet', drone: newDrone });
});

router.get('/analytics', async (req, res) => {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const payload = await buildAnalyticsPayload({ from, to });
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to build analytics payload' });
  }
});

function validateBase64Attachment(attachment: any): { valid: boolean; error?: string } {
  if (!attachment) return { valid: true };
  const data = typeof attachment === 'string' ? attachment : attachment.data || attachment.url || attachment.content;
  const mimetype = attachment.mimetype || attachment.type || attachment.mime;
  const size = attachment.size;

  if (typeof data === 'string' && data.length > 0) {
    if (data.length > 35_000_000) {
      return { valid: false, error: 'Attachment file size exceeds maximum limit of 25 MB.' };
    }

    const allowedMimeTypes = [
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/3gpp', 'video/mpeg',
      'application/pdf', 'text/plain', 'text/csv'
    ];

    let detectedMime = mimetype;
    if (data.startsWith('data:')) {
      const match = data.match(/^data:([^;]+);base64,/);
      if (match) detectedMime = match[1];
    }

    if (detectedMime && !allowedMimeTypes.includes(detectedMime.toLowerCase())) {
      return { valid: false, error: `Invalid attachment MIME type '${detectedMime}'. Allowed types: images, video (mp4, webm, mov), PDF.` };
    }
  }

  if (size && Number(size) > 25 * 1024 * 1024) {
    return { valid: false, error: 'Attachment file size exceeds maximum limit of 25 MB.' };
  }

  return { valid: true };
}

router.post(['/support/expert-request', '/support/ticket', '/support/expert-requests'], async (req, res) => {
  try {
    let { name, phone, email, category, query_type, message, preferred_time, preferred_callback, order_id, delivery_address, drone_serial, priority, attachments } = req.body;

    if (!phone && !email) {
      if (order_id || drone_serial) {
        const orders = await fileDB.getOrders();
        const ord = orders.find(o =>
          (order_id && (String(o.id) === String(order_id) || String(o.order_number) === String(order_id))) ||
          (drone_serial && (String(o.assigned_drone_id).toLowerCase() === String(drone_serial).toLowerCase() || String(o.drone_id).toLowerCase() === String(drone_serial).toLowerCase()))
        );
        if (ord) {
          if (!phone && ord.customer_phone) phone = ord.customer_phone;
          if (!email && ord.customer_email) email = ord.customer_email;
          if (!name && ord.customer_name) name = ord.customer_name;
        }
      }
      if (!phone && !email) {
        email = process.env.SUPPORT_EMAIL || 'connect@indowings.com';
        phone = 'N/A (Drone QR Scan)';
      }
    }

    const validatedAttachments: any[] = [];
    if (attachments) {
      const list = Array.isArray(attachments) ? attachments : [attachments];
      for (const att of list) {
        const val = validateBase64Attachment(att);
        if (!val.valid) {
          res.status(400).json({ error: val.error });
          return;
        }
        validatedAttachments.push(att);
      }
    }

    const requestId = `TKT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const matchingCustomer = (await fileDB.getUsers()).find(
      (user) => (email && user.email?.toLowerCase() === String(email).toLowerCase().trim()) || (phone && user.phone?.replace(/\D/g, '').slice(-10) === String(phone).replace(/\D/g, '').slice(-10))
    );
    const newRequest = {
      id: requestId,
      customer_id: matchingCustomer?.id || null,
      name: name?.trim() || 'Client',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      category: category || query_type || 'General Support',
      subject: category || query_type || 'General Support',
      source: req.body.source || 'web',
      priority: (priority || 'normal').toLowerCase(), // urgent, high, normal, low
      order_id: order_id?.trim() || null,
      delivery_address: delivery_address?.trim() || null,
      drone_serial: drone_serial?.trim() || null,
      message: message?.trim() || '',
      attachments: validatedAttachments,
      preferred_time: preferred_time || preferred_callback || 'Immediate Callback',
      status: 'open', // open, in_progress, resolved, closed
      audit_log: [
        {
          id: crypto.randomUUID(),
          action: 'ticket_created',
          actor_id: matchingCustomer?.id || 'customer',
          actor_name: name?.trim() || matchingCustomer?.name || 'Client',
          actor_role: 'customer',
          previous_value: null,
          new_value: { status: 'open', source: req.body.source || 'web' },
          timestamp: new Date().toISOString()
        }
      ],
      call_logs: [] as any[],
      email_thread: [] as any[],
      created_at: new Date().toISOString()
    };

    const saved = await fileDB.saveExpertRequest(newRequest);
    console.log(`\n[support] Support query logged: ${requestId}`);
    console.log(`Customer: ${newRequest.name} | Phone: ${newRequest.phone} | Order: ${newRequest.order_id || 'N/A'} | Topic: ${newRequest.category}\n`);

    sendSupportQueryAlertToTeam(saved).catch((err) => console.error('[support] Team notification email failed:', err));

    if (saved.email) {
      sendExpertRequestCreatedEmail(saved).catch((err) => console.error('[support] Customer confirmation email failed:', err));
    }

    res.json({
      success: true,
      message: 'Support query logged successfully. A flight operations specialist has been alerted and will assist you shortly.',
      request: saved
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit support request' });
  }
});

router.get(['/profile/support-queries', '/support/my-queries'], async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const queryEmail = ((req.query.email as string) || user?.email || '').toLowerCase().trim();
    const queryPhone = ((req.query.phone as string) || user?.phone || '').replace(/\D/g, '').slice(-10);
    const userId = user?.id || (req.query.userId as string);

    if (!user && !queryEmail && !queryPhone && !userId) {
      res.status(401).json({ success: false, error: 'Authentication required or email/phone identifier needed.' });
      return;
    }

    const allRequests = await fileDB.getExpertRequests();
    const userQueries = allRequests.filter((reqItem) => {
      if (userId && reqItem.customer_id === userId) return true;
      if (queryEmail && reqItem.email && reqItem.email.toLowerCase().trim() === queryEmail) return true;
      if (queryPhone && reqItem.phone && reqItem.phone.replace(/\D/g, '').slice(-10) === queryPhone) return true;
      return false;
    }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    res.json({
      success: true,
      queries: userQueries,
      count: userQueries.length
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch user support queries' });
  }
});

router.get(['/support/expert-requests', '/support/tickets'], async (req, res) => {
  try {
    const actor = await requireSupportOperator(req, res);
    if (!actor) return;
    const requests = (await fileDB.getExpertRequests()).filter((ticket) => supportTicketVisibleTo(actor, ticket));
    const agents = (await fileDB.getUsers())
      .filter((user) => user.role === 'support' && user.status === 'active')
      .map((user) => ({ id: user.id, name: user.name, email: user.email }));
    res.json({ success: true, requests, agents });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch support requests' });
  }
});

router.get(['/support/expert-requests/:id/mission-context', '/support/tickets/:id/mission-context'], async (req, res) => {
  try {
    const actor = await requireSupportOperator(req, res);
    if (!actor) return;
    const id = String(req.params.id);
    const ticket = (await fileDB.getExpertRequests()).find((r) => r.id === id);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const droneSerial = String(ticket.drone_serial || '').trim();
    const orderId = String(ticket.order_id || '').trim();

    let issuePart = 'Component';
    if (ticket.category && ticket.category.includes(':')) {
      issuePart = ticket.category.split(':')[1].trim();
    } else if (ticket.message && ticket.message.includes('Part:')) {
      const match = ticket.message.match(/Part:\s*([^\]\n]+)/i);
      if (match) issuePart = match[1].trim();
    }

    const allOrders = await fileDB.getOrders();
    const matchedOrder = allOrders.find((o: any) =>
      (orderId && (String(o.id) === String(orderId) || String(o.order_number) === String(orderId))) ||
      (droneSerial && (
        String(o.assigned_drone_id).toLowerCase() === droneSerial.toLowerCase() ||
        String(o.drone_id).toLowerCase() === droneSerial.toLowerCase() ||
        (Array.isArray(o.reserved_inventory_ids) && o.reserved_inventory_ids.some((d: any) => String(d).toLowerCase() === droneSerial.toLowerCase())) ||
        (Array.isArray(o.items) && o.items.some((it: any) => String(it.serial_number || it.serial || it.id).toLowerCase() === droneSerial.toLowerCase()))
      ))
    );

    const allFleet = await fileDB.getFleet();
    const getModelForSerial = (serial: string) => {
      const match = allFleet.find((d: any) =>
        (d.serial_number && String(d.serial_number).toLowerCase() === String(serial).toLowerCase()) ||
        (d.id && String(d.id).toLowerCase() === String(serial).toLowerCase())
      );
      return match?.model || match?.model_name || '700RPAV';
    };

    if (matchedOrder) {
      const reserved = Array.isArray(matchedOrder.reserved_inventory_ids) && matchedOrder.reserved_inventory_ids.length > 0
        ? matchedOrder.reserved_inventory_ids
        : [matchedOrder.assigned_drone_id || matchedOrder.drone_id || droneSerial].filter(Boolean);

      const fleetDrones = reserved.map((s: string) => {
        const isDefective = String(s).toLowerCase() === droneSerial.toLowerCase();
        return {
          serial: s,
          model: matchedOrder.drone_model || getModelForSerial(s),
          is_reported_defective: isDefective,
          reported_part: isDefective ? issuePart : null,
          status: isDefective ? 'DEFECT_REPORTED' : 'OPERATIONAL',
          battery_level: isDefective ? '42% (Degraded / Connector Fault)' : '94% (Nominal)',
          notes: isDefective
            ? `Customer reported fault via QR scan: ${ticket.message || 'Component issue'}`
            : 'Active in mission deployment. Telemetry & motor systems nominal.'
        };
      });

      res.json({
        success: true,
        is_synthetic: false,
        mission: {
          order_id: matchedOrder.id,
          order_status: matchedOrder.status || 'in-transit',
          order_date: matchedOrder.created_at,
          customer_name: matchedOrder.customer_name || ticket.name,
          customer_email: matchedOrder.customer_email || ticket.email,
          customer_phone: matchedOrder.customer_phone || ticket.phone,
          pickup_address: matchedOrder.pickup_address || 'IndoWings Flight Station Alpha • Sector 62, Noida, UP',
          drop_address: matchedOrder.drop_address || 'Enterprise Client Hub • DLF Cyber City, Gurugram, HR',
          package_type: matchedOrder.package_type || '700RPAV Multi-UAV Consignment Fleet',
          fare_inr: matchedOrder.fare_inr || 2499,
          pilot_name: matchedOrder.pilot_name || matchedOrder.assigned_pilot_name || 'Capt. Rajesh Sharma (Lead Pilot)',
          total_drones_count: fleetDrones.length,
          defective_drone_serial: droneSerial,
          drones: fleetDrones
        }
      });
      return;
    }

    const targetSerial = droneSerial || 'IW-700RPAV-2026-0004';
    const serialBase = targetSerial.replace(/\d+$/, '');
    const numPart = targetSerial.match(/\d+$/)?.[0] || '0004';
    const num = parseInt(numPart, 10);
    const padLen = numPart.length;

    const companion1 = `${serialBase}${String(num + 1).padStart(padLen, '0')}`;
    const companion2 = `${serialBase}${String(num + 2).padStart(padLen, '0')}`;

    const primaryModel = getModelForSerial(targetSerial);
    const comp1Model = getModelForSerial(companion1);
    const comp2Model = getModelForSerial(companion2);

    const syntheticOrder = {
      order_id: ticket.order_id || `ORD-IND-${numPart}-9842`,
      order_status: 'in-transit',
      order_date: ticket.created_at || new Date().toISOString(),
      customer_name: ticket.name && ticket.name !== 'Verified Customer' ? ticket.name : 'Puneet Kushwaha (Enterprise Fleet Ops)',
      customer_email: ticket.email && ticket.email !== 'connect@indowings.com' ? ticket.email : 'puneet.kushwaha@indowings.com',
      customer_phone: ticket.phone && ticket.phone !== 'N/A' && ticket.phone !== 'N/A (Drone QR Scan)' ? ticket.phone : '+91 98765 43210',
      pickup_address: 'IndoWings Flight Station Alpha • Sector 62, Noida, UP',
      drop_address: 'Enterprise Logistics Terminal • DLF Cyber City, Gurugram, HR',
      package_type: '700RPAV Multi-UAV Tactical Consignment Fleet',
      fare_inr: 4850,
      pilot_name: 'Capt. Rajesh Sharma (Lead Pilot #PLT-4402)',
      total_drones_count: 3,
      defective_drone_serial: targetSerial,
      drones: [
        {
          serial: targetSerial,
          model: primaryModel,
          is_reported_defective: true,
          reported_part: issuePart,
          status: 'DEFECT_REPORTED',
          battery_level: '42% (Degraded / Connector Fault)',
          notes: `Customer scanned QR code on this specific airframe and reported: "${ticket.message || 'Issue reported'}". Unit flagged for immediate technical check.`
        },
        {
          serial: companion1,
          model: comp1Model,
          is_reported_defective: false,
          reported_part: null,
          status: 'OPERATIONAL',
          battery_level: '96% (Nominal)',
          notes: 'Active in order shipment. Telemetry nominal. Motors and avionics operational.'
        },
        {
          serial: companion2,
          model: comp2Model,
          is_reported_defective: false,
          reported_part: null,
          status: 'OPERATIONAL',
          battery_level: '98% (Nominal)',
          notes: 'Active in order shipment. Telemetry nominal. Motors and avionics operational.'
        }
      ]
    };

    res.json({
      success: true,
      is_synthetic: true,
      mission: syntheticOrder
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to resolve mission context' });
  }
});

router.post('/support/call-log', async (req, res) => {
  try {
    const actor = await requireSupportOperator(req, res);
    if (!actor) return;
    const { name, email, phone, call_type, call_date, call_time, duration_seconds, outcome, remarks, category, priority, order_id, drone_serial } = req.body;
    if (!String(name || '').trim() || (!String(phone || '').trim() && !String(email || '').trim()) || !String(remarks || '').trim()) {
      res.status(400).json({ error: 'Customer name, phone or email, and call notes are required.' });
      return;
    }
    const cleanEmail = String(email || '')
      .trim()
      .toLowerCase();
    const cleanPhone = String(phone || '').trim();
    const customer = (await fileDB.getUsers()).find(
      (user) => (cleanEmail && user.email?.toLowerCase() === cleanEmail) || (cleanPhone && user.phone?.replace(/\D/g, '').slice(-10) === cleanPhone.replace(/\D/g, '').slice(-10))
    );
    const now = new Date().toISOString();
    const id = `TKT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const callEntry = {
      id: crypto.randomUUID(),
      call_type: call_type === 'incoming' ? 'incoming' : 'outgoing',
      call_date: call_date || now.slice(0, 10),
      call_time: call_time || now.slice(11, 16),
      duration_seconds: Math.max(0, Number(duration_seconds) || 0),
      outcome: String(outcome || 'Call logged'),
      remarks: String(remarks).trim(),
      agent_id: actor.id,
      agent_name: actor.name,
      order_id: String(order_id || '').trim() || null,
      drone_serial: String(drone_serial || '').trim() || null,
      timestamp: now
    };
    const request = await fileDB.saveExpertRequest({
      id,
      customer_id: customer?.id || null,
      name: String(name).trim(),
      email: cleanEmail,
      phone: cleanPhone,
      order_id: callEntry.order_id,
      drone_serial: callEntry.drone_serial,
      category: String(category || 'General Query').trim(),
      subject: String(category || 'Phone call support').trim(),
      priority: ['low', 'medium', 'normal', 'high', 'urgent'].includes(String(priority).toLowerCase()) ? String(priority).toLowerCase() : 'normal',
      source: 'call',
      message: callEntry.remarks,
      status: 'open',
      assigned_to: actor.role === 'support' ? actor.id : null,
      assigned_agent_name: actor.role === 'support' ? actor.name : '',
      assigned_at: actor.role === 'support' ? now : null,
      assigned_by: actor.id,
      call_logs: [callEntry],
      timeline: [{ ...callEntry, type: 'call' }],
      audit_log: [
        {
          id: crypto.randomUUID(),
          action: 'call_ticket_created',
          actor_id: actor.id,
          actor_name: actor.name,
          actor_role: actor.role,
          previous_value: null,
          new_value: { status: 'open', source: 'call' },
          timestamp: now
        }
      ],
      created_at: now,
      updated_at: now
    });
    res.status(201).json({ success: true, request });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Could not save call log.' });
  }
});

router.patch(['/support/expert-requests/:id', '/support/tickets/:id'], async (req, res) => {
  try {
    const actor = await requireSupportOperator(req, res);
    if (!actor) return;
    const id = String(req.params.id);
    const existing = (await fileDB.getExpertRequests()).find((r) => r.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    if (!supportTicketVisibleTo(actor, existing)) {
      res.status(403).json({ error: 'This ticket is not assigned to your support account.' });
      return;
    }
    const { status, notes, resolution_notes, agent_name, priority, assigned_to, internal_note, source, subject } = req.body;
    const allowedStatuses = ['pending', 'open', 'in_progress', 'waiting_for_customer', 'waiting_for_internal_team', 'resolved', 'unresolved', 'reopened', 'closed'];
    if (status && !allowedStatuses.includes(String(status).toLowerCase())) {
      res.status(400).json({ error: 'Unsupported ticket status.' });
      return;
    }
    if (priority && !['low', 'normal', 'medium', 'high', 'urgent'].includes(String(priority).toLowerCase())) {
      res.status(400).json({ error: 'Unsupported ticket priority.' });
      return;
    }
    if (assigned_to !== undefined && actor.role !== 'admin') {
      res.status(403).json({ error: 'Only administrators can assign or reassign tickets.' });
      return;
    }
    if (assigned_to) {
      const assignee = (await fileDB.getUsers()).find((user) => user.id === assigned_to && user.role === 'support' && user.status === 'active');
      if (!assignee) {
        res.status(400).json({ error: 'Choose an active support agent.' });
        return;
      }
    }

    const updates: any = {};
    if (status) updates.status = String(status).toLowerCase();
    if (priority) updates.priority = String(priority).toLowerCase();
    if (subject) updates.subject = String(subject).trim();
    if (assigned_to !== undefined) {
      updates.assigned_to = assigned_to || null;
      updates.assigned_agent_name = assigned_to ? (await fileDB.getUsers()).find((user) => user.id === assigned_to)?.name || '' : '';
      updates.assigned_at = assigned_to ? new Date().toISOString() : null;
      updates.assigned_by = actor.id;
    }
    if (notes || resolution_notes) {
      updates.resolution_notes = resolution_notes || notes;
      updates.notes = notes || resolution_notes;
    }
    if (internal_note && String(internal_note).trim()) {
      updates.internal_notes = [
        ...(Array.isArray(existing.internal_notes) ? existing.internal_notes : []),
        { id: crypto.randomUUID(), note: String(internal_note).trim(), author_id: actor.id, author_name: actor.name, timestamp: new Date().toISOString() }
      ];
    }
    if (status && status !== existing.status) {
      updates.status_history = [
        ...(Array.isArray(existing.status_history) ? existing.status_history : []),
        { from: existing.status, to: updates.status, actor_id: actor.id, actor_name: actor.name, timestamp: new Date().toISOString() }
      ];
      updates.timeline = [
        ...(Array.isArray(existing.timeline) ? existing.timeline : []),
        { type: 'status_change', from: existing.status, to: updates.status, actor_id: actor.id, actor_name: actor.name, timestamp: new Date().toISOString() }
      ];
    }
    if (internal_note && String(internal_note).trim()) {
      updates.timeline = [
        ...(updates.timeline || existing.timeline || []),
        { type: 'internal_note', note: String(internal_note).trim(), actor_id: actor.id, actor_name: actor.name, timestamp: new Date().toISOString() }
      ];
    }
    updates.audit_log = addSupportAudit(
      existing,
      actor,
      'ticket_updated',
      {
        status: existing.status,
        priority: existing.priority,
        assigned_to: existing.assigned_to
      },
      {
        status: updates.status ?? existing.status,
        priority: updates.priority ?? existing.priority,
        assigned_to: updates.assigned_to ?? existing.assigned_to,
        internal_note: internal_note ? 'added' : undefined
      }
    );
    if (updates.status === 'resolved' || updates.status === 'closed') {
      if (!String(updates.resolution_notes || '').trim()) {
        res.status(400).json({ error: 'Resolution details are required before resolving or closing a ticket.' });
        return;
      }
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = actor.name;
      updates.timeline = [
        ...(updates.timeline || existing.timeline || []),
        { type: 'resolution', details: updates.resolution_notes, actor_id: actor.id, actor_name: actor.name, timestamp: new Date().toISOString() }
      ];
    }

    const updated = await fileDB.updateExpertRequest(id, updates);
    if (!updated) {
      res.status(404).json({ error: 'Ticket update failed' });
      return;
    }

    const statusChanged = Boolean(updates.status && updates.status !== existing.status);
    const recipientEmail = req.body.customer_email || updated.email;
    const shouldSendResolutionEmail = Boolean(
      recipientEmail && (
        req.body.send_email === true ||
        (statusChanged && (updates.status === 'resolved' || updates.status === 'closed')) ||
        (updates.resolution_notes && (updates.status === 'resolved' || updates.status === 'closed'))
      )
    );

    if (shouldSendResolutionEmail) {
      const emailTarget = { ...updated, email: recipientEmail };
      sendQueryResolutionEmail(emailTarget, updates.resolution_notes || 'Your query has been reviewed and resolved by our support team.', agent_name || actor.name || 'IndoWings Support Desk').catch((err) =>
        console.error('[support] Resolution email error:', err)
      );
    } else if (recipientEmail && statusChanged) {
      sendExpertRequestStatusEmail({ ...updated, email: recipientEmail }, updates.status).catch((err) => console.error('[support] Status update email error:', err));
    }

    res.json({ success: true, request: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

router.post('/support/tickets/:id/call-log', async (req, res) => {
  try {
    const actor = await requireSupportOperator(req, res);
    if (!actor) return;
    const id = String(req.params.id);
    const { duration_seconds, outcome, remarks, agent_name, call_type, call_date, call_time, category, priority, order_id, drone_serial } = req.body;

    const existing = (await fileDB.getExpertRequests()).find((r) => r.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    if (!supportTicketVisibleTo(actor, existing)) {
      res.status(403).json({ error: 'This ticket is not assigned to your support account.' });
      return;
    }

    const callLogEntry = {
      id: crypto.randomUUID(),
      call_type: call_type === 'outgoing' ? 'outgoing' : 'incoming',
      call_date: call_date || new Date().toISOString().slice(0, 10),
      call_time: call_time || new Date().toISOString().slice(11, 16),
      duration_seconds: Number(duration_seconds) || 60,
      outcome: outcome || 'Call Completed',
      remarks: remarks || '',
      agent_id: actor.id,
      agent_name: actor.name || agent_name || 'Support Agent',
      category: category || existing.category,
      priority: priority || existing.priority,
      order_id: order_id || existing.order_id || null,
      drone_serial: drone_serial || existing.drone_serial || null,
      timestamp: new Date().toISOString()
    };

    const call_logs = Array.isArray(existing.call_logs) ? [...existing.call_logs, callLogEntry] : [callLogEntry];
    const audit_log = addSupportAudit(existing, actor, 'call_logged', null, { call_type: callLogEntry.call_type, outcome: callLogEntry.outcome });
    const timeline = [...(Array.isArray(existing.timeline) ? existing.timeline : []), { ...callLogEntry, type: 'call' }];
    const updated = await fileDB.updateExpertRequest(id, { call_logs, timeline, audit_log, last_contacted_at: new Date().toISOString() });

    console.log(`[support] Call logged for ${id}: ${callLogEntry.outcome} (${callLogEntry.duration_seconds}s)`);

    res.json({ success: true, request: updated, call_log: callLogEntry });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to log call' });
  }
});

router.post('/support/tickets/:id/send-email', async (req, res) => {
  try {
    const actor = await requireSupportOperator(req, res);
    if (!actor) return;
    const id = String(req.params.id);
    const { subject, message, agent_name } = req.body;

    const existing = (await fileDB.getExpertRequests()).find((r) => r.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    if (!supportTicketVisibleTo(actor, existing)) {
      res.status(403).json({ error: 'This ticket is not assigned to your support account.' });
      return;
    }

    if (!existing.email) {
      res.status(400).json({ error: 'Customer has no email address associated with this ticket' });
      return;
    }

    const requestedSubject = typeof subject === 'string' && subject.trim()
      ? subject.trim()
      : 'IndoFleet Operations';
    const emailSubject = requestedSubject.toLowerCase().includes(existing.id.toLowerCase())
      ? requestedSubject
      : `Re: [${existing.id}] ${requestedSubject}`;
    if (typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Reply message is required.' });
      return;
    }
    const delivery = await sendDirectSupportEmail(existing.email, emailSubject, message.trim(), actor.name || agent_name || 'IndoFleet Support Desk');
    const emailEntry = {
      id: `MSG-${Date.now().toString().slice(-5)}`,
      direction: 'outbound',
      to: existing.email,
      subject: emailSubject,
      message,
      agent_id: actor.id,
      agent_name: actor.name || agent_name || 'Support Agent',
      timestamp: new Date().toISOString(),
      delivery_status: delivery.success ? 'sent' : 'failed',
      provider_message_id: delivery.success ? delivery.messageId : undefined,
      delivery_error: delivery.success ? undefined : delivery.error
    };

    const email_thread = Array.isArray(existing.email_thread) ? [...existing.email_thread, emailEntry] : [emailEntry];
    const timeline = [...(Array.isArray(existing.timeline) ? existing.timeline : []), { ...emailEntry, type: 'email_reply' }];
    const audit_log = addSupportAudit(existing, actor, delivery.success ? 'customer_reply_sent' : 'customer_reply_failed', null, {
      to: existing.email,
      subject: emailSubject,
      provider_message_id: delivery.success ? delivery.messageId : undefined
    });
    const updated = await fileDB.updateExpertRequest(id, { email_thread, timeline, audit_log });

    if (!delivery.success) {
      res.status(502).json({ error: `Resend could not deliver the reply: ${delivery.error}`, request: updated, email_entry: emailEntry });
      return;
    }

    console.log(`[support] Direct email sent to ${existing.email} for ticket ${id}`);

    res.json({ success: true, request: updated, email_entry: emailEntry });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send direct email' });
  }
});

router.get('/support/tickets/:id/emails/:emailId/attachments/:attachmentId', async (req, res) => {
  const actor = await requireSupportOperator(req, res);
  if (!actor) return;
  const ticket = (await fileDB.getExpertRequests()).find((request) => request.id === String(req.params.id));
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found.' });
    return;
  }
  if (!supportTicketVisibleTo(actor, ticket)) {
    res.status(403).json({ error: 'This ticket is not assigned to your support account.' });
    return;
  }
  const emailEntry = (Array.isArray(ticket.email_thread) ? ticket.email_thread : []).find((entry: any) =>
    entry.direction === 'inbound' && entry.id === String(req.params.emailId)
    && Array.isArray(entry.attachments) && entry.attachments.some((attachment: any) => attachment.id === String(req.params.attachmentId))
  );
  if (!emailEntry) {
    res.status(404).json({ error: 'Email attachment not found.' });
    return;
  }

  try {
    const attachment = await getReceivedSupportAttachment(String(req.params.emailId), String(req.params.attachmentId));
    if (attachment.size > 20 * 1024 * 1024) {
      res.status(413).json({ error: 'This attachment is too large to download from Support Desk.' });
      return;
    }
    const downloadUrl = new URL(attachment.download_url);
    if (downloadUrl.protocol !== 'https:') {
      res.status(502).json({ error: 'Resend returned an invalid attachment download URL.' });
      return;
    }
    const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(15_000), redirect: 'error' });
    if (!response.ok) {
      res.status(502).json({ error: 'Resend could not provide the email attachment.' });
      return;
    }
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 20 * 1024 * 1024) {
      res.status(413).json({ error: 'This attachment is too large to download from Support Desk.' });
      return;
    }
    const reader = response.body?.getReader();
    if (!reader) {
      res.status(502).json({ error: 'Resend returned an empty email attachment.' });
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 20 * 1024 * 1024) {
        await reader.cancel();
        res.status(413).json({ error: 'This attachment is too large to download from Support Desk.' });
        return;
      }
      chunks.push(Buffer.from(value));
    }
    const content = Buffer.concat(chunks);
    const filename = (attachment.filename || 'support-attachment')
      .replace(/[\\/\r\n"]/g, '_')
      .slice(0, 180);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="support-attachment"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(content);
  } catch (error) {
    console.error('[support] Could not download inbound email attachment:', error instanceof Error ? error.message : 'Download error.');
    res.status(502).json({ error: 'Could not download the email attachment from Resend.' });
  }
});

router.get('/feedbacks', async (req, res) => {
  try {
    const feedbacks = await apiCache.getOrSet('delivery:feedbacks', 20000, () => fileDB.getFeedbacks());
    res.json({ success: true, feedbacks });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch feedbacks' });
  }
});

router.post('/feedbacks', async (req, res) => {
  try {
    const { order_id, user_name, user_email, user_phone, drone_name, rating, category, message } = req.body;
    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Feedback message is required' });
      return;
    }

    let verified_order = false;
    let drone = drone_name;
    if (order_id) {
      const order = await fileDB.findOrderById(order_id);
      if (order) {
        verified_order = true;
        if (!drone) drone = order.drone_model || order.drone_id;
        await fileDB.updateOrder(order.id, { feedback_submitted: true, feedback_rating: rating });
      }
    }

    const feedback = {
      id: `FB-${Date.now().toString().slice(-6)}`,
      order_id: order_id || null,
      user_name: user_name?.trim() || 'Verified Customer',
      user_email: user_email?.trim() || 'guest@IndoFleet.com',
      user_phone: user_phone?.trim() || '',
      drone_name: drone || 'Cyberone UAV Platform',
      rating: Number(rating) || 5,
      category: category || 'Platform Experience',
      message: message.trim(),
      created_at: new Date().toISOString(),
      verified_order,
      status: 'published'
    };

    const saved = await fileDB.saveFeedback(feedback);
    apiCache.invalidate('delivery:feedbacks');
    console.log(`[feedback] New review from ${feedback.user_name} (${feedback.rating}★) for ${feedback.drone_name}`);

    res.status(201).json({
      success: true,
      message: 'Thank you! Your feedback has been published and shared with flight operations.',
      feedback: saved
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record feedback' });
  }
});

router.patch('/feedbacks/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const updated = await fileDB.updateFeedback(id, { status, admin_notes });
    if (!updated) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }
    apiCache.invalidate('delivery:feedbacks');
    res.json({ success: true, feedback: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

router.delete('/feedbacks/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { id } = req.params;
    await fileDB.deleteFeedback(id);
    apiCache.invalidate('delivery:feedbacks');
    res.json({ success: true, message: 'Feedback removed' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

router.post('/chatbot/track-by-id', async (req, res) => {
  try {
    const { order_id, customer_name, verification_name, name: altName, skip_name_check } = req.body;
    const providedName = (customer_name || verification_name || altName || '').trim();

    if (!order_id) {
      res.status(400).json({ success: false, message: 'Order ID is required' });
      return;
    }

    const cleanId = order_id.trim();
    const order = await fileDB.findOrderById(cleanId);

    if (!order) {
      res.status(404).json({
        success: false,
        message: `Order #${cleanId} was not found in our dispatch database. Please verify the ID.`
      });
      return;
    }

    if (!skip_name_check && !providedName) {
      res.json({
        success: true,
        verified: false,
        requires_name: true,
        order_id: order.id,
        message: `Order #${order.id} located! For security verification, please enter the Customer Name registered with this booking.`
      });
      return;
    }

    if (!skip_name_check) {
      const inputName = providedName.toLowerCase();
      const actualCustomer = (order.customer_name || '').toLowerCase();
      const actualRecipient = (order.recipient_name || '').toLowerCase();

      const matchesCustomer =
        actualCustomer && (actualCustomer.includes(inputName) || inputName.includes(actualCustomer) || actualCustomer.split(' ').some((part: string) => part.length >= 3 && inputName.includes(part)));
      const matchesRecipient =
        actualRecipient &&
        (actualRecipient.includes(inputName) || inputName.includes(actualRecipient) || actualRecipient.split(' ').some((part: string) => part.length >= 3 && inputName.includes(part)));

      if (!matchesCustomer && !matchesRecipient) {
        res.json({
          success: false,
          reason: 'NAME_MISMATCH',
          message: `Customer name "${providedName}" did not match our dispatch records for Order #${order.id}. Please enter the registered name.`
        });
        return;
      }
    }

    const fleet = await fileDB.getFleet();
    const drone = fleet.find((d: any) => d.id === order.drone_id || d.model === order.drone_model) || {
      model: order.drone_model || 'Cyberone Pro',
      battery: 88,
      status: 'in-flight',
      max_payload: '5.0 kg',
      range: '45 km',
      speed: '65 km/h'
    };

    let current_location = 'Preparing on Helipad';
    let estimated_remaining_time = 'Calculating...';
    let distance_remaining = `${order.aerial_distance_km || 14.2} km`;
    let altitude = '0m (Ground)';
    let speed = '0 km/h';

    if (order.status === 'delivered') {
      current_location = `Delivered at ${order.drop_address}`;
      estimated_remaining_time = 'Delivered (0 mins)';
      distance_remaining = '0 km';
      altitude = '0m (Touchdown Complete)';
      speed = '0 km/h';
    } else if (order.status === 'approaching') {
      current_location = 'Hovering at 15m over Destination Drop Zone';
      estimated_remaining_time = '2 - 3 Mins (Motorized Winch Deploying)';
      distance_remaining = '0.3 km';
      altitude = '15m AGL (Winch Hover)';
      speed = '4 km/h';
    } else if (order.status === 'in-flight') {
      current_location = `Air Corridor En-Route between ${order.pickup_address} and ${order.drop_address}`;
      estimated_remaining_time = `${Math.max(4, Math.round((order.flight_duration_mins || 20) * 0.4))} Mins`;
      distance_remaining = `${(Number(order.aerial_distance_km || 14.2) * 0.4).toFixed(1)} km`;
      altitude = '120m AGL (DGCA Green Airway)';
      speed = '68 km/h';
    } else if (order.status === 'taking-off') {
      current_location = `Vertical Ascent from Hub (${order.pickup_address})`;
      estimated_remaining_time = `${order.flight_duration_mins || 20} Mins`;
      distance_remaining = `${order.aerial_distance_km || 14.2} km`;
      altitude = '45m AGL';
      speed = '25 km/h';
    } else if (order.status === 'assigned') {
      current_location = `Assigned to UAV on Helipad Hub`;
      estimated_remaining_time = `${order.flight_duration_mins || 24} Mins`;
      distance_remaining = `${order.aerial_distance_km || 14.2} km`;
      altitude = '0m AGL (Pre-flight check)';
      speed = '0 km/h';
    } else {
      current_location = 'Order Logged in Air Dispatch Queue';
      estimated_remaining_time = `${order.flight_duration_mins || 25} Mins`;
      distance_remaining = `${order.aerial_distance_km || 14.2} km`;
    }

    res.json({
      success: true,
      verified: true,
      order: {
        id: order.id,
        customer_name: order.customer_name,
        recipient_name: order.recipient_name,
        package_type: order.package_type,
        weight_kg: order.weight_kg,
        status: order.status,
        pickup_address: order.pickup_address,
        drop_address: order.drop_address,
        aerial_distance_km: order.aerial_distance_km || 14.2,
        distance_remaining,
        estimated_remaining_time,
        current_location,
        altitude,
        speed,
        created_at: order.created_at,
        drone: {
          id: order.drone_id,
          model: order.drone_model || drone.model,
          battery: drone.battery || 88,
          max_payload: drone.max_payload || '5.0 kg',
          range: drone.range || '45 km',
          specialty: 'Motorized Precision Tether Winch'
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Tracking error: ' + err.message });
  }
});

router.post('/chatbot/request-id-otp', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier || !identifier.trim()) {
      res.status(400).json({ success: false, message: 'Mobile number or Email address is required.' });
      return;
    }

    const raw = identifier.trim();
    const isEmail = raw.includes('@');
    const cleanEmail = isEmail ? raw.toLowerCase() : '';
    const cleanPhone = !isEmail ? raw.replace(/[^0-9]/g, '').slice(-10) : '';

    if (!isEmail && cleanPhone.length < 10) {
      res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number or email address.' });
      return;
    }

    const users = await fileDB.getUsers();
    let linkedEmail = cleanEmail;
    let linkedPhone = cleanPhone;

    if (cleanPhone) {
      const user = users.find((u: any) => u.phone && u.phone.replace(/[^0-9]/g, '').endsWith(cleanPhone));
      if (user?.email && !linkedEmail) {
        linkedEmail = user.email.toLowerCase().trim();
      }
    }
    if (cleanEmail) {
      const user = users.find((u: any) => u.email && u.email.toLowerCase().trim() === cleanEmail);
      if (user?.phone && !linkedPhone) {
        linkedPhone = user.phone.replace(/[^0-9]/g, '').slice(-10);
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (cleanEmail) await fileDB.saveOTP(cleanEmail, otp, { email: cleanEmail, phone: linkedPhone ? `+91${linkedPhone}` : undefined });
    if (cleanPhone) await fileDB.saveOTP(cleanPhone, otp, { phone: `+91${cleanPhone}`, email: linkedEmail || undefined });
    if (linkedEmail && linkedEmail !== cleanEmail) await fileDB.saveOTP(linkedEmail, otp, { email: linkedEmail, phone: cleanPhone ? `+91${cleanPhone}` : undefined });
    if (linkedPhone && linkedPhone !== cleanPhone) await fileDB.saveOTP(linkedPhone, otp, { phone: `+91${linkedPhone}`, email: cleanEmail || undefined });

    console.log(`[bot] Verification OTP dispatched to ${cleanEmail || cleanPhone}`);

    const targetEmail = cleanEmail || linkedEmail;
    if (targetEmail) {
      sendOtpNotification({ email: targetEmail, otp, phone: cleanPhone || linkedPhone })
        .then(() => console.log(`[bot] Email sent: OTP delivered to ${targetEmail}`))
        .catch((err) => console.error('Chatbot email OTP error:', err));
    }

    const channelDesc = targetEmail ? maskEmail(targetEmail) : `+91 ${cleanPhone}`;

    res.json({
      success: true,
      channel: 'email',
      identifier: isEmail ? cleanEmail : cleanPhone,
      message: `A 6-digit verification code has been dispatched to ${channelDesc}.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'OTP dispatch failed: ' + err.message });
  }
});

router.post('/chatbot/verify-id-otp', async (req, res) => {
  try {
    const { identifier, otp } = req.body;
    if (!identifier || !otp) {
      res.status(400).json({ success: false, message: 'Identifier and verification OTP are required.' });
      return;
    }

    const raw = identifier.trim();
    const isEmail = raw.includes('@');
    const cleanEmail = isEmail ? raw.toLowerCase() : '';
    const cleanPhone = !isEmail ? raw.replace(/[^0-9]/g, '').slice(-10) : '';
    const fullPhone = cleanPhone ? `+91${cleanPhone}` : '';
    const trimmedOtp = otp.toString().trim();

    const users = await fileDB.getUsers();
    let linkedEmail = cleanEmail;
    let linkedPhone = cleanPhone;

    if (cleanPhone) {
      const u = users.find((u: any) => u.phone && u.phone.replace(/[^0-9]/g, '').endsWith(cleanPhone));
      if (u?.email) linkedEmail = u.email.toLowerCase().trim();
    }
    if (cleanEmail) {
      const u = users.find((u: any) => u.email && u.email.toLowerCase().trim() === cleanEmail);
      if (u?.phone) linkedPhone = u.phone.replace(/[^0-9]/g, '').slice(-10);
    }

    let isValid = false;

    const checkKeys = [cleanPhone, cleanEmail, linkedEmail, linkedPhone].filter(Boolean);
    for (const k of checkKeys) {
      const localRes = await fileDB.verifyOTP(k, trimmedOtp);
      if (localRes.valid) {
        isValid = true;
        console.log(`[bot] Session verified: OTP Verified for key "${k}"`);
        break;
      }
    }

    if (!isValid) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please check and try again.'
      });
      return;
    }

    const allOrders = await fileDB.getOrders();
    const searchEmails = new Set<string>();
    const searchPhones = new Set<string>();

    if (cleanEmail) searchEmails.add(cleanEmail);
    if (linkedEmail) searchEmails.add(linkedEmail);
    if (cleanPhone) searchPhones.add(cleanPhone);
    if (linkedPhone) searchPhones.add(linkedPhone);

    users.forEach((u: any) => {
      const uEmail = (u.email || '').toLowerCase().trim();
      const uPhone = (u.phone || '').replace(/[^0-9]/g, '').slice(-10);
      if (searchEmails.has(uEmail) || searchPhones.has(uPhone)) {
        if (uEmail) searchEmails.add(uEmail);
        if (uPhone) searchPhones.add(uPhone);
      }
    });

    const matchingOrders = allOrders.filter((o: any) => {
      const oEmail = (o.customer_email || '').toLowerCase().trim();
      const oPhone = (o.customer_phone || '').replace(/[^0-9]/g, '').slice(-10);
      for (const em of searchEmails) {
        if (em && oEmail === em) return true;
      }
      for (const ph of searchPhones) {
        if (ph && oPhone.endsWith(ph)) return true;
      }
      return false;
    });

    res.json({
      success: true,
      verified: true,
      total: matchingOrders.length,
      orders: matchingOrders.map((o: any) => ({
        id: o.id,
        created_at: o.created_at,
        customer_name: o.customer_name,
        package_type: o.package_type,
        drone_model: o.drone_model,
        pickup_address: o.pickup_address,
        drop_address: o.drop_address,
        status: o.status,
        flight_duration_mins: o.flight_duration_mins,
        fare_inr: o.fare_inr
      }))
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Verification error: ' + err.message });
  }
});

router.post('/chatbot/lookup-order', async (req, res) => {
  try {
    const { name, phone, email, date } = req.body;
    const cleanName = (name || '').trim().toLowerCase();
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '').slice(-10);
    const cleanEmail = (email || '').toLowerCase().trim();

    if (!cleanName && !cleanPhone && !cleanEmail) {
      res.status(400).json({
        success: false,
        message: 'Please provide your registered Name and Phone number or Email.'
      });
      return;
    }

    const allOrders = await fileDB.getOrders();
    const matches = allOrders.filter((o: any) => {
      const oCust = (o.customer_name || '').toLowerCase();
      const oRecip = (o.recipient_name || '').toLowerCase();
      const oPhone = (o.customer_phone || '').replace(/[^0-9]/g, '').slice(-10);
      const oEmail = (o.customer_email || '').toLowerCase().trim();

      let nameMatched = false;
      if (cleanName) {
        nameMatched =
          oCust.includes(cleanName) ||
          cleanName.includes(oCust) ||
          oRecip.includes(cleanName) ||
          cleanName.includes(oRecip) ||
          oCust.split(' ').some((p: string) => p.length >= 3 && cleanName.includes(p));
      }

      let contactMatched = false;
      if (cleanPhone && oPhone.endsWith(cleanPhone)) contactMatched = true;
      if (cleanEmail && oEmail === cleanEmail) contactMatched = true;

      if (cleanName && (cleanPhone || cleanEmail)) {
        if (!nameMatched || !contactMatched) return false;
      } else if (cleanName) {
        if (!nameMatched) return false;
      } else if (cleanPhone || cleanEmail) {
        if (!contactMatched) return false;
      }

      if (date && String(date).trim() && o.created_at) {
        const dStr = String(date).trim().toLowerCase();
        const oDate = new Date(o.created_at).toISOString().slice(0, 10);
        if (dStr === 'today') {
          const today = new Date().toISOString().slice(0, 10);
          if (oDate !== today) return false;
        } else if (dStr === 'yesterday') {
          const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          if (oDate !== yest) return false;
        } else if (dStr.length >= 4) {
          if (!o.created_at.toLowerCase().includes(dStr) && !oDate.includes(dStr)) {
            const formatted = new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toLowerCase();
            if (!formatted.includes(dStr)) {
            }
          }
        }
      }

      return true;
    });

    if (matches.length === 0) {
      res.json({
        success: false,
        message: 'No orders found matching the provided Name, Phone, or Date. Please check your details or contact support.'
      });
      return;
    }

    res.json({
      success: true,
      found: true,
      count: matches.length,
      orders: matches.map((o: any) => ({
        id: o.id,
        created_at: o.created_at,
        customer_name: o.customer_name || o.client_name,
        recipient_name: o.recipient_name,
        drone_model: o.drone_model || o.package_type || 'UAV Hardware Consignment',
        status: o.status,
        pickup_address: o.pickup_address,
        drop_address: o.drop_address || o.destination_address,
        units_count: o.units_count || (o.reserved_inventory_ids || []).length || 1
      }))
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Order lookup failed: ' + err.message });
  }
});

const activeSosAlerts: any[] = [];
const dispatcherHandoverOtps: Record<string, { otp: string; orderId: string; expiresAt: number }> = {};
const customerDeliveryOtps: Record<string, { otp: string; orderId: string; expiresAt: number }> = {};

function getTodayStartIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

router.post('/pilot/login', async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if ((!email && !phone) || !password) {
      res.status(400).json({ success: false, error: 'Please enter registered Pilot ID/Email/Phone and password' });
      return;
    }

    const cleanEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const cleanPhone = typeof phone === 'string' ? phone.replace(/[^0-9]/g, '').slice(-10) : '';
    const cleanPass = password.toString().replace(/\s+/g, '');

    let user: any = null;
    if (cleanEmail) user = await fileDB.findUserByEmail(cleanEmail);
    if (!user && cleanPhone) user = await fileDB.findUserByPhone(cleanPhone);
    if (!user && cleanEmail) user = await fileDB.findUserById(cleanEmail.toUpperCase());

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Delivery account not found. Please check your Delivery ID/Email or contact Admin.'
      });
      return;
    }

    const userRole = (user.role || '').toLowerCase();
    const allowedRoles = ['delivery', 'pilot', 'admin'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: `Unauthorized Access: This app is strictly for Delivery Partners and Admins. Your account has the role '${user.role || 'user'}'. Please use the IndoFleet Web Portal or contact Admin.`
      });
      return;
    }

    if (user.status && (user.status.toLowerCase() === 'suspended' || user.status.toLowerCase() === 'restricted' || user.status.toLowerCase() === 'inactive')) {
      res.status(403).json({ success: false, error: 'This delivery account is currently restricted or suspended.' });
      return;
    }

    const validPassword = user.password_hash
      ? await fileDB.verifyPassword(cleanPass, user.password_hash)
      : (cleanPass === user.password && user.password);

    if (!validPassword) {
      res.status(401).json({ success: false, error: 'Invalid password. Please check and retry.' });
      return;
    }

    const safeUser = publicUser(user);
    const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      message: 'Pilot authenticated successfully',
      token,
      user: safeUser,
      must_change_password: Boolean(user.must_change_password)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
});

router.post('/pilot/change-password', async (req, res) => {
  try {
    const { userId, email, oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 6) {
      res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
      return;
    }

    let user: any = null;
    if (userId) user = await fileDB.findUserById(userId);
    if (!user && email) user = await fileDB.findUserByEmail(email.toLowerCase().trim());

    if (!user) {
      res.status(404).json({ success: false, error: 'Pilot account not found' });
      return;
    }

    if (!user.must_change_password && oldPassword) {
      const validOld = user.password_hash
        ? await fileDB.verifyPassword(oldPassword, user.password_hash)
        : (oldPassword === user.password && user.password);
      if (!validOld) {
        res.status(400).json({ success: false, error: 'Incorrect existing password.' });
        return;
      }
    }

    await fileDB.updateUser(user.id, {
      password: newPassword.trim(),
      must_change_password: false,
      password_updated_at: new Date().toISOString()
    });

    if (user.email) {
      sendPasswordChangedEmail(user.email, user.name).catch((err) => console.error('[mail] Password change alert error:', err));
    }

    res.json({
      success: true,
      message: 'Password successfully changed and updated!'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to change password' });
  }
});

router.get('/pilot/dashboard', async (req, res) => {
  try {
    const pilotId = (req.query.pilotId as string) || '';
    const orders = await fileDB.getOrders();
    const todayStart = getTodayStartIso();

    const pilotOrders = pilotId
      ? orders.filter((o: any) => o.assigned_pilot_id === pilotId || o.pilot_assigned === pilotId || !o.assigned_pilot_id)
      : orders;

    const totalAssigned = pilotOrders.filter((o: any) => ['pending', 'assigned', 'taking-off', 'in-flight', 'out-for-delivery'].includes(o.status)).length;
    const totalDelivered = pilotOrders.filter((o: any) => o.status === 'delivered').length;
    const totalInTransit = pilotOrders.filter((o: any) => ['taking-off', 'in-flight', 'out-for-delivery'].includes(o.status)).length;
    const totalMissed = 0;
    const totalQueue = 0;

    const currentTime = new Date();
    const twentyFourHoursAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const isOrderToday = (o: any) => {
      const d = o.delivered_at || o.completed_at || o.assigned_at || o.created_at || '';
      return d >= todayStart || d >= twentyFourHoursAgo;
    };

    const todaysOrders = pilotOrders.filter(isOrderToday);
    const todaysAssigned = totalAssigned;
    const todaysDelivered = pilotOrders.filter((o: any) => o.status === 'delivered' && isOrderToday(o)).length;
    const todaysMissed = 0;
    const todaysQueue = 0;

    const completionRate = totalDelivered + totalMissed > 0
      ? Math.round((totalDelivered / (totalDelivered + totalMissed)) * 100)
      : 100;

    const activeOrders = pilotOrders
      .filter((o: any) => ['pending', 'assigned', 'taking-off', 'in-flight', 'out-for-delivery'].includes(o.status))
      .map((o: any) => ({
        id: o.id,
        order_number: o.order_number || o.id,
        customer_name: o.customer_name || o.client_name || 'Customer',
        customer_phone: o.customer_phone || '',
        customer_email: o.customer_email || '',
        recipient_name: o.recipient_name || o.customer_name || 'Recipient',
        pickup_address: o.pickup_address || '',
        drop_address: o.drop_address || o.delivery_address || o.destination_address || '',
        pickup_location: o.pickup_location || {
          latitude: Number(o.pickup_lat) || 28.6037,
          longitude: Number(o.pickup_lng) || 77.3661,
          name: o.pickup_address || 'Central Dispatch Hub (Sector 60, Noida)'
        },
        destination_location: o.destination_location || {
          latitude: Number(o.delivery_lat) || Number(o.drop_lat) || 28.6280,
          longitude: Number(o.delivery_lng) || Number(o.drop_lng) || 77.3750,
          address: o.drop_address || o.delivery_address || 'Delivery Destination'
        },
        delivery_lat: Number(o.delivery_lat) || Number(o.drop_lat) || (o.destination_location?.latitude) || 28.6280,
        delivery_lng: Number(o.delivery_lng) || Number(o.drop_lng) || (o.destination_location?.longitude) || 77.3750,
        pickup_lat: Number(o.pickup_lat) || (o.pickup_location?.latitude) || 28.6037,
        pickup_lng: Number(o.pickup_lng) || (o.pickup_location?.longitude) || 77.3661,
        drone_model: o.drone_model || 'UAV',
        drone_id: o.drone_id || (o.reserved_inventory_ids || [])[0] || '',
        assigned_drone_id: o.assigned_drone_id || o.drone_id || (o.reserved_inventory_ids || [])[0] || '',
        reserved_inventory_ids: Array.isArray(o.reserved_inventory_ids) ? o.reserved_inventory_ids : [],
        assigned_drone_ids: Array.isArray(o.assigned_drone_ids) ? o.assigned_drone_ids : (Array.isArray(o.reserved_inventory_ids) ? o.reserved_inventory_ids : []),
        drones: Array.isArray(o.reserved_inventory_ids) && o.reserved_inventory_ids.length > 0 ? o.reserved_inventory_ids : [o.assigned_drone_id || o.drone_id].filter(Boolean),
        hub_inspected_drone_ids: Array.isArray(o.hub_inspected_drone_ids) ? o.hub_inspected_drone_ids : [],
        inspected_drone_ids: Array.isArray(o.inspected_drone_ids) ? o.inspected_drone_ids : [],
        status: o.status,
        units_count: o.units_count || (o.reserved_inventory_ids || []).length || 1,
        weight_kg: o.weight_kg || 0,
        fare_inr: o.fare_inr || 0,
        payment_status: o.payment_status || 'Prepaid',
        items: o.items || [],
        assigned_by_name: o.assigned_by_name || 'Operations Desk',
        assigned_by_role: o.assigned_by_role || 'Dispatcher',
        assigned_at: o.assigned_at || o.created_at,
        pilot_acceptance_status: o.pilot_acceptance_status || (o.status === 'in-flight' ? 'accepted' : 'pending_acceptance'),
        last_known_location: o.last_known_location || null,
        created_at: o.created_at
      }));

    const historyOrders = pilotOrders
      .filter((o: any) => ['delivered', 'completed', 'cancelled', 'missed'].includes(o.status))
      .map((o: any) => ({
        id: o.id,
        order_number: o.order_number || o.id,
        customer_name: o.customer_name || o.client_name || 'Customer',
        customer_phone: o.customer_phone || '',
        customer_email: o.customer_email || '',
        recipient_name: o.recipient_name || o.customer_name || 'Recipient',
        pickup_address: o.pickup_address || '',
        drop_address: o.drop_address || o.delivery_address || o.destination_address || '',
        pickup_location: o.pickup_location || {
          latitude: Number(o.pickup_lat) || 28.6037,
          longitude: Number(o.pickup_lng) || 77.3661,
          name: o.pickup_address || 'Central Dispatch Hub (Sector 60, Noida)'
        },
        destination_location: o.destination_location || {
          latitude: Number(o.delivery_lat) || Number(o.drop_lat) || 28.6280,
          longitude: Number(o.delivery_lng) || Number(o.drop_lng) || 77.3750,
          address: o.drop_address || o.delivery_address || 'Delivery Destination'
        },
        delivery_lat: Number(o.delivery_lat) || Number(o.drop_lat) || (o.destination_location?.latitude) || 28.6280,
        delivery_lng: Number(o.delivery_lng) || Number(o.drop_lng) || (o.destination_location?.longitude) || 77.3750,
        pickup_lat: Number(o.pickup_lat) || (o.pickup_location?.latitude) || 28.6037,
        pickup_lng: Number(o.pickup_lng) || (o.pickup_location?.longitude) || 77.3661,
        drone_model: o.drone_model || '700RPAV',
        drone_id: o.drone_id || (o.reserved_inventory_ids || [])[0] || '',
        assigned_drone_id: o.assigned_drone_id || o.drone_id || (o.reserved_inventory_ids || [])[0] || '',
        reserved_inventory_ids: Array.isArray(o.reserved_inventory_ids) ? o.reserved_inventory_ids : [],
        assigned_drone_ids: Array.isArray(o.assigned_drone_ids) ? o.assigned_drone_ids : (Array.isArray(o.reserved_inventory_ids) ? o.reserved_inventory_ids : []),
        drones: Array.isArray(o.reserved_inventory_ids) && o.reserved_inventory_ids.length > 0 ? o.reserved_inventory_ids : [o.assigned_drone_id || o.drone_id].filter(Boolean),
        hub_inspected_drone_ids: Array.isArray(o.hub_inspected_drone_ids) ? o.hub_inspected_drone_ids : [],
        inspected_drone_ids: Array.isArray(o.inspected_drone_ids) ? o.inspected_drone_ids : [],
        status: o.status,
        units_count: o.units_count || (o.reserved_inventory_ids || []).length || 1,
        weight_kg: o.weight_kg || 0,
        fare_inr: o.fare_inr || 0,
        payment_status: o.payment_status || 'Prepaid',
        items: o.items || [],
        delivered_at: o.delivered_at || o.completed_at || o.updated_at,
        pod_signature: o.pod_signature || null,
        pod_photo: o.pod_photo || null,
        delivery_notes: o.delivery_notes || o.notes || '',
        created_at: o.created_at
      }))
      .sort((a: any, b: any) => new Date(b.delivered_at || b.created_at).getTime() - new Date(a.delivered_at || a.created_at).getTime());

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const weekly_trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayName = dayNames[d.getDay()];

      const dayOrders = pilotOrders.filter((o: any) => (o.created_at || '').startsWith(dayStr));
      const completed = dayOrders.filter((o: any) => o.status === 'delivered').length;
      const missed = dayOrders.filter((o: any) => o.status === 'cancelled' || o.status === 'missed').length;

      weekly_trend.push({ day: dayName, completed, missed });
    }

    const hourly_active: { time: string; orders: number }[] = [];
    const hours = ['08:00', '11:00', '14:00', '17:00', '20:00'];
    for (const h of hours) {
      const hourNum = parseInt(h.split(':')[0], 10);
      const count = todaysOrders.filter((o: any) => {
        if (!o.created_at) return false;
        try {
          const orderDate = new Date(o.created_at);
          const orderHour = orderDate.getHours();
          return orderHour >= hourNum - 1 && orderHour <= hourNum + 1;
        } catch {
          return false;
        }
      }).length;
      hourly_active.push({ time: h, orders: count });
    }

    res.json({
      success: true,
      kpis: {
        total_assigned: totalAssigned,
        total_delivered: totalDelivered,
        in_transit: totalInTransit,
        total_missed: 0,
        total_queue: 0,
        todays_total: todaysOrders.length,
        todays_assigned: todaysAssigned,
        todays_delivered: todaysDelivered,
        todays_missed: todaysMissed,
        todays_queue: todaysQueue,
        completion_rate: completionRate
      },
      chart_data: {
        weekly_trend,
        hourly_active
      },
      active_orders: activeOrders,
      history_orders: historyOrders
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to load pilot dashboard' });
  }
});

router.get('/pilot/history', async (req, res) => {
  try {
    const pilotId = (req.query.pilotId as string) || '';
    const orders = await fileDB.getOrders();
    const pilotOrders = pilotId
      ? orders.filter((o: any) => o.assigned_pilot_id === pilotId || o.pilot_assigned === pilotId)
      : orders;

    const historyOrders = pilotOrders
      .filter((o: any) => ['delivered', 'completed', 'cancelled', 'missed'].includes(o.status))
      .map((o: any) => ({
        id: o.id,
        order_number: o.order_number || o.id,
        customer_name: o.customer_name || o.client_name || 'Customer',
        customer_phone: o.customer_phone || '',
        customer_email: o.customer_email || '',
        recipient_name: o.recipient_name || o.customer_name || 'Recipient',
        pickup_address: o.pickup_address || '',
        drop_address: o.drop_address || o.delivery_address || o.destination_address || '',
        pickup_location: o.pickup_location || {
          latitude: Number(o.pickup_lat) || 28.6037,
          longitude: Number(o.pickup_lng) || 77.3661,
          name: o.pickup_address || 'Central Dispatch Hub (Sector 60, Noida)'
        },
        destination_location: o.destination_location || {
          latitude: Number(o.delivery_lat) || Number(o.drop_lat) || 28.6280,
          longitude: Number(o.delivery_lng) || Number(o.drop_lng) || 77.3750,
          address: o.drop_address || o.delivery_address || 'Delivery Destination'
        },
        delivery_lat: Number(o.delivery_lat) || Number(o.drop_lat) || (o.destination_location?.latitude) || 28.6280,
        delivery_lng: Number(o.delivery_lng) || Number(o.drop_lng) || (o.destination_location?.longitude) || 77.3750,
        pickup_lat: Number(o.pickup_lat) || (o.pickup_location?.latitude) || 28.6037,
        pickup_lng: Number(o.pickup_lng) || (o.pickup_location?.longitude) || 77.3661,
        drone_model: o.drone_model || '700RPAV',
        drone_id: o.drone_id || (o.reserved_inventory_ids || [])[0] || '',
        assigned_drone_id: o.assigned_drone_id || o.drone_id || (o.reserved_inventory_ids || [])[0] || '',
        reserved_inventory_ids: Array.isArray(o.reserved_inventory_ids) ? o.reserved_inventory_ids : [],
        assigned_drone_ids: Array.isArray(o.assigned_drone_ids) ? o.assigned_drone_ids : (Array.isArray(o.reserved_inventory_ids) ? o.reserved_inventory_ids : []),
        drones: Array.isArray(o.reserved_inventory_ids) && o.reserved_inventory_ids.length > 0 ? o.reserved_inventory_ids : [o.assigned_drone_id || o.drone_id].filter(Boolean),
        hub_inspected_drone_ids: Array.isArray(o.hub_inspected_drone_ids) ? o.hub_inspected_drone_ids : [],
        inspected_drone_ids: Array.isArray(o.inspected_drone_ids) ? o.inspected_drone_ids : [],
        status: o.status,
        units_count: o.units_count || (o.reserved_inventory_ids || []).length || 1,
        weight_kg: o.weight_kg || 0,
        fare_inr: o.fare_inr || 0,
        payment_status: o.payment_status || 'Prepaid',
        items: o.items || [],
        delivered_at: o.delivered_at || o.completed_at || o.updated_at,
        pod_signature: o.pod_signature || null,
        pod_photo: o.pod_photo || null,
        delivery_notes: o.delivery_notes || o.notes || '',
        created_at: o.created_at
      }))
      .sort((a: any, b: any) => new Date(b.delivered_at || b.created_at).getTime() - new Date(a.delivered_at || a.created_at).getTime());

    res.json({
      success: true,
      orders: historyOrders
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to load order history' });
  }
});

async function checkOrderDepotInspectionPassed(order: any, requestedDroneId?: string): Promise<{ passed: boolean; requiredDrones: string[]; uninspectedDrones: string[] }> {
  const normId = (val: string) => String(val || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const rawList: string[] = Array.from(new Set([
    ...(Array.isArray(order.reserved_inventory_ids) ? order.reserved_inventory_ids : []),
    ...(Array.isArray(order.assigned_drone_ids) ? order.assigned_drone_ids : []),
    ...(order.drone_id ? [order.drone_id] : []),
    ...(order.assigned_drone_id ? [order.assigned_drone_id] : []),
    ...(requestedDroneId ? [requestedDroneId] : [])
  ])).filter(Boolean).map((d: any) => String(d).trim());

  if (rawList.length === 0) {
    return { passed: true, requiredDrones: [], uninspectedDrones: [] };
  }

  const inspectedNormSet = new Set<string>();
  if (Array.isArray(order.depot_inspected_drone_ids)) {
    order.depot_inspected_drone_ids.forEach((d: string) => inspectedNormSet.add(normId(d)));
  }
  if (order.delivery_data?.depot_inspections) {
    Object.keys(order.delivery_data.depot_inspections).forEach((k: string) => inspectedNormSet.add(normId(k)));
  }
  if (Array.isArray(order.hub_inspected_drone_ids)) {
    order.hub_inspected_drone_ids.forEach((d: string) => inspectedNormSet.add(normId(d)));
  }
  if (order.delivery_data?.hub_inspections) {
    Object.keys(order.delivery_data.hub_inspections).forEach((k: string) => inspectedNormSet.add(normId(k)));
  }

  try {
    const existing = await fileDB.getInspections({ delivery_id: String(order.id) });
    existing.forEach((insp: any) => {
      const isPreDispatch = insp.stage === 'depot_dispatch' || insp.stage === 'depot' || insp.stage === 'hub_pickup' || insp.stage === 'hub' || insp.inspection_type === 'DEPOT_MAINTENANCE' || insp.inspection_type === 'HUB_PRE_FLIGHT_CHECK';
      if (isPreDispatch && insp.overall_inspection === 'PASSED' && insp.drone_id) {
        inspectedNormSet.add(normId(insp.drone_id));
      }
    });
  } catch (err) {
    console.warn('[CheckQC] Inspection read notice:', err);
  }

  try {
    const fleet = await fileDB.getFleet();
    rawList.forEach((rId) => {
      const matched = fleet.find((f: any) => normId(f.id) === normId(rId) || normId(f.drone_id) === normId(rId) || normId(f.serial_number) === normId(rId));
      if (matched && (matched.qc_status === 'passed' || matched.verification_status === 'verified')) {
        inspectedNormSet.add(normId(rId));
      }
    });
  } catch {}

  const uninspectedDrones = rawList.filter(d => !inspectedNormSet.has(normId(d)));
  return {
    passed: uninspectedDrones.length === 0,
    requiredDrones: rawList,
    uninspectedDrones
  };
}

router.post('/orders/:id/assign-pilot-request-otp', async (req, res) => {
  const operator = await requireDispatchOperator(req, res);
  if (!operator) return;

  const { id } = req.params;
  const order = await fileDB.findOrderById(id);
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  const qcCheck = await checkOrderDepotInspectionPassed(order, req.body?.drone_id);
  if (!qcCheck.passed) {
    res.status(400).json({
      success: false,
      error: `Order #${order.order_number || order.id} assign nahi ho sakta! Sabhi drones ka Depot QC Inspection (by Admin / Fleet Manager / Dispatcher) complete hona zaroori hai. Pending airframes: ${qcCheck.uninspectedDrones.join(', ')}. Pehle inspection karo!`
    });
    return;
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const targetEmail = operator.email ? operator.email.toLowerCase().trim() : '';
  const targetPhone = operator.phone ? operator.phone.replace(/[^0-9]/g, '').slice(-10) : '';

  if (targetEmail) {
    await fileDB.saveOTP(targetEmail, otp, { purpose: `assign-order-${id}` });
    sendOtpNotification({ email: targetEmail, otp }).catch((err) => console.error('[mail] Dispatcher assignment OTP error:', err));
  }
  if (targetPhone) {
    await fileDB.saveOTP(targetPhone, otp, { purpose: `assign-order-${id}` });
    sendOtpNotification({ phone: targetPhone, otp }).catch((err) => console.error('[sms] Dispatcher assignment OTP error:', err));
  }

  console.log(`[DISPATCH ASSIGNMENT OTP] Order #${id} requested by ${operator.name} (${targetEmail || targetPhone}): ${otp}`);

  res.json({
    success: true,
    message: `Assignment authorization OTP dispatched to ${operator.email || operator.phone}`,
    order_id: id,
    dev_otp: process.env.NODE_ENV !== 'production' ? otp : undefined
  });
});

router.post('/orders/:id/assign-pilot', async (req, res) => {
  try {
    const operator = await requireDispatchOperator(req, res);
    if (!operator) return;

    const { id } = req.params;
    const { pilot_id, pilot_name, pilot_phone, drone_id, otp } = req.body;

    if (!pilot_id && !pilot_name) {
      res.status(400).json({ success: false, error: 'Pilot selection is required' });
      return;
    }

    const order = await fileDB.findOrderById(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const qcCheck = await checkOrderDepotInspectionPassed(order, drone_id);
    if (!qcCheck.passed) {
      res.status(400).json({
        success: false,
        error: `Order #${order.order_number || order.id} assign nahi ho sakta! Is order ke sabhi drones ka Depot QC Inspection (by Admin / Fleet Manager / Dispatcher) complete hona mandatory hai. Abhi in airframes ka inspection baaki hai: ${qcCheck.uninspectedDrones.join(', ')}. Pehle inspection karo!`
      });
      return;
    }

    if (!otp || typeof otp !== 'string' || !otp.trim()) {
      res.status(400).json({
        success: false,
        error: 'Order dispatch/assign karne ke liye Dispatcher Security OTP mandatory hai. Please 6-digit OTP request karein aur enter karein.'
      });
      return;
    }

    const targetEmail = operator.email ? operator.email.toLowerCase().trim() : '';
    const targetPhone = operator.phone ? operator.phone.replace(/[^0-9]/g, '').slice(-10) : '';
    let verifyRes: { valid: boolean; reason?: string } = { valid: false, reason: '' };
    if (targetEmail) {
      verifyRes = await fileDB.verifyOTP(targetEmail, otp.trim());
    }
    if (!verifyRes.valid && targetPhone) {
      verifyRes = await fileDB.verifyOTP(targetPhone, otp.trim());
    }
    if (!verifyRes.valid) {
      res.status(400).json({
        success: false,
        error: verifyRes.reason || 'Invalid ya expired assignment authorization OTP. Naya OTP mangwayein aur retry karein.'
      });
      return;
    }
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const pilotAcceptanceOtp = crypto.randomInt(100000, 1000000).toString();

    let pilotUser: any = null;
    if (pilot_id) pilotUser = await fileDB.findUserById(pilot_id);
    if (!pilotUser && pilot_phone) pilotUser = await fileDB.findUserByPhone(pilot_phone);
    const pilotEmail = (pilotUser?.email || '').toLowerCase().trim();

    const updated = await fileDB.updateOrder(id, {
      status: 'assigned',
      assigned_pilot_id: pilot_id || '',
      pilot_assigned: pilot_name || pilotUser?.name || 'Assigned Pilot',
      pilot_phone: pilot_phone || pilotUser?.phone || '',
      pilot_email: pilotEmail,
      drone_id: drone_id || order.drone_id || 'UAV-SYS-01',
      assigned_by_name: operator.name || 'Flight Operations Dispatcher',
      assigned_by_role: operator.role || 'dispatcher',
      assigned_at: new Date().toISOString(),
      pilot_acceptance_status: 'pending_acceptance',
      pilot_acceptance_otp: pilotAcceptanceOtp,
      delivery_data: {
        ...(order.delivery_data || {}),
        pilot_email: pilotEmail,
        pilot_acceptance_otp: pilotAcceptanceOtp
      }
    });

    if (pilotEmail) {
      await fileDB.saveOTP(pilotEmail, pilotAcceptanceOtp, { purpose: `pilot-acceptance-${id}` });
      sendOtpNotification({ email: pilotEmail, otp: pilotAcceptanceOtp }).catch(e => console.error('[mail] Pilot assignment OTP err:', e));
    }
    if (pilot_phone || pilotUser?.phone) {
      const cleanP = (pilot_phone || pilotUser?.phone).replace(/[^0-9]/g, '').slice(-10);
      if (cleanP) {
        await fileDB.saveOTP(cleanP, pilotAcceptanceOtp, { purpose: `pilot-acceptance-${id}` });
      }
    }

    if (pilot_id) {
      sendPushToUser(
        pilot_id,
        'New Order Assigned',
        `Order #${id} has been assigned to you. Acceptance OTP: ${pilotAcceptanceOtp}.`,
        { orderId: String(id), type: 'order_assigned', otp: pilotAcceptanceOtp }
      ).catch(() => {});
    }

    res.json({
      success: true,
      message: `Order #${id} successfully assigned to ${pilot_name}!`,
      order: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to assign order' });
  }
});

router.post('/pilot/request-acceptance-otp', async (req, res) => {
  try {
    const { order_id, pilot_id, pilot_email, pilot_phone } = req.body;
    if (!order_id) {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    const order = await fileDB.findOrderById(order_id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    let deliveryUser: any = null;
    if (pilot_id) deliveryUser = await fileDB.findUserById(pilot_id);
    if (!deliveryUser && order.assigned_pilot_id) deliveryUser = await fileDB.findUserById(order.assigned_pilot_id);
    if (!deliveryUser && pilot_email) deliveryUser = await fileDB.findUserByEmail(pilot_email);
    if (!deliveryUser && (pilot_phone || order.pilot_phone)) deliveryUser = await fileDB.findUserByPhone(pilot_phone || order.pilot_phone);

    const targetEmail = (pilot_email || deliveryUser?.email || '').toLowerCase().trim();
    const targetPhone = pilot_phone || deliveryUser?.phone || order.pilot_phone || '';

    if (!targetEmail && !targetPhone) {
      res.status(400).json({ success: false, error: 'No contact information found for delivery partner to send OTP.' });
      return;
    }

    const acceptanceOtp = crypto.randomInt(100000, 1000000).toString();
    if (targetEmail) {
      await fileDB.saveOTP(targetEmail, acceptanceOtp, { purpose: `pilot-acceptance-${order_id}` });
      sendOtpNotification({ email: targetEmail, otp: acceptanceOtp }).catch(e => console.error('[mail] Pilot acceptance OTP err:', e));
    }
    if (targetPhone) {
      const cleanPhone = targetPhone.replace(/[^0-9]/g, '').slice(-10);
      await fileDB.saveOTP(cleanPhone, acceptanceOtp, { purpose: `pilot-acceptance-${order_id}` });
    }

    await fileDB.updateOrder(order_id, {
      pilot_acceptance_otp: acceptanceOtp,
      delivery_data: {
        ...(order.delivery_data || {}),
        pilot_acceptance_otp: acceptanceOtp
      }
    });

    console.log(`[DELIVERY PARTNER ACCEPTANCE OTP] Order #${order_id}: ${acceptanceOtp} -> ${targetEmail || targetPhone}`);

    res.json({
      success: true,
      message: `Acceptance OTP sent to your registered ${targetEmail ? 'email (' + targetEmail + ')' : 'phone'}`,
      acceptance_otp: acceptanceOtp
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to dispatch acceptance OTP' });
  }
});

router.post('/pilot/accept-order', async (req, res) => {
  try {
    const { order_id, otp, pilot_name, pilot_id, pilot_email, pilot_phone, dl_id, vehicle_id } = req.body;
    if (!order_id || !otp) {
      res.status(400).json({ success: false, error: 'Order ID and Acceptance OTP are required' });
      return;
    }

    const order = await fileDB.findOrderById(order_id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    let deliveryUser: any = null;
    if (order.assigned_pilot_id) {
      deliveryUser = await fileDB.findUserById(order.assigned_pilot_id);
    }
    if (!deliveryUser && pilot_id) {
      deliveryUser = await fileDB.findUserById(pilot_id);
    }
    if (!deliveryUser && (pilot_phone || order.pilot_phone)) {
      deliveryUser = await fileDB.findUserByPhone(pilot_phone || order.pilot_phone);
    }
    if (!deliveryUser && (pilot_email || order.pilot_email)) {
      deliveryUser = await fileDB.findUserByEmail(pilot_email || order.pilot_email);
    }

    const partnerDl = (dl_id || deliveryUser?.dl_id || deliveryUser?.metadata?.dl_id || '').toString().trim();
    const partnerVehicle = (vehicle_id || deliveryUser?.vehicle_id || deliveryUser?.metadata?.vehicle_id || '').toString().trim();

    const finalPartnerDl = partnerDl || 'DL-VERIFIED';
    const finalPartnerVehicle = partnerVehicle || order.drone_id || 'IND-DL-772';

    const cleanOtp = (otp || '').toString().trim();
    const expectedOtp = (order.pilot_acceptance_otp || order.delivery_data?.pilot_acceptance_otp || '').toString().trim();
    const targetEmail = (pilot_email || deliveryUser?.email || '').toLowerCase().trim();
    const targetPhone = pilot_phone || deliveryUser?.phone || order.pilot_phone || '';

    let isOtpValid = false;
    let failReason = 'Invalid or expired Acceptance OTP. Please tap Request OTP to receive a new code.';
    if (targetEmail) {
      const v = await fileDB.verifyOTP(targetEmail, cleanOtp);
      if (v.valid) isOtpValid = true;
      else if (v.reason) failReason = v.reason;
    }
    if (!isOtpValid && targetPhone) {
      const v = await fileDB.verifyOTP(targetPhone.replace(/[^0-9]/g, '').slice(-10), cleanOtp);
      if (v.valid) isOtpValid = true;
      else if (v.reason) failReason = v.reason;
    }
    if (!isOtpValid && expectedOtp && !failReason.includes('Too many incorrect attempts')) {
      const candidate = Buffer.from(cleanOtp);
      const expected = Buffer.from(expectedOtp);
      if (candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected)) {
        isOtpValid = true;
      }
    }

    if (!isOtpValid) {
      res.status(400).json({ success: false, error: failReason });
      return;
    }

    const effectiveDroneId = (Array.isArray(order.reserved_inventory_ids) && order.reserved_inventory_ids.length > 0)
      ? order.reserved_inventory_ids[0]
      : (order.drone_id && !order.drone_id.includes('@') && !order.drone_id.includes('delivery') ? order.drone_id : finalPartnerVehicle);

    const updated = await fileDB.updateOrder(order_id, {
      pilot_acceptance_status: 'accepted',
      accepted_at: new Date().toISOString(),
      pilot_assigned: pilot_name || deliveryUser?.name || order.pilot_assigned || 'Delivery Partner',
      pilot_phone: deliveryUser?.phone || order.pilot_phone || '',
      drone_id: effectiveDroneId,
      vehicle_id: finalPartnerVehicle,
      dl_id: finalPartnerDl
    });

    const dispatcherEmail = order.assigned_by_email || process.env.DISPATCH_OPS_EMAIL || process.env.ADMIN_EMAIL || 'ops@indowings.com';
    sendOrderAcceptedByDeliveryAlert({
      dispatcherEmail,
      dispatcherName: order.assigned_by_name || 'Dispatcher',
      orderNumber: order.order_number || order.id,
      deliveryPartnerName: pilot_name || deliveryUser?.name || 'Delivery Partner',
      deliveryPartnerPhone: deliveryUser?.phone || order.pilot_phone || '',
      vehicleId: partnerVehicle,
      dlId: partnerDl,
      orderId: order_id
    }).catch(err => console.error('[mail] Dispatcher order accepted email error:', err));

    res.json({
      success: true,
      message: `Order #${order_id} accepted by ${pilot_name || 'Delivery Partner'}! Ready for departure.`,
      order: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to accept order' });
  }
});

router.post('/pilot/request-handover-otp', async (req, res) => {
  try {
    const { order_id, pilot_name, pilot_id, pilot_email, pilot_phone } = req.body;
    if (!order_id) {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    const order = await fileDB.findOrderById(order_id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    let deliveryUser: any = null;
    if (pilot_id) deliveryUser = await fileDB.findUserById(pilot_id);
    if (!deliveryUser && order.assigned_pilot_id) deliveryUser = await fileDB.findUserById(order.assigned_pilot_id);
    if (!deliveryUser && pilot_email) deliveryUser = await fileDB.findUserByEmail(pilot_email);
    if (!deliveryUser && (pilot_phone || order.pilot_phone)) deliveryUser = await fileDB.findUserByPhone(pilot_phone || order.pilot_phone);

    const targetEmail = (pilot_email || deliveryUser?.email || '').toLowerCase().trim();
    const targetPhone = pilot_phone || deliveryUser?.phone || order.pilot_phone || '';

    const handoverOtp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    dispatcherHandoverOtps[order_id] = {
      otp: handoverOtp,
      orderId: order_id,
      expiresAt
    };

    await fileDB.updateOrder(order_id, {
      delivery_data: {
        ...(order.delivery_data || {}),
        dispatcher_handover_otp: handoverOtp,
        dispatcher_handover_otp_expires_at: expiresAt
      }
    });

    if (targetEmail) {
      await fileDB.saveOTP(targetEmail, handoverOtp, { purpose: `pilot-departure-${order_id}` });
      sendOtpNotification({ email: targetEmail, otp: handoverOtp }).catch((err) => console.error('[mail] Pilot departure OTP error:', err));
    }
    if (targetPhone) {
      const cleanPhone = targetPhone.replace(/[^0-9]/g, '').slice(-10);
      await fileDB.saveOTP(cleanPhone, handoverOtp, { purpose: `pilot-departure-${order_id}` });
    }

    console.log(`[DELIVERY PARTNER DEPARTURE OTP] Order #${order_id}: ${handoverOtp} -> ${targetEmail || targetPhone}`);

    res.json({
      success: true,
      message: `Departure Authorization OTP dispatched to your registered ${targetEmail ? 'email (' + targetEmail + ')' : 'phone'}.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to generate departure OTP' });
  }
});

router.post('/pilot/verify-drone-order', async (req, res) => {
  try {
    const { order_id, drone_id } = req.body;
    if (!order_id || !drone_id) {
      res.status(400).json({ success: false, error: 'order_id and drone_id are required' });
      return;
    }

    const cleanOrderId = String(order_id).trim();
    const cleanDroneId = String(drone_id).trim();

    const order = await fileDB.findOrderById(cleanOrderId);
    if (!order) {
      res.status(404).json({ success: false, error: `Order #${cleanOrderId} not found.` });
      return;
    }

    const normScanned = cleanDroneId.toUpperCase().replace(/[^A-Z0-9-]/g, '');

    const fleet = await fileDB.getFleet();
    const expected = new Set<string>();
    const candidateIds = new Set<string>();

    if (Array.isArray(order.reserved_inventory_ids)) {
      order.reserved_inventory_ids.forEach((id: string) => candidateIds.add(String(id).trim()));
    }
    if (Array.isArray(order.assigned_drone_ids)) {
      order.assigned_drone_ids.forEach((id: string) => candidateIds.add(String(id).trim()));
    }
    if (order.assigned_drone_id) candidateIds.add(String(order.assigned_drone_id).trim());
    if (order.drone_id) candidateIds.add(String(order.drone_id).trim());
    if (Array.isArray(order.items)) {
      order.items.forEach((it: any) => {
        const sn = String(it.serial_number || it.serial || it.drone_id || it.id || '').trim();
        if (sn) candidateIds.add(sn);
      });
    }

    candidateIds.forEach((c) => {
      const clean = c.trim();
      if (!clean) return;
      expected.add(clean);
      const fleetItem = fleet.find(d =>
        String(d.id).toLowerCase() === clean.toLowerCase() ||
        String(d.serial_number || '').toLowerCase() === clean.toLowerCase()
      );
      if (fleetItem) {
        if (fleetItem.id) expected.add(String(fleetItem.id).trim());
        if (fleetItem.serial_number) expected.add(String(fleetItem.serial_number).trim());
      }
    });

    let matchedDroneId: string | null = null;
    for (const exp of Array.from(expected)) {
      const normExp = exp.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (normExp === normScanned || normExp.includes(normScanned) || normScanned.includes(normExp)) {
        matchedDroneId = exp;
        break;
      }
    }

    if (!matchedDroneId && expected.size === 0) {
      const fleet = await fileDB.getFleet();
      const inFleet = fleet.find(d =>
        String(d.id).toUpperCase() === normScanned ||
        String(d.serial_number || '').toUpperCase() === normScanned
      );
      if (inFleet) {
        matchedDroneId = inFleet.id || inFleet.serial_number;
        await fileDB.updateOrder(order.id, {
          reserved_inventory_ids: [matchedDroneId],
          drone_id: matchedDroneId
        });
      }
    }

    if (!matchedDroneId) {
      res.status(400).json({
        success: false,
        matched: false,
        error: `QR Mismatch: Drone '${cleanDroneId}' is not assigned to Order #${order.order_number || order.id}. This aircraft does not match the order.`
      });
      return;
    }

    const droneRecord = fleet.find(d =>
      String(d.id).toLowerCase() === matchedDroneId!.toLowerCase() ||
      String(d.serial_number || '').toLowerCase() === matchedDroneId!.toLowerCase()
    );

    res.json({
      success: true,
      matched: true,
      drone_id: matchedDroneId,
      model_name: droneRecord?.model || droneRecord?.model_name || order.drone_model || 'IndoWings 700 RPAV',
      order_id: order.id,
      order_number: order.order_number || order.id,
      already_inspected: Array.isArray(order.inspected_drone_ids) && order.inspected_drone_ids.includes(matchedDroneId)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to verify drone for order' });
  }
});

router.post('/pilot/verify-handover-and-start-flight', async (req, res) => {
  try {
    const { order_id, pilot_name, pilot_phone, vehicle_id, initial_lat, initial_lng } = req.body;
    if (!order_id) {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    const order = await fileDB.findOrderById(order_id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const now = new Date().toISOString();
    const effectiveFlightDroneId = (Array.isArray(order.reserved_inventory_ids) && order.reserved_inventory_ids.length > 0)
      ? order.reserved_inventory_ids[0]
      : (order.drone_id && !order.drone_id.includes('@') && !order.drone_id.includes('delivery') ? order.drone_id : (vehicle_id || 'INW-700RPAV-0001'));

    const updated = await fileDB.updateOrder(order_id, {
      status: 'in-flight',
      location_is_live: true,
      dispatched_at: now,
      pilot_assigned: pilot_name || order.pilot_assigned || 'IndoFleet Pilot',
      pilot_phone: pilot_phone || order.pilot_phone || '',
      drone_id: effectiveFlightDroneId,
      vehicle_id: vehicle_id || order.vehicle_id || 'IND-DL-772',
      ...(initial_lat && initial_lng ? {
        last_known_location: `${initial_lat}, ${initial_lng}`,
        current_location_coords: { lat: initial_lat, lng: initial_lng }
      } : {})
    });

    const departureDrones = Array.isArray(order.reserved_inventory_ids) && order.reserved_inventory_ids.length > 0
      ? order.reserved_inventory_ids
      : [effectiveFlightDroneId].filter(Boolean);

    for (const dId of departureDrones) {
      try {
        await fileDB.updateDrone(dId, { status: 'in-flight', assigned_order: order_id });
      } catch (dErr) {}
    }

    const trackingBaseUrl = (process.env.PUBLIC_TRACKING_URL || process.env.FRONTEND_URL || 'https://indo-fleet.vercel.app').replace(/\/+$/, '');
    const trackingUrl = `${trackingBaseUrl}/track?orderId=${order_id}`;
    if (order.customer_email || order.recipient_email) {
      sendFlightStartedCustomerEmail({
        to: order.customer_email || order.recipient_email,
        customerName: order.customer_name || order.recipient_name || 'Customer',
        orderNumber: order.order_number || order.id,
        trackingUrl,
        pilotName: pilot_name || order.pilot_assigned || 'IndoFleet Pilot',
        pilotPhone: pilot_phone || order.pilot_phone || '',
        vehicleId: vehicle_id || order.drone_id || 'UAV-SYS-01',
        deliveryAddress: order.drop_address || order.destination_address || 'Delivery Destination'
      }).catch((err) => console.error('[mail] Flight start email error:', err));
    }

    res.json({
      success: true,
      message: `Delivery started! Order #${order.order_number || order.id} is now out for delivery.`,
      order: updated,
      tracking_url: trackingUrl
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to start delivery flight' });
  }
});

router.post('/pilot/update-location', async (req, res) => {
  try {
    const {
      order_id,
      latitude,
      longitude,
      altitude,
      speed,
      heading,
      battery_pct,
      accuracy,
      pilot_id
    } = req.body;

    if (!order_id || latitude === undefined || longitude === undefined) {
      res.status(400).json({ success: false, error: 'order_id, latitude, and longitude are required' });
      return;
    }

    const order = await fileDB.findOrderById(order_id);
    if (!order) {
      res.status(404).json({ success: false, error: `Order #${order_id} not found` });
      return;
    }

    const now = new Date().toISOString();
    const hasRealAltitude = altitude != null && Number(altitude) > 0;
    const liveLocation = {
      lat: Number(latitude),
      lng: Number(longitude),
      altitude_m: hasRealAltitude ? Number(altitude) : 45,
      is_altitude_estimated: !hasRealAltitude,
      speed_kmh: speed != null ? Number(speed) : 0,
      heading_deg: heading != null ? Number(heading) : 0,
      accuracy_m: accuracy != null ? Number(accuracy) : 5,
      battery_pct: battery_pct !== undefined ? Number(battery_pct) : 95,
      pilot_name: pilot_id || 'IndoFleet Pilot',
      updated_at: now
    };

    let dropLng = Number(
      order.drop_lng ??
      order.destination_lng ??
      order.delivery_lng ??
      order.destination_location?.longitude ??
      order.destination_location?.lng
    );
    let dropLat = Number(
      order.drop_lat ??
      order.destination_lat ??
      order.delivery_lat ??
      order.destination_location?.latitude ??
      order.destination_location?.lat
    );

    if (!Number.isFinite(dropLng) || !Number.isFinite(dropLat) || (dropLng === 0 && dropLat === 0)) {
      const dropAddr = String(order.drop_address || order.destination_address || order.delivery_address || '').trim();
      if (dropAddr) {
        const geo = await geocodeAddress(dropAddr);
        if (geo) {
          dropLng = geo.lng;
          dropLat = geo.lat;
        }
      }
    }

    const pickupLng = Number(order.pickup_lng ?? order.pickup_location?.longitude ?? 77.3661);
    const pickupLat = Number(order.pickup_lat ?? order.pickup_location?.latitude ?? 28.6037);

    let plannedCoords: [number, number][] = Array.isArray(order.planned_route_coords) ? order.planned_route_coords : [];
    if (plannedCoords.length < 2 && Number.isFinite(dropLng) && Number.isFinite(dropLat) && (dropLng !== 0 || dropLat !== 0)) {
      const baseRoute = await getRoadRoute([pickupLng, pickupLat], [dropLng, dropLat]);
      if (baseRoute?.coordinates?.length) {
        plannedCoords = baseRoute.coordinates;
      }
    }

    let isOffRoute = false;
    let deviationMeters = 0;
    let reroutedCoords: [number, number][] | null = null;
    let recalculatedDurationMins: number | null = null;
    let recalculatedDistanceKm: number | null = null;

    if (plannedCoords.length >= 2) {
      const devCheck = checkRouteDeviation([liveLocation.lng, liveLocation.lat], plannedCoords, 150);
      isOffRoute = devCheck.isOffRoute;
      deviationMeters = devCheck.deviationMeters;

      if (isOffRoute && Number.isFinite(dropLng) && Number.isFinite(dropLat)) {
        const newRoute = await getRoadRoute([liveLocation.lng, liveLocation.lat], [dropLng, dropLat]);
        if (newRoute?.coordinates?.length) {
          reroutedCoords = newRoute.coordinates;
          recalculatedDistanceKm = newRoute.distanceKm;
          recalculatedDurationMins = newRoute.durationMins;
        }
      }
    }

    const updatedOrder = await fileDB.updateOrder(order_id, {
      last_known_location: `${liveLocation.lat.toFixed(6)}, ${liveLocation.lng.toFixed(6)}`,
      current_location_coords: { lat: liveLocation.lat, lng: liveLocation.lng },
      latitude: liveLocation.lat,
      longitude: liveLocation.lng,
      current_lat: liveLocation.lat,
      current_lng: liveLocation.lng,
      pilot_lat: liveLocation.lat,
      pilot_lng: liveLocation.lng,
      altitude_m: liveLocation.altitude_m,
      speed_kmh: liveLocation.speed_kmh,
      heading_deg: liveLocation.heading_deg,
      battery_pct: liveLocation.battery_pct,
      last_location_updated_at: now,
      location_is_live: true,
      is_off_route: isOffRoute,
      route_deviation_meters: deviationMeters,
      route_status: isOffRoute ? 'deviated' : 'on_track',
      planned_route_coords: plannedCoords,
      current_route_coords: reroutedCoords || (isOffRoute ? undefined : plannedCoords),
      ...(isOffRoute && reroutedCoords ? {
        rerouted_at: now,
        recalculated_distance_km: recalculatedDistanceKm,
        recalculated_duration_mins: recalculatedDurationMins
      } : {}),
      ...(order.status === 'pending' || order.status === 'assigned' ? { status: 'in-flight' } : {})
    });

    res.json({
      success: true,
      order_id,
      timestamp: now,
      recorded_location: liveLocation,
      is_off_route: isOffRoute,
      deviation_meters: deviationMeters,
      route_status: isOffRoute ? 'deviated' : 'on_track',
      rerouted: Boolean(reroutedCoords),
      status: updatedOrder?.status || 'in-flight'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update live location' });
  }
});

router.post('/pilot/sos-emergency', async (req, res) => {
  try {
    const { pilot_name, pilot_phone, vehicle_id, latitude, longitude, battery_pct, audio_base64, notes } = req.body;

    const parsedLat = Number(latitude);
    const parsedLng = Number(longitude);
    const parsedBat = Number(battery_pct);

    let normalizedAudio = audio_base64 || null;
    if (typeof normalizedAudio === 'string' && normalizedAudio.startsWith('data:application/octet-stream;base64,')) {
      normalizedAudio = normalizedAudio.replace('data:application/octet-stream;base64,', 'data:audio/mp4;base64,');
    }

    const sosEvent = {
      id: `SOS-${Date.now().toString(36).toUpperCase()}`,
      pilot_name: pilot_name || 'Pilot',
      pilot_phone: pilot_phone || '',
      vehicle_id: vehicle_id || 'UAV-SYS',
      latitude: Number.isFinite(parsedLat) && (parsedLat !== 0 || Number(longitude) !== 0) ? parsedLat : 28.6046,
      longitude: Number.isFinite(parsedLng) && (parsedLng !== 0 || Number(latitude) !== 0) ? parsedLng : 77.3687,
      battery_pct: Number.isFinite(parsedBat) ? parsedBat : 80,
      audio_base64: normalizedAudio,
      has_audio: Boolean(normalizedAudio),
      notes: notes || `EMERGENCY BEACON TRIGGERED BY ${pilot_name || 'PILOT'}`,
      timestamp: new Date().toISOString(),
      status: 'active'
    };

    activeSosAlerts.unshift(sosEvent);

    try {
      saveSosAlertToFile(sosEvent);
    } catch (fErr) {
      console.warn('[SOS File] Persistence notice:', fErr);
    }

    try {
      await fileDB.saveExpertRequest({
        id: sosEvent.id,
        customer_id: null,
        name: sosEvent.pilot_name,
        email: 'sos-alert@indowfleet.com',
        phone: sosEvent.pilot_phone,
        order_id: null,
        category: 'SOS_EMERGENCY',
        priority: 'urgent',
        message: `${sosEvent.notes} - Lat/Lng: [${sosEvent.latitude}, ${sosEvent.longitude}] Battery: ${sosEvent.battery_pct}%`,
        status: 'open',
        request_data: {
          sos_id: sosEvent.id,
          pilot_name: sosEvent.pilot_name,
          pilot_phone: sosEvent.pilot_phone,
          vehicle_id: sosEvent.vehicle_id,
          latitude: sosEvent.latitude,
          longitude: sosEvent.longitude,
          battery_pct: sosEvent.battery_pct,
          has_audio: sosEvent.has_audio,
          audio_base64: sosEvent.audio_base64,
          timestamp: sosEvent.timestamp,
          status: 'active'
        }
      });
    } catch (dbErr) {
      console.warn('[SOS DB] Could not persist SOS to Supabase:', dbErr);
    }

    const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'admin@indowings.com';
    sendSosEmergencyAlertEmail({
      adminEmail,
      pilotName: sosEvent.pilot_name,
      pilotPhone: sosEvent.pilot_phone,
      vehicleId: sosEvent.vehicle_id,
      latitude: sosEvent.latitude,
      longitude: sosEvent.longitude,
      batteryPct: sosEvent.battery_pct,
      timestamp: sosEvent.timestamp,
      audioNote: notes || 'SOS emergency audio feed recorded'
    }).catch((err) => console.error('[mail] SOS email alert error:', err));

    res.json({
      success: true,
      message: '🚨 CRITICAL SOS BEACON TRANSMITTED TO COMMAND CENTER & DISPATCH OPS!',
      sos_id: sosEvent.id,
      sos_alert: sosEvent
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to trigger SOS' });
  }
});

router.get('/admin/sos-alerts', async (req, res) => {
  try {
    const alertsMap = new Map<string, any>();

    try {
      const fileAlerts = loadSosAlertsFromFile();
      for (const a of fileAlerts) {
        if (a && a.id) alertsMap.set(a.id, a);
      }
    } catch (e) {
      console.warn('[SOS File] Load notice:', e);
    }

    for (const mem of activeSosAlerts) {
      if (mem && mem.id) {
        const existing = alertsMap.get(mem.id);
        alertsMap.set(mem.id, { ...existing, ...mem });
      }
    }

    try {
      const requests = await fileDB.getExpertRequests();
      const dbSos = requests.filter((r: any) => r.category === 'SOS_EMERGENCY' || r.id?.startsWith('SOS'));
      for (const r of dbSos) {
        const rd = r.request_data?.request_data || r.request_data || {};
        const id = rd.sos_id || r.id;

        let lat = Number(rd.latitude ?? r.latitude);
        let lng = Number(rd.longitude ?? r.longitude);
        let bat = Number(rd.battery_pct ?? r.battery_pct);

        if (r.message) {
          const matchCoords = r.message.match(/Lat\/Lng:\s*\[([0-9.-]+),\s*([0-9.-]+)\]/i);
          if (matchCoords && Number.isFinite(parseFloat(matchCoords[1])) && Number.isFinite(parseFloat(matchCoords[2]))) {
            lat = parseFloat(matchCoords[1]);
            lng = parseFloat(matchCoords[2]);
          }
          const matchBat = r.message.match(/Battery:\s*([0-9]+)%/i);
          if (matchBat && Number.isFinite(parseInt(matchBat[1], 10))) {
            bat = parseInt(matchBat[1], 10);
          }
        }

        const fallbackItem = {
          id,
          pilot_name: rd.pilot_name || r.name || 'Pilot',
          pilot_phone: rd.pilot_phone || r.phone || '',
          vehicle_id: rd.vehicle_id || 'UAV-SYS',
          latitude: Number.isFinite(lat) && lat !== 0 ? lat : 28.6046,
          longitude: Number.isFinite(lng) && lng !== 0 ? lng : 77.3687,
          battery_pct: Number.isFinite(bat) ? bat : 80,
          audio_base64: rd.audio_base64 || r.audio_base64 || null,
          has_audio: Boolean(rd.audio_base64 || r.audio_base64 || rd.has_audio),
          notes: r.message || rd.notes || '',
          timestamp: rd.timestamp || r.created_at,
          status: r.status === 'resolved' || rd.status === 'resolved' ? 'resolved' : 'active'
        };

        if (!alertsMap.has(id)) {
          alertsMap.set(id, fallbackItem);
        } else {
          const current = alertsMap.get(id);
          alertsMap.set(id, {
            ...fallbackItem,
            ...current,
            status: r.status === 'resolved' ? 'resolved' : current.status
          });
        }
      }
    } catch (e) {
      console.warn('[SOS DB] Could not read persistent SOS alerts:', e);
    }

    const combined = Array.from(alertsMap.values()).map((a: any) => {
      let aud = a.audio_base64;
      if (typeof aud === 'string' && aud.startsWith('data:application/octet-stream;base64,')) {
        aud = aud.replace('data:application/octet-stream;base64,', 'data:audio/mp4;base64,');
      }
      return { ...a, audio_base64: aud, has_audio: Boolean(aud) };
    }).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const activeCount = combined.filter((a: any) => a.status === 'active').length;
    res.json({
      success: true,
      count: activeCount,
      total: combined.length,
      alerts: combined
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch SOS alerts' });
  }
});

router.post('/admin/sos-alerts/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolved_by, notes } = req.body || {};
    const alert = activeSosAlerts.find((a: any) => a.id === id);
    if (alert) {
      alert.status = 'resolved';
      alert.resolved_at = new Date().toISOString();
      alert.resolved_by = resolved_by || 'Operations Admin';
      if (notes) alert.resolution_notes = notes;
    }

    try {
      saveSosAlertToFile({
        id,
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: resolved_by || 'Operations Admin',
        resolution_notes: notes || 'Resolved by Administrator'
      });
    } catch (fErr) {
      console.warn('[SOS File] Resolve notice:', fErr);
    }

    try {
      const allReqs = await fileDB.getExpertRequests();
      const existingReq = allReqs.find((r: any) => r.id === id);
      const existingRd = existingReq?.request_data || {};
      await fileDB.updateExpertRequest(id, {
        status: 'resolved',
        resolution_notes: notes || 'Resolved by Administrator',
        request_data: {
          ...existingRd,
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: resolved_by || 'Operations Admin'
        }
      });
    } catch (dbErr) {
      console.warn('[SOS DB] Could not update resolved status in DB:', dbErr);
    }

    res.json({
      success: true,
      message: 'SOS Emergency beacon marked as resolved.',
      alert
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to resolve SOS alert' });
  }
});

router.delete('/admin/sos-alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idx = activeSosAlerts.findIndex((a: any) => a.id === id);
    if (idx !== -1) {
      activeSosAlerts.splice(idx, 1);
    }
    deleteSosAlertFromFile(id);
    try {
      if (supabase) {
        await supabase.from('sos_alerts').delete().eq('id', id);
      }
    } catch {}
    res.json({ success: true, message: 'Alert removed' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const pilotDeliveryOtps: Record<string, { otp: string; orderId: string; expiresAt: number }> = {};

router.post('/pilot/request-customer-otp', async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    const order = await fileDB.findOrderById(order_id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const customerOtp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    customerDeliveryOtps[order_id] = {
      otp: customerOtp,
      orderId: order_id,
      expiresAt
    };

    await fileDB.updateOrder(order_id, {
      delivery_data: {
        ...(order.delivery_data || {}),
        customer_delivery_otp: customerOtp,
        customer_delivery_otp_expires_at: expiresAt
      }
    });

    const customerTarget = order.customer_email || order.customer_phone;
    if (order.customer_email) {
      sendOtpNotification({ email: order.customer_email, otp: customerOtp }).catch((err) => console.error('[mail] Customer OTP error:', err));
    }

    console.log(`[CUSTOMER DELIVERY OTP] Order #${order_id}: ${customerOtp}`);

    res.json({
      success: true,
      message: `Delivery Verification OTP dispatched to customer (${customerTarget || 'Phone/Email'})`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to request customer OTP' });
  }
});

router.post('/pilot/request-pilot-delivery-otp', async (req, res) => {
  try {
    const { order_id, pilot_email, pilot_phone, pilot_name } = req.body;
    if (!order_id) {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    const order = await fileDB.findOrderById(order_id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const pilotOtp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    pilotDeliveryOtps[order_id] = {
      otp: pilotOtp,
      orderId: order_id,
      expiresAt
    };

    await fileDB.updateOrder(order_id, {
      delivery_data: {
        ...(order.delivery_data || {}),
        pilot_delivery_otp: pilotOtp,
        pilot_delivery_otp_expires_at: expiresAt
      }
    });

    if (pilot_email) {
      sendOtpNotification({ email: pilot_email, otp: pilotOtp }).catch((err) => console.error('[mail] Pilot Delivery OTP error:', err));
    }

    console.log(`[PILOT SELF DELIVERY OTP] Order #${order_id} for ${pilot_name || 'Pilot'}: ${pilotOtp}`);

    res.json({
      success: true,
      message: `Pilot Verification OTP dispatched to ${pilot_email || pilot_phone || 'Pilot phone/email'}`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to request pilot OTP' });
  }
});

router.post('/pilot/complete-delivery', async (req, res) => {
  try {
    const {
      order_id,
      customer_otp,
      pilot_otp,
      recipient_name,
      digital_signature,
      pod_photo,
      final_latitude,
      final_longitude,
      delivery_notes,
      pilot_name,
      inspection_id
    } = req.body;

    if (!order_id || !recipient_name) {
      res.status(400).json({ success: false, error: 'Order ID and Recipient Name are required' });
      return;
    }

    const order = await fileDB.findOrderById(order_id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const expectedCustomerOtp = order.delivery_data?.customer_delivery_otp || customerDeliveryOtps[order_id]?.otp;
    const customerOtpExpiresAt = order.delivery_data?.customer_delivery_otp_expires_at || customerDeliveryOtps[order_id]?.expiresAt;

    if (!customer_otp || typeof customer_otp !== 'string' || !customer_otp.trim()) {
      res.status(400).json({ success: false, error: 'Customer 6-digit Verification OTP is required' });
      return;
    }

    if (expectedCustomerOtp && customer_otp.trim() !== expectedCustomerOtp.trim()) {
      res.status(400).json({ success: false, error: 'Invalid Customer Verification OTP. Please ask recipient for the OTP sent to their email/phone.' });
      return;
    }

    if (customerOtpExpiresAt && Date.now() > customerOtpExpiresAt) {
      res.status(400).json({ success: false, error: 'Customer Verification OTP has expired. Please tap Request Customer OTP to regenerate.' });
      return;
    }

    const expectedPilotOtp = order.delivery_data?.pilot_delivery_otp || pilotDeliveryOtps[order_id]?.otp;
    const pilotOtpExpiresAt = order.delivery_data?.pilot_delivery_otp_expires_at || pilotDeliveryOtps[order_id]?.expiresAt;

    if (!pilot_otp || typeof pilot_otp !== 'string' || !pilot_otp.trim()) {
      res.status(400).json({ success: false, error: 'Pilot Self Verification OTP is required' });
      return;
    }

    if (expectedPilotOtp && pilot_otp.trim() !== expectedPilotOtp.trim()) {
      res.status(400).json({ success: false, error: 'Invalid Pilot Self Verification OTP. Please tap Request Pilot OTP.' });
      return;
    }

    if (pilotOtpExpiresAt && Date.now() > pilotOtpExpiresAt) {
      res.status(400).json({ success: false, error: 'Pilot Self Verification OTP has expired. Please tap Request Pilot OTP to regenerate.' });
      return;
    }

    const now = new Date().toISOString();
    const effectiveInspectionId = inspection_id || order.inspection_id || null;
    const updated = await fileDB.updateOrder(order_id, {
      status: 'delivered',
      delivered_at: now,
      location_is_live: false,
      recipient_name: recipient_name.trim(),
      delivery_notes: delivery_notes || 'Handover completed via dual OTP verification & photo POD',
      digital_signature_url: digital_signature || null,
      pod_photo: pod_photo || null,
      last_known_location: final_latitude && final_longitude ? `${final_latitude}, ${final_longitude}` : order.last_known_location,
      inspection_id: effectiveInspectionId,
      inspection_status: effectiveInspectionId ? 'PASSED' : order.inspection_status || null,
      delivery_data: {
        ...(order.delivery_data || {}),
        pod_photo: pod_photo || null,
        digital_signature: digital_signature || null,
        inspection_id: effectiveInspectionId,
        completed_at: now
      },
      handover_details: {
        recipient_name: recipient_name.trim(),
        delivered_by: pilot_name || order.pilot_assigned || 'IndoFleet Pilot',
        verified_via_customer_otp: true,
        verified_via_pilot_otp: true,
        inspection_verified: Boolean(effectiveInspectionId || order.delivery_data?.post_delivery_inspection || order.delivery_data?.delivery_person_inspection),
        inspection_id: effectiveInspectionId,
        delivered_at_coords: final_latitude && final_longitude ? { lat: final_latitude, lng: final_longitude } : null,
        timestamp: now,
        has_pod_photo: Boolean(pod_photo)
      }
    });

    const completedDrones = Array.isArray(order.reserved_inventory_ids) && order.reserved_inventory_ids.length > 0
      ? order.reserved_inventory_ids
      : [order.drone_id].filter(Boolean);

    for (const dId of completedDrones) {
      try {
        await fileDB.updateDrone(dId, {
          status: 'delivered',
          assigned_order: order_id,
          delivered_to: recipient_name.trim(),
          delivered_at: now
        });
      } catch (dErr) {}
    }

    const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'admin@indowings.com';
    sendDeliveryCompletedEmail({
      to: adminEmail,
      orderNumber: order.order_number || order.id,
      recipientName: recipient_name.trim(),
      pilotName: pilot_name || order.pilot_assigned || 'IndoFleet Pilot',
      deliveryLat: final_latitude ? Number(final_latitude) : undefined,
      deliveryLng: final_longitude ? Number(final_longitude) : undefined,
      deliveryAddress: order.drop_address || order.destination_address || 'Customer Location',
      notes: delivery_notes,
      signatureDataUrl: digital_signature
    }).catch((err) => console.error('[mail] Delivery completion email error:', err));

    res.json({
      success: true,
      message: `🎉 Order #${order_id} DELIVERED successfully! Handover proof archived.`,
      order: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to complete delivery' });
  }
});

router.get('/pilot/profile', async (req, res) => {
  try {
    const pilotId = req.query.pilotId as string;
    if (!pilotId) {
      res.status(400).json({ success: false, error: 'Pilot ID is required' });
      return;
    }

    const user = await fileDB.findUserById(pilotId);
    if (!user) {
      res.status(404).json({ success: false, error: 'Pilot profile not found' });
      return;
    }

    res.json({
      success: true,
      profile: publicUser(user)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch profile' });
  }
});

router.patch('/pilot/profile', async (req, res) => {
  try {
    const { userId, name, phone, dl_id, employee_id, vehicle_id } = req.body;
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required' });
      return;
    }

    const updated = await fileDB.updateUser(userId, {
      ...(name ? { name: name.trim() } : {}),
      ...(phone ? { phone: phone.trim() } : {}),
      ...(dl_id ? { dl_id: dl_id.trim() } : {}),
      ...(employee_id ? { employee_id: employee_id.trim() } : {}),
      ...(vehicle_id ? { vehicle_id: vehicle_id.trim() } : {})
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updated ? publicUser(updated) : null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update profile' });
  }
});

router.post('/pilot/support-ticket', async (req, res) => {
  try {
    const { pilot_id, pilot_name, order_id, issue_category, message, priority } = req.body;
    const ticketId = `PLT-SUPP-${Date.now().toString(36).toUpperCase()}`;

    const newTicket = {
      id: ticketId,
      name: pilot_name || 'Field Pilot',
      order_id: order_id || null,
      category: issue_category || 'Flight Operations Help',
      priority: priority || 'high',
      message: message || 'Pilot requested support assistance from mobile app',
      status: 'open',
      created_at: new Date().toISOString()
    };

    await fileDB.saveExpertRequest(newTicket);

    res.json({
      success: true,
      message: 'Support request submitted to 24x7 IndoFleet Control Room!',
      ticket_id: ticketId
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to submit support ticket' });
  }
});

let activeAppRelease = {
  version: 'v1.2.4',
  build_number: 24,
  package_size: '~54.9 MB',
  release_notes: 'IndoFleet v1.2.4 (Build 24): Android 3-button system navigation bar insets fix, silent Render-to-Local API fallback for OTP/inspections without test banners, order-wise drone inspection grouping with photo/video media evidence preview in Admin Console, and optimized ~54.9 MB APK.',
  android_url: 'https://github.com/puneetonindowings/Indo-Fleet/releases/download/v1.2.4/IndoFleet_Delivery_v1.2.4.apk',
  ios_url: 'https://testflight.apple.com/join/IndoFleetDeliveryApp',
  updated_at: new Date().toISOString()
};

router.get('/download-apk', (req, res) => {
  const possiblePaths = [
    path.resolve(process.cwd(), '../releases/IndoFleet_Delivery_latest.apk'),
    path.resolve(process.cwd(), 'releases/IndoFleet_Delivery_latest.apk'),
    path.resolve(process.cwd(), '../IndoFleet_PilotApp/android/app/build/outputs/apk/release/app-release.apk')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      return res.download(p, `IndoFleet_Delivery_${activeAppRelease.version}.apk`);
    }
  }
  return res.redirect(activeAppRelease.android_url);
});

router.get('/app-release', async (req, res) => {
  res.json({
    success: true,
    release: activeAppRelease
  });
});

router.post('/app-release', async (req, res) => {
  try {
    const { version, release_notes, android_url, ios_url, notify_partners } = req.body;

    if (version) activeAppRelease.version = version.trim();
    if (release_notes) activeAppRelease.release_notes = release_notes.trim();
    if (android_url !== undefined) activeAppRelease.android_url = android_url.trim();
    if (ios_url !== undefined) activeAppRelease.ios_url = ios_url.trim();
    activeAppRelease.updated_at = new Date().toISOString();

    let notifiedCount = 0;
    if (notify_partners) {
      const allUsers = await fileDB.getUsers();
      const deliveryPartners = allUsers.filter((u: any) => {
        const r = (u.role || '').toLowerCase();
        return r === 'delivery' || r === 'pilot';
      });

      for (const partner of deliveryPartners) {
        if (partner.email && partner.email.includes('@')) {
          try {
            await sendAppReleaseEmail({
              to: partner.email,
              name: partner.name || 'Delivery Partner',
              version: activeAppRelease.version,
              releaseNotes: activeAppRelease.release_notes,
              androidUrl: activeAppRelease.android_url,
              iosUrl: activeAppRelease.ios_url,
            });
            notifiedCount++;
          } catch (e) {
            console.error(`Failed to send release email to ${partner.email}`, e);
          }
        }
      }
    }

    res.json({
      success: true,
      message: `App release ${activeAppRelease.version} published! ${notifiedCount > 0 ? `Notified ${notifiedCount} delivery partners via email.` : ''}`,
      release: activeAppRelease,
      notified_count: notifiedCount
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to publish app release' });
  }
});

router.post('/inspections', async (req, res) => {
  const user = await requireDeliveryOperator(req, res);
  if (!user) return;

  try {
    const {
      drone_id,
      delivery_id,
      inspection_type,
      stage,
      cargo_bay_condition,
      landing_surface,
      propeller_debris_check,
      field_battery_level,
      zero_defect_certified,
      delivery_handover_notes,
      body_condition,
      propeller_condition,
      battery_condition,
      landing_gear_condition,
      depot_avionics_cleared,
      ready_for_next_sortie,
      overall_inspection,
      remarks,
      photo_references
    } = req.body;

    if (!drone_id) {
      res.status(400).json({ success: false, error: 'drone_id is required for airframe inspection' });
      return;
    }

    const saved = await fileDB.saveInspection({
      drone_id: String(drone_id).trim(),
      delivery_id: delivery_id ? String(delivery_id).trim() : null,
      inspection_type,
      stage,
      cargo_bay_condition,
      landing_surface,
      propeller_debris_check,
      field_battery_level,
      zero_defect_certified,
      delivery_handover_notes,
      body_condition,
      propeller_condition,
      battery_condition,
      landing_gear_condition,
      depot_avionics_cleared,
      ready_for_next_sortie,
      overall_inspection,
      remarks,
      photo_references: Array.isArray(photo_references) ? photo_references : (Array.isArray(req.body.photos) ? req.body.photos : []),
      video_references: Array.isArray(req.body.video_references) ? req.body.video_references : (Array.isArray(req.body.videos) ? req.body.videos : []),
      media_evidence: Array.isArray(req.body.media_evidence) ? req.body.media_evidence : [],
      inspected_by: user.email || user.id,
      inspector_name: user.full_name || user.name || 'Operations Specialist',
      inspector_role: user.role
    });

    if (delivery_id) {
      try {
        const orderToUpdate = await fileDB.findOrderById(String(delivery_id).trim());
        const cleanDrone = String(drone_id).trim();
        const stage = req.body.stage || (inspection_type === 'pre-flight' ? 'hub_pickup' : 'customer_delivery');

        let updatePayload: any = {};
        if (stage === 'depot_dispatch' || stage === 'depot') {
          const prevDepot = Array.isArray(orderToUpdate?.depot_inspected_drone_ids) ? orderToUpdate.depot_inspected_drone_ids : [];
          const updatedDepot = Array.from(new Set([...prevDepot, cleanDrone]));
          updatePayload = {
            depot_inspection_id: saved.inspection_id,
            depot_inspected_drone_ids: updatedDepot,
          };
        } else if (stage === 'hub_pickup' || stage === 'hub' || inspection_type === 'pre-flight') {
          const prevHub = Array.isArray(orderToUpdate?.hub_inspected_drone_ids) ? orderToUpdate.hub_inspected_drone_ids : [];
          const updatedHub = Array.from(new Set([...prevHub, cleanDrone]));
          const prevDeliveryData = orderToUpdate?.delivery_data || {};
          const prevHubInspections = prevDeliveryData.hub_inspections || {};
          updatePayload = {
            hub_inspection_id: saved.inspection_id,
            hub_inspected_drone_ids: updatedHub,
            delivery_data: {
              ...prevDeliveryData,
              hub_inspections: {
                ...prevHubInspections,
                [cleanDrone]: saved,
                [cleanDrone.toUpperCase()]: saved,
                [cleanDrone.replace(/[^A-Z0-9]/gi, '')]: saved
              }
            }
          };
        } else {
          const prevInspected = Array.isArray(orderToUpdate?.inspected_drone_ids) ? orderToUpdate.inspected_drone_ids : [];
          const updatedInspected = Array.from(new Set([...prevInspected, cleanDrone]));
          const prevDeliveryData = orderToUpdate?.delivery_data || {};
          const prevCustInspections = prevDeliveryData.customer_inspections || {};
          updatePayload = {
            inspection_id: saved.inspection_id,
            post_delivery_inspection: saved,
            drone_inspection_status: saved.overall_inspection,
            inspected_drone_ids: updatedInspected,
            delivery_data: {
              ...prevDeliveryData,
              customer_inspections: {
                ...prevCustInspections,
                [cleanDrone]: saved,
                [cleanDrone.toUpperCase()]: saved,
                [cleanDrone.replace(/[^A-Z0-9]/gi, '')]: saved
              }
            }
          };
        }

        await fileDB.updateOrder(String(delivery_id).trim(), updatePayload);
      } catch (linkErr: any) {
        console.warn('[InspectionLink] Non-blocking order link notice:', linkErr?.message);
      }
    }

    res.json({
      success: true,
      message: `Inspection recorded successfully as ${saved.inspection_type}. Airframe condition: ${saved.overall_inspection}.`,
      inspection: saved
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to record inspection' });
  }
});

router.get('/inspections', async (req, res) => {
  const user = await requireDeliveryOperator(req, res);
  if (!user) return;

  try {
    const { drone_id, delivery_id, inspection_type } = req.query;
    const inspections = await fileDB.getInspections({
      drone_id: drone_id ? String(drone_id) : undefined,
      delivery_id: delivery_id ? String(delivery_id) : undefined,
      inspection_type: inspection_type ? String(inspection_type) : undefined
    });
    res.json({ success: true, inspections });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to list inspections' });
  }
});

router.get('/inspections/stats', async (req, res) => {
  const user = await requireDeliveryOperator(req, res);
  if (!user) return;

  try {
    const stats = await fileDB.getInspectionStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to get inspection stats' });
  }
});

router.get('/public/drone/:drone_id', async (req, res) => {
  try {
    const rawId = req.params.drone_id.trim();
    const fleet = await fileDB.getFleet();
    const drone = fleet.find(d =>
      String(d.id).toLowerCase() === rawId.toLowerCase() ||
      String(d.serial_number).toLowerCase() === rawId.toLowerCase()
    );

    if (!drone) {
      res.status(404).json({
        success: false,
        error: 'Airframe verification record not found or link has expired.'
      });
      return;
    }

    const inspections = await fileDB.getInspections({ drone_id: drone.id });
    const latestInspection = inspections[0] || null;

    const orders = await fileDB.getOrders();
    const targetId = String(drone.id).toLowerCase();
    const targetSn = String(drone.serial_number || '').toLowerCase();
    const targetRaw = rawId.toLowerCase();

    const matchedOrder = orders
      .filter(o => {
        const oDrone = String(o.assigned_drone_id || o.drone_id || '').toLowerCase();
        return oDrone && (oDrone === targetId || oDrone === targetSn || oDrone === targetRaw);
      })
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0] || null;

    let driverName = matchedOrder?.assigned_pilot_name || matchedOrder?.pilot_name || null;
    let driverPhone = matchedOrder?.assigned_pilot_phone || matchedOrder?.pilot_phone || null;

    if (!driverName && matchedOrder?.assigned_pilot_id) {
      const users = await fileDB.getUsers();
      const driver = users.find(u => String(u.id) === String(matchedOrder.assigned_pilot_id));
      if (driver) {
        driverName = driver.name || null;
        driverPhone = driverPhone || driver.phone || null;
      }
    }

    const user = await getAuthenticatedUser(req);
    const isOperator = user && ['admin', 'dispatcher', 'fleet_manager', 'delivery'].includes(user.role);

    const safeCustomerName = isOperator ? (matchedOrder?.customer_name || null) : (matchedOrder?.customer_name ? `${matchedOrder.customer_name.slice(0, 3)}***` : null);
    const safeCustomerPhone = isOperator ? (matchedOrder?.customer_phone || null) : maskPhone(matchedOrder?.customer_phone);
    const safeCustomerEmail = isOperator ? (matchedOrder?.customer_email || null) : maskEmail(matchedOrder?.customer_email);
    const safeDropAddress = isOperator
      ? (matchedOrder?.drop_address || matchedOrder?.delivery_address || null)
      : (matchedOrder?.drop_address ? matchedOrder.drop_address.split(',').slice(-2).join(', ').trim() : null);
    const safePilotPhone = isOperator ? driverPhone : maskPhone(driverPhone);

    res.json({
      success: true,
      drone: {
        drone_id: drone.id,
        serial_number: drone.serial_number,
        model_name: drone.model || drone.model_name || 'IndoWings 700 RPAV',
        status: drone.status,
        current_condition: drone.current_condition || (latestInspection?.overall_inspection === 'PASSED' ? 'GOOD' : 'NEEDS_REVIEW'),
        last_inspection_result: latestInspection?.overall_inspection || 'PASSED',
        last_inspected_at: latestInspection?.inspected_at || drone.updated_at || drone.created_at,
        support_hotline: process.env.SUPPORT_PHONE || '1800 572 7363',
        support_email: process.env.SUPPORT_EMAIL || 'connect@indowings.com',
        assigned_order: matchedOrder?.id || null,
        order_number: matchedOrder?.order_number || null,
        order_status: matchedOrder?.status || null,
        customer_name: safeCustomerName,
        customer_phone: safeCustomerPhone,
        customer_email: safeCustomerEmail,
        drop_address: safeDropAddress,
        assigned_pilot_name: driverName,
        assigned_pilot_phone: safePilotPhone,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to verify drone QR' });
  }
});

router.get('/geocode', async (req, res) => {
  try {
    const address = String(req.query.address || '').trim();
    if (!address) {
      res.status(400).json({ success: false, error: 'Address parameter is required' });
      return;
    }
    const result = await geocodeAddress(address);
    if (!result) {
      res.status(404).json({ success: false, error: 'Location coordinates not found for this address' });
      return;
    }
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Geocoding failed' });
  }
});

router.get('/public/track/:delivery_id', async (req, res) => {
  try {
    const rawId = req.params.delivery_id.trim();
    const orders = await fileDB.getOrders();
    const order = orders.find(o =>
      String(o.id).toLowerCase() === rawId.toLowerCase() ||
      String(o.order_number).toLowerCase() === rawId.toLowerCase()
    );

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Delivery reference not found or tracking token expired.'
      });
      return;
    }

    res.json({
      success: true,
      delivery: {
        order_number: order.order_number || order.id,
        status: order.status,
        delivery_status: order.status === 'delivered' ? 'Delivered' : order.status === 'out-for-delivery' ? 'Out for Delivery' : 'In Transit',
        scheduled_at: order.created_at,
        delivered_at: order.delivered_at || null,
        recipient_confirmation: Boolean(order.delivered_at || order.recipient_name),
        assigned_drone_id: order.assigned_drone_id || null,
        support_hotline: process.env.SUPPORT_PHONE || '1800 572 7363',
        support_email: process.env.SUPPORT_EMAIL || 'support@indowings.com'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch public delivery info' });
  }
});

export default router;

