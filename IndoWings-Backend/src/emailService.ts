import './env.js';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const RESEND_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@dev2dev.online';
const SUPPORT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.SUPPORT_EMAIL || FROM_EMAIL;
const SUPPORT_FROM_NAME = process.env.RESEND_FROM_NAME || process.env.SUPPORT_EMAIL_NAME || 'IndoFleet Support Desk';
const MAIL_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.SUPPORT_EMAIL || FROM_EMAIL;
const MAIL_FROM_NAME = process.env.RESEND_FROM_NAME || process.env.SUPPORT_EMAIL_NAME || 'IndoFleet Flight Operations';

const resend = new Resend(RESEND_KEY);

const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }): Promise<boolean> {
  if (!to || !to.includes('@')) {
    console.error('[mail] Not sent: destination email address is invalid.');
    return false;
  }

  const activeResendKey = process.env.RESEND_API_KEY || RESEND_KEY;
  const mailClient = activeResendKey ? new Resend(activeResendKey) : null;

  // 1. Try Resend API
  if (activeResendKey && mailClient) {
    const fromAddr = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    try {
      const { data, error } = await mailClient.emails.send({
        from: `${MAIL_FROM_NAME} <${fromAddr}>`,
        to: [to],
        subject,
        text,
        html: html || undefined
      });

      if (data && !error) {
        console.log(`[mail] Resend delivered email to ${to} (ID: ${data.id})`);
        return true;
      }

      console.warn(`[mail] Resend sender ${fromAddr} returned error: ${error?.message}. Trying fallback sender...`);

      // If custom domain is not verified, try onboarding@resend.dev
      if (fromAddr !== 'onboarding@resend.dev') {
        const retry = await mailClient.emails.send({
          from: `${MAIL_FROM_NAME} <onboarding@resend.dev>`,
          to: [to],
          subject,
          text,
          html: html || undefined
        });
        if (retry.data && !retry.error) {
          console.log(`[mail] Resend delivered via onboarding@resend.dev to ${to} (ID: ${retry.data.id})`);
          return true;
        }
      }
    } catch (err) {
      console.warn('[mail] Resend exception. Attempting Gmail SMTP fallback:', err instanceof Error ? err.message : err);
    }
  }

  // 2. Fallback to Gmail SMTP via Nodemailer
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const info = await smtpTransporter.sendMail({
        from: `"${MAIL_FROM_NAME}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html: html || undefined
      });
      console.log(`[mail] Gmail SMTP delivered message for ${to} (ID: ${info.messageId})`);
      return true;
    } catch (smtpErr) {
      console.error('[mail] Gmail SMTP fallback failed:', smtpErr instanceof Error ? smtpErr.message : smtpErr);
    }
  }

  return false;
}

export async function getReceivedSupportAttachment(emailId: string, attachmentId: string) {
  const { data, error } = await resend.emails.receiving.attachments.get({ emailId, id: attachmentId });
  if (error || !data) throw new Error('Could not retrieve the attachment from Resend.');
  return data;
}

// ── 0. OTP Dispatch (Email & SMS Gateway) ───────────────────────────────────
export async function sendOtpNotification({ email, phone, otp }: { email?: string; phone?: string; otp: string }) {
  console.log(`\n========================================\n[SECURITY OTP GENERATED]\nTarget: ${email || phone}\nCode: ${otp}\n========================================\n`);
  let delivered = false;
  // 1. Send direct plain-text Email OTP
  if (email && email.includes('@')) {
    const isEmailLogin = !phone;
    const subject = isEmailLogin ? `Your IndoFleet Login Verification Code: ${otp}` : `Your IndoFleet Verification Code: ${otp}`;
    const text = isEmailLogin
      ? `
Hello,

Your 6-digit IndoFleet login verification code for ${email} is:

------------------------------------
 ${otp}
------------------------------------

Valid for 10 minutes. Please enter this code in the login portal to access your account.

If you did not request this code, please ignore this email.

IndoFleet Flight Operations
Sector 62, Noida, Uttar Pradesh
`.trim()
      : `
Hello,

Your 6-digit IndoFleet verification code for +91 ${phone} is:

------------------------------------
 ${otp}
------------------------------------

Valid for 10 minutes. Please enter this code in the login portal to verify your account.

If you did not request this code, please ignore this email.

IndoFleet Flight Operations
Sector 62, Noida, Uttar Pradesh
`.trim();

    delivered = await sendEmail({ to: email, subject, text });
  }

  // 2. Dispatch to SMS Gateways (Fast2SMS / Supabase Phone Auth)
  if (phone) {
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    const fullPhone = `+91${cleanPhone}`;

    // Fast2SMS Gateway
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    if (fast2smsKey && fast2smsKey.trim() && fast2smsKey !== 'xxx') {
      try {
        const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(fast2smsKey.trim())}&variables_values=${otp}&route=otp&numbers=${cleanPhone}`;
        const response = await fetch(url);
        if (response.ok) {
          delivered = true;
          console.log(`[Fast2SMS Gateway] Real SMS OTP dispatched to +91 ${cleanPhone}`);
        } else {
          console.error(`[Fast2SMS Gateway] Provider returned HTTP ${response.status}.`);
        }
      } catch (err: any) {
        console.warn(`[Fast2SMS Exception]: ${err.message}`);
      }
    }

    // Supabase Phone Auth Gateway
    const SH_SB_URL = process.env.SERVICEHUB_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const SH_SB_KEY = process.env.SERVICEHUB_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    if (SH_SB_URL && SH_SB_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const sbClient = createClient(SH_SB_URL, SH_SB_KEY);
        const { error: sbError } = await sbClient.auth.signInWithOtp({ phone: fullPhone });
        if (!sbError) {
          delivered = true;
          console.log(`[Supabase SMS] Real Phone Auth SMS dispatched to ${fullPhone}`);
        } else {
          console.warn(`[Supabase SMS Notice]: ${sbError.message}`);
        }
      } catch (err: any) {
        console.warn(`[Supabase SMS Exception]: ${err.message}`);
      }
    }
  }
  return delivered;
}

// ── 1. Welcome / Signup Email ────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string, phone?: string) {
  const subject = `Welcome to IndoFleet Drone Delivery - Account Activated`;
  const text = `
Hello ${name},

Welcome to IndoFleet Autonomous Drone Delivery Network!

Your customer account has been successfully created and verified via Mobile OTP.

Account Details:
- Name: ${name}
- Email: ${to}
- Registered Mobile: ${phone || 'N/A'}
- Platform: IndoFleet Aerial Logistics (DGCA Certified)

Best regards,
IndoFleet Operations Team
Sector 62, Noida, Uttar Pradesh
`.trim();

  await sendEmail({ to, subject, text });
}

// ── Helper: Clean Light Email Layout Wrapper ──────────────────────────────
function renderCleanEmail({
  title,
  subtitle,
  bodyHtml,
  footerNote
}: {
  title: string;
  subtitle?: string;
  bodyHtml: string;
  footerNote?: string;
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 24px 16px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <!-- Brand Header -->
    <tr>
      <td style="padding: 24px 28px 20px 28px; border-bottom: 1px solid #f1f5f9;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td>
              <span style="font-size: 18px; font-weight: 800; color: #5a00b8; letter-spacing: -0.5px;">IndoFleet</span>
              <span style="font-size: 13px; color: #64748b; margin-left: 8px; font-weight: 500;">| Operations</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Content Area -->
    <tr>
      <td style="padding: 28px;">
        <h1 style="margin: 0 0 6px 0; font-size: 19px; font-weight: 700; color: #0f172a; line-height: 1.3;">${title}</h1>
        ${subtitle ? `<p style="margin: 0 0 20px 0; font-size: 13px; color: #64748b;">${subtitle}</p>` : '<div style="height: 14px;"></div>'}
        
        ${bodyHtml}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 20px 28px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5;">
        ${footerNote ? `<p style="margin: 0 0 6px 0; color: #64748b;">${footerNote}</p>` : ''}
        <p style="margin: 0;">&copy; 2026 IndoFleet Aerospace &bull; Sector 62, Noida, Uttar Pradesh</p>
        <p style="margin: 4px 0 0 0; font-size: 11px;">Helpline: 1800-IND-WINGS &bull; Email: connect@IndoFleet.com</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ── 1B. Enterprise Team Member Account Provisioned Email ─────────────────────
export async function sendUserProvisionedEmail({
  to,
  name,
  userId,
  role,
  temporaryPassword,
  loginUrl
}: {
  to: string;
  name: string;
  userId: string;
  role: string;
  temporaryPassword: string;
  loginUrl?: string;
}): Promise<boolean> {
  const roleLabels: Record<string, string> = {
    admin: 'Super Admin',
    fleet_manager: 'Fleet & QC Manager',
    dispatcher: 'Drone Logistics Dispatcher',
    support: 'Support Desk Officer',
    customer: 'Customer'
  };
  const roleName = roleLabels[role] || role.toUpperCase();
  const url = loginUrl || `${process.env.FRONTEND_URL || 'https://IndoFleet.com'}/login`;

  const subject = `IndoFleet Account Provisioned: Credentials for ${name}`;
  const text = `
Hello ${name},

Your official IndoFleet operations account has been provisioned.

Account Credentials:
--------------------------------------------------
User ID: ${userId}
Registered Email: ${to}
Assigned Role: ${roleName}
Temporary Password: ${temporaryPassword}
Login Portal: ${url}
--------------------------------------------------

NEXT STEPS TO ACTIVATE:
1. Open the Login Portal: ${url}
2. Enter your email (${to}) and temporary password.
3. Verify your identity with OTP and set your permanent password.

IndoFleet Aerospace Operations
Sector 62, Noida, Uttar Pradesh
`.trim();

  const bodyHtml = `
    <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
      Hello <strong>${name}</strong>,<br>
      Your official IndoFleet operations account has been provisioned by the Administrator.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 130px;">User ID:</td>
          <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 700;">${userId}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Email:</td>
          <td style="padding: 6px 0; color: #0f172a;">${to}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Assigned Role:</td>
          <td style="padding: 6px 0; color: #5a00b8; font-weight: 700;">${roleName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Temporary Pass:</td>
          <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 700;">${temporaryPassword}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${url}" style="background-color: #5a00b8; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
        Open Login Portal &rarr;
      </a>
    </div>

    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-top: 16px;">
      <p style="font-size: 12px; font-weight: 700; color: #0f172a; margin: 0 0 6px 0;">Next Steps to Activate Your Account:</p>
      <ol style="font-size: 12px; color: #64748b; padding-left: 18px; margin: 0; line-height: 1.6;">
        <li>Log in with your temporary password.</li>
        <li>Verify with a 6-digit OTP sent to your email or phone.</li>
        <li>Set your permanent password to complete setup.</li>
      </ol>
    </div>
  `;

  const html = renderCleanEmail({
    title: 'Account Provisioned',
    subtitle: 'Your operations account credentials and setup instructions',
    bodyHtml
  });

  return sendEmail({ to, subject, text, html });
}

export async function sendAccountStatusEmail(to: string, name: string, status: 'active' | 'restricted') {
  const subject = status === 'restricted'
    ? 'IndoFleet account access restricted'
    : 'IndoFleet account access restored';
  const text = status === 'restricted'
    ? `Hello ${name},\n\nAn administrator has restricted sign-in access to your IndoFleet account. If you believe this is a mistake, contact your administrator or connect@IndoFleet.com.\n\nIndoFleet Operations`
    : `Hello ${name},\n\nAn administrator has restored sign-in access to your IndoFleet account. You can sign in using your registered email and the usual verification process.\n\nIndoFleet Operations`;
  return sendEmail({ to, subject, text });
}

export async function sendAccountRemovedEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: 'IndoFleet account removed',
    text: `Hello ${name},\n\nYour IndoFleet account has been removed by an administrator. If you believe this is a mistake, contact connect@IndoFleet.com.\n\nIndoFleet Operations`
  });
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: 'IndoFleet account password updated',
    text: `Hello ${name},\n\nThe password for your IndoFleet account was updated. If you did not make this change, contact your administrator or connect@IndoFleet.com immediately.\n\nIndoFleet Operations`
  });
}

// ── 2. Login Security Alert Email ───────────────────────────────────────────
export async function sendLoginAlertEmail(to: string, name: string, role: string, ip?: string) {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const subject = `Security Alert: Login Detected for ${name} (${role.toUpperCase()})`;
  const text = `
Hello ${name},

A new login to your IndoFleet account was detected.

Login Information:
- Account: ${to}
- Role: ${role.toUpperCase()}
- Date & Time: ${timestamp} IST
- Client IP: ${ip || '127.0.0.1 (Local)'}

If this was you, no action is needed. If you did not authorize this session, please contact IndoFleet security immediately.

IndoFleet Flight Operations
`.trim();

  await sendEmail({ to, subject, text });
}

// ── 3. Order Placed Confirmation Email ──────────────────────────────────────
export async function sendOrderPlacedEmail(order: any) {
  const to = order.customer_email;
  if (!to) return;

  const subject = `Order Confirmed: Drone Delivery ${order.id}`;
  const text = `
Hello ${order.customer_name},

Your IndoFleet drone delivery request has been confirmed and placed into active dispatch queue.

ORDER DETAILS:
--------------------------------------------------
Order ID: ${order.id}
Package Type: ${order.package_type}
Total Fare: Rs. ${order.fare_inr || 149}
Payment Method: ${(order.payment_method || 'online').toUpperCase()}
Payment Status: ${(order.payment_status || 'paid').toUpperCase()}
Assigned UAV: ${order.drone_id || 'Auto-assigning'} (${order.drone_model || 'Cyberone Max'})
Est. Distance: ${order.aerial_distance_km ? order.aerial_distance_km + ' km' : '~14.8 km'}
Est. Flight Time: ${order.flight_duration_mins ? order.flight_duration_mins + ' mins' : '~18 mins'}

TRANSIT ROUTE:
--------------------------------------------------
Pickup Point: ${order.pickup_address}
Drop Destination: ${order.drop_address}

View your order and tracking updates:
${process.env.FRONTEND_URL || 'https://IndoFleet.com'}/profile?tab=orders

IndoFleet Operations
`.trim();

  await sendEmail({ to, subject, text });
}

export async function sendCustomerBookingEmail(order: any) {
  if (!order.customer_email) return;
  const storeUrl = `${process.env.FRONTEND_URL || 'https://IndoFleet.com'}/profile?tab=orders`;
  const items = (order.items || []).map((item: any) => `- ${item.model} x ${item.quantity}`).join('\n');
  await sendEmail({
    to: order.customer_email,
    subject: `IndoFleet booking received: ${order.id}`,
    text: `
Hello ${order.customer_name},

We have received your drone booking request. No payment was taken.

Order ID: ${order.id}
Items:
${items}
Delivery address: ${order.drop_address}
Current status: ${order.status}

You can view order history and tracking updates here:
${storeUrl}

IndoFleet Customer Operations
`.trim()
  });
}

// ── 4. Order Status Update Email ───────────────────────────────────────────
export async function sendOrderStatusEmail(order: any, newStatus: string) {
  const to = order.customer_email;
  if (!to) return;

  if (order.order_type === 'drone_purchase') {
    const items = (order.items || []).map((item: any) => `- ${item.model} x ${item.quantity}`).join('\n');
    await sendEmail({
      to,
      subject: `IndoFleet booking update: ${order.id} - ${newStatus.toUpperCase()}`,
      text: `
Hello ${order.customer_name},

Your drone booking status has been updated.

Order ID: ${order.id}
Status: ${newStatus.toUpperCase()}
Items:
${items}
Delivery address: ${order.drop_address}

View your order:
${process.env.FRONTEND_URL || 'https://IndoFleet.com'}/profile?tab=orders

IndoFleet Customer Operations
`.trim()
    });
    return;
  }

  const statusLabels: Record<string, string> = {
    pending: 'BOOKING RECEIVED',
    assigned: 'ASSIGNED',
    'on-hold': 'ON HOLD',
    cancelled: 'ORDER CANCELLED',
    completed: 'COMPLETED',
    rescheduled: 'RESCHEDULED',
    'in-flight': 'DISPATCHED & IN-FLIGHT',
    'taking-off': 'TAKING OFF',
    approaching: 'APPROACHING DROP ZONE',
    'out-for-delivery': 'OUT FOR DELIVERY',
    'in-transit': 'IN TRANSIT',
    delivered: 'DELIVERED SUCCESSFULLY',
    failed: 'DELIVERY FAILED / RETURNED',
  };

  const currentLabel = statusLabels[newStatus] || newStatus.toUpperCase();
  const subject = `Flight Update: Order ${order.id} is now ${currentLabel}`;

  const text = `
Hello ${order.customer_name},

Status update for your drone delivery order ${order.id}:
Current Status: ${currentLabel}
Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST

ORDER SUMMARY:
--------------------------------------------------
Order ID: ${order.id}
Assigned UAV: ${order.drone_id || 'Cyberone UAV'}
Package: ${order.package_type}
Pickup: ${order.pickup_address}
Drop: ${order.drop_address}

View order updates:
${process.env.FRONTEND_URL || 'https://IndoFleet.com'}/profile?tab=orders

IndoFleet Flight Operations
`.trim();

  await sendEmail({ to, subject, text });
}

// ── 5. Expert Consultation Request Confirmation Email ────────────────────────
export async function sendExpertRequestCreatedEmail(request: any) {
  const to = request.email;
  if (!to || !to.includes('@')) return;

  const subject = `Consultation Request Confirmed [${request.id}] - IndoFleet`;
  const text = `
Hello ${request.name || 'Valued Customer'},

Thank you for contacting IndoFleet. Your consultation callback request has been scheduled.

CONSULTATION DETAILS:
--------------------------------------------------
Reference ID: ${request.id}
Category: ${request.category}
Preferred Slot: ${request.preferred_time}
Contact Phone: ${request.phone || 'N/A'}
Contact Email: ${request.email}
Status: Pending Callback

Your Inquiry Notes:
"${request.message || 'No additional notes provided.'}"

IndoFleet Flight Operations
Sector 62, Noida, Uttar Pradesh
`.trim();

  const bodyHtml = `
    <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
      Hello <strong>${request.name || 'Valued Customer'}</strong>,<br>
      Your consultation callback request has been received. Our flight operations team will review your requirements and reach out during your requested time slot.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 130px;">Reference ID:</td>
          <td style="padding: 8px 0; font-weight: 700; color: #5a00b8; font-family: monospace;">${request.id}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${request.category}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Preferred Slot:</td>
          <td style="padding: 8px 0; color: #0f172a;">${request.preferred_time}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Contact Phone:</td>
          <td style="padding: 8px 0; color: #0f172a;">${request.phone || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Current Status:</td>
          <td style="padding: 8px 0;"><span style="background-color: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 12px;">Pending Callback</span></td>
        </tr>
      </table>
    </div>

    ${request.message ? `
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
      <p style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 0 0 4px 0;">Your Inquiry Notes</p>
      <p style="margin: 0; font-size: 13px; color: #334155;">${request.message}</p>
    </div>` : ''}

    <div style="text-align: center; margin: 24px 0;">
      <a href="https://wa.me/917669478937?text=${encodeURIComponent(`Hello IndoFleet, I have a callback booked with reference ID ${request.id}`)}" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; display: inline-block; margin-right: 8px;">
        Chat on WhatsApp
      </a>
      <a href="${process.env.FRONTEND_URL || 'https://IndoFleet.com'}/support" style="background-color: #5a00b8; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; display: inline-block;">
        Support Desk
      </a>
    </div>
  `;

  const html = renderCleanEmail({
    title: 'Consultation Callback Scheduled',
    subtitle: `Reference: ${request.id}`,
    bodyHtml
  });

  await sendEmail({ to, subject, text, html });
}

// ── 6. Expert Consultation Status Update Email ───────────────────────────────
export async function sendExpertRequestStatusEmail(request: any, newStatus: string) {
  const to = request.email;
  if (!to || !to.includes('@')) return;

  const statusLabels: Record<string, string> = {
    open: 'Open',
    pending: 'Pending Callback',
    in_progress: 'In Progress',
    'in-progress': 'In Progress',
    waiting_for_customer: 'Waiting for Customer',
    waiting_for_internal_team: 'Under Review',
    reopened: 'Reopened',
    unresolved: 'Unresolved',
    contacted: 'Contact Initiated',
    resolved: 'Resolved',
    closed: 'Closed'
  };

  const currentLabel = statusLabels[newStatus] || newStatus.toUpperCase();
  const subject = `Consultation Update [${request.id}]: ${currentLabel}`;
  const text = `
Hello ${request.name || 'Valued Customer'},

Your IndoFleet consultation request (${request.id}) status has been updated to: ${currentLabel}.

Reference ID: ${request.id}
Category: ${request.category}
Status: ${currentLabel}
Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST

IndoFleet Flight Operations
`.trim();

  const bodyHtml = `
    <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
      Hello <strong>${request.name || 'Valued Customer'}</strong>,<br>
      The status of your consultation inquiry regarding <strong>${request.category}</strong> has been updated.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 130px;">Reference ID:</td>
          <td style="padding: 8px 0; font-weight: 700; color: #5a00b8; font-family: monospace;">${request.id}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${request.category}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Updated Status:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${currentLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Updated At:</td>
          <td style="padding: 8px 0; color: #0f172a;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 20px 0;">
      <a href="${process.env.FRONTEND_URL || 'https://IndoFleet.com'}/support" style="background-color: #5a00b8; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 13px; display: inline-block;">
        View Support Desk
      </a>
    </div>
  `;

  const html = renderCleanEmail({
    title: 'Consultation Status Update',
    subtitle: `Ticket ${request.id} is now ${currentLabel}`,
    bodyHtml
  });

  await sendEmail({ to, subject, text, html });
}

// ── 7. Order Completion: Feedback Invitation Email ──────────────────────────
export async function sendFeedbackInvitationEmail(order: any) {
  const to = order.customer_email;
  if (!to || !to.includes('@')) return;

  const droneModel = order.drone_model || order.drone_id || 'IndoFleet Drone Platform';
  const subject = `Delivery Complete: Rate Your Experience [Order ${order.id}]`;
  const feedbackUrl = `${process.env.FRONTEND_URL || 'https://IndoFleet.com'}/feedback?orderId=${order.id}&drone=${encodeURIComponent(droneModel)}&name=${encodeURIComponent(order.customer_name || '')}&email=${encodeURIComponent(to)}`;

  const text = `
Hello ${order.customer_name || 'Valued Customer'},

Your IndoFleet drone flight for Order ${order.id} has completed successfully.

Order ID: ${order.id}
Vehicle: ${droneModel}
Pickup: ${order.pickup_address}
Drop: ${order.drop_address}

Please take a moment to rate your delivery experience:
${feedbackUrl}

IndoFleet Flight Operations
`.trim();

  const bodyHtml = `
    <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
      Hello <strong>${order.customer_name || 'Valued Customer'}</strong>,<br>
      Your package for order <strong>#${order.id}</strong> was delivered safely by <strong>${droneModel}</strong>.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 130px;">Order ID:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #5a00b8; font-family: monospace;">${order.id}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Delivery Vehicle:</td>
          <td style="padding: 6px 0; color: #0f172a;">${droneModel}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Drop Destination:</td>
          <td style="padding: 6px 0; color: #0f172a;">${order.drop_address || 'Registered Location'}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${feedbackUrl}" style="background-color: #5a00b8; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
        Rate Delivery &amp; Share Feedback &rarr;
      </a>
    </div>
  `;

  const html = renderCleanEmail({
    title: 'Delivery Complete',
    subtitle: `Order #${order.id} delivered successfully`,
    bodyHtml
  });

  await sendEmail({ to, subject, text, html });
}

// ── 8. Support Query: Alert to Support Team ──────────────────────────────────
export async function sendSupportQueryAlertToTeam(query: any) {
  const to = 'connect@IndoFleet.com';
  const priorityLabel = (query.priority || 'NORMAL').toUpperCase();
  const subject = `[Support Query] [${priorityLabel}] Ticket ${query.id} - ${query.name || 'Customer'}`;
  const text = `
New Customer Query Submitted!

Ticket ID: ${query.id}
Customer: ${query.name} (${query.email || 'N/A'}, ${query.phone || 'N/A'})
Associated Order: ${query.order_id || 'N/A'}
Site Address: ${query.delivery_address || 'N/A'}
Drone Serial: ${query.drone_serial || 'N/A'}
Category: ${query.category || 'General'}
Priority: ${priorityLabel}
Callback Preference: ${query.preferred_time || query.preferred_callback || 'N/A'}

Message:
${query.message || 'No description provided.'}

Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
`.trim();

  const bodyHtml = `
    <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
      A new customer query has been submitted and assigned reference ID <strong>${query.id}</strong>.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">Customer Name:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${query.name}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Email:</td>
          <td style="padding: 6px 0; color: #0f172a;"><a href="mailto:${query.email}" style="color: #5a00b8;">${query.email}</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Phone:</td>
          <td style="padding: 6px 0; color: #0f172a;">${query.phone || 'N/A'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Order Reference:</td>
          <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${query.order_id || 'None'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Category:</td>
          <td style="padding: 6px 0; color: #0f172a;">${query.category || 'General'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Priority:</td>
          <td style="padding: 6px 0; color: #dc2626; font-weight: 700;">${priorityLabel}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
      <p style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 0 0 4px 0;">Customer Query Description</p>
      <p style="margin: 0; font-size: 13px; color: #334155; white-space: pre-wrap;">${query.message || 'No description provided.'}</p>
    </div>

    <div style="text-align: center; margin: 20px 0;">
      <a href="${process.env.FRONTEND_URL || 'https://IndoFleet.com'}/support-desk" style="background-color: #5a00b8; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 13px; display: inline-block;">
        Open Support Desk Console &rarr;
      </a>
    </div>
  `;

  const html = renderCleanEmail({
    title: 'New Customer Query Received',
    subtitle: `Ticket ID: ${query.id} | Priority: ${priorityLabel}`,
    bodyHtml
  });

  await sendEmail({ to, subject, text, html });
}

// ── 9. Support Query: Resolution Notification to User ────────────────────────
export async function sendQueryResolutionEmail(query: any, resolutionNotes: string, agentName: string = 'IndoFleet Support') {
  if (!query.email) return;
  const to = query.email;
  const subject = `Your Support Query [${query.id}] Has Been Resolved - IndoFleet`;
  const text = `
Dear ${query.name || 'Valued Customer'},

Your support inquiry (Ticket ID: ${query.id}) regarding "${query.category || 'Support Request'}" has been resolved by our operations team.

Resolution Details:
------------------------------------
${resolutionNotes}
------------------------------------

Ticket: ${query.id}
Resolved By: ${agentName}

Helpline: 1800-IND-WINGS | Email: connect@IndoFleet.com
IndoFleet Flight Operations
`.trim();

  const bodyHtml = `
    <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${query.name || 'Valued Customer'}</strong>,<br>
      Our support operations team has reviewed and resolved your inquiry regarding <strong>${query.category || 'Flight Operations'}</strong>.
    </p>

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <p style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; margin: 0 0 6px 0;">Official Resolution Note:</p>
      <p style="margin: 0; font-size: 13px; color: #14532d; line-height: 1.6; white-space: pre-wrap;">${resolutionNotes}</p>
    </div>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; color: #64748b; width: 130px;">Ticket Reference:</td>
          <td style="padding: 4px 0; color: #5a00b8; font-family: monospace; font-weight: 700;">${query.id}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Resolved By:</td>
          <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${agentName}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 12px; color: #64748b; margin: 0;">
      If you have additional questions, feel free to reply to this email or reach our support helpline.
    </p>
  `;

  const html = renderCleanEmail({
    title: 'Query Resolved',
    subtitle: `Ticket ${query.id} has been marked as resolved`,
    bodyHtml
  });

  await sendEmail({ to, subject, text, html });
}

// ── 10. Direct Email Reply from Support Agent ─────────────────────────────────
export async function sendDirectSupportEmail(to: string, subject: string, message: string, agentName: string = 'IndoFleet Support Desk') {
  if (!to || !to.includes('@')) return { success: false, error: 'Customer email address is invalid.' };
  if (!RESEND_KEY) return { success: false, error: 'Resend is not configured for Support Desk email.' };
  if (!SUPPORT_FROM_EMAIL || !SUPPORT_FROM_EMAIL.includes('@')) {
    return { success: false, error: 'A valid Resend support sender address is not configured.' };
  }

  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character] || character);
  const safeMessage = escapeHtml(message);
  const safeAgentName = escapeHtml(agentName);
  const text = `
Dear Customer,

${message}

------------------------------------
${agentName}
IndoFleet Aerospace Technologies Ltd.
Phone: 1800-IND-WINGS | Email: connect@IndoFleet.com
`.trim();

  const bodyHtml = `
    <div style="font-size: 14px; line-height: 1.7; color: #334155; white-space: pre-wrap; margin-bottom: 24px;">
      ${safeMessage}
    </div>

    <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 12px; color: #64748b;">
      <strong style="color: #0f172a; display: block; font-size: 13px;">${safeAgentName}</strong>
      Support &amp; Operations Command Desk<br>
      IndoFleet Aerospace Technologies Ltd.
    </div>
  `;

  const html = renderCleanEmail({
    title: 'Support Desk Message',
    bodyHtml
  });

  try {
    const { data, error } = await resend.emails.send({
      from: `${SUPPORT_FROM_NAME} <${SUPPORT_FROM_EMAIL}>`,
      to: [to],
      subject,
      text,
      html
    });
    if (error || !data) {
      const reason = error?.message || 'Resend did not return a message ID.';
      console.error(`[support-mail] Resend delivery failed: ${reason}`);
      return { success: false, error: reason };
    }
    console.log(`[support-mail] Resend accepted support reply (ID: ${data.id})`);
    return { success: true, messageId: data.id };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown Resend error.';
    console.error(`[support-mail] Resend delivery failed: ${reason}`);
    return { success: false, error: reason };
  }
}

// ── 12. Flight Started Customer Notification Email ──────────────────────────
export async function sendFlightStartedCustomerEmail({
  to,
  customerName,
  orderNumber,
  pilotName,
  pilotPhone,
  vehicleId,
  trackingUrl,
  deliveryAddress
}: {
  to: string;
  customerName: string;
  orderNumber: string;
  pilotName: string;
  pilotPhone?: string;
  vehicleId?: string;
  trackingUrl: string;
  deliveryAddress: string;
}) {
  const subject = `Your IndoFleet Delivery #${orderNumber} is In-Flight`;
  const text = `
Hello ${customerName},

Your consignment #${orderNumber} has taken flight and is actively en-route to your destination.

DISPATCH DETAILS:
• Order Number: ${orderNumber}
• Flight Pilot: ${pilotName}
• Pilot Contact: ${pilotPhone || '+91 7669478937'}
• Vehicle ID: ${vehicleId || 'IndoFleet Drone'}
• Destination: ${deliveryAddress}

Live Tracking Link:
${trackingUrl}

IndoFleet Flight Operations
`.trim();

  const bodyHtml = `
    <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
      Hello <strong>${customerName}</strong>,<br>
      Your package for order <strong>#${orderNumber}</strong> has departed our facility and is en-route.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 6px 0; color: #64748b; width: 130px;">Order Number:</td>
          <td style="padding: 6px 0; color: #5a00b8; font-weight: 700; font-family: monospace;">#${orderNumber}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 6px 0; color: #64748b;">Pilot:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${pilotName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 6px 0; color: #64748b;">Pilot Contact:</td>
          <td style="padding: 6px 0; color: #0f172a;">${pilotPhone || '+91 7669478937'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 6px 0; color: #64748b;">Vehicle:</td>
          <td style="padding: 6px 0; color: #0f172a;">${vehicleId || 'IndoFleet Drone'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Destination:</td>
          <td style="padding: 6px 0; color: #0f172a;">${deliveryAddress}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${trackingUrl}" style="background-color: #5a00b8; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
        View Live Flight Tracking &rarr;
      </a>
    </div>
  `;

  const html = renderCleanEmail({
    title: 'Your Delivery is In-Flight',
    subtitle: `Order #${orderNumber} is on its way`,
    bodyHtml
  });

  return sendEmail({ to, subject, text, html });
}

// ── 13. SOS Emergency Alert Email to Admin & Dispatch Operations ─────────────
export async function sendSosEmergencyAlertEmail({
  adminEmail,
  pilotName,
  pilotPhone,
  vehicleId,
  latitude,
  longitude,
  batteryPct,
  timestamp,
  audioNote
}: {
  adminEmail: string;
  pilotName: string;
  pilotPhone?: string;
  vehicleId?: string;
  latitude: number;
  longitude: number;
  batteryPct?: number;
  timestamp: string;
  audioNote?: string;
}) {
  const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const subject = `[URGENT SOS] Pilot ${pilotName} Triggered Emergency Beacon`;
  const text = `
URGENT SOS EMERGENCY BEACON TRIGGERED

Pilot: ${pilotName}
Phone: ${pilotPhone || 'N/A'}
Vehicle ID: ${vehicleId || 'N/A'}
Timestamp: ${timestamp}
Device Charge: ${batteryPct ?? 'N/A'}%

GPS Coordinates: ${latitude}, ${longitude}
Map Link: ${mapsUrl}

${audioNote ? `Notes: ${audioNote}\n` : ''}

IndoFleet Automated Emergency Alert System
`.trim();

  const bodyHtml = `
    <div style="background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; font-weight: 700; color: #991b1b;">
        An emergency beacon was triggered by pilot ${pilotName}.
      </p>
    </div>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 130px;">Pilot:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${pilotName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Phone:</td>
          <td style="padding: 6px 0; color: #0f172a;"><a href="tel:${pilotPhone}">${pilotPhone || 'N/A'}</a></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Vehicle ID:</td>
          <td style="padding: 6px 0; color: #0f172a;">${vehicleId || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Power Level:</td>
          <td style="padding: 6px 0; color: #0f172a;">${batteryPct ?? 'N/A'}%</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Coordinates:</td>
          <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 20px 0;">
      <a href="${mapsUrl}" style="background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 13px; display: inline-block;">
        Open Location on Google Maps &rarr;
      </a>
    </div>
  `;

  const html = renderCleanEmail({
    title: 'Emergency SOS Alert',
    subtitle: `Pilot ${pilotName} at ${timestamp}`,
    bodyHtml
  });

  return sendEmail({ to: adminEmail, subject, text, html });
}

// ── 14. Delivery Completed & Handover Confirmation Email ────────────────────
export async function sendDeliveryCompletedEmail({
  to,
  orderNumber,
  recipientName,
  pilotName,
  deliveryLat,
  deliveryLng,
  deliveryAddress,
  notes,
  signatureDataUrl
}: {
  to: string;
  orderNumber: string;
  recipientName: string;
  pilotName: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryAddress: string;
  notes?: string;
  signatureDataUrl?: string;
}) {
  const mapsUrl = deliveryLat && deliveryLng ? `https://www.google.com/maps?q=${deliveryLat},${deliveryLng}` : '';
  const subject = `Delivery Completed: Order #${orderNumber}`;
  const text = `
Order #${orderNumber} has been successfully delivered and handed over.

Recipient: ${recipientName}
Delivery Pilot: ${pilotName}
Destination: ${deliveryAddress}
Time: ${new Date().toISOString()}

IndoFleet Operations Desk
`.trim();

  const bodyHtml = `
    <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
      Order <strong>#${orderNumber}</strong> has been successfully delivered and handed over.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 130px;">Recipient:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${recipientName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Pilot:</td>
          <td style="padding: 6px 0; color: #0f172a;">${pilotName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Destination:</td>
          <td style="padding: 6px 0; color: #0f172a;">${deliveryAddress}</td>
        </tr>
        ${notes ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Notes:</td>
          <td style="padding: 6px 0; color: #0f172a;">${notes}</td>
        </tr>` : ''}
      </table>
    </div>

    ${signatureDataUrl ? `
    <div style="text-align: center; margin: 16px 0; padding: 12px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
      <p style="margin: 0 0 8px 0; font-size: 11px; color: #64748b; font-weight: 600;">Digital Signature</p>
      <img src="${signatureDataUrl}" alt="Digital Signature" style="max-width: 200px; height: auto;" />
    </div>` : ''}

    ${mapsUrl ? `
    <div style="text-align: center; margin: 20px 0;">
      <a href="${mapsUrl}" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: 600; font-size: 13px; display: inline-block;">
        View Location on Map &rarr;
      </a>
    </div>` : ''}
  `;

  const html = renderCleanEmail({
    title: 'Delivery Confirmed',
    subtitle: `Order #${orderNumber} successfully completed`,
    bodyHtml
  });

  return sendEmail({ to, subject, text, html });
}

// ── 15. Delivery Partner Accepted Order Alert (Sent to Dispatcher) ──────────
export async function sendOrderAcceptedByDeliveryAlert({
  dispatcherEmail,
  dispatcherName,
  orderNumber,
  deliveryPartnerName,
  deliveryPartnerPhone,
  vehicleId,
  dlId,
  orderId
}: {
  dispatcherEmail: string;
  dispatcherName: string;
  orderNumber: string;
  deliveryPartnerName: string;
  deliveryPartnerPhone?: string;
  vehicleId?: string;
  dlId?: string;
  orderId: string;
}) {
  const targetEmail = dispatcherEmail || process.env.ADMIN_EMAIL || 'ops@IndoFleet.com';
  const subject = `Order #${orderNumber} Accepted by ${deliveryPartnerName}`;
  const text = `
Hello ${dispatcherName || 'Dispatcher'},

Delivery Partner ${deliveryPartnerName} has accepted Order #${orderNumber}.

Partner Details:
• Name: ${deliveryPartnerName}
• Phone: ${deliveryPartnerPhone || 'N/A'}
• Vehicle ID: ${vehicleId || 'N/A'}
• License ID: ${dlId || 'Verified'}

IndoFleet Operations Desk
`.trim();

  const bodyHtml = `
    <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
      Hello <strong>${dispatcherName || 'Dispatcher'}</strong>,<br>
      Delivery Partner <strong>${deliveryPartnerName}</strong> has accepted Order <strong>#${orderNumber}</strong>.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 140px;">Delivery Partner:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${deliveryPartnerName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Phone:</td>
          <td style="padding: 6px 0; color: #0f172a;">${deliveryPartnerPhone || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Vehicle:</td>
          <td style="padding: 6px 0; color: #0f172a;">${vehicleId || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">License (DL):</td>
          <td style="padding: 6px 0; color: #0f172a;">${dlId || 'Verified'}</td>
        </tr>
      </table>
    </div>
  `;

  const html = renderCleanEmail({
    title: 'Order Accepted',
    subtitle: `Order #${orderNumber} accepted by partner`,
    bodyHtml
  });

  return sendEmail({ to: targetEmail, subject, text, html });
}

// ── 16. Password Change Verification OTP Email (Valid for 10 Minutes) ───────────
export async function sendPasswordChangeOtpEmail({
  email,
  name,
  otp
}: {
  email: string;
  name?: string;
  otp: string;
}) {
  const subject = `Your Password Change Verification Code: ${otp}`;
  const text = `
Hello ${name || 'Valued User'},

We received a request to update the password for your account (${email}).

Your 6-digit Verification Code is:
------------------------------------
  ${otp}
------------------------------------

This code is valid for 10 minutes only. Enter it in your profile to complete your password update.
If you did not make this request, please contact your Administrator immediately.

IndoFleet Security
`.trim();

  const bodyHtml = `
    <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
      Hello <strong>${name || 'Valued User'}</strong>,<br>
      A request was made to update the password for your account (<strong>${email}</strong>).
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <p style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Verification Code</p>
      <div style="font-family: monospace; font-size: 32px; font-weight: 800; color: #5a00b8; letter-spacing: 6px; margin: 4px 0;">
        ${otp}
      </div>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #dc2626; font-weight: 600;">Valid for 10 minutes only</p>
    </div>

    <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">
      Enter this code on the password update screen. If you did not request this, please contact your Administrator to secure your account.
    </p>
  `;

  const html = renderCleanEmail({
    title: 'Password Change Verification',
    subtitle: '10-Minute Verification Code',
    bodyHtml
  });

  return sendEmail({ to: email, subject, text, html });
}

// ── 17. Temporary Password Dispatch Email (Valid for 10 Minutes) ────────────────
export async function sendTemporaryPasswordEmail({
  email,
  name,
  tempPassword,
  adminGenerated
}: {
  email: string;
  name?: string;
  tempPassword: string;
  adminGenerated?: boolean;
}) {
  const subject = `Your Temporary Login Password: ${tempPassword}`;
  const text = `
Hello ${name || 'Valued User'},

A temporary login password has been ${adminGenerated ? 'generated by your Administrator' : 'issued for your account'} (${email}).

Your Temporary Password is:
------------------------------------
  ${tempPassword}
------------------------------------

INSTRUCTIONS:
• Valid for 10 minutes ONLY.
• Use this temporary password to log in.
• Immediately update your password in Profile Settings upon signing in.

IndoFleet Security
`.trim();

  const bodyHtml = `
    <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
      Hello <strong>${name || 'Valued User'}</strong>,<br>
      A temporary password has been ${adminGenerated ? 'generated by your Administrator' : 'requested for your account'} (<strong>${email}</strong>).
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <p style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Temporary Password</p>
      <div style="font-family: monospace; font-size: 24px; font-weight: 800; color: #5a00b8; letter-spacing: 2px; margin: 4px 0;">
        ${tempPassword}
      </div>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #dc2626; font-weight: 600;">Valid for 10 minutes only</p>
    </div>

    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-top: 16px;">
      <p style="font-size: 12px; font-weight: 700; color: #0f172a; margin: 0 0 6px 0;">Instructions:</p>
      <ol style="font-size: 12px; color: #64748b; padding-left: 18px; margin: 0; line-height: 1.6;">
        <li>Log in with this temporary password within 10 minutes.</li>
        <li>Go to your <strong>Profile Settings &rarr; Change Password</strong>.</li>
        <li>Set your new permanent password.</li>
      </ol>
    </div>
  `;

  const html = renderCleanEmail({
    title: 'Temporary Login Password',
    subtitle: 'Access recovery for your account',
    bodyHtml
  });

  return sendEmail({ to: email, subject, text, html });
}

// ── 16. App Release Notification Email for Delivery Partners ────────────────
export async function sendAppReleaseEmail({
  to,
  name,
  version,
  releaseNotes,
  androidUrl,
  iosUrl,
}: {
  to: string;
  name: string;
  version: string;
  releaseNotes: string;
  androidUrl?: string;
  iosUrl?: string;
}) {
  const subject = `New IndoFleet Pilot App Update Available (${version}) - Download Now`;
  const text = `
Hello ${name},

A new version (${version}) of the IndoFleet Pilot App has been released by IndoFleet Operations.

RELEASE NOTES:
--------------------------------------------------
${releaseNotes}

DOWNLOAD LINKS:
- Android APK: ${androidUrl || 'Available on Web Portal'}
- iOS App Store / TestFlight: ${iosUrl || 'Available on Web Portal'}

Please download and update your app to access the latest features and flight navigation tools.

IndoFleet Flight Operations
`.trim();

  const bodyHtml = `
    <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
      Hello <strong>${name}</strong>,<br>
      A new update for the <strong>IndoFleet Pilot App (${version})</strong> is now available for download.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <p style="font-size: 12px; font-weight: 700; color: #5a00b8; text-transform: uppercase; margin: 0 0 6px 0;">Release Notes (${version}):</p>
      <p style="margin: 0; font-size: 13px; color: #334155; white-space: pre-wrap;">${releaseNotes}</p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      ${androidUrl ? `<a href="${androidUrl}" style="background-color: #3b0080; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; margin-right: 8px;">Download Android APK</a>` : ''}
      ${iosUrl ? `<a href="${iosUrl}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Download iOS App</a>` : ''}
    </div>
  `;

  const html = renderCleanEmail({
    title: `IndoFleet Pilot App ${version} Released`,
    subtitle: 'Download the latest mobile build for Android & iOS',
    bodyHtml
  });

  return sendEmail({ to, subject, text, html });
}




