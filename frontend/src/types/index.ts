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

export interface Km {
  id: number
  name: string
  sort: number
  createdAt: string
  updatedAt: string
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

export interface TableSheet {
  id: string
  name: string
  columns: TableColumn[]
  rows: TableRow[]
  cells: TableCell[]
  mergeCells: TableMergeCell[]
}

export interface InteractiveTableData {
  id: string
  columns: TableColumn[]
  rows: TableRow[]
  cells: TableCell[]
  mergeCells: TableMergeCell[]
  sheets?: TableSheet[]
  activeSheetId?: string
}

export interface InteractiveTableProps {
  data: InteractiveTableData
  onChange?: (data: InteractiveTableData) => void
  onDelete?: () => void
}

export type BlockType = 'text' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'bullet' | 'numbered' | 'todo' | 'code' | 'quote' | 'table' | 'divider'

export interface Block {
  id: string
  type: BlockType
  content: string
  meta?: {
    language?: string
    checked?: boolean
    tableData?: InteractiveTableData
  }
}

export interface BlockEditorProps {
  blocks: Block[]
  onChange: (blocks: Block[]) => void
  onAddBlock?: (afterBlockId: string, type: BlockType) => void
  onDeleteBlock?: (blockId: string) => void
  onUpdateBlock?: (blockId: string, updates: Partial<Block>) => void
}

export interface DocumentVersion {
  id: number
  documentId: number
  content: string
  title: string
  version: number
  createdAt: string
  changeSummary?: string
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'
