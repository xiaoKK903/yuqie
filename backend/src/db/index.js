import initSqlJs from 'sql.js'
import { fileURLToPath } from 'url'
import * as fs from 'fs'
import * as path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, '../../../data')
const dbPath = path.join(dataDir, 'knowledge.db')

let db = null
let dbReady = false

function normalizeRow(row) {
  if (!row) return row
  const normalized = {}
  for (const [key, value] of Object.entries(row)) {
    normalized[key] = value === undefined ? null : value
  }
  return normalized
}

console.log('=== 数据库配置 ===')
console.log('数据目录:', dataDir)
console.log('数据库路径:', dbPath)

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
  console.log('创建数据目录:', dataDir)
}

async function initDb() {
  const SQL = await initSqlJs()
  
  if (fs.existsSync(dbPath)) {
    console.log('加载现有数据库...')
    const fileBuffer = fs.readFileSync(dbPath)
    console.log('数据库文件大小:', fileBuffer.length, 'bytes')
    db = new SQL.Database(fileBuffer)
    console.log('已从文件加载数据库:', dbPath)
  } else {
    console.log('创建新数据库...')
    db = new SQL.Database()
    console.log('创建新数据库完成')
  }
  
  db.run(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      sort INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      folder_id INTEGER,
      sort INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  db.run(`
    CREATE TABLE IF NOT EXISTS document_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      version INTEGER NOT NULL DEFAULT 1,
      change_summary TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
    )
  `)
  
  db.run(`CREATE INDEX IF NOT EXISTS idx_versions_document_id ON document_versions (document_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_versions_created_at ON document_versions (created_at)`)
  
  dbReady = true
  
  saveDb()
  
  console.log('数据库初始化完成')
  console.log('表列表:')
  const tables = all("SELECT name FROM sqlite_master WHERE type='table'")
  tables.forEach(t => console.log('  -', t.name))
  
  return db
}

function saveDb() {
  if (!db) {
    console.log('[saveDb] 数据库未初始化，跳过保存')
    return
  }
  
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    
    fs.writeFileSync(dbPath, buffer)
    console.log('[saveDb] 数据库已保存到文件:', dbPath, '大小:', buffer.length, 'bytes')
    
    if (fs.existsSync(dbPath)) {
      const verifyBuffer = fs.readFileSync(dbPath)
      console.log('[saveDb] 验证文件大小:', verifyBuffer.length, 'bytes')
    }
  } catch (error) {
    console.error('[saveDb] 保存数据库失败:', error)
  }
}

function run(sql, params = []) {
  if (!db) {
    throw new Error('数据库未初始化')
  }
  
  console.log('[run] 执行 SQL:', sql, '参数:', params)
  
  try {
    db.run(sql, params)
    console.log('[run] 执行完成')
    saveDb()
    console.log('[run] 保存完成')
    return true
  } catch (error) {
    console.error('[run] SQL 执行失败:', error)
    throw error
  }
}

function get(sql, params = []) {
  if (!db) {
    throw new Error('数据库未初始化')
  }
  
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()
    return normalizeRow(row)
  }
  stmt.free()
  return undefined
}

function all(sql, params = []) {
  if (!db) {
    throw new Error('数据库未初始化')
  }
  
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) {
    results.push(normalizeRow(stmt.getAsObject()))
  }
  stmt.free()
  return results
}

function insertAndGetId(tableName, sql, params = []) {
  if (!db) {
    throw new Error('数据库未初始化')
  }
  
  console.log('[insertAndGetId] 表:', tableName, 'SQL:', sql, '参数:', params)
  
  db.run(sql, params)
  
  const idResult = db.exec('SELECT last_insert_rowid() as id')
  let lastId = null
  if (idResult && idResult.length > 0 && idResult[0].values && idResult[0].values.length > 0) {
    lastId = idResult[0].values[0][0]
  }
  
  console.log('[insertAndGetId] last_insert_rowid:', lastId)
  
  saveDb()
  
  if (lastId !== null && lastId !== undefined && lastId > 0) {
    const result = get(`SELECT * FROM ${tableName} WHERE id = ?`, [lastId])
    console.log('[insertAndGetId] 通过 ID 查询结果:', result)
    return result
  }
  
  console.log('[insertAndGetId] 尝试通过参数查找...')
  const allRows = all(`SELECT * FROM ${tableName} ORDER BY id DESC LIMIT 5`)
  console.log('[insertAndGetId] 最后5条记录:', allRows)
  
  return allRows[0]
}

function getDb() {
  return db
}

function isDbReady() {
  return dbReady
}

export { initDb, getDb, isDbReady, saveDb, run, get, all, insertAndGetId }
