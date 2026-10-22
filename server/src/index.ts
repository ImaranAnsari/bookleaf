import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';

import { initDatabase } from './db/database.js';
import { openApiSpec } from './docs/swagger.js';
import authRoutes from './routes/authRoutes.js';
import authorRoutes from './routes/authorRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import realtimeRoutes from './routes/realtimeRoutes.js';
import statsRoutes from './routes/statsRoutes.js';

dotenv.config();

// Initialize SQLite database
initDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger OpenAPI documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'BookLeaf Publishing API Docs',
  customCss: '.swagger-ui .topbar { background-color: #1e3a8a; }',
}));

app.get('/api/openapi.json', (_req: Request, res: Response) => {
  res.json(openApiSpec);
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'BookLeaf Author Support Portal API',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/admin/stats', statsRoutes);

// Catch-all for undefined /api routes
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Production: serve built static files from client/dist
const clientDistPath = path.resolve(process.cwd(), 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Global Error Handler (meaningful JSON errors, not generic 500s)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'An unexpected internal error occurred. Please contact support.',
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 BookLeaf Author Support Portal Backend is running!`);
  console.log(`📡 API Base URL:       http://localhost:${PORT}/api`);
  console.log(`📚 Interactive Swagger: http://localhost:${PORT}/api/docs`);
  console.log(`⚡ Real-Time SSE:      http://localhost:${PORT}/api/realtime/events`);
  console.log(`=======================================================`);
});

export default app;
