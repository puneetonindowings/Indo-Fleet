import './env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import fleetRoutes from './routes/fleet.js';
import missionsRoutes from './routes/missions.js';
import auditRoutes from './routes/audit.js';
import contactRoutes from './routes/contact.js';
import statsRoutes from './routes/stats.js';
import deliveryRoutes from './routes/delivery.js';
import notificationRoutes from './routes/notifications.js';
import { verifySupabaseConnection } from './supabase.js';
import { seedDefaultAccounts } from './seed.js';
import { securityShield } from './middleware/securityShield.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:8081',
      'http://localhost:19006',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:8081',
      'http://127.0.0.1:5173',
      'https://indo-fleet.vercel.app',
      'https://indowfleet.vercel.app',
      'https://indo-fleet.onrender.com',
      'https://IndoFleet.com',
      'https://indowfleet.com',
      'https://app.IndoFleet.com',
      'https://app.indowfleet.com',
      'https://indowings.com',
      'https://app.indowings.com'
    ];

const isAllowedOrigin = (origin: string): boolean => {
  if (allowedOrigins.includes(origin)) return true;
  if (/^https?:\/\/localhost(?::\d+)?$/i.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin)) return true;
  if (/^https?:\/\/(?:192\.168|10|172\.(?:1[6-9]|2\d|3[01]))\.\d+\.\d+(?::\d+)?$/i.test(origin)) return true;
  if (/^https:\/\/(?:[a-zA-Z0-9-]+\.)?indowfleet\.com$/i.test(origin)) return true;
  if (/^https:\/\/(?:[a-zA-Z0-9-]+\.)?indowings\.com$/i.test(origin)) return true;
  if (/^https:\/\/(?:indo-fleet|indowfleet)\.vercel\.app$/i.test(origin)) return true;
  if (/^https:\/\/(?:indo-fleet|indowfleet)\.onrender\.com$/i.test(origin)) return true;
  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    console.warn(`[cors] Blocked unauthorized origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(securityShield);

app.use('/api/auth', authRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/missions', missionsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'IndoFleet Drone Operations & Delivery API Gateway',
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
    service: 'IndoFleet Flight Operations API & Command Center Gateway',
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
    const server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      console.log(`API endpoints mounted at http://localhost:${PORT}/api`);
    });
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[startup] Port ${PORT} is already in use. Please free port ${PORT} or terminate the existing process.`);
      } else {
        console.error('[startup] Server error:', err);
      }
    });
  })
  .catch(error => {
    console.error('[startup] Supabase is required and must be reachable before starting the API:', error);
    process.exitCode = 1;
  });

