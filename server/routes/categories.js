import { Router } from 'express';
import { queryAll, queryOne, runSql } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware, logOperation } from '../middleware/rbac.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const list = queryAll('SELECT * FROM category ORDER BY sort_order');
    res.json({ code: 200, data: list });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.post('/', rbacMiddleware('goods:add'), (req, res) => {
  try {
    const { name, sort_order = 0 } = req.body;
    if (!name) return res.json({ code: 400, message: '分类名称不能为空' });
    const exists = queryOne('SELECT id FROM category WHERE name = ?', [name]);
    if (exists) return res.json({ code: 400, message: '分类名已存在' });
    const result = runSql('INSERT INTO category (name, sort_order) VALUES (?, ?)', [name, sort_order]);
    logOperation(req.user.userId, req.user.username, `新增分类: ${name}`, req.ip);
    res.json({ code: 200, message: '创建成功', data: { id: result.lastInsertRowid } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.put('/:id', rbacMiddleware('goods:edit'), (req, res) => {
  try {
    const { name, sort_order } = req.body;
    runSql('UPDATE category SET name = ?, sort_order = ? WHERE id = ?', [name, sort_order, Number(req.params.id)]);
    res.json({ code: 200, message: '更新成功' });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.delete('/:id', rbacMiddleware('goods:delete'), (req, res) => {
  try {
    const cnt = queryOne('SELECT COUNT(*) as cnt FROM goods WHERE category_id = ?', [Number(req.params.id)])?.cnt || 0;
    if (cnt > 0) return res.json({ code: 400, message: '该分类下有物资，不能删除' });
    runSql('DELETE FROM category WHERE id = ?', [Number(req.params.id)]);
    res.json({ code: 200, message: '删除成功' });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

export default router;
