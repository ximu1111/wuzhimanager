import { Router } from 'express';
import { queryAll, queryOne } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';

const router = Router();
router.use(authMiddleware);

router.get('/', rbacMiddleware('log:view'), (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', start_date, end_date } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (username LIKE ? OR action LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (start_date) { where += ' AND created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const total = queryOne(`SELECT COUNT(*) as total FROM operation_log WHERE ${where}`, params)?.total || 0;
    const offset = (Number(page) - 1) * Number(pageSize);
    const list = queryAll(`SELECT * FROM operation_log WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, Number(pageSize), offset]);
    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

export default router;
