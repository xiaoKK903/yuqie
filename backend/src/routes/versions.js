import { Router } from 'express'
import { versionModel } from '../models/version.js'
import { documentModel } from '../models/document.js'

const router = Router()

router.get('/document/:documentId', (req, res) => {
  try {
    const { documentId } = req.params
    const versions = versionModel.getVersionsByDocumentId(parseInt(documentId))
    
    res.json({
      success: true,
      data: versions.map(v => ({
        id: v.id,
        documentId: v.document_id,
        title: v.title,
        content: v.content,
        version: v.version,
        changeSummary: v.change_summary,
        createdAt: v.created_at,
      })),
    })
  } catch (error) {
    console.error('获取版本历史失败:', error)
    res.status(500).json({
      success: false,
      message: '获取版本历史失败',
    })
  }
})

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params
    const version = versionModel.getVersionById(parseInt(id))
    
    if (!version) {
      return res.status(404).json({
        success: false,
        message: '版本不存在',
      })
    }
    
    res.json({
      success: true,
      data: {
        id: version.id,
        documentId: version.document_id,
        title: version.title,
        content: version.content,
        version: version.version,
        changeSummary: version.change_summary,
        createdAt: version.created_at,
      },
    })
  } catch (error) {
    console.error('获取版本失败:', error)
    res.status(500).json({
      success: false,
      message: '获取版本失败',
    })
  }
})

router.post('/restore/:id', (req, res) => {
  try {
    const { id } = req.params
    const version = versionModel.getVersionById(parseInt(id))
    
    if (!version) {
      return res.status(404).json({
        success: false,
        message: '版本不存在',
      })
    }
    
    const document = documentModel.getDocumentById(parseInt(version.document_id))
    if (!document) {
      return res.status(404).json({
        success: false,
        message: '文档不存在',
      })
    }
    
    const updatedDocument = documentModel.updateDocument(
      parseInt(version.document_id),
      {
        title: version.title,
        content: version.content,
      }
    )
    
    res.json({
      success: true,
      data: {
        id: updatedDocument.id,
        title: updatedDocument.title,
        content: updatedDocument.content,
        folderId: updatedDocument.folder_id,
        sort: updatedDocument.sort,
        createdAt: updatedDocument.created_at,
        updatedAt: updatedDocument.updated_at,
      },
      message: `已恢复到版本 v${version.version}`,
    })
  } catch (error) {
    console.error('恢复版本失败:', error)
    res.status(500).json({
      success: false,
      message: '恢复版本失败',
    })
  }
})

export default router
