export interface TreeNode {
  id: number
  name: string
  type: 'folder' | 'document'
  parentId: number | null
  sort: number
  children?: TreeNode[]
  isExpanded?: boolean
  isActive?: boolean
}

export interface Folder {
  id: number
  name: string
  parentId: number | null
  sort: number
  createdAt: string
  updatedAt: string
}

export interface Document {
  id: number
  title: string
  content: string
  folderId: number | null
  sort: number
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
}
