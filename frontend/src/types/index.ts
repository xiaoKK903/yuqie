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

export type TableFieldType = 'text' | 'select' | 'date' | 'checkbox'

export interface TableColumn {
  id: string
  width: number
  fieldType: TableFieldType
  title: string
  selectOptions?: string[]
}

export interface TableRow {
  id: string
  height: number
}

export interface TableCell {
  rowId: string
  colId: string
  value: string
  isMerged?: boolean
  mergeRowSpan?: number
  mergeColSpan?: number
  mergeOrigin?: { rowId: string; colId: string }
}

export interface TableSelection {
  rowId: string
  colId: string
}

export interface TableMergeCell {
  rowId: string
  colId: string
  rowSpan: number
  colSpan: number
}

export interface InteractiveTableData {
  id: string
  columns: TableColumn[]
  rows: TableRow[]
  cells: TableCell[]
  mergeCells: TableMergeCell[]
}

export interface InteractiveTableProps {
  data: InteractiveTableData
  onChange?: (data: InteractiveTableData) => void
  onDelete?: () => void
}
