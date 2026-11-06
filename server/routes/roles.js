import { Router } from 'express';
import { queryAll, queryOne, runSql } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware, logOperation } from '../middleware/rbac.js';

const router = Router();
router.use(authMiddleware);

router.get('/', rbacMiddleware('role:view'), (req, res) => {
  try {
    const roles = queryAll('SELECT * FROM role ORDER BY id');
    const list = roles.map(r => ({ ...r, permissions: JSON.parse(r.permissions || '[]') }));
    res.json({ code: 200, data: list });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.post('/', rbacMiddleware('role:add'), (req, res) => {
  try {
    const { name, permissions } = req.body;
    if (!name) return res.json({ code: 400, message: '角色名称不能为空' });
    const exists = queryOne('SELECT id FROM role WHERE name = ?', [name]);
    if (exists) return res.json({ code: 400, message: '角色名已存在' });
    const result = runSql('INSERT INTO role (name, permissions) VALUES (?, ?)', [name, JSON.stringify(permissions || [])]);
    logOperation(req.user.userId, req.user.username, `新增角色: ${name}`, req.ip);
    res.json({ code: 200, message: '创建成功', data: { id: result.lastInsertRowid } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.put('/:id', rbacMiddleware('role:edit'), (req, res) => {
  try {
    const { name, permissions } = req.body;
    const role = queryOne('SELECT * FROM role WHERE id = ?', [Number(req.params.id)]);
    if (!role) return res.json({ code: 400, message: '角色不存在' });
    runSql('UPDATE role SET name = ?, permissions = ? WHERE id = ?', [name, JSON.stringify(permissions || []), Number(req.params.id)]);
    logOperation(req.user.userId, req.user.username, `编辑角色: ${role.name}`, req.ip);
    res.json({ code: 200, message: '更新成功' });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.delete('/:id', rbacMiddleware('role:delete'), (req, res) => {
  try {
    const role = queryOne('SELECT * FROM role WHERE id = ?', [Number(req.params.id)]);
    if (!role) return res.json({ code: 400, message: '角色不存在' });
    const userCount = queryOne('SELECT COUNT(*) as cnt FROM user WHERE role_id = ?', [Number(req.params.id)])?.cnt || 0;
    if (userCount > 0) return res.json({ code: 400, message: '该角色下还有用户，不能删除' });
    runSql('DELETE FROM role WHERE id = ?', [Number(req.params.id)]);
    logOperation(req.user.userId, req.user.username, `删除角色: ${role.name}`, req.ip);
    res.json({ code: 200, message: '删除成功' });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

export default router;
