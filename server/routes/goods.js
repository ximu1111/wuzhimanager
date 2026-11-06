import { Router } from 'express';
import { queryAll, queryOne, runSql } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware, logOperation } from '../middleware/rbac.js';
import XLSX from 'xlsx';

const router = Router();
router.use(authMiddleware);

router.get('/', rbacMiddleware('goods:view'), (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', category_id, status } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (g.name LIKE ? OR g.spec LIKE ? OR g.supplier LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
    if (category_id) { where += ' AND g.category_id = ?'; params.push(Number(category_id)); }
    if (status) { where += ' AND g.status = ?'; params.push(status); }
    const total = queryOne(`SELECT COUNT(*) as total FROM goods g WHERE ${where}`, params)?.total || 0;
    const offset = (Number(page) - 1) * Number(pageSize);
    const list = queryAll(`SELECT g.*, c.name as category_name, u.name as creator_name FROM goods g LEFT JOIN category c ON g.category_id = c.id LEFT JOIN user u ON g.created_by = u.id WHERE ${where} ORDER BY g.id DESC LIMIT ? OFFSET ?`, [...params, Number(pageSize), offset]);
    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.get('/export/excel', rbacMiddleware('goods:export'), (req, res) => {
  try {
    const goods = queryAll(`SELECT g.id, g.name, c.name as category_name, g.spec, g.supplier, g.purchase_date, g.purchase_price, g.stock, g.warning_threshold, g.status, g.remark FROM goods g LEFT JOIN category c ON g.category_id = c.id ORDER BY g.id`);
    const statusMap = { normal: '正常', repairing: '维修中', scrapped: '已报废' };
    const data = goods.map(g => ({ 'ID': g.id, '物资名称': g.name, '分类': g.category_name, '规格型号': g.spec, '供应商': g.supplier, '采购日期': g.purchase_date, '采购单价': g.purchase_price, '库存数量': g.stock, '预警阈值': g.warning_threshold, '状态': statusMap[g.status] || g.status, '备注': g.remark }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '物资列表');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=goods.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.get('/:id', rbacMiddleware('goods:view'), (req, res) => {
  try {
    const goods = queryOne(`SELECT g.*, c.name as category_name FROM goods g LEFT JOIN category c ON g.category_id = c.id WHERE g.id = ?`, [Number(req.params.id)]);
    if (!goods) return res.json({ code: 400, message: '物资不存在' });
    res.json({ code: 200, data: goods });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.post('/', rbacMiddleware('goods:add'), (req, res) => {
  try {
    const { name, category_id, spec, supplier, purchase_date, purchase_price, stock, warning_threshold, remark } = req.body;
    if (!name || !category_id) return res.json({ code: 400, message: '物资名称和分类不能为空' });
    const result = runSql(`INSERT INTO goods (name,category_id,spec,supplier,purchase_date,purchase_price,stock,warning_threshold,remark,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`, [name, category_id, spec||'', supplier||'', purchase_date||'', purchase_price||0, stock||0, warning_threshold||5, remark||'', req.user.userId]);
    logOperation(req.user.userId, req.user.username, `新增物资: ${name}`, req.ip);
    res.json({ code: 200, message: '创建成功', data: { id: result.lastInsertRowid } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.post('/import', rbacMiddleware('goods:import'), (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.json({ code: 400, message: '导入数据不能为空' });
    let count = 0;
    for (const item of items) {
      const r = runSql(`INSERT INTO goods (name,category_id,spec,supplier,purchase_date,purchase_price,stock,warning_threshold,remark,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`, [item.name, item.category_id, item.spec||'', item.supplier||'', item.purchase_date||'', item.purchase_price||0, item.stock||0, item.warning_threshold||5, item.remark||'', req.user.userId]);
      if (item.stock > 0) runSql('INSERT INTO stock_in (goods_id,quantity,operator_id,remark) VALUES (?,?,?,?)', [r.lastInsertRowid, item.stock, req.user.userId, '批量导入入库']);
      count++;
    }
    logOperation(req.user.userId, req.user.username, `批量导入物资: ${count}条`, req.ip);
    res.json({ code: 200, message: `成功导入${count}条物资` });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.put('/:id', rbacMiddleware('goods:edit'), (req, res) => {
  try {
    const { name, category_id, spec, supplier, purchase_date, purchase_price, warning_threshold, remark, status: newStatus } = req.body;
    const goods = queryOne('SELECT * FROM goods WHERE id = ?', [Number(req.params.id)]);
    if (!goods) return res.json({ code: 400, message: '物资不存在' });
    runSql(`UPDATE goods SET name=?,category_id=?,spec=?,supplier=?,purchase_date=?,purchase_price=?,warning_threshold=?,remark=? WHERE id=?`, [name||goods.name, category_id||goods.category_id, spec??goods.spec, supplier??goods.supplier, purchase_date??goods.purchase_date, purchase_price??goods.purchase_price, warning_threshold??goods.warning_threshold, remark??goods.remark, Number(req.params.id)]);
    if (newStatus && newStatus !== goods.status) runSql('UPDATE goods SET status=? WHERE id=?', [newStatus, Number(req.params.id)]);
    logOperation(req.user.userId, req.user.username, `编辑物资: ${name||goods.name}`, req.ip);
    res.json({ code: 200, message: '更新成功' });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

router.delete('/:id', rbacMiddleware('goods:delete'), (req, res) => {
  try {
    const goods = queryOne('SELECT * FROM goods WHERE id = ?', [Number(req.params.id)]);
    if (!goods) return res.json({ code: 400, message: '物资不存在' });
    runSql('DELETE FROM goods WHERE id = ?', [Number(req.params.id)]);
    logOperation(req.user.userId, req.user.username, `删除物资: ${goods.name}`, req.ip);
    res.json({ code: 200, message: '删除成功' });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

export default router;
