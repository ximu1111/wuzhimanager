import { Router } from 'express';
import { queryAll, queryOne, runSql } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware, logOperation } from '../middleware/rbac.js';

const router = Router();
router.use(authMiddleware);

router.get('/', rbacMiddleware('scrap:view'), (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    let where = "g.status = 'scrapped'";
    const params = [];
    if (keyword) { where += ' AND (g.name LIKE ? OR g.spec LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    const total = queryOne(`SELECT COUNT(*) as total FROM goods g LEFT JOIN category c ON g.category_id = c.id WHERE ${where}`, params)?.total || 0;
    const offset = (Number(page) - 1) * Number(pageSize);
    const list = queryAll(`SELECT g.*, c.name as category_name FROM goods g LEFT JOIN category c ON g.category_id = c.id WHERE ${where} ORDER BY g.id DESC LIMIT ? OFFSET ?`, [...params, Number(pageSize), offset]);
    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.post('/', rbacMiddleware('scrap:add'), (req, res) => {
  try {
    const { goods_id, reason } = req.body;
    if (!goods_id || !reason) return res.json({ code: 400, message: '请选择物资并填写报废原因' });
    const goods = queryOne('SELECT * FROM goods WHERE id = ?', [Number(goods_id)]);
    if (!goods) return res.json({ code: 400, message: '物资不存在' });
    if (goods.status === 'scrapped') return res.json({ code: 400, message: '该物资已报废' });
    runSql("UPDATE goods SET status = 'scrapped', stock = 0, remark = ? WHERE id = ?", [reason, Number(goods_id)]);
    logOperation(req.user.userId, req.user.username, `报废物资: ${goods.name} - ${reason}`, req.ip);
    res.json({ code: 200, message: '报废成功' });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

export default router;
