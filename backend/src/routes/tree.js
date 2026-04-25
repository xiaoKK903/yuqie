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
    
    let oldParentId = null
    if (sourceType === 'folder') {
      const sourceFolder = folderModel.getFolderById(sourceId)
      if (!sourceFolder) {
        return res.status(404).json({
          success: false,
          message: '源文件夹不存在',
        })
      }
      oldParentId = sourceFolder.parent_id
    } else {
      const sourceDoc = documentModel.getDocumentById(sourceId)
      if (!sourceDoc) {
        return res.status(404).json({
          success: false,
          message: '源文档不存在',
        })
      }
      oldParentId = sourceDoc.folder_id
    }
    
    if (sourceType === 'folder' && targetType === 'folder' && targetId !== null) {
      if (folderModel.isDescendantOf(targetId, sourceId)) {
        throw new Error('不能将文件夹移动到其子文件夹中')
      }
    }
    
    if (targetId === null) {
      if (sourceType === 'folder') {
        const folders = folderModel.getFoldersByParentId(null)
        const newSort = folders.length
        folderModel.updateFolder(sourceId, { parent_id: null, sort: newSort })
      } else {
        const docs = documentModel.getDocumentsByFolderId(null)
        const newSort = docs.length
        documentModel.updateDocument(sourceId, { folder_id: null, sort: newSort })
      }
      
      if (sourceType === 'folder') {
        folderModel.updateSortValues(oldParentId)
        folderModel.updateSortValues(null)
      } else {
        documentModel.updateSortValues(oldParentId)
        documentModel.updateSortValues(null)
      }
    } else {
      if (position === 'inside') {
        if (targetType === 'folder') {
          if (sourceType === 'folder') {
            const childFolders = folderModel.getFoldersByParentId(targetId)
            const newSort = childFolders.length
            folderModel.updateFolder(sourceId, { parent_id: targetId, sort: newSort })
          } else {
            const childDocs = documentModel.getDocumentsByFolderId(targetId)
            const newSort = childDocs.length
            documentModel.updateDocument(sourceId, { folder_id: targetId, sort: newSort })
          }
          
          if (sourceType === 'folder') {
            folderModel.updateSortValues(oldParentId)
            folderModel.updateSortValues(targetId)
          } else {
            documentModel.updateSortValues(oldParentId)
            documentModel.updateSortValues(targetId)
          }
        }
      } else {
        let targetParentId = null
        
        if (targetType === 'folder') {
          const targetFolder = folderModel.getFolderById(targetId)
          if (targetFolder) {
            targetParentId = targetFolder.parent_id
          }
        } else {
          const targetDoc = documentModel.getDocumentById(targetId)
          if (targetDoc) {
            targetParentId = targetDoc.folder_id
          }
        }
        
        if (targetParentId === oldParentId) {
          let siblings = []
          if (sourceType === 'folder') {
            siblings = folderModel.getFoldersByParentId(targetParentId)
          } else {
            siblings = documentModel.getDocumentsByFolderId(targetParentId)
          }
          
          const sourceIndex = siblings.findIndex(s => s.id === sourceId)
          
          const targetIndex = siblings.findIndex(s => s.id === targetId)
          
          if (sourceIndex === -1 || targetIndex === -1) {
            throw new Error('节点不存在')
          }
          
          const [removed] = siblings.splice(sourceIndex, 1)
          
          let insertIndex = targetIndex
          if (sourceIndex < targetIndex) {
            insertIndex = targetIndex - 1
          }
          
          if (position === 'before') {
            siblings.splice(insertIndex, 0, removed)
          } else {
            siblings.splice(insertIndex + 1, 0, removed)
          }
          
          siblings.forEach((node, index) => {
            if (sourceType === 'folder') {
              folderModel.updateFolder(node.id, { sort: index })
            } else {
              documentModel.updateDocument(node.id, { sort: index })
            }
          })
        } else {
          let oldSiblings = []
          if (sourceType === 'folder') {
            oldSiblings = folderModel.getFoldersByParentId(oldParentId)
          } else {
            oldSiblings = documentModel.getDocumentsByFolderId(oldParentId)
          }
          
          let newSiblings = []
          if (sourceType === 'folder') {
            newSiblings = folderModel.getFoldersByParentId(targetParentId)
          } else {
            newSiblings = documentModel.getDocumentsByFolderId(targetParentId)
          }
          
          const targetIndex = newSiblings.findIndex(s => s.id === targetId)
          
          if (sourceType === 'folder') {
            folderModel.updateFolder(sourceId, { parent_id: targetParentId })
          } else {
            documentModel.updateDocument(sourceId, { folder_id: targetParentId })
          }
          
          oldSiblings = oldSiblings.filter(s => s.id !== sourceId)
          oldSiblings.forEach((node, index) => {
            if (sourceType === 'folder') {
              folderModel.updateFolder(node.id, { sort: index })
            } else {
              documentModel.updateDocument(node.id, { sort: index })
            }
          })
          
          const sourceNode = sourceType === 'folder'
            ? folderModel.getFolderById(sourceId)
            : documentModel.getDocumentById(sourceId)
          
          let insertIndex = targetIndex
          if (position === 'after') {
            insertIndex = targetIndex + 1
          }
          
          newSiblings.splice(insertIndex, 0, sourceNode)
          
          newSiblings.forEach((node, index) => {
            if (sourceType === 'folder') {
              folderModel.updateFolder(node.id, { sort: index })
            } else {
              documentModel.updateDocument(node.id, { sort: index })
            }
          })
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
