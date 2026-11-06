import { Router } from 'express';
import { queryAll, queryOne, runSql } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware, logOperation } from '../middleware/rbac.js';

const router = Router();
router.use(authMiddleware);

router.get('/', rbacMiddleware('borrow:view'), (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status, user_id } = req.query;
    let where = '1=1';
    const params = [];
    const role = queryOne('SELECT permissions FROM role WHERE id = ?', [req.user.roleId]);
    const perms = role ? JSON.parse(role.permissions) : [];
    if (!perms.includes('borrow:audit')) { where += ' AND b.user_id = ?'; params.push(req.user.userId); }
    else if (user_id) { where += ' AND b.user_id = ?'; params.push(Number(user_id)); }
    if (keyword) { where += ' AND (g.name LIKE ? OR u.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (status) { where += ' AND b.status = ?'; params.push(status); }
    const total = queryOne(`SELECT COUNT(*) as total FROM borrow b LEFT JOIN goods g ON b.goods_id = g.id LEFT JOIN user u ON b.user_id = u.id WHERE ${where}`, params)?.total || 0;
    const offset = (Number(page) - 1) * Number(pageSize);
    const list = queryAll(`SELECT b.*, g.name as goods_name, g.spec, u.name as user_name FROM borrow b LEFT JOIN goods g ON b.goods_id = g.id LEFT JOIN user u ON b.user_id = u.id WHERE ${where} ORDER BY b.id DESC LIMIT ? OFFSET ?`, [...params, Number(pageSize), offset]);
    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.post('/', rbacMiddleware('borrow:add'), (req, res) => {
  try {
    const { goods_id, quantity, purpose, expected_return_date } = req.body;
    if (!goods_id || !quantity || quantity <= 0) return res.json({ code: 400, message: '请填写有效的物资和数量' });
    const goods = queryOne('SELECT * FROM goods WHERE id = ?', [Number(goods_id)]);
    if (!goods) return res.json({ code: 400, message: '物资不存在' });
    if (goods.status !== 'normal') return res.json({ code: 400, message: '该物资当前不可领用' });
    if (goods.stock < quantity) return res.json({ code: 400, message: `库存不足，当前库存: ${goods.stock}` });
    const result = runSql(`INSERT INTO borrow (goods_id, user_id, quantity, purpose, expected_return_date, status) VALUES (?, ?, ?, ?, ?, 'pending')`, [Number(goods_id), req.user.userId, quantity, purpose || '', expected_return_date || '']);
    logOperation(req.user.userId, req.user.username, `提交领用申请: ${goods.name} x${quantity}`, req.ip);
    res.json({ code: 200, message: '申请已提交', data: { id: result.lastInsertRowid } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.put('/:id/audit', rbacMiddleware('borrow:audit'), (req, res) => {
  try {
    const { action, remark } = req.body;
    const borrow = queryOne('SELECT b.*, g.stock, g.status as goods_status FROM borrow b LEFT JOIN goods g ON b.goods_id = g.id WHERE b.id = ?', [Number(req.params.id)]);
    if (!borrow) return res.json({ code: 400, message: '领用单不存在' });
    if (borrow.status !== 'pending') return res.json({ code: 400, message: '该申请已被处理' });
    if (action === 'approve') {
      if (borrow.goods_status !== 'normal') return res.json({ code: 400, message: '物资状态异常' });
      if (borrow.stock < borrow.quantity) return res.json({ code: 400, message: `库存不足，当前库存: ${borrow.stock}` });
      runSql("UPDATE borrow SET status = 'borrowed', remark = ? WHERE id = ?", [remark || '审核通过', Number(req.params.id)]);
      runSql('UPDATE goods SET stock = stock - ? WHERE id = ?', [borrow.quantity, borrow.goods_id]);
      logOperation(req.user.userId, req.user.username, `审核通过领用申请 #${req.params.id}`, req.ip);
      res.json({ code: 200, message: '审核通过' });
    } else if (action === 'reject') {
      runSql("UPDATE borrow SET status = 'rejected', remark = ? WHERE id = ?", [remark || '驳回', Number(req.params.id)]);
      logOperation(req.user.userId, req.user.username, `驳回领用申请 #${req.params.id}`, req.ip);
      res.json({ code: 200, message: '已驳回' });
    } else { res.json({ code: 400, message: '无效操作' }); }
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.put('/:id/return', rbacMiddleware('borrow:return'), (req, res) => {
  try {
    const borrow = queryOne('SELECT * FROM borrow WHERE id = ?', [Number(req.params.id)]);
    if (!borrow) return res.json({ code: 400, message: '领用单不存在' });
    if (borrow.status !== 'borrowed') return res.json({ code: 400, message: '该物资未被领用' });
    const role = queryOne('SELECT permissions FROM role WHERE id = ?', [req.user.roleId]);
    const perms = role ? JSON.parse(role.permissions) : [];
    if (!perms.includes('borrow:audit') && borrow.user_id !== req.user.userId) return res.json({ code: 403, message: '只能归还自己的领用' });
    runSql("UPDATE borrow SET status = 'returned', actual_return_date = datetime('now','localtime') WHERE id = ?", [Number(req.params.id)]);
    runSql('UPDATE goods SET stock = stock + ? WHERE id = ?', [borrow.quantity, borrow.goods_id]);
    logOperation(req.user.userId, req.user.username, `确认归还: 领用单#${req.params.id}`, req.ip);
    res.json({ code: 200, message: '归还成功' });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

export default router;
