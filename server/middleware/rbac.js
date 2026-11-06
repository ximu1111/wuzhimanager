import { queryOne, runSql } from '../db.js';

export function rbacMiddleware(requiredPerm) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });
    const role = queryOne('SELECT permissions FROM role WHERE id = ?', [req.user.roleId]);
    if (!role) return res.status(403).json({ code: 403, message: '角色不存在' });
    const perms = JSON.parse(role.permissions || '[]');
    if (!perms.includes(requiredPerm)) return res.status(403).json({ code: 403, message: '无权限执行此操作' });
    next();
  };
}

export function logOperation(userId, username, action, ip) {
  try {
    runSql('INSERT INTO operation_log (user_id, username, action, ip) VALUES (?, ?, ?, ?)', [userId, username, action, ip || '']);
  } catch (e) { console.error('Log error:', e); }
}
