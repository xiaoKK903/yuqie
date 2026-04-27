<template>
  <div class="interactive-table-wrapper" ref="wrapperRef">
    <div class="table-toolbar">
      <div class="toolbar-left">
        <el-button text class="toolbar-btn" @click="handleAddRow">
          <el-icon><Plus /></el-icon>
          <span>添加行</span>
        </el-button>
        <el-button text class="toolbar-btn" @click="handleAddColumn">
          <el-icon><Plus /></el-icon>
          <span>添加列</span>
        </el-button>
      </div>
      
      <div class="toolbar-right">
        <el-button text class="toolbar-btn" @click="handleDeleteTable">
          <el-icon><Delete /></el-icon>
          <span>删除表格</span>
        </el-button>
      </div>
    </div>
    
    <div class="table-container">
      <div class="table-scroll-horizontal" ref="scrollContainerRef">
        <table class="interactive-table" :style="{ width: tableWidth + 'px' }">
          <thead>
            <tr>
              <th class="table-header-cell checkbox-header" style="width: 50px;">
                <el-checkbox v-model="selectAll" @change="handleSelectAll" />
              </th>
              <th
                v-for="(col, colIndex) in tableData.columns"
                :key="col.id"
                class="table-header-cell"
                :style="{ width: col.width + 'px' }"
              >
                <div class="header-content">
                  <span class="header-title" @dblclick="startEditHeader(colIndex)">
                    <template v-if="editingColIndex === colIndex">
                      <el-input
                        v-model="editingTitle"
                        size="small"
                        @blur="saveHeaderEdit(colIndex)"
                        @keyup.enter="saveHeaderEdit(colIndex)"
                      />
                    </template>
                    <template v-else>{{ col.title }}</template>
                  </span>
                  <span class="field-type-badge">{{ getFieldTypeLabel(col.fieldType) }}</span>
                </div>
                <div 
                  class="column-resize-handle"
                  @mousedown="startResizeColumn(colIndex, $event)"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in tableData.rows"
              :key="row.id"
              class="table-row"
              :class="{ 'row-selected': selectedRowIndices.includes(rowIndex) }"
              @click="handleRowClick(rowIndex, $event)"
            >
              <td class="table-cell checkbox-cell" style="width: 50px;">
                <span class="row-number">{{ rowIndex + 1 }}</span>
              </td>
              <td
                v-for="(col, colIndex) in tableData.columns"
                :key="col.id"
                class="table-cell"
                :class="{ 'cell-editing': editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex }"
                :style="{ width: col.width + 'px' }"
                @click="handleCellClick(rowIndex, colIndex, $event)"
                @dblclick="handleCellDblClick(rowIndex, colIndex)"
              >
                <template v-if="editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex">
                  <template v-if="col.fieldType === 'text'">
                    <el-input
                      v-model="editingValue"
                      size="small"
                      @blur="saveCellEdit"
                      @keyup.enter="saveCellEdit"
                    />
                  </template>
                  <template v-else-if="col.fieldType === 'select'">
                    <el-select
                      v-model="editingValue"
                      size="small"
                      @change="saveCellEdit"
                      clearable
                    >
                      <el-option
                        v-for="opt in (col.selectOptions || ['选项1', '选项2', '选项3'])"
                        :key="opt"
                        :label="opt"
                        :value="opt"
                      />
                    </el-select>
                  </template>
                  <template v-else-if="col.fieldType === 'date'">
                    <el-date-picker
                      v-model="editingValue"
                      type="date"
                      size="small"
                      @change="saveCellEdit"
                      value-format="YYYY-MM-DD"
                    />
                  </template>
                  <template v-else-if="col.fieldType === 'checkbox'">
                    <el-checkbox
                      v-model="checkboxValue"
                      @change="handleCheckboxChange(rowIndex, colIndex)"
                    />
                  </template>
                </template>
                <template v-else>
                  <template v-if="col.fieldType === 'checkbox'">
                    <el-checkbox :model-value="getCellValue(rowIndex, colIndex) === 'true'" disabled />
                  </template>
                  <template v-else>
                    {{ getCellValue(rowIndex, colIndex) || '' }}
                  </template>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="sheet-tabs-bar">
      <div class="sheet-tabs-scroll">
        <div
          v-for="sheet in sheets"
          :key="sheet.id"
          class="sheet-tab"
          :class="{ 'is-active': sheet.id === activeSheetId }"
          @click="switchSheet(sheet.id)"
          @dblclick="startRenameSheet(sheet.id)"
        >
          <template v-if="editingSheetId === sheet.id">
            <el-input
              v-model="renamingSheetName"
              size="small"
              @blur="saveRenameSheet"
              @keyup.enter="saveRenameSheet"
              @keyup.esc="cancelRenameSheet"
              class="sheet-name-input"
              @click.stop
            />
          </template>
          <template v-else>
            <span class="sheet-name">{{ sheet.name }}</span>
          </template>
          <el-icon
            v-if="sheets.length > 1 && editingSheetId !== sheet.id"
            class="sheet-close"
            @click.stop="deleteSheet(sheet.id)"
          >
            <Close />
          </el-icon>
        </div>
      </div>
      <div class="sheet-tab-add" @click="addSheet">
        <el-icon><Plus /></el-icon>
      </div>
    </div>
    
    <div class="table-footer">
      <span>{{ selectedRowIndices.length > 0 ? selectedRowIndices.length : tableData.rows.length }} 条记录</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Delete,
  Close,
} from '@element-plus/icons-vue'
import type { InteractiveTableData, TableFieldType, TableSheet } from '@/types'

const props = defineProps<{
  modelValue: InteractiveTableData
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: InteractiveTableData): void
  (e: 'delete'): void
}>()

const wrapperRef = ref<HTMLElement | null>(null)
const scrollContainerRef = ref<HTMLElement | null>(null)

const tableData = ref<InteractiveTableData>(JSON.parse(JSON.stringify(props.modelValue)))

const selectAll = ref(false)
const selectedRowIndices = ref<number[]>([])

const editingCell = ref<{ rowIndex: number; colIndex: number } | null>(null)
const editingValue = ref('')
const checkboxValue = ref(false)

const editingColIndex = ref<number | null>(null)
const editingTitle = ref('')

const resizingColumn = ref<{ colIndex: number; startX: number; startWidth: number } | null>(null)

const editingSheetId = ref<string | null>(null)
const renamingSheetName = ref('')

const isEmitting = ref(false)

const sheets = computed(() => tableData.value.sheets || [])
const activeSheetId = computed(() => tableData.value.activeSheetId || '')

const tableWidth = computed(() => {
  return tableData.value.columns.reduce((sum, col) => sum + col.width, 0) + 50
})

function ensureSheets() {
  if (!tableData.value.sheets || tableData.value.sheets.length === 0) {
    const defaultSheet: TableSheet = {
      id: 'sheet_' + Date.now(),
      name: 'Sheet1',
      columns: JSON.parse(JSON.stringify(tableData.value.columns)),
      rows: JSON.parse(JSON.stringify(tableData.value.rows)),
      cells: JSON.parse(JSON.stringify(tableData.value.cells)),
      mergeCells: JSON.parse(JSON.stringify(tableData.value.mergeCells || [])),
    }
    tableData.value.sheets = [defaultSheet]
    tableData.value.activeSheetId = defaultSheet.id
  }
}

function saveCurrentSheetToSheets() {
  if (!tableData.value.sheets || !tableData.value.activeSheetId) return
  
  const sheetIndex = tableData.value.sheets.findIndex(s => s.id === tableData.value.activeSheetId)
  if (sheetIndex >= 0) {
    tableData.value.sheets[sheetIndex].columns = JSON.parse(JSON.stringify(tableData.value.columns))
    tableData.value.sheets[sheetIndex].rows = JSON.parse(JSON.stringify(tableData.value.rows))
    tableData.value.sheets[sheetIndex].cells = JSON.parse(JSON.stringify(tableData.value.cells))
    tableData.value.sheets[sheetIndex].mergeCells = JSON.parse(JSON.stringify(tableData.value.mergeCells || []))
  }
}

function loadSheetFromSheets(sheetId: string) {
  if (!tableData.value.sheets) return
  
  const sheet = tableData.value.sheets.find(s => s.id === sheetId)
  if (sheet) {
    tableData.value.columns = JSON.parse(JSON.stringify(sheet.columns))
    tableData.value.rows = JSON.parse(JSON.stringify(sheet.rows))
    tableData.value.cells = JSON.parse(JSON.stringify(sheet.cells))
    tableData.value.mergeCells = JSON.parse(JSON.stringify(sheet.mergeCells || []))
    tableData.value.activeSheetId = sheetId
  }
}

function switchSheet(sheetId: string) {
  if (sheetId === tableData.value.activeSheetId) return
  if (editingSheetId.value) return
  
  saveCurrentSheetToSheets()
  loadSheetFromSheets(sheetId)
  
  selectAll.value = false
  selectedRowIndices.value = []
  editingCell.value = null
  editingValue.value = ''
  
  emitData()
}

function addSheet() {
  ensureSheets()
  
  const sheetIndex = tableData.value.sheets!.length
  const newSheet: TableSheet = {
    id: 'sheet_' + Date.now(),
    name: `Sheet${sheetIndex + 1}`,
    columns: [
      { id: 'col_1', width: 150, fieldType: 'text', title: '字段1' },
      { id: 'col_2', width: 150, fieldType: 'text', title: '字段2' },
      { id: 'col_3', width: 150, fieldType: 'text', title: '字段3' },
    ],
    rows: [
      { id: 'row_1', height: 40 },
      { id: 'row_2', height: 40 },
      { id: 'row_3', height: 40 },
    ],
    cells: [
      { rowId: 'row_1', colId: 'col_1', value: '' },
      { rowId: 'row_1', colId: 'col_2', value: '' },
      { rowId: 'row_1', colId: 'col_3', value: '' },
      { rowId: 'row_2', colId: 'col_1', value: '' },
      { rowId: 'row_2', colId: 'col_2', value: '' },
      { rowId: 'row_2', colId: 'col_3', value: '' },
      { rowId: 'row_3', colId: 'col_1', value: '' },
      { rowId: 'row_3', colId: 'col_2', value: '' },
      { rowId: 'row_3', colId: 'col_3', value: '' },
    ],
    mergeCells: [],
  }
  
  saveCurrentSheetToSheets()
  tableData.value.sheets!.push(newSheet)
  loadSheetFromSheets(newSheet.id)
  
  selectAll.value = false
  selectedRowIndices.value = []
  editingCell.value = null
  
  emitData()
  ElMessage.success('已添加新工作表')
}

function startRenameSheet(sheetId: string) {
  if (tableData.value.sheets) {
    const sheet = tableData.value.sheets.find(s => s.id === sheetId)
    if (sheet) {
      editingSheetId.value = sheetId
      renamingSheetName.value = sheet.name
    }
  }
}

function saveRenameSheet() {
  if (!editingSheetId.value || !tableData.value.sheets) return
  
  const newName = renamingSheetName.value.trim()
  if (newName) {
    const sheetIndex = tableData.value.sheets.findIndex(s => s.id === editingSheetId.value)
    if (sheetIndex >= 0) {
      tableData.value.sheets[sheetIndex].name = newName
      emitData()
    }
  }
  
  editingSheetId.value = null
  renamingSheetName.value = ''
}

function cancelRenameSheet() {
  editingSheetId.value = null
  renamingSheetName.value = ''
}

function deleteSheet(sheetId: string) {
  if (!tableData.value.sheets || tableData.value.sheets.length <= 1) return
  
  ElMessageBox.confirm('确定要删除此工作表吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    const sheetIndex = tableData.value.sheets!.findIndex(s => s.id === sheetId)
    if (sheetIndex >= 0) {
      tableData.value.sheets!.splice(sheetIndex, 1)
      
      if (tableData.value.activeSheetId === sheetId) {
        const firstSheet = tableData.value.sheets![0]
        loadSheetFromSheets(firstSheet.id)
        
        selectAll.value = false
        selectedRowIndices.value = []
        editingCell.value = null
      }
      
      emitData()
      ElMessage.success('已删除工作表')
    }
  }).catch(() => {})
}

watch(() => props.modelValue, (newVal) => {
  if (isEmitting.value) return
  
  tableData.value = JSON.parse(JSON.stringify(newVal))
  ensureSheets()
}, { deep: true })

function emitData() {
  isEmitting.value = true
  saveCurrentSheetToSheets()
  emit('update:modelValue', JSON.parse(JSON.stringify(tableData.value)))
  nextTick(() => {
    isEmitting.value = false
  })
}

function getCellValue(rowIndex: number, colIndex: number): string {
  const rowId = tableData.value.rows[rowIndex]?.id
  const colId = tableData.value.columns[colIndex]?.id
  
  if (!rowId || !colId) return ''
  
  const cell = tableData.value.cells.find(c => c.rowId === rowId && c.colId === colId)
  return cell?.value || ''
}

function setCellValue(rowIndex: number, colIndex: number, value: string) {
  const rowId = tableData.value.rows[rowIndex]?.id
  const colId = tableData.value.columns[colIndex]?.id
  
  if (!rowId || !colId) return
  
  const cellIndex = tableData.value.cells.findIndex(c => c.rowId === rowId && c.colId === colId)
  
  if (cellIndex >= 0) {
    tableData.value.cells[cellIndex].value = value
  } else {
    tableData.value.cells.push({ rowId, colId, value })
  }
  
  emitData()
}

function getFieldTypeLabel(type: TableFieldType): string {
  const labels: Record<TableFieldType, string> = {
    text: '文本',
    select: '单选',
    date: '日期',
    checkbox: '复选框',
  }
  return labels[type] || type
}

function handleAddRow() {
  const newRowId = 'row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  
  tableData.value.rows.push({
    id: newRowId,
    height: 40,
  })
  
  tableData.value.columns.forEach(col => {
    tableData.value.cells.push({
      rowId: newRowId,
      colId: col.id,
      value: '',
    })
  })
  
  emitData()
  ElMessage.success('已添加新行')
}

function handleAddColumn() {
  const newColId = 'col_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  
  tableData.value.columns.push({
    id: newColId,
    width: 150,
    fieldType: 'text',
    title: '字段' + (tableData.value.columns.length + 1),
  })
  
  tableData.value.rows.forEach(row => {
    tableData.value.cells.push({
      rowId: row.id,
      colId: newColId,
      value: '',
    })
  })
  
  emitData()
  ElMessage.success('已添加新列')
}

function handleDeleteTable() {
  ElMessageBox.confirm('确定要删除此表格吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    emit('delete')
  }).catch(() => {})
}

function handleSelectAll(checked: boolean) {
  if (checked) {
    selectedRowIndices.value = tableData.value.rows.map((_, i) => i)
  } else {
    selectedRowIndices.value = []
  }
}

function handleRowClick(rowIndex: number, e: MouseEvent) {
  if (e.shiftKey && selectedRowIndices.value.length > 0) {
    const lastSelected = selectedRowIndices.value[selectedRowIndices.value.length - 1]
    const min = Math.min(lastSelected, rowIndex)
    const max = Math.max(lastSelected, rowIndex)
    
    selectedRowIndices.value = []
    for (let i = min; i <= max; i++) {
      selectedRowIndices.value.push(i)
    }
  } else if (e.ctrlKey || e.metaKey) {
    const index = selectedRowIndices.value.indexOf(rowIndex)
    if (index >= 0) {
      selectedRowIndices.value.splice(index, 1)
    } else {
      selectedRowIndices.value.push(rowIndex)
    }
  } else {
    selectedRowIndices.value = [rowIndex]
  }
  
  selectAll.value = selectedRowIndices.value.length === tableData.value.rows.length
}

function handleCellClick(rowIndex: number, colIndex: number, e: MouseEvent) {
  if (editingCell.value && 
      (editingCell.value.rowIndex !== rowIndex || editingCell.value.colIndex !== colIndex)) {
    saveCellEdit()
  }
}

function handleCellDblClick(rowIndex: number, colIndex: number) {
  const col = tableData.value.columns[colIndex]
  
  editingCell.value = { rowIndex, colIndex }
  editingValue.value = getCellValue(rowIndex, colIndex)
  
  if (col.fieldType === 'checkbox') {
    checkboxValue.value = editingValue.value === 'true'
  }
}

function saveCellEdit() {
  if (!editingCell.value) return
  
  const col = tableData.value.columns[editingCell.value.colIndex]
  
  if (col.fieldType !== 'checkbox') {
    setCellValue(editingCell.value.rowIndex, editingCell.value.colIndex, editingValue.value)
  }
  
  editingCell.value = null
  editingValue.value = ''
}

function handleCheckboxChange(rowIndex: number, colIndex: number) {
  setCellValue(rowIndex, colIndex, checkboxValue.value ? 'true' : 'false')
}

function startEditHeader(colIndex: number) {
  editingColIndex.value = colIndex
  editingTitle.value = tableData.value.columns[colIndex].title
}

function saveHeaderEdit(colIndex: number) {
  if (editingTitle.value.trim()) {
    tableData.value.columns[colIndex].title = editingTitle.value.trim()
    emitData()
  }
  editingColIndex.value = null
  editingTitle.value = ''
}

function startResizeColumn(colIndex: number, e: MouseEvent) {
  e.preventDefault()
  
  resizingColumn.value = {
    colIndex,
    startX: e.clientX,
    startWidth: tableData.value.columns[colIndex].width,
  }
  
  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)
}

function handleResizeMove(e: MouseEvent) {
  if (!resizingColumn.value) return
  
  const deltaX = e.clientX - resizingColumn.value.startX
  const newWidth = Math.max(80, resizingColumn.value.startWidth + deltaX)
  
  tableData.value.columns[resizingColumn.value.colIndex].width = newWidth
}

function handleResizeEnd() {
  if (resizingColumn.value) {
    emitData()
    resizingColumn.value = null
  }
  
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
}

onMounted(() => {
  ensureSheets()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
})
</script>

<style lang="scss" scoped>
.interactive-table-wrapper {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  margin: 16px 0;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e4e7ed;
  background: #fafafa;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-btn {
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #606266;
  border-radius: 4px;
  
  &:hover {
    background: #ecf5ff;
    color: #409eff;
  }
  
  .el-icon {
    font-size: 14px;
  }
}

.table-container {
  overflow: hidden;
}

.table-scroll-horizontal {
  overflow-x: auto;
  overflow-y: hidden;
}

.interactive-table {
  border-collapse: collapse;
  table-layout: fixed;
}

.table-header-cell {
  background: #f5f7fa;
  height: 44px;
  font-weight: 500;
  color: #606266;
  border-bottom: 2px solid #e4e7ed;
  border-right: 1px solid #e4e7ed;
  position: relative;
  vertical-align: middle;
  
  &:last-child {
    border-right: none;
  }
  
  &.checkbox-header {
    width: 50px;
    text-align: center;
    padding: 0;
  }
}

.header-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  height: 100%;
  
  .header-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    
    :deep(.el-input__wrapper) {
      padding: 2px 8px;
      box-shadow: none;
      background: #fff;
    }
  }
  
  .field-type-badge {
    font-size: 12px;
    color: #909399;
    background: #f4f4f5;
    padding: 2px 8px;
    border-radius: 4px;
    flex-shrink: 0;
  }
}

.column-resize-handle {
  position: absolute;
  right: -3px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 10;
  
  &:hover {
    background: #409eff;
  }
}

.table-row {
  height: 40px;
  transition: background 0.2s;
  
  &:hover {
    background: #f5f7fa;
  }
  
  &.row-selected {
    background: #ecf5ff;
  }
}

.table-cell {
  height: 40px;
  padding: 8px 12px;
  font-size: 14px;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  border-right: 1px solid #e4e7ed;
  vertical-align: middle;
  position: relative;
  cursor: pointer;
  
  &:last-child {
    border-right: none;
  }
  
  &.checkbox-cell {
    width: 50px;
    text-align: center;
    padding: 0;
    
    .row-number {
      font-size: 13px;
      color: #909399;
    }
  }
  
  &.cell-editing {
    padding: 4px;
    
    :deep(.el-input__wrapper) {
      padding: 0 8px;
    }
  }
}

.sheet-tabs-bar {
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 8px;
  height: 36px;
}

.sheet-tabs-scroll {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 1;
  overflow-x: auto;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c0c4cc;
    border-radius: 2px;
  }
}

.sheet-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
  height: 35px;
  position: relative;
  
  &:hover {
    color: #409eff;
    background: #f5f7fa;
    
    .sheet-close {
      opacity: 1;
    }
  }
  
  &.is-active {
    color: #409eff;
    font-weight: 500;
    background: #fafafa;
    border-bottom: 2px solid #409eff;
  }
}

.sheet-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet-name-input {
  width: 100px;
  
  :deep(.el-input__wrapper) {
    padding: 0 8px;
    box-shadow: none;
  }
}

.sheet-close {
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 12px;
  padding: 2px;
  border-radius: 2px;
  
  &:hover {
    background: #f5f7fa;
    color: #f56c6c;
  }
}

.sheet-tab-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  color: #909399;
  transition: all 0.2s;
  
  &:hover {
    background: #ecf5ff;
    color: #409eff;
  }
  
  .el-icon {
    font-size: 14px;
  }
}

.table-footer {
  padding: 8px 16px;
  background: #fafafa;
  font-size: 13px;
  color: #909399;
  text-align: center;
}
</style>
