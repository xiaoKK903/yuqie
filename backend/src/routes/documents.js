import { Router } from 'express'
import { documentModel } from '../models/document.js'
import { folderModel } from '../models/folder.js'
import { versionModel } from '../models/version.js'

const router = Router()

router.get('/', (req, res) => {
  try {
    const documents = documentModel.getAllDocuments()
    res.json({
      success: true,
      data: documents.map(d => ({
        id: d.id,
        title: d.title,
        content: d.content,
        folderId: d.folder_id,
        sort: d.sort,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      })),
    })
  } catch (error) {
    console.error('获取文档列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取文档列表失败',
    })
  }
})

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params
    const document = documentModel.getDocumentById(parseInt(id))
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: '文档不存在',
      })
    }
    
    res.json({
      success: true,
      data: {
        id: document.id,
        title: document.title,
        content: document.content,
        folderId: document.folder_id,
        sort: document.sort,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
      },
    })
  } catch (error) {
    console.error('获取文档失败:', error)
    res.status(500).json({
      success: false,
      message: '获取文档失败',
    })
  }
})

router.post('/', (req, res) => {
  try {
    const { title, folderId, content = '', kmId } = req.body
    
    console.log('[创建文档] 收到请求:')
    console.log('  - title:', title)
    console.log('  - folderId:', folderId, '类型:', typeof folderId)
    console.log('  - kmId:', kmId)
    console.log('  - req.body:', JSON.stringify(req.body))
    
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '文档名称不能为空',
      })
    }
    
    if (folderId !== undefined && folderId !== null) {
      console.log('[创建文档] 检查父文件夹, folderId:', folderId)
      const folder = folderModel.getFolderById(parseInt(folderId))
      if (!folder) {
        console.log('[创建文档] 父文件夹不存在')
        return res.status(404).json({
          success: false,
          message: '文件夹不存在',
        })
      }
      console.log('[创建文档] 找到父文件夹:', folder)
    }
    
    const document = documentModel.createDocument(
      title.trim(),
      folderId === null || folderId === undefined ? null : parseInt(folderId),
      content,
      kmId === null || kmId === undefined ? null : parseInt(kmId)
    )
    
    console.log('[创建文档] 创建成功:', document)
    
    versionModel.createVersion(
      document.id,
      document.title,
      document.content,
      '初始版本'
    )
    
    res.json({
      success: true,
      data: {
        id: document.id,
        title: document.title,
        content: document.content,
        folderId: document.folder_id,
        kmId: document.km_id,
        sort: document.sort,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
      },
    })
  } catch (error) {
    console.error('创建文档失败:', error)
    res.status(500).json({
      success: false,
      message: '创建文档失败',
    })
  }
})

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params
    const { title, content, folderId, sort, kmId } = req.body
    
    const document = documentModel.getDocumentById(parseInt(id))
    if (!document) {
      return res.status(404).json({
        success: false,
        message: '文档不存在',
      })
    }
    
    if (folderId !== undefined && folderId !== null) {
      const folder = folderModel.getFolderById(parseInt(folderId))
      if (!folder) {
        return res.status(404).json({
          success: false,
          message: '文件夹不存在',
        })
      }
    }
    
    const updates = {}
    if (title !== undefined && title.trim() !== '') {
      updates.title = title.trim()
    }
    if (content !== undefined) {
      updates.content = content
    }
    if (folderId !== undefined) {
      updates.folder_id = folderId === null ? null : parseInt(folderId)
    }
    if (sort !== undefined) {
      updates.sort = parseInt(sort)
    }
    if (kmId !== undefined) {
      updates.km_id = kmId === null ? null : parseInt(kmId)
    }
    
    const updatedDocument = documentModel.updateDocument(parseInt(id), updates)
    
    if (content !== undefined && content !== document.content) {
      versionModel.createVersion(
        parseInt(id),
        updatedDocument.title,
        content,
        null
      )
    }
    
    res.json({
      success: true,
      data: {
        id: updatedDocument.id,
        title: updatedDocument.title,
        content: updatedDocument.content,
        folderId: updatedDocument.folder_id,
        kmId: updatedDocument.km_id,
        sort: updatedDocument.sort,
        createdAt: updatedDocument.created_at,
        updatedAt: updatedDocument.updated_at,
      },
    })
  } catch (error) {
    console.error('更新文档失败:', error)
    res.status(500).json({
      success: false,
      message: '更新文档失败',
    })
  }
})

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params
    
    const document = documentModel.getDocumentById(parseInt(id))
    if (!document) {
      return res.status(404).json({
        success: false,
        message: '文档不存在',
      })
    }
    
    const success = documentModel.deleteDocument(parseInt(id))
    
    res.json({
      success,
      message: success ? '删除成功' : '删除失败',
    })
  } catch (error) {
    console.error('删除文档失败:', error)
    res.status(500).json({
      success: false,
      message: '删除文档失败',
    })
  }
})

export default router
