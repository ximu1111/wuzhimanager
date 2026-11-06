import { Router } from 'express';
import { queryAll, queryOne } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';

const router = Router();
router.use(authMiddleware);

router.get('/dashboard', rbacMiddleware('dashboard'), (req, res) => {
  try {
    const totalGoods = queryOne('SELECT COUNT(*) as cnt FROM goods')?.cnt || 0;
    const totalStock = queryOne('SELECT COALESCE(SUM(stock), 0) as total FROM goods')?.total || 0;
    const normalCount = queryOne("SELECT COUNT(*) as cnt FROM goods WHERE status = 'normal'")?.cnt || 0;
    const repairingCount = queryOne("SELECT COUNT(*) as cnt FROM goods WHERE status = 'repairing'")?.cnt || 0;
    const scrappedCount = queryOne("SELECT COUNT(*) as cnt FROM goods WHERE status = 'scrapped'")?.cnt || 0;
    const borrowedCount = queryOne("SELECT COUNT(*) as cnt FROM borrow WHERE status = 'borrowed'")?.cnt || 0;
    const alertCount = queryOne("SELECT COUNT(*) as cnt FROM goods WHERE stock <= warning_threshold AND status = 'normal'")?.cnt || 0;
    const pendingBorrows = queryOne("SELECT COUNT(*) as cnt FROM borrow WHERE status = 'pending'")?.cnt || 0;

    const monthlyBorrows = queryAll(`SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count, SUM(quantity) as quantity FROM borrow WHERE created_at >= date('now', '-12 months') GROUP BY strftime('%Y-%m', created_at) ORDER BY month`);
    const categoryDist = queryAll(`SELECT c.name, COUNT(g.id) as count, COALESCE(SUM(g.stock), 0) as stock FROM category c LEFT JOIN goods g ON c.id = g.category_id AND g.status != 'scrapped' GROUP BY c.id ORDER BY count DESC`);
    const repairStats = queryAll(`SELECT strftime('%Y-%m', repair_date) as month, COUNT(*) as count, COALESCE(SUM(cost), 0) as cost FROM repair WHERE repair_date >= date('now', '-12 months') GROUP BY strftime('%Y-%m', repair_date) ORDER BY month`);
    const alertGoods = queryAll(`SELECT g.*, c.name as category_name FROM goods g LEFT JOIN category c ON g.category_id = c.id WHERE g.stock <= g.warning_threshold AND g.status = 'normal' ORDER BY (g.stock * 1.0 / g.warning_threshold) ASC LIMIT 10`);

    res.json({ code: 200, data: { overview: { totalGoods, totalStock, normalCount, repairingCount, scrappedCount, borrowedCount, alertCount, pendingBorrows }, monthlyBorrows, categoryDist, repairStats, alertGoods } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.get('/alerts', rbacMiddleware('alert:view'), (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const total = queryOne("SELECT COUNT(*) as total FROM goods WHERE stock <= warning_threshold AND status = 'normal'")?.total || 0;
    const offset = (Number(page) - 1) * Number(pageSize);
    const list = queryAll(`SELECT g.*, c.name as category_name FROM goods g LEFT JOIN category c ON g.category_id = c.id WHERE g.stock <= g.warning_threshold AND g.status = 'normal' ORDER BY (g.stock * 1.0 / g.warning_threshold) ASC LIMIT ? OFFSET ?`, [Number(pageSize), offset]);
    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

export default router;
