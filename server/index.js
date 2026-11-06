import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { initDatabase } from './db.js';
import { seedDatabase } from './seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function startServer() {
  // Initialize database
  await initDatabase();
  await seedDatabase();

  const app = express();
  const PORT = process.env.DEPLOY_RUN_PORT || 5000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });

  const { default: authRoutes } = await import('./routes/auth.js');
  const { default: userRoutes } = await import('./routes/users.js');
  const { default: roleRoutes } = await import('./routes/roles.js');
  const { default: goodsRoutes } = await import('./routes/goods.js');
  const { default: categoryRoutes } = await import('./routes/categories.js');
  const { default: stockInRoutes } = await import('./routes/stockIn.js');
  const { default: borrowRoutes } = await import('./routes/borrow.js');
  const { default: repairRoutes } = await import('./routes/repair.js');
  const { default: scrapRoutes } = await import('./routes/scrap.js');
  const { default: logRoutes } = await import('./routes/logs.js');
  const { default: reportRoutes } = await import('./routes/report.js');

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/roles', roleRoutes);
  app.use('/api/goods', goodsRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/stock-in', stockInRoutes);
  app.use('/api/borrow', borrowRoutes);
  app.use('/api/repair', repairRoutes);
  app.use('/api/scrap', scrapRoutes);
  app.use('/api/logs', logRoutes);
  app.use('/api/report', reportRoutes);

  // 健康检查端点
  app.get('/api/health', (req, res) => {
    res.json({ code: 200, message: 'ok', data: { status: 'up', time: new Date().toISOString() } });
  });

  const frontendDist = join(__dirname, '../frontend/dist');
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res) => {
      res.sendFile(join(frontendDist, 'index.html'));
    });
  }

  app.use('/api/*', (req, res) => {
    res.status(404).json({ code: 404, message: '接口不存在' });
  });

  app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ code: 500, message: err.message || '服务器内部错误' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
