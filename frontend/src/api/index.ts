import request from './request'
import type { Folder, Document, TreeNode, Km } from '@/types'

export const kmApi = {
  getAll() {
    return request.get<{ data: Km[] }>('/kms')
  },

  create(data: { name: string }) {
    return request.post<{ data: Km }>('/kms', data)
  },

  update(id: number, data: { name?: string; sort?: number }) {
    return request.put<{ data: Km }>(`/kms/${id}`, data)
  },

  delete(id: number) {
    return request.delete(`/kms/${id}`)
  },
}

export const folderApi = {
  getAll() {
    return request.get<{ data: Folder[] }>('/folders')
  },

  create(data: { name: string; parentId: number | null; kmId?: number | null }) {
    return request.post<{ data: Folder }>('/folders', data)
  },

  update(id: number, data: { name?: string; parentId?: number | null; sort?: number; kmId?: number | null }) {
    return request.put<{ data: Folder }>(`/folders/${id}`, data)
  },

  delete(id: number, recursive: boolean = false) {
    return request.delete(`/folders/${id}${recursive ? '?recursive=true' : ''}`)
  },
}

export const documentApi = {
  getAll() {
    return request.get<{ data: Document[] }>('/documents')
  },

  getById(id: number) {
    return request.get<{ data: Document }>(`/documents/${id}`)
  },

  create(data: { title: string; folderId: number | null; content?: string; kmId?: number | null }) {
    return request.post<{ data: Document }>('/documents', data)
  },

  update(id: number, data: { title?: string; content?: string; folderId?: number | null; sort?: number; kmId?: number | null }) {
    return request.put<{ data: Document }>(`/documents/${id}`, data)
  },

  delete(id: number) {
    return request.delete(`/documents/${id}`)
  },
}

export const treeApi = {
  getTree(kmId?: number | null) {
    const url = kmId !== null && kmId !== undefined ? `/tree?kmId=${kmId}` : '/tree'
    return request.get<{ data: TreeNode[] }>(url)
  },

  moveNode(params: {
    sourceId: number
    sourceType: 'folder' | 'document'
    targetId: number | null
    targetType: 'folder' | 'document' | null
    position: 'before' | 'after' | 'inside'
  }) {
    return request.post('/tree/move', params)
  },
}
