import '../env.js';
import { Router } from 'express';
import { Resend } from 'resend';
import { fileDB } from '../db.js';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY || '');
const MAX_MESSAGE_LENGTH = 20_000;
const FINAL_TICKET_STATUSES = new Set(['resolved', 'closed']);

type WebhookEvent = {
  type: string;
  created_at?: string;
  data: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function senderAddress(value: string) {
  const match = value.match(/<([^<>]+)>/);
  const email = (match?.[1] || value).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function senderName(value: string) {
  const match = value.match(/^\s*"?([^"<]+)"?\s*</);
  return match?.[1]?.trim() || senderAddress(value).split('@')[0] || 'Customer';
}

function headerValue(headers: Record<string, unknown> | null, name: string) {
  if (!headers) return '';
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? String(headers[key] || '') : '';
}

function plainText(text: unknown, html: unknown) {
  if (typeof text === 'string' && text.trim()) return text.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (typeof html !== 'string') return '';
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

function extractTicketId(subject: string, message: string) {
  return `${subject}\n${message}`.match(/\bTKT-[A-Z0-9-]+\b/i)?.[0] || '';
}

function referencedMessageIds(headers: Record<string, unknown> | null) {
  return `${headerValue(headers, 'in-reply-to')} ${headerValue(headers, 'references')}`
    .split(/\s+/)
    .map((value) => value.replace(/[<>]/g, '').trim())
    .filter(Boolean);
}

async function attachInboundEmail(emailId: string) {
  const { data: received, error } = await resend.emails.receiving.get(emailId);
  if (error || !received) throw new Error('Could not fetch the received email from Resend.');

  const supportEmail = (process.env.SUPPORT_EMAIL || '').trim().toLowerCase();
  if (!supportEmail) throw new Error('SUPPORT_EMAIL is not configured for inbound email.');
  const recipients = [...(received.to || []), ...(received.received_for || [])]
    .map((value) => senderAddress(value))
    .filter(Boolean);
  if (!recipients.includes(supportEmail)) return;

  const sender = senderAddress(received.from);
  const body = plainText(received.text, received.html);
  if (!sender || !body) throw new Error('Received email is missing a valid sender or readable message.');
  if (sender === supportEmail) return;

  const tickets = await fileDB.getExpertRequests();
  if (tickets.some((candidate) => Array.isArray(candidate.email_thread)
    && candidate.email_thread.some((entry: Record<string, unknown>) => entry.id === emailId || entry.message_id === received.message_id))) {
    return;
  }
  const ticketId = extractTicketId(received.subject || '', body);
  let ticket = ticketId ? tickets.find((candidate) => candidate.id.toLowerCase() === ticketId.toLowerCase()) : undefined;
  if (ticket && ticket.email?.toLowerCase() !== sender) ticket = undefined;

  if (!ticket) {
    const references = referencedMessageIds(received.headers);
    if (references.length) {
      ticket = tickets.find((candidate) => Array.isArray(candidate.email_thread)
        && candidate.email?.toLowerCase() === sender
        && candidate.email_thread.some((entry: Record<string, unknown>) => references.includes(String(entry.message_id || '').replace(/[<>]/g, ''))));
    }
  }

  if (!ticket) {
    const activeMatches = tickets.filter((candidate) =>
      candidate.email?.toLowerCase() === sender && !FINAL_TICKET_STATUSES.has(String(candidate.status).toLowerCase())
    );
    if (activeMatches.length === 1) ticket = activeMatches[0];
  }

  const timestamp = received.created_at || new Date().toISOString();
  const attachments = (received.attachments || []).map((attachment) => ({
    id: attachment.id,
    filename: attachment.filename,
    content_type: attachment.content_type,
    size: attachment.size
  }));
  const emailEntry = {
    id: emailId,
    message_id: received.message_id,
    direction: 'inbound',
    from: sender,
    subject: received.subject || '(no subject)',
    message: body,
    attachments,
    delivery_status: 'received',
    timestamp
  };

  if (!ticket) {
    const users = await fileDB.getUsers();
    const customer = users.find((user) => user.email?.toLowerCase() === sender);
    const id = `TKT-${Date.now().toString(36).toUpperCase()}`;
    await fileDB.saveExpertRequest({
      id,
      customer_id: customer?.id || null,
      name: customer?.name || senderName(received.from),
      email: sender,
      phone: customer?.phone || '',
      category: 'Email Support',
      subject: received.subject || 'Support request by email',
      source: 'email',
      priority: 'normal',
      message: body,
      status: 'open',
      email_thread: [emailEntry],
      timeline: [{ type: 'email_received', subject: emailEntry.subject, timestamp }],
      audit_log: [{ id: emailId, action: 'inbound_email_received', actor_role: 'customer', timestamp }],
      created_at: timestamp
    });
    return;
  }

  const wasClosed = FINAL_TICKET_STATUSES.has(String(ticket.status).toLowerCase());
  const updated = await fileDB.updateExpertRequest(ticket.id, {
    status: wasClosed ? 'open' : ticket.status,
    email_thread: [...(Array.isArray(ticket.email_thread) ? ticket.email_thread : []), emailEntry],
    timeline: [...(Array.isArray(ticket.timeline) ? ticket.timeline : []), {
      type: 'email_received',
      subject: emailEntry.subject,
      timestamp,
      ...(wasClosed ? { reopened: true } : {})
    }],
    audit_log: [...(Array.isArray(ticket.audit_log) ? ticket.audit_log : []), {
      id: emailId,
      action: 'inbound_email_received',
      actor_role: 'customer',
      timestamp
    }],
    last_contacted_at: timestamp
  });
  if (!updated) throw new Error('Support ticket disappeared while attaching the received email.');
}

function outboundStatus(eventType: string) {
  const statuses: Record<string, string> = {
    'email.sent': 'sent',
    'email.delivered': 'delivered',
    'email.delivery_delayed': 'delayed',
    'email.failed': 'failed',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
    'email.suppressed': 'suppressed'
  };
  return statuses[eventType];
}

async function updateOutboundEmail(event: WebhookEvent) {
  const emailId = String(event.data.email_id || '');
  const status = outboundStatus(event.type);
  if (!emailId || !status) return;

  const tickets = await fileDB.getExpertRequests();
  for (const ticket of tickets) {
    if (!Array.isArray(ticket.email_thread)) continue;
    let updated = false;
    const email_thread = ticket.email_thread.map((entry: Record<string, unknown>) => {
      if (entry.provider_message_id !== emailId && entry.id !== emailId) return entry;
      updated = true;
      return {
        ...entry,
        delivery_status: status,
        provider_event_at: event.created_at || new Date().toISOString()
      };
    });
    if (updated) {
      const updated = await fileDB.updateExpertRequest(ticket.id, { email_thread });
      if (!updated) throw new Error('Support ticket disappeared while updating email delivery status.');
      return;
    }
  }
}

router.get('/', async (_req, res) => {
  let eventStoreReady = false;
  let lastEvent: { event_type: string; status: string; received_at: string; processed_at: string | null } | null = null;
  try {
    lastEvent = await fileDB.getResendWebhookHealth();
    eventStoreReady = true;
  } catch {
    console.warn('[resend-webhook] Health check could not read event storage.');
  }
  res.json({
    status: process.env.RESEND_WEBHOOK_SECRET && process.env.RESEND_API_KEY && eventStoreReady ? 'ready' : 'needs_configuration',
    service: 'resend-webhook',
    signature_secret_configured: Boolean(process.env.RESEND_WEBHOOK_SECRET),
    resend_api_key_configured: Boolean(process.env.RESEND_API_KEY),
    event_store_ready: eventStoreReady,
    last_event: lastEvent ? {
      type: lastEvent.event_type,
      status: lastEvent.status,
      received_at: lastEvent.received_at,
      processed_at: lastEvent.processed_at
    } : null,
    timestamp: new Date().toISOString()
  });
});

router.post('/', async (req, res) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({ error: 'Resend webhook signature verification is not configured.' });
    return;
  }
  if (!Buffer.isBuffer(req.body)) {
    res.status(400).json({ error: 'Expected a JSON webhook payload.' });
    return;
  }

  const headers = {
    id: String(req.header('svix-id') || ''),
    timestamp: String(req.header('svix-timestamp') || ''),
    signature: String(req.header('svix-signature') || '')
  };
  if (!headers.id || !headers.timestamp || !headers.signature) {
    res.status(400).json({ error: 'Required webhook signature headers are missing.' });
    return;
  }

  const rawPayload = req.body.toString('utf8');
  let event: WebhookEvent;
  try {
    const verified = resend.webhooks.verify({
      payload: rawPayload,
      headers,
      webhookSecret: secret
    });
    if (!isRecord(verified) || typeof verified.type !== 'string' || !isRecord(verified.data)) {
      res.status(400).json({ error: 'Webhook event payload is invalid.' });
      return;
    }
    event = {
      type: verified.type,
      data: verified.data,
      ...(typeof verified.created_at === 'string' ? { created_at: verified.created_at } : {})
    };
  } catch {
    console.warn('[resend-webhook] Rejected request with an invalid signature.');
    res.status(400).json({ error: 'Webhook signature verification failed.' });
    return;
  }

  let claim: 'claimed' | 'duplicate' | 'busy';
  try {
    claim = await fileDB.claimResendWebhookEvent(headers.id, event.type);
  } catch (error) {
    console.error('[resend-webhook] Could not claim event:', error instanceof Error ? error.message : 'Database error.');
    res.status(503).json({ error: 'Webhook processing is temporarily unavailable.' });
    return;
  }
  if (claim === 'duplicate') {
    res.status(200).json({ received: true, duplicate: true });
    return;
  }
  if (claim === 'busy') {
    res.status(503).json({ error: 'This webhook event is already being processed.' });
    return;
  }

  try {
    if (event.type === 'email.received') {
      const emailId = String(event.data.email_id || '');
      if (!emailId) throw new Error('Received email event is missing its message ID.');
      await attachInboundEmail(emailId);
    } else if (outboundStatus(event.type)) {
      await updateOutboundEmail(event);
    }
    await fileDB.completeResendWebhookEvent(headers.id);
    console.info(`[resend-webhook] Processed event ${event.type}.`);
    res.status(200).json({ received: true });
  } catch (error) {
    try {
      await fileDB.failResendWebhookEvent(headers.id, 'processing_failed');
    } catch (recordError) {
      console.error('[resend-webhook] Could not record failure state:', recordError instanceof Error ? recordError.message : 'Database error.');
    }
    console.error(`[resend-webhook] Event ${event.type} failed:`, error instanceof Error ? error.message : 'Processing error.');
    res.status(503).json({ error: 'Webhook event could not be processed and may be retried.' });
  }
});

export default router;
