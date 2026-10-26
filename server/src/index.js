import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import bookingRoutes from './routes/bookings.js';
import adminRoutes from './routes/admin.js';
import { ensureSeedData } from './seedData.js';

const { MONGODB_URI, JWT_SECRET } = process.env;
if (!MONGODB_URI) { console.error('Missing MONGODB_URI environment variable.'); process.exit(1); }
if (!JWT_SECRET || JWT_SECRET.length < 16) { console.error('Missing or too-short JWT_SECRET environment variable (use 16+ characters).'); process.exit(1); }

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

// Render (and most hosts) put a proxy in front of the app. Without this, every visitor looks like
// the same IP to the login rate limiter and express-rate-limit logs validation errors.
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
// Same-origin single-service deployments need no CORS. Set CLIENT_URL only for a separately hosted frontend.
if (process.env.CLIENT_URL) {
  const allowedOrigins = process.env.CLIENT_URL.split(',').map(value => value.trim()).filter(Boolean);
  app.use(cors({ origin: allowedOrigins }));
}
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }), authRoutes);
app.use('/api', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'database-unavailable', service: 'Stayora API' });
});
app.use('/api', (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` }));

// Serve the compiled React application from this same service in production.
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
} else {
  console.warn('client/dist not found: only the API is being served (run the client build first).');
}

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON in request.' });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id or value.' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors).map(e => e.message).join(' ') });
  if (err.code === 11000) return res.status(409).json({ message: 'That record already exists.' });
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? 'Something went wrong on the server.' : err.message });
});

// If the connection string has no database name, fall back to "stayora" instead of MongoDB's default "test".
function hasDatabaseName(uri) {
  try { return new URL(uri).pathname.length > 1; } catch { return true; }
}

const PORT = process.env.PORT || 5000;
try {
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    ...(hasDatabaseName(MONGODB_URI) ? {} : { dbName: 'stayora' })
  });
  console.log('MongoDB connected');
  await ensureSeedData();
  app.listen(PORT, () => console.log(`Stayora running on port ${PORT}`));
} catch (err) {
  console.error('Startup failed:', err.message);
  console.error('Check MONGODB_URI (username/password, database name) and that MongoDB Atlas > Network Access allows 0.0.0.0/0 for Render.');
  process.exit(1);
}
