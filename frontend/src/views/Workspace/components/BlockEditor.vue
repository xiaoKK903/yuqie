<template>
  <div class="block-editor" ref="editorRef" @click="handleEditorClick">
    <template v-for="(block, index) in blocks" :key="block.id">
      <div
        class="block-wrapper"
        :class="{ 'block-active': activeBlockId === block.id }"
      >
        <div class="block-handle" @click="handleBlockClick(block.id, $event)">
          <el-icon><MoreFilled /></el-icon>
        </div>
        
        <div class="block-content" @click="handleBlockClick(block.id, $event)">
          <template v-if="block.type === 'divider'">
            <hr class="block-divider" />
          </template>
          
          <template v-else-if="block.type === 'table'">
            <InteractiveTable
              :modelValue="block.meta?.tableData || createDefaultTable()"
              @update:modelValue="(data: InteractiveTableData) => updateBlockTable(block.id, data)"
              @delete="deleteBlock(block.id)"
            />
          </template>
          
          <template v-else-if="block.type === 'code'">
            <div class="code-block-wrapper">
              <div class="code-header">
                <span class="code-lang">{{ block.meta?.language || 'plaintext' }}</span>
              </div>
              <textarea
                v-model="block.content"
                class="code-editor"
                placeholder="输入代码..."
                @input="handleCodeInput(block.id)"
              />
            </div>
          </template>
          
          <template v-else>
            <div
              class="editable-content"
              :class="`block-${block.type}`"
              :contenteditable="true"
              :data-placeholder="getPlaceholder(block.type)"
              @input="handleContentInput(block.id, $event)"
              @keydown="handleKeyDown(block.id, $event)"
              @focus="handleBlockFocus(block.id)"
              @blur="handleBlockBlur(block.id)"
              v-html="renderBlockContent(block)"
            ></div>
            
            <div v-if="block.type === 'todo'" class="todo-checkbox">
              <el-checkbox
                :model-value="block.meta?.checked"
                @change="handleTodoCheck(block.id, $event)"
              />
            </div>
          </template>
        </div>
        
        <div class="block-actions" v-if="activeBlockId === block.id">
          <el-button text size="small" @click="showSlashMenu(block.id, $event)">
            <el-icon><Plus /></el-icon>
          </el-button>
          <el-button text size="small" @click="deleteBlock(block.id)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </template>
    
    <div
      v-if="blocks.length === 0"
      class="empty-block"
      @click="addFirstBlock"
    >
      <span class="empty-hint">点击或按 / 开始输入</span>
    </div>
    
    <SlashMenu
      :visible="slashMenuVisible"
      :position="slashMenuPosition"
      @close="hideSlashMenu"
      @insert="handleSlashMenuInsert"
      @upload="handleSlashMenuUpload"
      @table-select="handleTableSelect"
    />
    
    <el-dialog
      v-model="uploadDialogVisible"
      :title="uploadType === 'image' ? '上传图片' : '上传附件'"
      width="500px"
    >
      <div class="upload-content">
        <el-upload
          drag
          :auto-upload="false"
          :on-change="handleFileUpload"
          :limit="1"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">
            将文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              {{ uploadType === 'image' ? '支持 jpg、png、gif 格式' : '支持所有文件格式' }}
            </div>
          </template>
        </el-upload>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  MoreFilled,
  Plus,
  Delete,
  UploadFilled,
} from '@element-plus/icons-vue'
import InteractiveTable from './InteractiveTable.vue'
import SlashMenu from './SlashMenu.vue'
import type { Block, BlockType, InteractiveTableData } from '@/types'

const props = defineProps<{
  modelValue: Block[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Block[]): void
}>()

const editorRef = ref<HTMLElement | null>(null)
const blocks = ref<Block[]>(JSON.parse(JSON.stringify(props.modelValue || [])))

const activeBlockId = ref<string | null>(null)

const slashMenuVisible = ref(false)
const slashMenuPosition = ref({ x: 0, y: 0 })
const slashMenuTargetBlockId = ref<string | null>(null)

const uploadDialogVisible = ref(false)
const uploadType = ref<'image' | 'attachment'>('image')

watch(() => props.modelValue, (newVal) => {
  blocks.value = JSON.parse(JSON.stringify(newVal || []))
}, { deep: true })

watch(blocks, (newVal) => {
  emit('update:modelValue', JSON.parse(JSON.stringify(newVal)))
}, { deep: true })

function generateId(): string {
  return 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

function createDefaultTable(): InteractiveTableData {
  const cols = 3
  const rows = 3
  
  const columns = []
  for (let i = 0; i < cols; i++) {
    columns.push({
      id: 'col_' + (i + 1),
      width: 150,
      fieldType: 'text',
      title: `字段${i + 1}`,
    })
  }
  
  const tableRows = []
  for (let i = 0; i < rows; i++) {
    tableRows.push({
      id: 'row_' + (i + 1),
      height: 40,
    })
  }
  
  const cells = []
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      cells.push({
        rowId: 'row_' + (i + 1),
        colId: 'col_' + (j + 1),
        value: '',
      })
    }
  }
  
  return {
    id: 'table_' + Date.now(),
    columns,
    rows: tableRows,
    cells,
    mergeCells: [],
  }
}

function createBlock(type: BlockType, content: string = ''): Block {
  return {
    id: generateId(),
    type,
    content,
    meta: type === 'table' ? { tableData: createDefaultTable() } : type === 'code' ? { language: 'javascript' } : type === 'todo' ? { checked: false } : undefined,
  }
}

function getPlaceholder(type: BlockType): string {
  const placeholders: Record<BlockType, string> = {
    text: '输入内容...',
    h1: '一级标题',
    h2: '二级标题',
    h3: '三级标题',
    h4: '四级标题',
    h5: '五级标题',
    h6: '六级标题',
    bullet: '列表项',
    numbered: '列表项',
    todo: '待办事项',
    quote: '引用内容',
    code: '',
    table: '',
    divider: '',
  }
  return placeholders[type] || '输入内容...'
}

function renderBlockContent(block: Block): string {
  if (block.content) {
    return block.content
  }
  return ''
}

function handleEditorClick(e: MouseEvent) {
  if (blocks.value.length === 0) {
    addFirstBlock()
  }
}

function addFirstBlock() {
  const newBlock = createBlock('text')
  blocks.value.push(newBlock)
  activeBlockId.value = newBlock.id
  
  nextTick(() => {
    const contentEl = document.querySelector(`.block-active .editable-content`)
    if (contentEl) {
      (contentEl as HTMLElement).focus()
    }
  })
}

function handleBlockClick(blockId: string, e: MouseEvent) {
  e.stopPropagation()
  activeBlockId.value = blockId
}

function handleBlockFocus(blockId: string) {
  activeBlockId.value = blockId
}

function handleBlockBlur(blockId: string) {
}

function handleContentInput(blockId: string, e: Event) {
  const target = e.target as HTMLElement
  const blockIndex = blocks.value.findIndex(b => b.id === blockId)
  
  if (blockIndex >= 0) {
    blocks.value[blockIndex].content = target.innerText
  }
}

function handleCodeInput(blockId: string) {
}

function handleKeyDown(blockId: string, e: KeyboardEvent) {
  const blockIndex = blocks.value.findIndex(b => b.id === blockId)
  if (blockIndex < 0) return
  
  const block = blocks.value[blockIndex]
  const target = e.target as HTMLElement
  
  if (e.key === '/') {
    const rect = target.getBoundingClientRect()
    slashMenuPosition.value = {
      x: rect.left,
      y: rect.bottom + 5,
    }
    slashMenuTargetBlockId.value = blockId
    slashMenuVisible.value = true
  }
  
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    
    const newBlock = createBlock('text')
    
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const afterCursor = range.extractContents()
      const afterText = afterCursor.textContent || ''
      
      if (afterText) {
        blocks.value[blockIndex].content = target.innerText
        newBlock.content = afterText
      }
    }
    
    blocks.value.splice(blockIndex + 1, 0, newBlock)
    activeBlockId.value = newBlock.id
    
    nextTick(() => {
      const newBlockEl = document.querySelectorAll('.editable-content')[blockIndex + 1]
      if (newBlockEl) {
        (newBlockEl as HTMLElement).focus()
      }
    })
  }
  
  if (e.key === 'Backspace') {
    const selection = window.getSelection()
    const isAtStart = selection && selection.anchorOffset === 0
    
    if (isAtStart && block.content === '' && blocks.value.length > 1) {
      e.preventDefault()
      deleteBlock(blockId)
      
      if (blockIndex > 0) {
        activeBlockId.value = blocks.value[blockIndex - 1].id
        nextTick(() => {
          const prevBlockEl = document.querySelectorAll('.editable-content')[blockIndex - 1]
          if (prevBlockEl) {
            const el = prevBlockEl as HTMLElement
            el.focus()
            const range = document.createRange()
            range.selectNodeContents(el)
            range.collapse(false)
            selection?.removeAllRanges()
            selection?.addRange(range)
          }
        })
      }
    }
  }
  
  if (e.key === 'ArrowUp' && blockIndex > 0) {
    const selection = window.getSelection()
    const isAtStart = selection && selection.anchorOffset === 0
    
    if (isAtStart) {
      e.preventDefault()
      activeBlockId.value = blocks.value[blockIndex - 1].id
      nextTick(() => {
        const prevBlockEl = document.querySelectorAll('.editable-content')[blockIndex - 1]
        if (prevBlockEl) {
          (prevBlockEl as HTMLElement).focus()
        }
      })
    }
  }
  
  if (e.key === 'ArrowDown' && blockIndex < blocks.value.length - 1) {
    const selection = window.getSelection()
    const isAtEnd = selection && selection.anchorOffset === target.innerText.length
    
    if (isAtEnd) {
      e.preventDefault()
      activeBlockId.value = blocks.value[blockIndex + 1].id
      nextTick(() => {
        const nextBlockEl = document.querySelectorAll('.editable-content')[blockIndex + 1]
        if (nextBlockEl) {
          (nextBlockEl as HTMLElement).focus()
        }
      })
    }
  }
}

function handleTodoCheck(blockId: string, checked: boolean) {
  const blockIndex = blocks.value.findIndex(b => b.id === blockId)
  if (blockIndex >= 0) {
    if (!blocks.value[blockIndex].meta) {
      blocks.value[blockIndex].meta = {}
    }
    blocks.value[blockIndex].meta!.checked = checked
  }
}

function updateBlockTable(blockId: string, data: InteractiveTableData) {
  const blockIndex = blocks.value.findIndex(b => b.id === blockId)
  if (blockIndex >= 0) {
    if (!blocks.value[blockIndex].meta) {
      blocks.value[blockIndex].meta = {}
    }
    blocks.value[blockIndex].meta!.tableData = data
  }
}

function deleteBlock(blockId: string) {
  const blockIndex = blocks.value.findIndex(b => b.id === blockId)
  if (blockIndex >= 0 && blocks.value.length > 1) {
    blocks.value.splice(blockIndex, 1)
    
    if (activeBlockId.value === blockId) {
      activeBlockId.value = blocks.value[Math.max(0, blockIndex - 1)]?.id || null
    }
  }
}

function showSlashMenu(blockId: string, e: MouseEvent) {
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  slashMenuPosition.value = {
    x: rect.left,
    y: rect.bottom + 5,
  }
  slashMenuTargetBlockId.value = blockId
  slashMenuVisible.value = true
}

function hideSlashMenu() {
  slashMenuVisible.value = false
  slashMenuTargetBlockId.value = null
}

function handleSlashMenuInsert(type: string, content: string, cursorOffset: number) {
  if (!slashMenuTargetBlockId.value) {
    addFirstBlock()
    return
  }
  
  const blockIndex = blocks.value.findIndex(b => b.id === slashMenuTargetBlockId.value)
  if (blockIndex < 0) return
  
  const blockType = type as BlockType
  
  if (type === 'divider') {
    const newBlock = createBlock('divider')
    blocks.value.splice(blockIndex + 1, 0, newBlock)
  } else if (type === 'table') {
    const newBlock = createBlock('table')
    blocks.value.splice(blockIndex + 1, 0, newBlock)
  } else if (type === 'code') {
    const newBlock = createBlock('code')
    blocks.value.splice(blockIndex + 1, 0, newBlock)
  } else {
    blocks.value[blockIndex].type = blockType
  }
  
  hideSlashMenu()
}

function handleTableSelect(rows: number, cols: number) {
  const tableId = 'table_' + Date.now()
  
  const columns = []
  for (let i = 0; i < cols; i++) {
    columns.push({
      id: 'col_' + (i + 1),
      width: 150,
      fieldType: 'text',
      title: `字段${i + 1}`,
    })
  }
  
  const tableRows = []
  for (let i = 0; i < rows; i++) {
    tableRows.push({
      id: 'row_' + (i + 1),
      height: 40,
    })
  }
  
  const cells = []
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      cells.push({
        rowId: 'row_' + (i + 1),
        colId: 'col_' + (j + 1),
        value: '',
      })
    }
  }
  
  const tableData: InteractiveTableData = {
    id: tableId,
    columns,
    rows: tableRows,
    cells,
    mergeCells: [],
  }
  
  if (!slashMenuTargetBlockId.value) {
    const newBlock = createBlock('table')
    newBlock.meta = { tableData }
    blocks.value.push(newBlock)
  } else {
    const blockIndex = blocks.value.findIndex(b => b.id === slashMenuTargetBlockId.value)
    if (blockIndex >= 0) {
      const newBlock = createBlock('table')
      newBlock.meta = { tableData }
      blocks.value.splice(blockIndex + 1, 0, newBlock)
    }
  }
  
  hideSlashMenu()
}

function handleSlashMenuUpload(type: 'image' | 'attachment') {
  uploadType.value = type
  uploadDialogVisible.value = true
  hideSlashMenu()
}

function handleFileUpload(file: any) {
  if (!file || !file.raw) return
  
  const rawFile = file.raw as File
  
  if (uploadType.value === 'image') {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      
      if (!slashMenuTargetBlockId.value) {
        addFirstBlock()
        return
      }
      
      const blockIndex = blocks.value.findIndex(b => b.id === slashMenuTargetBlockId.value)
      if (blockIndex >= 0) {
        blocks.value[blockIndex].content += `\n![${rawFile.name}](${base64})`
      }
      
      uploadDialogVisible.value = false
      ElMessage.success('图片已添加')
    }
    reader.readAsDataURL(rawFile)
  }
}

function getActiveBlockIndex(): number {
  if (!activeBlockId.value) {
    if (blocks.value.length > 0) {
      activeBlockId.value = blocks.value[blocks.value.length - 1].id
      return blocks.value.length - 1
    }
    return -1
  }
  return blocks.value.findIndex(b => b.id === activeBlockId.value)
}

function setCurrentBlockType(type: BlockType) {
  const index = getActiveBlockIndex()
  if (index < 0) {
    addFirstBlock()
    return
  }
  
  if (type === 'divider' || type === 'table' || type === 'code') {
    const newBlock = createBlock(type)
    blocks.value.splice(index + 1, 0, newBlock)
    activeBlockId.value = newBlock.id
  } else {
    blocks.value[index].type = type
  }
}

function addBlockAfterActive(type: BlockType) {
  const index = getActiveBlockIndex()
  const newBlock = createBlock(type)
  
  if (index < 0) {
    blocks.value.push(newBlock)
  } else {
    blocks.value.splice(index + 1, 0, newBlock)
  }
  
  activeBlockId.value = newBlock.id
  
  nextTick(() => {
    const elements = document.querySelectorAll('.editable-content')
    const targetIndex = index < 0 ? 0 : index + 1
    if (elements[targetIndex]) {
      (elements[targetIndex] as HTMLElement).focus()
    }
  })
}

function insertTableWithSize(rows: number, cols: number) {
  const index = getActiveBlockIndex()
  
  const tableId = 'table_' + Date.now()
  
  const columns = []
  for (let i = 0; i < cols; i++) {
    columns.push({
      id: 'col_' + (i + 1),
      width: 150,
      fieldType: 'text',
      title: `字段${i + 1}`,
    })
  }
  
  const tableRows = []
  for (let i = 0; i < rows; i++) {
    tableRows.push({
      id: 'row_' + (i + 1),
      height: 40,
    })
  }
  
  const cells = []
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      cells.push({
        rowId: 'row_' + (i + 1),
        colId: 'col_' + (j + 1),
        value: '',
      })
    }
  }
  
  const tableData: InteractiveTableData = {
    id: tableId,
    columns,
    rows: tableRows,
    cells,
    mergeCells: [],
  }
  
  const newBlock = createBlock('table')
  newBlock.meta = { tableData }
  
  if (index < 0) {
    blocks.value.push(newBlock)
  } else {
    blocks.value.splice(index + 1, 0, newBlock)
  }
  
  activeBlockId.value = newBlock.id
}

function applyInlineStyle(command: string) {
  try {
    document.execCommand(command, false)
  } catch (e) {
    console.warn('execCommand not supported:', command)
  }
}

defineExpose({
  setCurrentBlockType,
  addBlockAfterActive,
  insertTableWithSize,
  applyInlineStyle,
  getActiveBlockIndex,
})
</script>

<style lang="scss" scoped>
.block-editor {
  min-height: 400px;
  padding: 16px;
}

.block-wrapper {
  display: flex;
  align-items: flex-start;
  margin-bottom: 4px;
  position: relative;
  transition: background 0.15s;
  
  &:hover {
    background: #f5f7fa;
    border-radius: 4px;
  }
  
  &.block-active {
    background: #ecf5ff;
    border-radius: 4px;
  }
}

.block-handle {
  width: 24px;
  padding: 4px 2px;
  opacity: 0;
  transition: opacity 0.15s;
  cursor: move;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .el-icon {
    font-size: 16px;
    color: #c0c4cc;
  }
}

.block-wrapper:hover .block-handle,
.block-active .block-handle {
  opacity: 1;
}

.block-content {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  position: relative;
}

.block-divider {
  border: none;
  border-top: 1px solid #e4e7ed;
  margin: 16px 0;
}

.code-block-wrapper {
  background: #1e1e1e;
  border-radius: 6px;
  overflow: hidden;
}

.code-header {
  padding: 8px 16px;
  background: #252526;
  border-bottom: 1px solid #333;
}

.code-lang {
  font-size: 12px;
  color: #858585;
  text-transform: uppercase;
}

.code-editor {
  width: 100%;
  min-height: 80px;
  padding: 16px;
  background: transparent;
  border: none;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
}

.editable-content {
  min-height: 24px;
  line-height: 1.7;
  outline: none;
  word-break: break-word;
  position: relative;
  
  &:empty::before {
    content: attr(data-placeholder);
    color: #c0c4cc;
    pointer-events: none;
    position: absolute;
  }
}

.editable-content.block-h1 {
  font-size: 32px;
  font-weight: bold;
  line-height: 1.3;
  margin: 16px 0 8px;
}

.editable-content.block-h2 {
  font-size: 24px;
  font-weight: bold;
  line-height: 1.4;
  margin: 14px 0 6px;
}

.editable-content.block-h3 {
  font-size: 20px;
  font-weight: bold;
  line-height: 1.5;
  margin: 12px 0 4px;
}

.editable-content.block-h4 {
  font-size: 18px;
  font-weight: bold;
  line-height: 1.5;
}

.editable-content.block-h5 {
  font-size: 16px;
  font-weight: bold;
  line-height: 1.6;
}

.editable-content.block-h6 {
  font-size: 14px;
  font-weight: bold;
  line-height: 1.7;
  color: #606266;
}

.editable-content.block-bullet {
  padding-left: 24px;
  position: relative;
  
  &::before {
    content: '•';
    position: absolute;
    left: 8px;
    color: #909399;
  }
}

.editable-content.block-numbered {
  padding-left: 24px;
  position: relative;
  
  &::before {
    content: '1.';
    position: absolute;
    left: 4px;
    color: #909399;
  }
}

.editable-content.block-todo {
  padding-left: 32px;
  position: relative;
}

.editable-content.block-quote {
  padding-left: 16px;
  border-left: 3px solid #dcdfe6;
  color: #606266;
  font-style: italic;
}

.todo-checkbox {
  position: absolute;
  left: 8px;
  top: 8px;
}

.block-actions {
  position: absolute;
  right: 8px;
  top: 4px;
  display: flex;
  gap: 4px;
}

.empty-block {
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: text;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  transition: all 0.15s;
  
  &:hover {
    border-color: #409eff;
    background: #ecf5ff;
  }
  
  .empty-hint {
    color: #c0c4cc;
    font-size: 14px;
  }
}

.upload-content {
  padding: 16px 0;
}
</style>
