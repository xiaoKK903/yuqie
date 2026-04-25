import { Router } from 'express'
import { folderModel } from '../models/folder.js'
import { documentModel } from '../models/document.js'

const router = Router()

router.get('/', (req, res) => {
  try {
    const folders = folderModel.getAllFolders()
    const documents = documentModel.getAllDocuments()
    
    const isNull = (val) => val === null || val === undefined
    
    const buildTree = (parentId) => {
      const children = []
      
      const childFolders = folders.filter(f => 
        isNull(parentId) ? isNull(f.parent_id) : f.parent_id === parentId
      )
      childFolders.sort((a, b) => a.sort - b.sort)
      
      for (const folder of childFolders) {
        children.push({
          id: folder.id,
          name: folder.name,
          type: 'folder',
          parentId: isNull(folder.parent_id) ? null : folder.parent_id,
          sort: folder.sort,
          children: buildTree(folder.id),
          isExpanded: false,
          isActive: false,
        })
      }
      
      const childDocs = documents.filter(d => 
        isNull(parentId) ? isNull(d.folder_id) : d.folder_id === parentId
      )
      childDocs.sort((a, b) => a.sort - b.sort)
      
      for (const doc of childDocs) {
        children.push({
          id: doc.id,
          name: doc.title,
          type: 'document',
          parentId: isNull(doc.folder_id) ? null : doc.folder_id,
          sort: doc.sort,
          children: [],
          isExpanded: false,
          isActive: false,
        })
      }
      
      return children
    }
    
    const tree = buildTree(null)
    
    res.json({
      success: true,
      data: tree,
    })
  } catch (error) {
    console.error('获取树形结构失败:', error)
    res.status(500).json({
      success: false,
      message: '获取树形结构失败',
    })
  }
})

router.post('/move', (req, res) => {
  try {
    const { sourceId, sourceType, targetId, targetType, position } = req.body
    
    if (!sourceId || !sourceType) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
      })
    }
    
    let newParentId = null
    let newSort = 0
    
    if (targetId === null) {
      if (sourceType === 'folder') {
        const folders = folderModel.getFoldersByParentId(null)
        newSort = folders.length
        folderModel.updateFolder(sourceId, { parent_id: null, sort: newSort })
      } else {
        const docs = documentModel.getDocumentsByFolderId(null)
        newSort = docs.length
        documentModel.updateDocument(sourceId, { folder_id: null, sort: newSort })
      }
    } else {
      if (sourceType === 'folder' && targetType === 'folder') {
        if (folderModel.isDescendantOf(targetId, sourceId)) {
          throw new Error('不能将文件夹移动到其子文件夹中')
        }
      }
      
      if (position === 'inside') {
        if (targetType === 'folder') {
          if (sourceType === 'folder') {
            const childFolders = folderModel.getFoldersByParentId(targetId)
            newSort = childFolders.length
            folderModel.updateFolder(sourceId, { parent_id: targetId, sort: newSort })
          } else {
            const childDocs = documentModel.getDocumentsByFolderId(targetId)
            newSort = childDocs.length
            documentModel.updateDocument(sourceId, { folder_id: targetId, sort: newSort })
          }
        }
      } else {
        let targetParentId = null
        let targetSort = 0
        
        if (targetType === 'folder') {
          const targetFolder = folderModel.getFolderById(targetId)
          if (targetFolder) {
            targetParentId = targetFolder.parent_id
            targetSort = targetFolder.sort
          }
        } else {
          const targetDoc = documentModel.getDocumentById(targetId)
          if (targetDoc) {
            targetParentId = targetDoc.folder_id
            targetSort = targetDoc.sort
          }
        }
        
        const oldParentId = sourceType === 'folder'
          ? folderModel.getFolderById(sourceId)?.parent_id
          : documentModel.getDocumentById(sourceId)?.folder_id
        
        let siblings = []
        if (targetParentId === oldParentId) {
          if (sourceType === 'folder') {
            siblings = folderModel.getFoldersByParentId(targetParentId)
          } else {
            siblings = documentModel.getDocumentsByFolderId(targetParentId)
          }
          
          const sourceNode = siblings.find(s => s.id === sourceId)
          const sourceIndex = siblings.findIndex(s => s.id === sourceId)
          
          if (position === 'before') {
            if (sourceIndex < targetSort) {
              newSort = targetSort - 1
            } else {
              newSort = targetSort
            }
          } else {
            if (sourceIndex < targetSort) {
              newSort = targetSort
            } else {
              newSort = targetSort + 1
            }
          }
          
          if (sourceType === 'folder') {
            folderModel.updateFolder(sourceId, { sort: newSort })
            folderModel.updateSortValues(targetParentId)
          } else {
            documentModel.updateDocument(sourceId, { sort: newSort })
            documentModel.updateSortValues(targetParentId)
          }
        } else {
          if (sourceType === 'folder') {
            folderModel.updateFolder(sourceId, { parent_id: targetParentId })
            if (position === 'before') {
              newSort = targetSort
            } else {
              newSort = targetSort + 1
            }
            folderModel.updateFolder(sourceId, { sort: newSort })
            folderModel.updateSortValues(targetParentId)
          } else {
            documentModel.updateDocument(sourceId, { folder_id: targetParentId })
            if (position === 'before') {
              newSort = targetSort
            } else {
              newSort = targetSort + 1
            }
            documentModel.updateDocument(sourceId, { sort: newSort })
            documentModel.updateSortValues(targetParentId)
          }
        }
      }
    }
    
    res.json({
      success: true,
      message: '移动成功',
    })
  } catch (error) {
    console.error('移动节点失败:', error)
    res.status(500).json({
      success: false,
      message: error.message || '移动节点失败',
    })
  }
})

export default router
