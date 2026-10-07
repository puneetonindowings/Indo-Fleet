import './env.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import fleetRoutes from './routes/fleet.js';
import missionsRoutes from './routes/missions.js';
import auditRoutes from './routes/audit.js';
import contactRoutes from './routes/contact.js';
import statsRoutes from './routes/stats.js';
import deliveryRoutes from './routes/delivery.js';
import resendWebhookRoutes from './routes/resendWebhook.js';
import { verifySupabaseConnection } from './supabase.js';
import { seedDefaultAccounts } from './seed.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use('/api/webhooks/resend', express.raw({ type: 'application/json', limit: '1mb' }), resendWebhookRoutes);
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/missions', missionsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/delivery', deliveryRoutes);

// Root & Health check endpoints
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'IndoWings Drone Operations & Delivery API Gateway',
    version: '3.4.4',
    endpoints: {
      health: '/api/health',
      analytics: '/api/delivery/analytics',
      feedbacks: '/api/delivery/feedbacks',
      orders: '/api/delivery/orders',
      fleet: '/api/fleet'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    version: '3.4.4',
    service: 'IndoWings Flight Operations API & Command Center Gateway',
    timestamp: new Date().toISOString()
  });
});

app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[api] ${req.method} ${req.originalUrl} failed:`, message);
  res.status(500).json({ error: 'The request could not be completed. Check the backend logs for details.' });
});

verifySupabaseConnection()
  .then(async () => {
    try {
      await seedDefaultAccounts();
    } catch (error) {
      console.error('[seed] Could not seed default accounts:', error instanceof Error ? error.message : error);
    }
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      console.log(`API endpoints mounted at http://localhost:${PORT}/api`);
    });
  })
  .catch(error => {
    console.error('[startup] Supabase is required and must be reachable before starting the API:', error);
    process.exitCode = 1;
  });
