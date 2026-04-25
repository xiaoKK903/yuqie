import { Router } from 'express'
import { folderModel } from '../models/folder.js'

const router = Router()

router.get('/', (req, res) => {
  try {
    const folders = folderModel.getAllFolders()
    res.json({
      success: true,
      data: folders.map(f => ({
        id: f.id,
        name: f.name,
        parentId: f.parent_id,
        sort: f.sort,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      })),
    })
  } catch (error) {
    console.error('获取文件夹列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取文件夹列表失败',
    })
  }
})

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params
    const folder = folderModel.getFolderById(parseInt(id))
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: '文件夹不存在',
      })
    }
    
    res.json({
      success: true,
      data: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parent_id,
        sort: folder.sort,
        createdAt: folder.created_at,
        updatedAt: folder.updated_at,
      },
    })
  } catch (error) {
    console.error('获取文件夹失败:', error)
    res.status(500).json({
      success: false,
      message: '获取文件夹失败',
    })
  }
})

router.post('/', (req, res) => {
  try {
    const { name, parentId } = req.body
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '文件夹名称不能为空',
      })
    }
    
    if (parentId !== undefined && parentId !== null) {
      const parentFolder = folderModel.getFolderById(parseInt(parentId))
      if (!parentFolder) {
        return res.status(404).json({
          success: false,
          message: '父文件夹不存在',
        })
      }
    }
    
    const folder = folderModel.createFolder(
      name.trim(),
      parentId === null || parentId === undefined ? null : parseInt(parentId)
    )
    
    res.json({
      success: true,
      data: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parent_id,
        sort: folder.sort,
        createdAt: folder.created_at,
        updatedAt: folder.updated_at,
      },
    })
  } catch (error) {
    console.error('创建文件夹失败:', error)
    res.status(500).json({
      success: false,
      message: '创建文件夹失败',
    })
  }
})

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params
    const { name, parentId, sort } = req.body
    
    const folder = folderModel.getFolderById(parseInt(id))
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: '文件夹不存在',
      })
    }
    
    if (parentId !== undefined && parentId !== null) {
      const parentFolder = folderModel.getFolderById(parseInt(parentId))
      if (!parentFolder) {
        return res.status(404).json({
          success: false,
          message: '父文件夹不存在',
        })
      }
      
      if (folderModel.isDescendantOf(parseInt(parentId), parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: '不能将文件夹移动到其子文件夹中',
        })
      }
    }
    
    const updates = {}
    if (name !== undefined && name.trim() !== '') {
      updates.name = name.trim()
    }
    if (parentId !== undefined) {
      updates.parent_id = parentId === null ? null : parseInt(parentId)
    }
    if (sort !== undefined) {
      updates.sort = parseInt(sort)
    }
    
    const updatedFolder = folderModel.updateFolder(parseInt(id), updates)
    
    res.json({
      success: true,
      data: {
        id: updatedFolder.id,
        name: updatedFolder.name,
        parentId: updatedFolder.parent_id,
        sort: updatedFolder.sort,
        createdAt: updatedFolder.created_at,
        updatedAt: updatedFolder.updated_at,
      },
    })
  } catch (error) {
    console.error('更新文件夹失败:', error)
    res.status(500).json({
      success: false,
      message: '更新文件夹失败',
    })
  }
})

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params
    const { recursive } = req.query
    
    const folder = folderModel.getFolderById(parseInt(id))
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: '文件夹不存在',
      })
    }
    
    folderModel.deleteFolder(parseInt(id))
    
    res.json({
      success: true,
      message: '删除成功',
    })
  } catch (error) {
    console.error('删除文件夹失败:', error)
    res.status(500).json({
      success: false,
      message: '删除文件夹失败',
    })
  }
})

export default router
