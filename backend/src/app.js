import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import foldersRouter from './routes/folders.js'
import documentsRouter from './routes/documents.js'
import treeRouter from './routes/tree.js'
import { initDb } from './db/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dataDir = join(__dirname, '../../data')

async function startServer() {
  await initDb()
  
  const app = express()
  const PORT = process.env.PORT || 8080
  
  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  app.use('/api/folders', foldersRouter)
  app.use('/api/documents', documentsRouter)
  app.use('/api/tree', treeRouter)
  
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: '知识库服务运行正常',
      timestamp: new Date().toISOString(),
    })
  })
  
  app.use((err, req, res, next) => {
    console.error('服务器错误:', err)
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
    })
  })
  
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║              知识库服务已启动                                ║
╠═══════════════════════════════════════════════════════════╣
║  服务地址: http://localhost:${PORT}                          ║
║  API 路径: http://localhost:${PORT}/api                      ║
║  数据目录: ${dataDir.padEnd(40)} ║
╚═══════════════════════════════════════════════════════════╝
    `)
  })
}

startServer().catch(err => {
  console.error('启动服务器失败:', err)
})
