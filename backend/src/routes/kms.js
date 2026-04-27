import { Router } from 'express'
import { kmModel } from '../models/km.js'

const router = Router()

router.get('/', (req, res) => {
  try {
    const kms = kmModel.getAllKms()
    res.json({
      success: true,
      data: kms,
    })
  } catch (error) {
    console.error('获取知识库列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取知识库列表失败',
    })
  }
})

router.post('/', (req, res) => {
  try {
    const { name } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '知识库名称不能为空',
      })
    }
    
    const newKm = kmModel.createKm(name.trim())
    
    res.json({
      success: true,
      data: newKm,
      message: '知识库创建成功',
    })
  } catch (error) {
    console.error('创建知识库失败:', error)
    res.status(500).json({
      success: false,
      message: '创建知识库失败',
    })
  }
})

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '知识库名称不能为空',
      })
    }
    
    const updatedKm = kmModel.updateKm(parseInt(id), { name: name.trim() })
    
    res.json({
      success: true,
      data: updatedKm,
      message: '知识库更新成功',
    })
  } catch (error) {
    console.error('更新知识库失败:', error)
    res.status(500).json({
      success: false,
      message: '更新知识库失败',
    })
  }
})

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params
    kmModel.deleteKm(parseInt(id))
    
    res.json({
      success: true,
      message: '知识库删除成功',
    })
  } catch (error) {
    console.error('删除知识库失败:', error)
    res.status(500).json({
      success: false,
      message: '删除知识库失败',
    })
  }
})

export default router
