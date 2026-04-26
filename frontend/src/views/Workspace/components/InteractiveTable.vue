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
    
    <div class="table-footer">
      <span>{{ selectedRowIndices.length > 0 ? selectedRowIndices.length : tableData.rows.length }} 条记录</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Delete,
} from '@element-plus/icons-vue'
import type { InteractiveTableData, TableFieldType } from '@/types'

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

const tableWidth = computed(() => {
  return tableData.value.columns.reduce((sum, col) => sum + col.width, 0) + 50
})

watch(() => props.modelValue, (newVal) => {
  tableData.value = JSON.parse(JSON.stringify(newVal))
}, { deep: true })

function emitData() {
  emit('update:modelValue', JSON.parse(JSON.stringify(tableData.value)))
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

.table-footer {
  padding: 8px 16px;
  border-top: 1px solid #e4e7ed;
  background: #fafafa;
  font-size: 13px;
  color: #909399;
  text-align: center;
}
</style>
