import { queryOne, runSql, saveDb, getDb } from './db.js';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  const roleCount = queryOne('SELECT COUNT(*) as cnt FROM role');
  if (roleCount && roleCount.cnt > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  const hashPwd = (pwd) => bcrypt.hashSync(pwd, 10);

  const allPerms = JSON.stringify([
    'dashboard','goods:view','goods:add','goods:edit','goods:delete','goods:import','goods:export',
    'stock_in:view','stock_in:add','borrow:view','borrow:add','borrow:audit','borrow:return',
    'repair:view','repair:add','repair:edit','scrap:view','scrap:add','alert:view',
    'user:view','user:add','user:edit','user:delete','role:view','role:add','role:edit','role:delete','log:view'
  ]);
  const adminPerms = JSON.stringify([
    'dashboard','goods:view','goods:add','goods:edit','goods:delete','goods:import','goods:export',
    'stock_in:view','stock_in:add','borrow:view','borrow:add','borrow:audit','borrow:return',
    'repair:view','repair:add','repair:edit','scrap:view','scrap:add','alert:view','log:view'
  ]);
  const empPerms = JSON.stringify(['dashboard','goods:view','borrow:view','borrow:add','borrow:return']);

  runSql("INSERT INTO role (name, permissions) VALUES (?, ?)", ['超级管理员', allPerms]);
  runSql("INSERT INTO role (name, permissions) VALUES (?, ?)", ['物资管理员', adminPerms]);
  runSql("INSERT INTO role (name, permissions) VALUES (?, ?)", ['普通员工', empPerms]);

  runSql("INSERT INTO user (username, password, name, role_id, status) VALUES (?, ?, ?, ?, 1)", ['admin', hashPwd('admin123'), '超级管理员', 1]);
  runSql("INSERT INTO user (username, password, name, role_id, status) VALUES (?, ?, ?, ?, 1)", ['manager', hashPwd('manager123'), '物资管理员', 2]);
  runSql("INSERT INTO user (username, password, name, role_id, status) VALUES (?, ?, ?, ?, 1)", ['zhangsan', hashPwd('123456'), '张三', 3]);
  runSql("INSERT INTO user (username, password, name, role_id, status) VALUES (?, ?, ?, ?, 1)", ['lisi', hashPwd('123456'), '李四', 3]);
  runSql("INSERT INTO user (username, password, name, role_id, status) VALUES (?, ?, ?, ?, 1)", ['wangwu', hashPwd('123456'), '王五', 3]);

  const cats = [['办公用品',1],['电子设备',2],['办公家具',3],['清洁用品',4],['安防设备',5],['工具器材',6]];
  for (const [name, sort] of cats) {
    runSql("INSERT INTO category (name, sort_order) VALUES (?, ?)", [name, sort]);
  }

  const goodsData = [
    ['A4打印纸',1,'70g 500张/包','得力办公','2024-08-15',25,200,20,'日常办公用纸'],
    ['签字笔',1,'0.5mm 黑色','晨光文具','2024-09-01',3,150,30,'黑色水性笔'],
    ['文件夹',1,'A4 双夹','得力办公','2024-08-20',8,80,15,'蓝色文件夹'],
    ['笔记本电脑',2,'ThinkPad T14s','联想官方','2024-06-10',6999,15,3,'开发人员用'],
    ['台式电脑',2,'Dell OptiPlex 7090','戴尔官方','2024-05-20',5499,10,3,'行政办公用'],
    ['显示器',2,'27寸 4K IPS','AOC','2024-07-01',1899,12,3,'外接显示器'],
    ['机械键盘',2,'87键 红轴','Cherry','2024-08-05',399,20,5,'程序员专用'],
    ['无线鼠标',2,'蓝牙静音','罗技','2024-08-10',129,30,10,'通用型'],
    ['办公桌',3,'1.4m 钢木结构','宜家家居','2024-03-15',899,25,5,'标准员工桌'],
    ['办公椅',3,'人体工学 网布','西昊','2024-03-15',1299,25,5,'人体工学椅'],
    ['文件柜',3,'三层 带锁','震旦家具','2024-04-01',599,15,3,'钢制文件柜'],
    ['白板',1,'120x90cm 磁性','得力办公','2024-07-20',159,8,2,'会议室用'],
    ['投影仪',2,'1080P 4000流明','爱普生','2024-04-10',4599,3,1,'会议室设备'],
    ['空调',2,'3匹 柜机 变频','格力','2024-02-20',7999,5,1,'办公区空调'],
    ['碎纸机',2,'4级保密 15L','科密','2024-06-15',699,4,2,'行政部用'],
    ['扫把套装',4,'室内软毛','妙洁','2024-09-01',35,20,5,'清洁工具'],
    ['垃圾桶',4,'12L 脚踏式','茶花','2024-09-01',25,30,10,'每个工位配备'],
    ['灭火器',5,'4kg 干粉','天广','2024-01-10',89,10,3,'消防设备'],
    ['监控摄像头',5,'200万 红外夜视','海康威视','2024-03-01',359,8,2,'安防监控'],
    ['电钻',6,'冲击钻 800W','博世','2024-05-01',459,3,1,'维修工具'],
  ];

  for (const g of goodsData) {
    runSql(`INSERT INTO goods (name,category_id,spec,supplier,purchase_date,purchase_price,stock,warning_threshold,status,remark,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [g[0],g[1],g[2],g[3],g[4],g[5],g[6],g[7],'normal',g[8],1]);
  }

  // Stock in records
  for (let i = 0; i < goodsData.length; i++) {
    const m = String(Math.floor(Math.random()*6)+1).padStart(2,'0');
    const d = String(Math.floor(Math.random()*28)+1).padStart(2,'0');
    runSql("INSERT INTO stock_in (goods_id,quantity,operator_id,remark,created_at) VALUES (?,?,?,?,?)",
      [i+1, goodsData[i][6], 1, `初始入库 - ${goodsData[i][0]}`, `2024-${m}-${d}`]);
  }
  runSql("INSERT INTO stock_in (goods_id,quantity,operator_id,remark,created_at) VALUES (?,?,?,?,?)", [1,50,1,'A4打印纸补充入库','2024-09-15']);
  runSql("INSERT INTO stock_in (goods_id,quantity,operator_id,remark,created_at) VALUES (?,?,?,?,?)", [2,30,1,'签字笔补充入库','2024-10-01']);
  runSql("INSERT INTO stock_in (goods_id,quantity,operator_id,remark,created_at) VALUES (?,?,?,?,?)", [7,10,1,'键盘补充采购','2024-10-10']);

  // Operation logs
  runSql("INSERT INTO operation_log (user_id,username,action,ip) VALUES (?,?,?,?)", [1,'admin','系统初始化','127.0.0.1']);
  runSql("INSERT INTO operation_log (user_id,username,action,ip) VALUES (?,?,?,?)", [1,'admin','新增物资: A4打印纸','127.0.0.1']);
  runSql("INSERT INTO operation_log (user_id,username,action,ip) VALUES (?,?,?,?)", [2,'manager','审核领用申请 #1','192.168.1.10']);
  runSql("INSERT INTO operation_log (user_id,username,action,ip) VALUES (?,?,?,?)", [3,'zhangsan','提交领用申请: 签字笔x5','192.168.1.20']);

  // Borrow records
  runSql("INSERT INTO borrow (goods_id,user_id,quantity,purpose,expected_return_date,status,remark,created_at) VALUES (?,?,?,?,?,?,?,?)",
    [2,3,5,'日常办公使用','2025-03-01','borrowed','已领用','2024-10-15']);
  runSql("INSERT INTO borrow (goods_id,user_id,quantity,purpose,expected_return_date,status,remark,created_at) VALUES (?,?,?,?,?,?,?,?)",
    [8,4,2,'项目开发','2025-06-01','borrowed','已领用','2024-11-01']);
  runSql("INSERT INTO borrow (goods_id,user_id,quantity,purpose,expected_return_date,actual_return_date,status,remark,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [1,5,10,'部门打印用纸','2024-12-31','2024-12-20','returned','已归还','2024-11-10']);
  runSql("INSERT INTO borrow (goods_id,user_id,quantity,purpose,expected_return_date,status,remark,created_at) VALUES (?,?,?,?,?,?,?,?)",
    [4,3,1,'项目开发使用','2025-12-31','pending','待审核','2024-12-01']);
  runSql("INSERT INTO borrow (goods_id,user_id,quantity,purpose,expected_return_date,status,remark,created_at) VALUES (?,?,?,?,?,?,?,?)",
    [7,5,1,'开发使用','2025-06-30','rejected','库存不足驳回','2024-11-20']);

  // Repair records
  runSql("INSERT INTO repair (goods_id,fault_desc,repair_date,cost,status,remark,operator_id) VALUES (?,?,?,?,?,?,?)",
    [14,'压缩机异响，制冷效果下降','2024-10-20',500,'repaired','已更换压缩机零件',2]);
  runSql("INSERT INTO repair (goods_id,fault_desc,repair_date,cost,status,remark,operator_id) VALUES (?,?,?,?,?,?,?)",
    [15,'进纸口卡纸严重','2024-11-15',200,'repairing','等待配件',2]);

  // Update goods status
  runSql("UPDATE goods SET status = 'repairing' WHERE id = 15");
  runSql("UPDATE goods SET stock = stock - 5 WHERE id = 2");
  runSql("UPDATE goods SET stock = stock - 2 WHERE id = 8");

  saveDb();
  console.log('Database seeded successfully!');
  console.log('Users: admin/admin123, manager/manager123, zhangsan/123456');
}
