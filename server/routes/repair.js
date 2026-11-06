import { Router } from 'express';
import { queryAll, queryOne, runSql } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware, logOperation } from '../middleware/rbac.js';

const router = Router();
router.use(authMiddleware);

router.get('/', rbacMiddleware('repair:view'), (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (g.name LIKE ? OR r.fault_desc LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (status) { where += ' AND r.status = ?'; params.push(status); }
    const total = queryOne(`SELECT COUNT(*) as total FROM repair r LEFT JOIN goods g ON r.goods_id = g.id LEFT JOIN user u ON r.operator_id = u.id WHERE ${where}`, params)?.total || 0;
    const offset = (Number(page) - 1) * Number(pageSize);
    const list = queryAll(`SELECT r.*, g.name as goods_name, g.spec, u.name as operator_name FROM repair r LEFT JOIN goods g ON r.goods_id = g.id LEFT JOIN user u ON r.operator_id = u.id WHERE ${where} ORDER BY r.id DESC LIMIT ? OFFSET ?`, [...params, Number(pageSize), offset]);
    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.post('/', rbacMiddleware('repair:add'), (req, res) => {
  try {
    const { goods_id, fault_desc, cost, remark } = req.body;
    if (!goods_id || !fault_desc) return res.json({ code: 400, message: '请选择物资并描述故障' });
    const goods = queryOne('SELECT * FROM goods WHERE id = ?', [Number(goods_id)]);
    if (!goods) return res.json({ code: 400, message: '物资不存在' });
    if (goods.status === 'scrapped') return res.json({ code: 400, message: '已报废物资不能送修' });
    runSql('INSERT INTO repair (goods_id, fault_desc, cost, status, remark, operator_id) VALUES (?, ?, ?, ?, ?, ?)', [Number(goods_id), fault_desc, cost || 0, 'repairing', remark || '', req.user.userId]);
    runSql("UPDATE goods SET status = 'repairing' WHERE id = ?", [Number(goods_id)]);
    logOperation(req.user.userId, req.user.username, `维修登记: ${goods.name} - ${fault_desc}`, req.ip);
    res.json({ code: 200, message: '维修登记成功' });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.put('/:id', rbacMiddleware('repair:edit'), (req, res) => {
  try {
    const { status, cost, remark } = req.body;
    const repair = queryOne('SELECT * FROM repair WHERE id = ?', [Number(req.params.id)]);
    if (!repair) return res.json({ code: 400, message: '维修记录不存在' });
    if (status === 'repaired') {
      runSql("UPDATE repair SET status = 'repaired', cost = ?, remark = ? WHERE id = ?", [cost ?? repair.cost, remark ?? repair.remark, Number(req.params.id)]);
      runSql("UPDATE goods SET status = 'normal' WHERE id = ?", [repair.goods_id]);
      logOperation(req.user.userId, req.user.username, `维修完成: 维修单#${req.params.id}`, req.ip);
    } else if (status === 'scrapped') {
      runSql("UPDATE repair SET status = 'scrapped', cost = ?, remark = ? WHERE id = ?", [cost ?? repair.cost, remark ?? repair.remark, Number(req.params.id)]);
      runSql("UPDATE goods SET status = 'scrapped', stock = 0 WHERE id = ?", [repair.goods_id]);
      logOperation(req.user.userId, req.user.username, `维修转报废: 维修单#${req.params.id}`, req.ip);
    } else {
      runSql("UPDATE repair SET cost = ?, remark = ? WHERE id = ?", [cost ?? repair.cost, remark ?? repair.remark, Number(req.params.id)]);
    }
    res.json({ code: 200, message: '更新成功' });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

export default router;
