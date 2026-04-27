import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TreeNode, Document, Km } from '@/types'
import { treeApi, documentApi, kmApi } from '@/api'

export const useKnowledgeStore = defineStore('knowledge', () => {
  const treeData = ref<TreeNode[]>([])
  const activeNode = ref<TreeNode | null>(null)
  const currentDocument = ref<Document | null>(null)
  const loading = ref(false)
  const currentKmId = ref<number | null>(null)
  const currentKm = ref<Km | null>(null)

  const expandedNodes = computed(() => {
    const getExpandedIds = (nodes: TreeNode[]): number[] => {
      const ids: number[] = []
      for (const node of nodes) {
        if (node.isExpanded) {
          ids.push(node.id)
        }
        if (node.children && node.children.length > 0) {
          ids.push(...getExpandedIds(node.children))
        }
      }
      return ids
    }
    return getExpandedIds(treeData.value)
  })

  async function fetchTree(kmId?: number | null) {
    if (kmId !== undefined) {
      currentKmId.value = kmId
    }
    
    loading.value = true
    try {
      const res = await treeApi.getTree(currentKmId.value)
      treeData.value = res.data.data
      restoreExpandedState(treeData.value, expandedNodes.value)
    } finally {
      loading.value = false
    }
  }

  async function fetchKmInfo(kmId: number) {
    try {
      const res = await kmApi.getAll()
      const kms = res.data.data || []
      currentKm.value = kms.find(km => km.id === kmId) || null
    } catch (error) {
      console.error('获取知识库信息失败:', error)
    }
  }

  function restoreExpandedState(nodes: TreeNode[], expandedIds: number[]) {
    for (const node of nodes) {
      node.isExpanded = expandedIds.includes(node.id)
      if (node.children && node.children.length > 0) {
        restoreExpandedState(node.children, expandedIds)
      }
    }
  }

  function setActiveNode(node: TreeNode | null) {
    activeNode.value = node
    if (node) {
      const allNodes = getAllNodes()
      for (const n of allNodes) {
        n.isActive = n.id === node.id && n.type === node.type
      }
    }
  }

  function getAllNodes(): TreeNode[] {
    const result: TreeNode[] = []
    const traverse = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        result.push(node)
        if (node.children && node.children.length > 0) {
          traverse(node.children)
        }
      }
    }
    traverse(treeData.value)
    return result
  }

  function findNodeById(id: number, type: 'folder' | 'document'): TreeNode | null {
    const allNodes = getAllNodes()
    return allNodes.find(n => n.id === id && n.type === type) || null
  }

  function toggleExpand(node: TreeNode) {
    node.isExpanded = !node.isExpanded
  }

  async function loadDocument(id: number) {
    loading.value = true
    try {
      const res = await documentApi.getById(id)
      currentDocument.value = res.data.data
    } finally {
      loading.value = false
    }
  }

  async function saveDocument(data: { title: string; content: string }) {
    if (!currentDocument.value) return
    await documentApi.update(currentDocument.value.id, data)
    currentDocument.value.title = data.title
    currentDocument.value.content = data.content
    
    const node = findNodeById(currentDocument.value.id, 'document')
    if (node) {
      node.name = data.title
    }
  }

  return {
    treeData,
    activeNode,
    currentDocument,
    loading,
    currentKmId,
    currentKm,
    expandedNodes,
    fetchTree,
    fetchKmInfo,
    setActiveNode,
    findNodeById,
    toggleExpand,
    loadDocument,
    saveDocument,
    getAllNodes,
  }
})
