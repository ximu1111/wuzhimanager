import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne } from '../db.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { logOperation } from '../middleware/rbac.js';

const router = Router();

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ code: 400, message: '用户名和密码不能为空' });
    const user = queryOne('SELECT * FROM user WHERE username = ?', [username]);
    if (!user) return res.json({ code: 400, message: '用户名或密码错误' });
    if (user.status !== 1) return res.json({ code: 400, message: '账号已被禁用，请联系管理员' });
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.json({ code: 400, message: '用户名或密码错误' });
    const role = queryOne('SELECT * FROM role WHERE id = ?', [user.role_id]);
    const permissions = role ? JSON.parse(role.permissions) : [];
    const token = generateToken({ userId: user.id, username: user.username, name: user.name, roleId: user.role_id, roleName: role?.name || '' });
    logOperation(user.id, user.username, '用户登录', req.ip);
    res.json({ code: 200, message: '登录成功', data: { token, userInfo: { id: user.id, username: user.username, name: user.name, roleId: user.role_id, roleName: role?.name || '', permissions } } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.get('/userinfo', authMiddleware, (req, res) => {
  try {
    const user = queryOne('SELECT id, username, name, role_id, status FROM user WHERE id = ?', [req.user.userId]);
    if (!user) return res.json({ code: 400, message: '用户不存在' });
    const role = queryOne('SELECT * FROM role WHERE id = ?', [user.role_id]);
    const permissions = role ? JSON.parse(role.permissions) : [];
    res.json({ code: 200, data: { id: user.id, username: user.username, name: user.name, roleId: user.role_id, roleName: role?.name || '', permissions } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

export default router;
