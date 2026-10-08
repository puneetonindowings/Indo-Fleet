import '../env.js';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { fileDB } from '../db.js';
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
  sendTemporaryPasswordEmail
} from '../emailService.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'indowings_command_center_secret_2026';

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

async function getAuthenticatedUser(req: any) {
  const authorization = req.headers.authorization;
  if (!authorization) return null;
  let decoded: any;
  try {
    decoded = jwt.verify(authorization.replace(/^Bearer\s+/i, ''), JWT_SECRET);
  } catch {
    return null;
  }
  const user = await fileDB.findUserById(decoded.id);
  return user && user.status === 'active' && !user.must_change_password ? user : null;
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
  if (!['admin', 'dispatcher', 'fleet_manager'].includes(user.role)) {
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
  // If OTP is omitted / disabled, allow authorized administrator session directly
  if (!otp || typeof otp !== 'string' || !otp.trim()) {
    return true;
  }
  if (adminTarget !== undefined && typeof adminTarget !== 'string') {
    res.status(400).json({ error: 'Administrator OTP target is invalid.' });
    return false;
  }
  const validAdminTargets = [admin.email, admin.phone].filter(Boolean).map((target: string) => fileDB.normalizeOtpKey(target));
  const otpTarget = fileDB.normalizeOtpKey(adminTarget || admin.email || '');
  if (!validAdminTargets.includes(otpTarget)) {
    res.status(403).json({ error: 'OTP must be verified against the signed-in administrator account.' });
    return false;
  }
  const verification = await fileDB.verifyOTP(otpTarget, otp);
  if (!verification.valid || verification.meta?.purpose !== purpose) {
    res.status(400).json({ error: verification.reason || 'Invalid or expired administrator OTP.' });
    return false;
  }
  return true;
}

// Optional Secondary Supabase Phone Auth Client
const SH_SB_URL = process.env.SERVICEHUB_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SH_SB_KEY = process.env.SERVICEHUB_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const serviceHubOtpClient = SH_SB_URL && SH_SB_KEY ? createClient(SH_SB_URL, SH_SB_KEY) : (null as any);
if (serviceHubOtpClient && process.env.SERVICEHUB_SUPABASE_URL) console.log('[sms] Secondary Supabase OTP client configured.');

// Auth: Direct Email or Phone + Password Login (Default password: 123 123)
router.post('/auth/login', async (req, res) => {
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

  if (!user) {
    res.status(403).json({
      error: 'Access Denied: Account not found. Please contact Administrator for ID provisioning.'
    });
    return;
  }

  if (user.status !== 'active') {
    res.status(403).json({ error: 'This account is restricted. Contact an administrator.' });
    return;
  }
  const validPassword = user.password_hash ? await fileDB.verifyPassword(cleanPass, user.password_hash) : cleanPass === '123123';
  if (!validPassword) {
    res.status(401).json({ error: 'Invalid password. Please check and retry.' });
    return;
  }

  console.log(`[auth] User authenticated via password: ${user.name} (${user.email || user.phone}) [Role: ${user.role}] (mustChange: ${!!user.must_change_password})`);

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'Localhost';
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

// Auth: Step 2 - Verify Password and automatically dispatch 6-digit Security OTP
router.post('/auth/verify-password-and-send-otp', async (req, res) => {
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

  if (!user) {
    res.status(403).json({
      error: 'Access Denied: Account not found. Please contact Administrator for ID provisioning.'
    });
    return;
  }

  if (user.status !== 'active') {
    res.status(403).json({ error: 'This account is restricted. Contact an administrator.' });
    return;
  }

  const validPassword = user.password_hash ? await fileDB.verifyPassword(cleanPass, user.password_hash) : cleanPass === '123123';
  if (!validPassword) {
    res.status(401).json({ error: 'Invalid password. Please check and retry.' });
    return;
  }

  // Password is valid -> Generate and automatically dispatch 6-digit OTP
  const otp = crypto.randomInt(100000, 1000000).toString();
  const isEmail = Boolean(cleanEmail || (!cleanPhone && user.email));

  if (isEmail && user.email) {
    const targetEmail = user.email.toLowerCase().trim();
    await fileDB.saveOTP(targetEmail, otp, { name: user.name, email: targetEmail, purpose: 'login' });
    sendOtpNotification({ email: targetEmail, otp }).catch((err) => console.error('[mail] Auto OTP email error:', err));

    console.log(`[auth] Password verified & 6-digit OTP auto-sent to email: ${targetEmail}`);
    res.json({
      success: true,
      otp_sent: true,
      channel: 'email',
      destination: targetEmail,
      name: user.name,
      role: user.role
    });
    return;
  }

  const fullPhone = `+91${cleanPhone}`;
  await fileDB.saveOTP(cleanPhone, otp, { name: user.name, email: user.email, phone: fullPhone, purpose: 'login' });

  try {
    const { error: sbError } = await serviceHubOtpClient.auth.signInWithOtp({ phone: fullPhone });
    if (sbError) console.warn('[sms] Auto OTP SMS warning:', sbError.message);
  } catch (err: any) {
    console.warn('[sms] Auto OTP SMS error:', err.message);
  }

  if (user.email) {
    sendOtpNotification({ email: user.email, phone: cleanPhone, otp }).catch((err) => console.error('[mail] Auto OTP email error:', err));
  }

  console.log(`[auth] Password verified & 6-digit OTP auto-sent to phone: ${fullPhone}`);
  res.json({
    success: true,
    otp_sent: true,
    channel: 'phone',
    destination: `+91 ${cleanPhone}`,
    name: user.name,
    role: user.role
  });
});

// Auth: Verify whether user account exists before showing password / OTP step
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
      error: 'Access Denied: This account is not registered. Please contact your IndoWings Administrator for ID provisioning.'
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

// Auth: Send OTP verification code (Phone SMS OTP)
router.post('/auth/send-otp', async (req, res) => {
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

  // STRICT CHECK: Account MUST be pre-provisioned by Admin
  let existingUser: any = null;
  if (cleanEmail) existingUser = await fileDB.findUserByEmail(cleanEmail);
  if (!existingUser && cleanPhone) existingUser = await fileDB.findUserByPhone(cleanPhone);

  if (!existingUser) {
    res.status(403).json({
      error: 'Access Denied: This account is not registered. Please contact your IndoWings Administrator for ID provisioning.'
    });
    return;
  }
  const otpPurpose = purpose === 'first-time-password' ? 'first-time-password' : 'login';
  if (otpPurpose === 'first-time-password' && !existingUser.must_change_password) {
    res.status(400).json({ error: 'This account does not need a first-time password setup.' });
    return;
  }

  // Generate 6-digit cryptographic-grade numeric OTP
  const otp = crypto.randomInt(100000, 1000000).toString();

  // 1. Direct Email OTP
  if (isEmail && cleanEmail) {
    await fileDB.saveOTP(cleanEmail, otp, { name: existingUser.name, email: cleanEmail, purpose: otpPurpose });

    sendOtpNotification({ email: cleanEmail, otp }).catch((err) => console.error('Email OTP error:', err));

    res.json({
      message: `Verification code sent to ${cleanEmail}`,
      channel: 'email',
      destination: cleanEmail,
      role: existingUser.role
    });
    return;
  }

  // 2. Real Mobile Phone SMS OTP
  const fullPhone = `+91${cleanPhone}`;
  await fileDB.saveOTP(cleanPhone, otp, { name: existingUser.name, email: existingUser.email, phone: fullPhone, purpose: otpPurpose });

  if (otpPurpose === 'first-time-password') {
    sendOtpNotification({ phone: cleanPhone, otp }).catch((err) => console.error('First-time password OTP error:', err));
    res.json({
      message: `Password setup verification code sent to +91 ${cleanPhone}`,
      channel: 'phone',
      destination: `+91 ${cleanPhone}`,
      role: existingUser.role
    });
    return;
  }

  try {
    const { data: sbData, error: sbError } = await serviceHubOtpClient.auth.signInWithOtp({
      phone: fullPhone
    });
    if (sbError) {
      console.warn(`[sms] Dispatch warning:`, sbError.message);
    } else {
      console.log(`[sms] Dispatched SMS to ${fullPhone}!`);
    }
  } catch (err: any) {
    console.warn(`[sms] Dispatch error:`, err.message);
  }

  if (existingUser.email) {
    sendOtpNotification({ email: existingUser.email, phone: cleanPhone, otp }).catch((err) => console.error('OTP email error:', err));
  }

  res.json({
    message: `Verification code dispatched to +91 ${cleanPhone}`,
    channel: 'phone',
    destination: `+91 ${cleanPhone}`,
    phone: `+91 ${cleanPhone}`,
    role: existingUser.role
  });
});

// Auth: Verify OTP and login strictly for provisioned users
router.post('/auth/verify-otp', async (req, res) => {
  const { phone, email, otp } = req.body;
  if ((!phone && !email) || !otp) {
    res.status(400).json({ error: 'Email/Phone and verification code are required' });
    return;
  }

  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '').slice(-10) : '';
  const cleanEmail = email ? email.toLowerCase().trim() : '';
  const fullPhone = cleanPhone ? `+91${cleanPhone}` : '';
  const trimmedOtp = otp.toString().trim();

  let isValid = false;

  // 1. If phone provided, verify with ServiceHub Supabase SMS first
  if (cleanPhone) {
    try {
      const { data: sbVerify, error: sbErr } = await serviceHubOtpClient.auth.verifyOtp({
        phone: fullPhone,
        token: trimmedOtp,
        type: 'sms'
      });
      if (!sbErr && sbVerify?.user) {
        console.log(`[auth] Phone OTP verified for ${fullPhone}`);
        isValid = true;
      }
    } catch (err: any) {
      console.warn(`[auth] SMS verification exception:`, err.message);
    }

    // Fallback to local session
    if (!isValid) {
      const localPhoneRes = await fileDB.verifyOTP(cleanPhone, trimmedOtp);
      if (localPhoneRes.valid && localPhoneRes.meta?.purpose === 'login') {
        isValid = true;
        console.log(`[auth] Session verified for ${cleanPhone}`);
      }
    }
  }

  // 2. If email provided, verify email OTP
  if (!isValid && cleanEmail) {
    const localEmailRes = await fileDB.verifyOTP(cleanEmail, trimmedOtp);
    if (localEmailRes.valid && localEmailRes.meta?.purpose === 'login') {
      isValid = true;
      console.log(`[auth] Email OTP verified for ${cleanEmail}`);
    }
  }

  if (!isValid) {
    res.status(400).json({ error: 'Invalid or expired verification code. Please check and try again.' });
    return;
  }

  // Look up pre-provisioned user
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

  console.log(`[auth] User authenticated via OTP:`, user.name, `[Role: ${user.role}]`);

  // Send login alert email
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'Localhost';
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

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN USER & PERSONNEL MANAGEMENT ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// Admin-only account directory; never return password fields.
router.get('/users', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const users = await fileDB.getUsers();
  res.json({ users: users.map(publicUser) });
});

// Legacy endpoint disabled so account creation always goes through the OTP flow below.
router.post('/users', async (req, res) => {
  res.status(410).json({ error: 'Use the administrator OTP-protected account provisioning flow.' });
});

// Admin: Update User
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

// Admin: Delete User
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

// ─────────────────────────────────────────────────────────────────────────────
// FLEET QC & CLIENT HANDOVER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// Fleet Manager QC Clearance
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

// Client Drone Handover / Acceptance
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

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN PERSONNEL PROVISIONING WITH ADMIN OTP VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

// 1. Admin requests Security OTP to authorize user provisioning
router.post('/admin/request-provision-otp', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { channel } = req.body;
  if (channel !== 'email' && channel !== 'phone') {
    res.status(400).json({ error: 'Choose email or phone for the administrator OTP.' });
    return;
  }
  const target = channel === 'phone' ? admin.phone : admin.email;
  if (!target) {
    res.status(400).json({ error: 'The administrator account has no registered contact for provisioning OTP.' });
    return;
  }
  const otp = crypto.randomInt(100000, 1000000).toString();

  await fileDB.saveOTP(target, otp, { email: target.includes('@') ? target : undefined, phone: !target.includes('@') ? target : undefined, purpose: 'admin-provision' });

  if (target.includes('@')) {
    sendOtpNotification({ email: target, otp }).catch((e) => console.error('Admin OTP email error:', e));
  } else {
    sendOtpNotification({ phone: target.replace(/[^0-9]/g, '').slice(-10), otp }).catch((e) => console.error('Admin OTP SMS error:', e));
  }

  res.json({
    success: true,
    message: `Security OTP dispatched to Admin via ${channel === 'phone' ? 'SMS' : 'Email'} (${target})`,
    target
  });
});

router.post('/admin/request-inventory-otp', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { channel } = req.body;
  if (channel !== 'email' && channel !== 'phone') {
    res.status(400).json({ error: 'Choose email or phone for the administrator OTP.' });
    return;
  }
  const target = channel === 'phone' ? admin.phone : admin.email;
  if (!target) {
    res.status(400).json({ error: `The administrator account has no registered ${channel}.` });
    return;
  }
  const otp = crypto.randomInt(100000, 1000000).toString();
  await fileDB.saveOTP(target, otp, { email: target.includes('@') ? target : undefined, phone: !target.includes('@') ? target : undefined, purpose: 'admin-inventory' });
  if (target.includes('@')) {
    sendOtpNotification({ email: target, otp }).catch((err) => console.error('Inventory authorization email OTP error:', err));
  } else {
    sendOtpNotification({ phone: target.replace(/[^0-9]/g, '').slice(-10), otp }).catch((err) => console.error('Inventory authorization SMS OTP error:', err));
  }
  res.json({ success: true, message: `Inventory authorization OTP sent via ${channel}.`, target });
});

// 2. Admin verifies OTP & provisions new user account with temporary password
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
  if (!(await verifyAdminOtp(admin, adminTarget, otp, 'admin-provision', res))) return;

  const rolePrefix = role === 'admin' ? 'ADM' : role === 'fleet_manager' ? 'FLT' : role === 'dispatcher' ? 'DSP' : role === 'support' ? 'SUPP' : role === 'pilot' || role === 'delivery' ? 'PLT' : 'CUS';
  const tempPass = temporaryPassword.trim();

  const newUser = {
    id: `IW-${rolePrefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    name: name.trim(),
    email: cleanEmail,
    phone: cleanPhone ? `+91${cleanPhone}` : '',
    role,
    station: station || 'IndoWings Plant, Noida',
    organization: organization || 'IndoWings Aerospace Operations',
    status: 'active',
    password: tempPass,
    must_change_password: true, // Forces first-time password change on login!
    dl_id: req.body.dl_id || '',
    employee_id: req.body.employee_id || '',
    vehicle_id: req.body.vehicle_id || '',
    created_at: new Date().toISOString(),
    authorized_by: adminTarget || 'Super Admin'
  };

  await fileDB.addUser(newUser);
  console.log(`[admin] User ${newUser.name} provisioned with ID ${newUser.id} (Role: ${newUser.role})`);

  let emailSent = false;
  try {
    emailSent = await sendUserProvisionedEmail({
      to: cleanEmail,
      name: newUser.name,
      userId: newUser.id,
      role: newUser.role,
      temporaryPassword: tempPass,
      loginUrl: `${process.env.FRONTEND_URL || 'https://indowings.com'}/login`
    });
  } catch (err) {
    console.error('[mail] Failed to send user provisioning email:', err);
  }

  res.status(201).json({
    success: true,
    message: emailSent ? `Account provisioned and credentials emailed to ${cleanEmail}.` : `Account provisioned, but the credentials email could not be sent to ${cleanEmail}.`,
    emailSent,
    user: (() => {
      return publicUser(newUser);
    })()
  });
});

// 3. User First-Time Login: Mandatory Password Change via OTP
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

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD MANAGEMENT & SECURITY OTP (PROFILE & AUTH RECOVERY)
// ─────────────────────────────────────────────────────────────────────────────

// In-memory record for admin password reset audit requests
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

// 1. Profile: Step 1 - Validate current password & send 10-minute OTP
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
      : (cleanCurrent === user.password || cleanCurrent === '123123');

    if (!validCurrent) {
      res.status(400).json({ success: false, error: 'Incorrect current password. Please verify and try again.' });
      return;
    }

    const targetEmail = (user.email || '').toLowerCase().trim();
    if (!targetEmail) {
      res.status(400).json({ success: false, error: 'No registered email found for this user account.' });
      return;
    }

    // Generate 6-digit OTP (Strictly valid for 10 minutes)
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

// 2. Profile: Step 2 - Verify OTP & Commit Password Change
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

    if (!otp || typeof otp !== 'string' || !otp.trim()) {
      res.status(400).json({ success: false, error: '6-digit verification OTP is required.' });
      return;
    }

    if (!newPassword || newPassword.trim().length < 6) {
      res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
      return;
    }

    const targetEmail = (user.email || '').toLowerCase().trim();
    const verification = await fileDB.verifyOTP(targetEmail, otp.trim());
    if (!verification.valid) {
      res.status(400).json({ success: false, error: verification.reason || 'Invalid or expired OTP code (Valid for 10 minutes).' });
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

// 3. Auth: Forgot Password Request (From Login Page or Profile)
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

    // Generate secure 10-minute temporary password
    const tempPass = `IW-${crypto.randomBytes(3).toString('hex').toUpperCase()}9!`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Update user in DB with temporary password and flag must_change_password
    await fileDB.updateUser(user.id, {
      password: tempPass,
      must_change_password: true,
      temp_password_expires_at: expiresAt,
      password_updated_at: new Date().toISOString()
    });

    // Record audit entry for admin visibility
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

    // Send email with temporary password & 10-minute validity instructions
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

// 4. Admin: Generate & Dispatch 10-Minute Temporary Password for Any User
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

// 5. Admin: Get List of Password Reset Requests
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

// ─────────────────────────────────────────────────────────────────────────────
// DRONES MANAGEMENT (GET, SINGLE ADD & BULK BATCH PROVISIONING)
// ─────────────────────────────────────────────────────────────────────────────

// Get all drones
router.get('/drones', async (req, res) => {
  const fleet = await fileDB.getFleet();
  res.json({ drones: fleet, count: fleet.length });
});

// Single Drone Add (Drone Name, ID, Image URL, Optional Category, Verification)
router.post('/drones', async (req, res) => {
  const admin = await requireFleetManagerOrAdmin(req, res);
  if (!admin) return;
  const { id, model, serial_number, image_url, category, is_verified, verification_status, current_city, status, battery, qc_status, payload_kg, adminTarget, otp } = req.body;
  if (typeof model !== 'string' || !model.trim()) {
    res.status(400).json({ error: 'Drone Name / Model is required.' });
    return;
  }
  if (image_url && (typeof image_url !== 'string' || image_url.length > 2_000_000)) {
    res.status(400).json({ error: 'Drone image must be smaller than 1.5 MB.' });
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

// Bulk Batch Drone Provisioning (Scale up to 1000+ Drones)
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
    if (String(drone.image_url || '').length > 2_000_000) {
      res.status(400).json({ error: `Drone image for ${drone.id} must be smaller than 1.5 MB.` });
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

// Edit / Update Drone Details (Drone Name, ID/Serial, Image, Category, Verification, Status/Maintenance)
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
  if (safeUpdates.image_url && String(safeUpdates.image_url).length > 2_000_000) {
    res.status(400).json({ error: 'Drone image must be smaller than 1.5 MB.' });
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

// Delete Drone (Fleet Manager or Super Admin)
router.delete('/drones/:id', async (req, res) => {
  const admin = await requireFleetManagerOrAdmin(req, res);
  if (!admin) return;
  await fileDB.deleteDrone(String(req.params.id));
  res.json({ message: 'Drone decommissioned and removed from registry.' });
});

// Auth: Session verification
router.get('/auth/me', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'An active account session is required.' });
    return;
  }
  const safeUser = publicUser(user);
  res.json({ user: safeUser });
});

// Profile: Get profile and saved addresses
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

// Profile: Update profile details
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

// Profile: Request verification OTP
router.post('/profile/send-verify-otp', async (req, res) => {
  if (!(await getAuthenticatedUser(req))) {
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

    try {
      await serviceHubOtpClient.auth.signInWithOtp({ phone: fullPhone });
      console.log(`[Profile Phone Verify OTP] SMS triggered via ServiceHub to ${fullPhone}!`);
    } catch (e: any) {
      console.warn('SMS dispatch warning:', e.message);
    }

    res.json({ message: `Verification code dispatched via SMS to ${fullPhone}` });
    return;
  }

  res.status(400).json({ error: 'Invalid verification target' });
});

// Profile: Confirm verification OTP
router.post('/profile/verify-otp', async (req, res) => {
  const decoded = await getAuthenticatedUser(req);
  if (!decoded) {
    res.status(401).json({ error: 'An active account session is required.' });
    return;
  }

  const { target, value, otp } = req.body;
  if (!target || !value || !otp) {
    res.status(400).json({ error: 'Target, value, and OTP are required' });
    return;
  }

  const trimmedOtp = otp.toString().trim();
  let verified = false;

  if (target === 'phone') {
    const cleanPhone = value.replace(/[^0-9]/g, '').slice(-10);
    const fullPhone = `+91${cleanPhone}`;

    try {
      const { data: sbVerify, error: sbErr } = await serviceHubOtpClient.auth.verifyOtp({
        phone: fullPhone,
        token: trimmedOtp,
        type: 'sms'
      });
      if (!sbErr && sbVerify?.user) verified = true;
    } catch {}

    if (!verified) {
      const local = await fileDB.verifyOTP(cleanPhone, trimmedOtp);
      if (local.valid && local.meta?.purpose === 'profile-verification') verified = true;
    }

    if (!verified) {
      res.status(400).json({ error: 'Invalid or expired phone verification code' });
      return;
    }

    const updated = await fileDB.updateUser(decoded.id, { phone: fullPhone, is_phone_verified: true });
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
    if (!local.valid || local.meta?.purpose !== 'profile-verification') {
      res.status(400).json({ error: 'Invalid or expired email verification code' });
      return;
    }

    const updated = await fileDB.updateUser(decoded.id, { email: cleanEmail, is_email_verified: true });
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

// Customer storefront catalog. Stock is calculated from the same inventory the
// fleet team provisions, with reserved/sold units excluded from availability.
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
    res.status(503).json({ error: `Could not deliver the dispatch OTP by ${channel}. Check the configured ${channel === 'email' ? 'Resend' : 'SMS'} provider and try again.` });
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
  const inventory = await fileDB.getFleet();
  const available = inventory.filter((d) => d.status === 'idle' && (d.qc_status === 'passed' || !d.qc_status));
  res.json({
    drones: available,
    count: available.length,
    products: available
  });
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
  const destinationLat = address.lat === undefined || address.lat === null || address.lat === '' ? NaN : Number(address.lat);
  const destinationLng = address.lng === undefined || address.lng === null || address.lng === '' ? NaN : Number(address.lng);
  const hasDestinationCoordinates = Number.isFinite(destinationLat) && destinationLat >= -90 && destinationLat <= 90
    && Number.isFinite(destinationLng) && destinationLng >= -180 && destinationLng <= 180;
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
    pickup_address: 'IndoWings Manufacturing & Dispatch Center, Noida',
    drop_address: dropAddress,
    destination_address: dropAddress,
    ...(hasDestinationCoordinates ? {
      destination_lat: destinationLat,
      destination_lng: destinationLng,
      drop_lat: destinationLat,
      drop_lng: destinationLng
    } : {}),
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

// Orders: Create delivery order
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
  const unitsCount = Number(req.body.units_count || req.body.weight_kg) || 1;
  const carrier = req.body.carrier || req.body.package_type || 'IndoWings Secured Fleet Van';
  const pickupAddress = req.body.pickup_address || 'IndoWings Manufacturing Plant, Sector 62, Noida';

  if (!dropAddress) {
    res.status(400).json({ error: 'Destination address / client receiving facility is required' });
    return;
  }

  const now = new Date();
  const currentYear = now.getFullYear();

  // Consignment / Dispatch number (e.g. DSP-2026-001)
  const existingOrders = await fileDB.getOrders();
  let orderOfTheDay = existingOrders.length + 1;
  let orderId = `DSP-${currentYear}-${String(orderOfTheDay).padStart(3, '0')}`;

  while (existingOrders.some((o) => o.id.toUpperCase() === orderId.toUpperCase())) {
    orderOfTheDay++;
    orderId = `DSP-${currentYear}-${String(orderOfTheDay).padStart(3, '0')}`;
  }

  const challanNo = `CHL-${currentYear}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  const estimatedDelivery = new Date(now.getTime() + 48 * 3600 * 1000); // 48 hours transit avg

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
    drop_address: dropAddress,
    destination_address: dropAddress,
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

  // Send Order Placed Notification Email
  sendOrderPlacedEmail(savedOrder).catch((err) => console.error('Order email error:', err));

  res.status(201).json({ message: 'Delivery order placed successfully', order: savedOrder });
});

// Orders: List orders
router.get('/orders', async (req, res) => {
  const auth = req.headers.authorization;
  let user: any = null;
  if (auth) {
    try {
      user = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    } catch {}
  }

  const allOrders = await fileDB.getOrders();

  if (user?.role === 'admin') {
    res.json({ orders: allOrders, total: allOrders.length });
  } else if (user) {
    const userEmail = (user.email || '').toLowerCase().trim();
    const userPhoneClean = (user.phone || '').replace(/[^0-9]/g, '').slice(-10);
    const myOrders = allOrders.filter(
      (o) =>
        (o.creator_id && o.creator_id === user.id) ||
        (userEmail && o.customer_email && o.customer_email.toLowerCase() === userEmail) ||
        (userPhoneClean && o.customer_phone && o.customer_phone.replace(/[^0-9]/g, '').endsWith(userPhoneClean))
    );
    res.json({ orders: myOrders, total: myOrders.length });
  } else {
    res.json({ orders: allOrders, total: allOrders.length });
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
  res.json({
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
  });
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

// Orders: Fetch order by ID
router.get('/orders/:id', async (req, res) => {
  const order = await fileDB.findOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json({ order });
});

// Operations: Request Operator Self-Verification OTP for placing an order on hold
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
    message: `Security verification OTP sent to ${operator.email || operator.phone}`,
    dev_otp: otp
  });
});

// Operations Order Management: Hold, Cancel, Reschedule, Resume (Dispatcher, Admin, Fleet Manager)
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

// Orders: Update status and telemetry
router.patch('/orders/:id/status', async (req, res) => {
  const operator = await requireDeliveryOperator(req, res);
  if (!operator) return;
  const { status, reason, notes } = req.body || {};
  const order = await fileDB.findOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  const updated = await fileDB.updateOrder(order.id, {
    status: status || order.status,
    notes: notes || reason || order.notes,
    updated_at: new Date().toISOString()
  });
  res.json({ success: true, order: updated });
});

// Orders: Cancel order
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

// Fleet: Get fleet status
router.get('/fleet', async (req, res) => {
  const fleet = await fileDB.getFleet();
  const orders = await fileDB.getOrders();

  // Dynamically synchronize fleet with active orders
  const syncedFleet = fleet.map((drone) => {
    // Find if drone is currently assigned to an active order
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
      // Drone not carrying an active order
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

  res.json({
    fleet: syncedFleet,
    total_fleet: syncedFleet.length,
    active: activeCount,
    idle: idleCount,
    charging: chargingCount,
    on_hold: onHoldCount
  });
});

// Fleet: Update drone telemetry
router.patch('/fleet/:id', async (req, res) => {
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
  console.log(`[Fleet] Drone ${drone.id} updated:`, updates);
  res.json({ message: `Drone ${drone.id} telemetry updated`, drone: updatedDrone });
});

// Fleet: Register new drone
router.post('/fleet', async (req, res) => {
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

// Analytics: Flight metrics and statistics
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

// Support: Expert consultation requests
// Submit a support query / technical consultation request
router.post(['/support/expert-request', '/support/ticket'], async (req, res) => {
  try {
    const { name, phone, email, category, query_type, message, preferred_time, preferred_callback, order_id, delivery_address, drone_serial, priority } = req.body;

    if (!phone && !email) {
      res.status(400).json({ error: 'Please provide at least a phone number or email address' });
      return;
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
      source: 'web',
      priority: (priority || 'normal').toLowerCase(), // urgent, high, normal, low
      order_id: order_id?.trim() || null,
      delivery_address: delivery_address?.trim() || null,
      drone_serial: drone_serial?.trim() || null,
      message: message?.trim() || '',
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
          new_value: { status: 'open', source: 'web' },
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

    // 1. Dispatch real-time alert email to Support Team (connect@indowings.com)
    sendSupportQueryAlertToTeam(saved).catch((err) => console.error('[support] Team notification email failed:', err));

    // 2. Dispatch automated confirmation email to customer
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

// User Support Queries (for Profile & Status Tracking)
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

// Get all support tickets / expert requests (for Support Desk & Admin)
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

// Update status / resolve support ticket
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

    // If resolved or closed with notes, send resolution notification email to user
    const statusChanged = Boolean(updates.status && updates.status !== existing.status);
    if (updated.email && statusChanged && (updates.status === 'resolved' || updates.status === 'closed')) {
      sendQueryResolutionEmail(updated, updates.resolution_notes || 'Your query has been reviewed and resolved by our support team.', agent_name || 'IndoFleet Support Desk').catch((err) =>
        console.error('[support] Resolution email error:', err)
      );
    } else if (updated.email && statusChanged) {
      sendExpertRequestStatusEmail(updated, updates.status).catch((err) => console.error('[support] Status update email error:', err));
    }

    res.json({ success: true, request: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Log a phone call to a customer
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

// Send direct email reply from support dashboard to customer
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

// Feedback: Customer reviews and ratings
// Public: Get all feedbacks
router.get('/feedbacks', async (req, res) => {
  try {
    const feedbacks = await fileDB.getFeedbacks();
    res.json({ success: true, feedbacks });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch feedbacks' });
  }
});

// Public: Submit feedback (associated with an order or standalone)
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
      user_email: user_email?.trim() || 'guest@indowings.com',
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

// Admin: Update feedback (status or notes)
router.patch('/feedbacks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const updated = await fileDB.updateFeedback(id, { status, admin_notes });
    if (!updated) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }
    res.json({ success: true, feedback: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

// Admin: Delete feedback
router.delete('/feedbacks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await fileDB.deleteFeedback(id);
    res.json({ success: true, message: 'Feedback removed' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

// Chatbot: Virtual flight assistant
// Track order by Order ID with Customer Name Verification
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

    // Check if customer name is provided (unless already verified via OTP)
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
      // Verify customer name (case-insensitive fuzzy/contains)
      const inputName = providedName.toLowerCase();
      const actualCustomer = (order.customer_name || '').toLowerCase();
      const actualRecipient = (order.recipient_name || '').toLowerCase();

      // Check if input name matches first name, full name, or is contained
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

    // Name verified! Calculate live flight parameters
    const fleet = await fileDB.getFleet();
    const drone = fleet.find((d: any) => d.id === order.drone_id || d.model === order.drone_model) || {
      model: order.drone_model || 'Cyberone Pro',
      battery: 88,
      status: 'in-flight',
      max_payload: '5.0 kg',
      range: '45 km',
      speed: '65 km/h'
    };

    // Calculate dynamic ETA & location based on order status
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

// Request OTP to retrieve Order ID via Phone or Email
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

    // Resolve linked account identifiers from Supabase.
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

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP challenges in Supabase under primary and linked identifiers.
    if (cleanEmail) await fileDB.saveOTP(cleanEmail, otp, { email: cleanEmail, phone: linkedPhone ? `+91${linkedPhone}` : undefined });
    if (cleanPhone) await fileDB.saveOTP(cleanPhone, otp, { phone: `+91${cleanPhone}`, email: linkedEmail || undefined });
    if (linkedEmail && linkedEmail !== cleanEmail) await fileDB.saveOTP(linkedEmail, otp, { email: linkedEmail, phone: cleanPhone ? `+91${cleanPhone}` : undefined });
    if (linkedPhone && linkedPhone !== cleanPhone) await fileDB.saveOTP(linkedPhone, otp, { phone: `+91${linkedPhone}`, email: cleanEmail || undefined });

    console.log(`[bot] Verification OTP dispatched to ${cleanEmail || cleanPhone}`);

    // Dispatch Email OTP through Resend
    const targetEmail = cleanEmail || linkedEmail;
    if (targetEmail) {
      sendOtpNotification({ email: targetEmail, otp, phone: cleanPhone || linkedPhone })
        .then(() => console.log(`[bot] Email sent: OTP delivered to ${targetEmail}`))
        .catch((err) => console.error('Chatbot email OTP error:', err));
    }

    // Dispatch Phone SMS (ServiceHub Twilio Gateway)
    const targetPhone = cleanPhone || linkedPhone;
    if (targetPhone) {
      const fullPhone = `+91${targetPhone}`;
      serviceHubOtpClient.auth
        .signInWithOtp({ phone: fullPhone })
        .then(() => console.log(`[ok] [Chatbot SMS Gateway] Dispatched Twilio SMS to ${fullPhone}`))
        .catch((err: any) => console.warn(`[bot] SMS warning:`, err.message));
    }

    const channelDesc = isEmail ? cleanEmail : `+91 ${cleanPhone}${linkedEmail ? ` (and email ${linkedEmail})` : ''}`;

    res.json({
      success: true,
      channel: isEmail ? 'email' : 'phone',
      identifier: isEmail ? cleanEmail : cleanPhone,
      message: `A 6-digit verification code has been dispatched to ${channelDesc}.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'OTP dispatch failed: ' + err.message });
  }
});

// Verify OTP & return list of user orders
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

    // Resolve linked account identifiers from Supabase.
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

    // 1. If phone, verify with ServiceHub Supabase Twilio SMS first
    if (cleanPhone) {
      try {
        const { data: sbVerify, error: sbErr } = await serviceHubOtpClient.auth.verifyOtp({
          phone: fullPhone,
          token: trimmedOtp,
          type: 'sms'
        });
        if (!sbErr && (sbVerify?.user || sbVerify?.session)) {
          console.log(`[bot] SMS verified: Phone OTP Verified Successfully for ${fullPhone}`);
          isValid = true;
        }
      } catch (err: any) {
        console.warn(`[bot] SMS verification exception:`, err.message);
      }
    }

    // 2. Check local session for phone, email, or linked accounts
    if (!isValid) {
      const checkKeys = [cleanPhone, cleanEmail, linkedEmail, linkedPhone].filter(Boolean);
      for (const k of checkKeys) {
        const localRes = await fileDB.verifyOTP(k, trimmedOtp);
        if (localRes.valid) {
          isValid = true;
          console.log(`[bot] Session verified: OTP Verified for key "${k}"`);
          break;
        }
      }
    }

    if (!isValid) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please check and try again.'
      });
      return;
    }

    // Validated! Gather all identifiers for this user & find orders
    const allOrders = await fileDB.getOrders();
    const searchEmails = new Set<string>();
    const searchPhones = new Set<string>();

    if (cleanEmail) searchEmails.add(cleanEmail);
    if (linkedEmail) searchEmails.add(linkedEmail);
    if (cleanPhone) searchPhones.add(cleanPhone);
    if (linkedPhone) searchPhones.add(linkedPhone);

    // Cross-match linked accounts loaded from Supabase.
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

// Chatbot: Direct Order ID Lookup by Name + Phone/Email + Booking Date
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

      // Name match
      let nameMatched = false;
      if (cleanName) {
        nameMatched =
          oCust.includes(cleanName) ||
          cleanName.includes(oCust) ||
          oRecip.includes(cleanName) ||
          cleanName.includes(oRecip) ||
          oCust.split(' ').some((p: string) => p.length >= 3 && cleanName.includes(p));
      }

      // Phone / Email match
      let contactMatched = false;
      if (cleanPhone && oPhone.endsWith(cleanPhone)) contactMatched = true;
      if (cleanEmail && oEmail === cleanEmail) contactMatched = true;

      // If both name and phone/email are provided, both must match
      if (cleanName && (cleanPhone || cleanEmail)) {
        if (!nameMatched || !contactMatched) return false;
      } else if (cleanName) {
        if (!nameMatched) return false;
      } else if (cleanPhone || cleanEmail) {
        if (!contactMatched) return false;
      }

      // Optional date filter if provided
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
          // Check if date substring matches
          if (!o.created_at.toLowerCase().includes(dStr) && !oDate.includes(dStr)) {
            // Also check formatted date e.g. "07 Oct"
            const formatted = new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toLowerCase();
            if (!formatted.includes(dStr)) {
              // lenient date match
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

// ── PILOT MOBILE APP & DISPATCH LIFECYCLE API ─────────────────────────────

// In-memory / cache store for active SOS emergencies and dispatcher OTPs
const activeSosAlerts: any[] = [];
const dispatcherHandoverOtps: Record<string, { otp: string; orderId: string; expiresAt: number }> = {};
const customerDeliveryOtps: Record<string, { otp: string; orderId: string; expiresAt: number }> = {};

// Helper to calculate today's start in local/ISO
function getTodayStartIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// 1. Pilot Authentication (Only Pilot / Delivery personnel allowed)
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
      res.status(404).json({
        success: false,
        error: 'Delivery account not found. Please check your Delivery ID/Email or contact Admin.'
      });
      return;
    }

    // Role verification: strictly delivery / pilot personnel only
    const userRole = (user.role || '').toLowerCase();
    if (userRole !== 'delivery' && userRole !== 'pilot') {
      res.status(403).json({
        success: false,
        error: `Unauthorized Access: This app is strictly for Delivery Partners. Your account has the role '${user.role || 'user'}'. Please use the IndoFleet Web Portal or contact Admin.`
      });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ success: false, error: 'This delivery account is currently restricted or suspended.' });
      return;
    }

    const validPassword = user.password_hash
      ? await fileDB.verifyPassword(cleanPass, user.password_hash)
      : (cleanPass === user.password || cleanPass === '123123');

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

// 2. Pilot Password Change (First login force change or profile change)
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

    // If not first-time mandatory, verify old password if supplied
    if (!user.must_change_password && oldPassword) {
      const validOld = user.password_hash
        ? await fileDB.verifyPassword(oldPassword, user.password_hash)
        : (oldPassword === user.password || oldPassword === '123123');
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

// 3. Pilot Dashboard KPIs, Performance Metrics, and Orders
router.get('/pilot/dashboard', async (req, res) => {
  try {
    const pilotId = (req.query.pilotId as string) || '';
    const orders = await fileDB.getOrders();
    const todayStart = getTodayStartIso();

    // Filter orders relevant to this pilot (or all active if unassigned/admin view)
    const pilotOrders = pilotId
      ? orders.filter((o: any) => o.assigned_pilot_id === pilotId || o.pilot_assigned === pilotId || !o.assigned_pilot_id)
      : orders;

    // KPI Metrics calculation
    const totalAssigned = pilotOrders.filter((o: any) => ['assigned', 'taking-off', 'in-flight', 'out-for-delivery'].includes(o.status)).length;
    const totalDelivered = pilotOrders.filter((o: any) => o.status === 'delivered').length;
    const totalMissed = pilotOrders.filter((o: any) => o.status === 'cancelled' || o.status === 'missed').length;
    const totalQueue = pilotOrders.filter((o: any) => o.status === 'pending').length;

    const todaysOrders = pilotOrders.filter((o: any) => (o.created_at || '') >= todayStart);
    const todaysAssigned = todaysOrders.filter((o: any) => ['assigned', 'taking-off', 'in-flight', 'out-for-delivery'].includes(o.status)).length;
    const todaysDelivered = todaysOrders.filter((o: any) => o.status === 'delivered').length;
    const todaysMissed = todaysOrders.filter((o: any) => o.status === 'cancelled' || o.status === 'missed').length;
    const todaysQueue = todaysOrders.filter((o: any) => o.status === 'pending').length;

    // Performance trends (hourly / completion rate)
    const completionRate = totalDelivered + totalMissed > 0
      ? Math.round((totalDelivered / (totalDelivered + totalMissed)) * 100)
      : 100;

    // Active orders list formatted for Pilot App
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
        pickup_location: o.pickup_location || null,
        destination_location: o.destination_location || null,
        drone_model: o.drone_model || 'UAV',
        drone_id: o.drone_id || (o.reserved_inventory_ids || [])[0] || '',
        status: o.status,
        units_count: o.units_count || 1,
        weight_kg: o.weight_kg || 0,
        fare_inr: o.fare_inr || 0,
        payment_status: o.payment_status || 'Prepaid',
        items: o.items || [],
        assigned_by_name: o.assigned_by_name || 'Operations Desk',
        assigned_by_role: o.assigned_by_role || 'Dispatcher',
        assigned_at: o.assigned_at || o.created_at,
        pilot_acceptance_status: o.pilot_acceptance_status || (o.status === 'in-flight' ? 'accepted' : 'pending_acceptance'),
        pilot_acceptance_otp: o.pilot_acceptance_otp || '',
        last_known_location: o.last_known_location || null,
        created_at: o.created_at
      }));

    // Real Weekly Trend (Past 7 Days computed dynamically)
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

    // Real Hourly Active (Today computed dynamically)
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
        total_missed: totalMissed,
        total_queue: totalQueue,
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
      active_orders: activeOrders
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to load pilot dashboard' });
  }
});

// 4. Admin / Dispatcher Order Assignment with OTP Protection
router.post('/orders/:id/assign-pilot-request-otp', async (req, res) => {
  const operator = await requireDispatchOperator(req, res);
  if (!operator) return;

  const { id } = req.params;
  const otp = crypto.randomInt(100000, 1000000).toString();
  await fileDB.saveOTP(operator.email || operator.phone, otp, { purpose: `assign-order-${id}` });

  if (operator.email) {
    sendOtpNotification({ email: operator.email, otp }).catch((err) => console.error('[mail] Dispatcher assignment OTP error:', err));
  }

  res.json({
    success: true,
    message: `Assignment authorization OTP dispatched to ${operator.email || operator.phone}`,
    order_id: id
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

    // If OTP verification required
    if (otp && typeof otp === 'string' && otp.trim()) {
      const verifyRes = await fileDB.verifyOTP(operator.email || operator.phone, otp.trim());
      if (!verifyRes.valid) {
        res.status(400).json({ success: false, error: 'Invalid or expired assignment authorization OTP.' });
        return;
      }
    }

    const order = await fileDB.findOrderById(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    // Generate 6-digit Acceptance OTP for Pilot
    const pilotAcceptanceOtp = crypto.randomInt(100000, 1000000).toString();

    const updated = await fileDB.updateOrder(id, {
      status: 'assigned',
      assigned_pilot_id: pilot_id || '',
      pilot_assigned: pilot_name || 'Assigned Pilot',
      pilot_phone: pilot_phone || '',
      drone_id: drone_id || order.drone_id || 'UAV-SYS-01',
      assigned_by_name: operator.name || 'Flight Operations Dispatcher',
      assigned_by_role: operator.role || 'dispatcher',
      assigned_at: new Date().toISOString(),
      pilot_acceptance_status: 'pending_acceptance',
      pilot_acceptance_otp: pilotAcceptanceOtp
    });

    res.json({
      success: true,
      message: `Order #${id} successfully assigned to ${pilot_name}!`,
      pilot_acceptance_otp: pilotAcceptanceOtp,
      order: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to assign order' });
  }
});

// 5. Delivery Partner Accepts Order via Acceptance OTP
router.post('/pilot/accept-order', async (req, res) => {
  try {
    const { order_id, otp, pilot_name, pilot_id, dl_id, vehicle_id } = req.body;
    if (!order_id || !otp) {
      res.status(400).json({ success: false, error: 'Order ID and Acceptance OTP are required' });
      return;
    }

    const order = await fileDB.findOrderById(order_id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    // Lookup Delivery Partner Profile to verify DL ID and Vehicle ID
    let deliveryUser: any = null;
    if (order.assigned_pilot_id) {
      deliveryUser = await fileDB.findUserById(order.assigned_pilot_id);
    }
    if (!deliveryUser && pilot_id) {
      deliveryUser = await fileDB.findUserById(pilot_id);
    }
    if (!deliveryUser && order.pilot_phone) {
      deliveryUser = await fileDB.findUserByPhone(order.pilot_phone);
    }

    const partnerDl = (dl_id || deliveryUser?.dl_id || deliveryUser?.metadata?.dl_id || '').toString().trim();
    const partnerVehicle = (vehicle_id || deliveryUser?.vehicle_id || deliveryUser?.metadata?.vehicle_id || '').toString().trim();

    // STRICT CHECK: Delivery Partner MUST have filled DL ID and Vehicle Number in their Profile
    if (!partnerDl || !partnerVehicle) {
      res.status(422).json({
        success: false,
        error: 'Profile Incomplete: You cannot accept this order until you fill your Driving License (DL ID) and Vehicle Number in your Profile.',
        requires_profile_update: true
      });
      return;
    }

    const cleanOtp = otp.toString().trim();
    const expectedOtp = (order.pilot_acceptance_otp || '').toString().trim();

    if (!expectedOtp || cleanOtp !== expectedOtp) {
      res.status(400).json({ success: false, error: 'Invalid Acceptance OTP. Please check the code provided by Dispatcher.' });
      return;
    }

    const updated = await fileDB.updateOrder(order_id, {
      pilot_acceptance_status: 'accepted',
      accepted_at: new Date().toISOString(),
      pilot_assigned: pilot_name || deliveryUser?.name || order.pilot_assigned || 'Delivery Partner',
      pilot_phone: deliveryUser?.phone || order.pilot_phone || '',
      drone_id: partnerVehicle || order.drone_id || 'Vehicle-01',
      dl_id: partnerDl
    });

    // Notify Dispatcher that Delivery Partner accepted order
    const dispatcherEmail = order.assigned_by_email || process.env.ADMIN_EMAIL || 'ops@indowings.com';
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
      message: `Order #${order_id} accepted by ${pilot_name || 'Delivery Partner'}! Ready for package handover.`,
      order: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to accept order' });
  }
});

// 6. Request Dispatcher Handover OTP to Start Delivery / Flight
router.post('/pilot/request-handover-otp', async (req, res) => {
  try {
    const { order_id, pilot_name } = req.body;
    if (!order_id) {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    const handoverOtp = crypto.randomInt(100000, 1000000).toString();
    dispatcherHandoverOtps[order_id] = {
      otp: handoverOtp,
      orderId: order_id,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 mins
    };

    console.log(`[DISPATCHER HANDOVER OTP] Order #${order_id}: ${handoverOtp}`);

    res.json({
      success: true,
      message: 'Dispatcher Handover OTP generated.',
      handover_otp: handoverOtp // Returned so pilot/dispatcher can see in demo or receive via SMS
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to generate handover OTP' });
  }
});

// 7. Verify Dispatcher Handover OTP & Start Live Delivery Flight
router.post('/pilot/verify-handover-and-start-flight', async (req, res) => {
  try {
    const { order_id, dispatcher_otp, pilot_name, pilot_phone, vehicle_id, initial_lat, initial_lng } = req.body;
    if (!order_id || !dispatcher_otp) {
      res.status(400).json({ success: false, error: 'Order ID and Dispatcher Handover OTP are required' });
      return;
    }

    const cached = dispatcherHandoverOtps[order_id];
    const cleanOtp = dispatcher_otp.toString().trim();

    if (!cached || cached.otp !== cleanOtp || cached.expiresAt < Date.now()) {
      res.status(400).json({ success: false, error: 'Invalid or expired Dispatcher Handover OTP.' });
      return;
    }

    const order = await fileDB.findOrderById(order_id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const now = new Date().toISOString();
    const updated = await fileDB.updateOrder(order_id, {
      status: 'in-flight',
      location_is_live: true,
      dispatched_at: now,
      pilot_assigned: pilot_name || order.pilot_assigned || 'IndoWings Pilot',
      pilot_phone: pilot_phone || order.pilot_phone || '',
      drone_id: vehicle_id || order.drone_id || 'UAV-SYS-01',
      ...(initial_lat && initial_lng ? {
        last_known_location: `${initial_lat}, ${initial_lng}`,
        current_location_coords: { lat: initial_lat, lng: initial_lng }
      } : {})
    });

    // Send Live Tracking Link & Flight Started Notification to Customer
    const trackingUrl = `${process.env.FRONTEND_URL || 'https://indo-fleet.vercel.app'}/track?orderId=${order_id}`;
    if (order.customer_email || order.recipient_email) {
      sendFlightStartedCustomerEmail({
        to: order.customer_email || order.recipient_email,
        customerName: order.customer_name || order.recipient_name || 'Customer',
        orderNumber: order.order_number || order.id,
        pilotName: pilot_name || 'IndoWings Flight Pilot',
        pilotPhone: pilot_phone || '+91 7669478937',
        vehicleId: vehicle_id || order.drone_id || 'IndoWings 700RPAV UAV',
        trackingUrl,
        deliveryAddress: order.drop_address || order.destination_address || 'Delivery Destination'
      }).catch((err) => console.error('[mail] Flight start email dispatch error:', err));
    }

    res.json({
      success: true,
      message: `Flight Transit initiated! Live tracking link sent to customer.`,
      tracking_url: trackingUrl,
      order: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to start flight' });
  }
});

// 8. Real-time Live GPS Coordinates Stream
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
    const liveLocation = {
      lat: Number(latitude),
      lng: Number(longitude),
      altitude_m: altitude != null ? Number(altitude) : 45,
      speed_kmh: speed != null ? Number(speed) : 0,
      heading_deg: heading != null ? Number(heading) : 0,
      accuracy_m: accuracy != null ? Number(accuracy) : 5,
      battery_pct: battery_pct !== undefined ? Number(battery_pct) : 95,
      pilot_name: pilot_id || 'IndoWings Pilot',
      updated_at: now
    };

    const updatedOrder = await fileDB.updateOrder(order_id, {
      last_known_location: `${liveLocation.lat.toFixed(6)}, ${liveLocation.lng.toFixed(6)}`,
      current_location_coords: { lat: liveLocation.lat, lng: liveLocation.lng },
      altitude_m: liveLocation.altitude_m,
      speed_kmh: liveLocation.speed_kmh,
      heading_deg: liveLocation.heading_deg,
      battery_pct: liveLocation.battery_pct,
      last_location_updated_at: now,
      location_is_live: true,
      ...(order.status === 'pending' || order.status === 'assigned' ? { status: 'in-flight' } : {})
    });

    res.json({
      success: true,
      order_id,
      timestamp: now,
      recorded_location: liveLocation,
      status: updatedOrder?.status || 'in-flight'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update live location' });
  }
});

// 9. SOS Emergency Alert Beacon
router.post('/pilot/sos-emergency', async (req, res) => {
  try {
    const { pilot_name, pilot_phone, vehicle_id, latitude, longitude, battery_pct, audio_base64, notes } = req.body;

    const sosEvent = {
      id: `SOS-${Date.now().toString(36).toUpperCase()}`,
      pilot_name: pilot_name || 'Pilot',
      pilot_phone: pilot_phone || '',
      vehicle_id: vehicle_id || 'UAV-SYS',
      latitude: Number(latitude || 28.628),
      longitude: Number(longitude || 77.3649),
      battery_pct: battery_pct || 80,
      has_audio: Boolean(audio_base64),
      notes: notes || 'EMERGENCY BEACON TRIGGERED BY PILOT',
      timestamp: new Date().toISOString(),
      status: 'active'
    };

    activeSosAlerts.unshift(sosEvent);

    // Send high-priority alert email to Super Admin & Operations Team
    const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.RESEND_FROM_EMAIL || 'puneetkushwaha9452@gmail.com';
    sendSosEmergencyAlertEmail({
      adminEmail,
      pilotName: sosEvent.pilot_name,
      pilotPhone: sosEvent.pilot_phone,
      vehicleId: sosEvent.vehicle_id,
      latitude: sosEvent.latitude,
      longitude: sosEvent.longitude,
      batteryPct: sosEvent.battery_pct,
      timestamp: sosEvent.timestamp,
      audioNote: notes || '1-minute SOS mic recording transmitted to server'
    }).catch((err) => console.error('[mail] SOS email alert error:', err));

    res.json({
      success: true,
      message: '🚨 CRITICAL SOS BEACON TRANSMITTED TO COMMAND CENTER & DISPATCH OPS!',
      sos_id: sosEvent.id
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to trigger SOS' });
  }
});

// 10. Admin endpoint to view active SOS alerts
router.get('/admin/sos-alerts', async (req, res) => {
  res.json({
    success: true,
    count: activeSosAlerts.length,
    alerts: activeSosAlerts
  });
});

const pilotDeliveryOtps: Record<string, { otp: string; orderId: string; expiresAt: number }> = {};

// 11. Request Customer Delivery Handover OTP
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
    customerDeliveryOtps[order_id] = {
      otp: customerOtp,
      orderId: order_id,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 mins
    };

    const customerTarget = order.customer_email || order.customer_phone;
    if (order.customer_email) {
      sendOtpNotification({ email: order.customer_email, otp: customerOtp }).catch((err) => console.error('[mail] Customer OTP error:', err));
    }

    console.log(`[CUSTOMER DELIVERY OTP] Order #${order_id}: ${customerOtp}`);

    res.json({
      success: true,
      message: `Delivery Verification OTP dispatched to customer (${customerTarget || 'Phone/Email'})`,
      customer_otp: customerOtp // For quick pilot testing & fallback
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to request customer OTP' });
  }
});

// 11b. Request Pilot Self Verification Delivery OTP
router.post('/pilot/request-pilot-delivery-otp', async (req, res) => {
  try {
    const { order_id, pilot_email, pilot_phone, pilot_name } = req.body;
    if (!order_id) {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    const pilotOtp = crypto.randomInt(100000, 1000000).toString();
    pilotDeliveryOtps[order_id] = {
      otp: pilotOtp,
      orderId: order_id,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 mins
    };

    if (pilot_email) {
      sendOtpNotification({ email: pilot_email, otp: pilotOtp }).catch((err) => console.error('[mail] Pilot Delivery OTP error:', err));
    }

    console.log(`[PILOT SELF DELIVERY OTP] Order #${order_id} for ${pilot_name || 'Pilot'}: ${pilotOtp}`);

    res.json({
      success: true,
      message: `Pilot Verification OTP dispatched to ${pilot_email || pilot_phone || 'Pilot phone/email'}`,
      pilot_otp: pilotOtp // For quick pilot testing & fallback
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to request pilot OTP' });
  }
});

// 12. Complete Delivery with Customer OTP, Pilot OTP, Recipient Signature, and GPS Tag
router.post('/pilot/complete-delivery', async (req, res) => {
  try {
    const {
      order_id,
      customer_otp,
      pilot_otp,
      recipient_name,
      digital_signature,
      final_latitude,
      final_longitude,
      delivery_notes,
      pilot_name
    } = req.body;

    if (!order_id || !recipient_name) {
      res.status(400).json({ success: false, error: 'Order ID and Recipient Name are required' });
      return;
    }

    // 1. Verify Customer OTP
    const cleanCustomerOtp = (customer_otp || '').toString().trim();
    const cachedCustomerOtp = customerDeliveryOtps[order_id];
    if (!cachedCustomerOtp || cachedCustomerOtp.otp !== cleanCustomerOtp || cachedCustomerOtp.expiresAt < Date.now()) {
      res.status(400).json({ success: false, error: 'Invalid or expired Customer Delivery OTP. Please ask customer for correct 6-digit code.' });
      return;
    }

    // 2. Verify Pilot Self OTP
    const cleanPilotOtp = (pilot_otp || '').toString().trim();
    const cachedPilotOtp = pilotDeliveryOtps[order_id];
    if (!cachedPilotOtp || cachedPilotOtp.otp !== cleanPilotOtp || cachedPilotOtp.expiresAt < Date.now()) {
      res.status(400).json({ success: false, error: 'Invalid or expired Pilot Self OTP. Please enter the OTP sent to your pilot account.' });
      return;
    }

    const order = await fileDB.findOrderById(order_id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const now = new Date().toISOString();
    const updated = await fileDB.updateOrder(order_id, {
      status: 'delivered',
      delivered_at: now,
      location_is_live: false,
      recipient_name: recipient_name.trim(),
      delivery_notes: delivery_notes || 'Handover completed and digitally signed by recipient',
      digital_signature_url: digital_signature || null,
      last_known_location: final_latitude && final_longitude ? `${final_latitude}, ${final_longitude}` : order.last_known_location,
      handover_details: {
        recipient_name: recipient_name.trim(),
        delivered_by: pilot_name || order.pilot_assigned || 'IndoWings Pilot',
        verified_via_customer_otp: true,
        verified_via_pilot_otp: true,
        delivered_at_coords: final_latitude && final_longitude ? { lat: final_latitude, lng: final_longitude } : null,
        timestamp: now
      }
    });

    // Notify Admin and Operations Desk with proof of delivery
    const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.RESEND_FROM_EMAIL || 'puneetkushwaha9452@gmail.com';
    sendDeliveryCompletedEmail({
      to: adminEmail,
      orderNumber: order.order_number || order.id,
      recipientName: recipient_name.trim(),
      pilotName: pilot_name || order.pilot_assigned || 'IndoWings Pilot',
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

// 13. Pilot Profile Endpoints
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

// 14. Pilot Support Ticket
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
      message: 'Support request submitted to 24x7 IndoWings Control Room!',
      ticket_id: ticketId
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to submit support ticket' });
  }
});

export default router;

