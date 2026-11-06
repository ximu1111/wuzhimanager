import initSqlJs from 'sql.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');
mkdirSync(dataDir, { recursive: true });
const dbPath = join(dataDir, 'material.db');

let SQL = null;
let db = null;

export async function initDatabase() {
  SQL = await initSqlJs();
  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS role (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      permissions TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role_id INTEGER NOT NULL,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (role_id) REFERENCES role(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS category (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS goods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      spec TEXT DEFAULT '',
      supplier TEXT DEFAULT '',
      purchase_date TEXT DEFAULT '',
      purchase_price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      warning_threshold INTEGER DEFAULT 5,
      status TEXT DEFAULT 'normal',
      remark TEXT DEFAULT '',
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (category_id) REFERENCES category(id),
      FOREIGN KEY (created_by) REFERENCES user(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS stock_in (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goods_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      operator_id INTEGER NOT NULL,
      remark TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (goods_id) REFERENCES goods(id),
      FOREIGN KEY (operator_id) REFERENCES user(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS borrow (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goods_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      purpose TEXT DEFAULT '',
      expected_return_date TEXT DEFAULT '',
      actual_return_date TEXT,
      status TEXT DEFAULT 'pending',
      remark TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (goods_id) REFERENCES goods(id),
      FOREIGN KEY (user_id) REFERENCES user(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS repair (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goods_id INTEGER NOT NULL,
      fault_desc TEXT DEFAULT '',
      repair_date TEXT DEFAULT (datetime('now','localtime')),
      cost REAL DEFAULT 0,
      status TEXT DEFAULT 'repairing',
      remark TEXT DEFAULT '',
      operator_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (goods_id) REFERENCES goods(id),
      FOREIGN KEY (operator_id) REFERENCES user(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS operation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT DEFAULT '',
      action TEXT NOT NULL,
      ip TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  saveDb();
}

export function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(dbPath, buffer);
  }
}

// Helper: run a query and return all rows as objects
export function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: run a query and return the first row as object
export function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: run an insert/update/delete and return info
export function runSql(sql, params = []) {
  db.run(sql, params);
  const lastId = queryOne('SELECT last_insert_rowid() as id')?.id || 0;
  saveDb();
  return { lastInsertRowid: lastId, changes: db.getRowsModified() };
}

export function getDb() { return db; }

export default { initDatabase, saveDb, queryAll, queryOne, runSql, getDb };
