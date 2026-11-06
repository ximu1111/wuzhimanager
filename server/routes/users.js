import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { queryAll, queryOne, runSql } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware, logOperation } from '../middleware/rbac.js';

const router = Router();
router.use(authMiddleware);

router.get('/', rbacMiddleware('user:view'), (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', role_id, status } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (u.username LIKE ? OR u.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (role_id) { where += ' AND u.role_id = ?'; params.push(Number(role_id)); }
    if (status !== undefined && status !== '') { where += ' AND u.status = ?'; params.push(Number(status)); }
    const total = queryOne(`SELECT COUNT(*) as total FROM user u WHERE ${where}`, params)?.total || 0;
    const offset = (Number(page) - 1) * Number(pageSize);
    const list = queryAll(`SELECT u.id, u.username, u.name, u.role_id, r.name as role_name, u.status, u.created_at FROM user u LEFT JOIN role r ON u.role_id = r.id WHERE ${where} ORDER BY u.id DESC LIMIT ? OFFSET ?`, [...params, Number(pageSize), offset]);
    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.post('/', rbacMiddleware('user:add'), (req, res) => {
  try {
    const { username, password, name, role_id } = req.body;
    if (!username || !password || !name || !role_id) return res.json({ code: 400, message: '请填写完整信息' });
    const exists = queryOne('SELECT id FROM user WHERE username = ?', [username]);
    if (exists) return res.json({ code: 400, message: '用户名已存在' });
    const hashPwd = bcrypt.hashSync(password, 10);
    const result = runSql('INSERT INTO user (username, password, name, role_id) VALUES (?, ?, ?, ?)', [username, hashPwd, name, role_id]);
    logOperation(req.user.userId, req.user.username, `新增用户: ${name}`, req.ip);
    res.json({ code: 200, message: '创建成功', data: { id: result.lastInsertRowid } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.put('/:id', rbacMiddleware('user:edit'), (req, res) => {
  try {
    const { name, role_id, status, password } = req.body;
    const user = queryOne('SELECT * FROM user WHERE id = ?', [Number(req.params.id)]);
    if (!user) return res.json({ code: 400, message: '用户不存在' });
    if (name) runSql('UPDATE user SET name = ? WHERE id = ?', [name, Number(req.params.id)]);
    if (role_id) runSql('UPDATE user SET role_id = ? WHERE id = ?', [Number(role_id), Number(req.params.id)]);
    if (status !== undefined) runSql('UPDATE user SET status = ? WHERE id = ?', [Number(status), Number(req.params.id)]);
    if (password) { const h = bcrypt.hashSync(password, 10); runSql('UPDATE user SET password = ? WHERE id = ?', [h, Number(req.params.id)]); }
    logOperation(req.user.userId, req.user.username, `编辑用户: ${user.name}`, req.ip);
    res.json({ code: 200, message: '更新成功' });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.delete('/:id', rbacMiddleware('user:delete'), (req, res) => {
  try {
    const user = queryOne('SELECT * FROM user WHERE id = ?', [Number(req.params.id)]);
    if (!user) return res.json({ code: 400, message: '用户不存在' });
    if (user.id === req.user.userId) return res.json({ code: 400, message: '不能删除自己' });
    runSql('DELETE FROM user WHERE id = ?', [Number(req.params.id)]);
    logOperation(req.user.userId, req.user.username, `删除用户: ${user.name}`, req.ip);
    res.json({ code: 200, message: '删除成功' });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

export default router;
