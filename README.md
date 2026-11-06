物资管理后台系统 - AGENTS.md
项目概览
物资管理后台系统，支持RBAC权限控制、物资全生命周期管理（入库、领用、维修、报废）、库存预警、统计报表。

技术栈
后端: Express.js + sql.js (SQLite WASM) + JWT + bcryptjs
前端: Vue3 + TypeScript + Vite + Pinia + Vue-Router + Element-Plus + ECharts
目录结构
├── server/              # 后端服务
│   ├── index.js         # Express 入口
│   ├── db.js            # 数据库初始化 (sql.js)
│   ├── seed.js          # 种子数据
│   ├── middleware/       # auth.js (JWT), rbac.js (权限校验+日志)
│   └── routes/          # API路由 (auth, users, roles, goods, categories, stockIn, borrow, repair, scrap, logs, report)
├── frontend/            # 前端应用
│   ├── src/
│   │   ├── api/         # Axios封装 + 所有API
│   │   ├── stores/      # Pinia auth store
│   │   ├── router/      # 路由 + 守卫
│   │   ├── views/       # 页面组件
│   │   └── components/  # 布局组件
│   └── vite.config.ts   # Vite配置 (代理/api到5000)
└── .coze                # 构建/运行配置
启动命令
后端: cd server && node index.js (端口5000)
前端开发: cd frontend && npx vite --port 6000 (HMR端口6000)
演示账号
超级管理员: admin / admin123
物资管理员: manager / manager123
普通员工: zhangsan / 123456
API接口
所有API前缀 /api/，统一返回 { code, message, data }。

POST /api/auth/login - 登录
GET/POST/PUT/DELETE /api/users - 用户CRUD
GET/POST/PUT/DELETE /api/roles - 角色CRUD
GET/POST/PUT/DELETE /api/goods - 物资CRUD
POST /api/goods/import - 批量导入
GET /api/goods/export/excel - 导出Excel
GET/POST /api/categories - 分类
GET/POST /api/stock-in - 入库
GET/POST /api/borrow - 领用
PUT /api/borrow/:id/audit - 审核
PUT /api/borrow/:id/return - 归还
GET/POST/PUT /api/repair - 维修
GET/POST /api/scrap - 报废
GET /api/logs - 操作日志
GET /api/report/dashboard - 报表大盘
GET /api/report/alerts - 预警列表
