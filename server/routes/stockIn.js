import { Router } from 'express';
import { queryAll, queryOne, runSql } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware, logOperation } from '../middleware/rbac.js';

const router = Router();
router.use(authMiddleware);

router.get('/', rbacMiddleware('stock_in:view'), (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', goods_id } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (g.name LIKE ? OR u.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (goods_id) { where += ' AND s.goods_id = ?'; params.push(Number(goods_id)); }
    const total = queryOne(`SELECT COUNT(*) as total FROM stock_in s LEFT JOIN goods g ON s.goods_id = g.id LEFT JOIN user u ON s.operator_id = u.id WHERE ${where}`, params)?.total || 0;
    const offset = (Number(page) - 1) * Number(pageSize);
    const list = queryAll(`SELECT s.*, g.name as goods_name, g.spec, u.name as operator_name FROM stock_in s LEFT JOIN goods g ON s.goods_id = g.id LEFT JOIN user u ON s.operator_id = u.id WHERE ${where} ORDER BY s.id DESC LIMIT ? OFFSET ?`, [...params, Number(pageSize), offset]);
    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.post('/', rbacMiddleware('stock_in:add'), (req, res) => {
  try {
    const { goods_id, quantity, remark } = req.body;
    if (!goods_id || !quantity || quantity <= 0) return res.json({ code: 400, message: '请填写有效的物资和数量' });
    const goods = queryOne('SELECT * FROM goods WHERE id = ?', [Number(goods_id)]);
    if (!goods) return res.json({ code: 400, message: '物资不存在' });
    if (goods.status === 'scrapped') return res.json({ code: 400, message: '已报废物资不能入库' });
    runSql('INSERT INTO stock_in (goods_id, quantity, operator_id, remark) VALUES (?, ?, ?, ?)', [Number(goods_id), quantity, req.user.userId, remark || '']);
    runSql('UPDATE goods SET stock = stock + ? WHERE id = ?', [quantity, Number(goods_id)]);
    logOperation(req.user.userId, req.user.username, `物资入库: ${goods.name} x${quantity}`, req.ip);
    res.json({ code: 200, message: '入库成功' });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

export default router;
