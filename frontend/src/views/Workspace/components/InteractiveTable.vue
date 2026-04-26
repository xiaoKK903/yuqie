<template>
  <div class="interactive-table-wrapper">
    <InteractiveTableToolbar
      @addColumn="handleAddColumn"
      @addRow="handleAddRow"
    />
    
    <div class="table-container" ref="tableContainerRef">
      <div class="table-scroll-horizontal" ref="scrollHorizontalRef">
        <div class="table-body-wrapper">
          <table class="interactive-table" :style="{ width: totalWidth + 'px' }">
            <thead>
              <tr>
                <th class="table-header-cell checkbox-header" style="width: 50px;">
                  <el-checkbox v-model="selectAllRows" @change="handleSelectAll" />
                </th>
                <th
                  v-for="(col, colIndex) in tableData.columns"
                  :key="col.id"
                  class="table-header-cell"
                  :style="{ width: col.width + 'px' }"
                >
                  <div class="header-content">
                    <span class="field-type-icon" @click.stop="toggleFieldTypeMenu(col.id)">
                      <el-icon v-if="col.fieldType === 'text'"><Edit /></el-icon>
                      <el-icon v-else-if="col.fieldType === 'select'"><CircleCheck /></el-icon>
                      <el-icon v-else-if="col.fieldType === 'date'"><Calendar /></el-icon>
                      <el-icon v-else-if="col.fieldType === 'checkbox'"><CheckBox /></el-icon>
                    </span>
                    <span 
                      class="header-title"
                      @click.stop="startEditHeader(col.id)"
                    >
                      <template v-if="editingColumnId === col.id">
                        <el-input
                          v-model="editingColumnTitle"
                          size="small"
                          @blur="saveHeaderEdit(col.id)"
                          @keyup.enter="saveHeaderEdit(col.id)"
                        />
                      </template>
                      <template v-else>{{ col.title }}</template>
                    </span>
                    <span class="header-menu" @click.stop="showColumnMenu(col.id, $event)">
                      <el-icon><MoreFilled /></el-icon>
                    </span>
                  </div>
                  <div 
                    class="column-resize-handle"
                    @mousedown="startResizeColumn(col.id, $event)"
                  />
                </th>
                <th class="table-header-cell add-column-header" @click="handleAddColumn">
                  <el-icon><Plus /></el-icon>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, rowIndex) in tableData.rows"
                :key="row.id"
                class="table-row"
                :class="{ 
                  'row-selected': selectedRowIds.includes(row.id),
                  'row-hovered': hoveredRowId === row.id
                }"
                @mouseenter="hoveredRowId = row.id"
                @mouseleave="hoveredRowId = null"
              >
                <td 
                  class="table-cell checkbox-cell" 
                  style="width: 50px;"
                  @click.stop="toggleRowSelection(row.id)"
                >
                  <span class="row-index">{{ rowIndex + 1 }}</span>
                </td>
                <td
                  v-for="col in tableData.columns"
                  :key="col.id"
                  class="table-cell"
                  :class="{
                    'cell-selected': isCellSelected(row.id, col.id),
                    'cell-editing': editingCell?.rowId === row.id && editingCell?.colId === col.id
                  }"
                  :style="{ width: col.width + 'px' }"
                  @click="handleCellClick(row.id, col.id, $event)"
                  @dblclick="handleCellDblClick(row.id, col.id)"
                >
                  <template v-if="editingCell?.rowId === row.id && editingCell?.colId === col.id">
                    <el-input
                      v-if="col.fieldType === 'text'"
                      v-model="editingCellValue"
                      size="small"
                      @blur="saveCellEdit"
                      @keyup.enter="saveCellEdit"
                    />
                    <el-select
                      v-else-if="col.fieldType === 'select'"
                      v-model="editingCellValue"
                      size="small"
                      @change="saveCellEdit"
                      :clearable="true"
                    >
                      <el-option
                        v-for="opt in (col.selectOptions || ['选项1', '选项2'])"
                        :key="opt"
                        :label="opt"
                        :value="opt"
                      />
                    </el-select>
                    <el-date-picker
                      v-else-if="col.fieldType === 'date'"
                      v-model="editingCellValue"
                      type="date"
                      size="small"
                      @change="saveCellEdit"
                      value-format="YYYY-MM-DD"
                      placeholder="选择日期"
                    />
                    <el-checkbox
                      v-else-if="col.fieldType === 'checkbox'"
                      v-model="editingCellValue"
                      @change="saveCellEdit"
                    />
                  </template>
                  <template v-else>
                    <template v-if="col.fieldType === 'checkbox'">
                      <el-checkbox :model-value="getCellValue(row.id, col.id) === 'true'" disabled />
                    </template>
                    <template v-else>
                      {{ getCellValue(row.id, col.id) || '' }}
                    </template>
                  </template>
                </td>
                <td class="table-cell add-column-cell"></td>
              </tr>
              <tr class="add-row-row">
                <td 
                  class="table-cell add-row-cell" 
                  style="width: 50px;"
                  @click="handleAddRow"
                >
                  <el-icon><Plus /></el-icon>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <div class="table-footer">
      <div class="footer-left">
        <span class="selection-count">{{ getSelectionCount() }} 条记录</span>
      </div>
      <div class="footer-center">
        <el-scrollbar class="horizontal-scrollbar">
          <div class="scroll-track" ref="scrollTrackRef">
            <div 
              class="scroll-thumb" 
              :style="{ width: scrollThumbWidth + 'px', left: scrollThumbLeft + 'px' }"
              ref="scrollThumbRef"
              @mousedown="startScrollThumbDrag"
            />
          </div>
        </el-scrollbar>
      </div>
      <div class="footer-right">
        <el-icon><ArrowLeft /></el-icon>
        <el-icon><ArrowRight /></el-icon>
      </div>
    </div>
    
    <el-dropdown
      v-model="fieldTypeMenuVisible"
      :placement="'bottom-start'"
      trigger="manual"
    >
      <span style="display: none;" />
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item 
            @click="setFieldType('text')"
            :class="{ 'is-active': selectedColumnForFieldType && getColumnById(selectedColumnForFieldType)?.fieldType === 'text' }"
          >
            <el-icon><Edit /></el-icon>
            <span>文本</span>
          </el-dropdown-item>
          <el-dropdown-item 
            @click="setFieldType('select')"
            :class="{ 'is-active': selectedColumnForFieldType && getColumnById(selectedColumnForFieldType)?.fieldType === 'select' }"
          >
            <el-icon><CircleCheck /></el-icon>
            <span>单选</span>
          </el-dropdown-item>
          <el-dropdown-item 
            @click="setFieldType('date')"
            :class="{ 'is-active': selectedColumnForFieldType && getColumnById(selectedColumnForFieldType)?.fieldType === 'date' }"
          >
            <el-icon><Calendar /></el-icon>
            <span>日期</span>
          </el-dropdown-item>
          <el-dropdown-item 
            @click="setFieldType('checkbox')"
            :class="{ 'is-active': selectedColumnForFieldType && getColumnById(selectedColumnForFieldType)?.fieldType === 'checkbox' }"
          >
            <el-icon><CheckBox /></el-icon>
            <span>复选框</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    
    <el-dropdown
      v-model="columnMenuVisible"
      :placement="'bottom-start'"
      trigger="manual"
    >
      <span style="display: none;" />
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item @click="handleInsertColumn('left')">
            <el-icon><Top /></el-icon>
            <span>在左侧插入列</span>
          </el-dropdown-item>
          <el-dropdown-item @click="handleInsertColumn('right')">
            <el-icon><Bottom /></el-icon>
            <span>在右侧插入列</span>
          </el-dropdown-item>
          <el-dropdown-item divided @click="handleDeleteColumn">
            <el-icon><Delete /></el-icon>
            <span>删除列</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Plus,
  Edit,
  CircleCheck,
  Calendar,
  CheckBox,
  MoreFilled,
  Delete,
  Top,
  Bottom,
  ArrowLeft,
  ArrowRight,
} from '@element-plus/icons-vue'
import type { 
  InteractiveTableData, 
  TableColumn, 
  TableFieldType,
  TableSelection 
} from '@/types'
import InteractiveTableToolbar from './InteractiveTableToolbar.vue'

const props = defineProps<{
  modelValue: InteractiveTableData
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: InteractiveTableData): void
  (e: 'delete'): void
}>()

const tableContainerRef = ref<HTMLElement | null>(null)
const scrollHorizontalRef = ref<HTMLElement | null>(null)
const scrollTrackRef = ref<HTMLElement | null>(null)
const scrollThumbRef = ref<HTMLElement | null>(null)

const tableData = ref<InteractiveTableData>(props.modelValue)

const selectAllRows = ref(false)
const selectedRowIds = ref<string[]>([])
const hoveredRowId = ref<string | null>(null)

const selectedCells = ref<TableSelection[]>([])
const editingCell = ref<{ rowId: string; colId: string } | null>(null)
const editingCellValue = ref('')

const editingColumnId = ref<string | null>(null)
const editingColumnTitle = ref('')

const resizingColumn = ref<{ colId: string; startX: number; startWidth: number } | null>(null)

const fieldTypeMenuVisible = ref(false)
const selectedColumnForFieldType = ref<string | null>(null)

const columnMenuVisible = ref(false)
const selectedColumnForMenu = ref<string | null>(null)

const scrollThumbWidth = ref(100)
const scrollThumbLeft = ref(0)
let isScrollThumbDragging = false
let scrollThumbStartX = 0
let scrollThumbStartLeft = 0

const totalWidth = computed(() => {
  return tableData.value.columns.reduce((sum, col) => sum + col.width, 0) + 50
})

function getCellValue(rowId: string, colId: string): string {
  const cell = tableData.value.cells.find(c => c.rowId === rowId && c.colId === colId)
  return cell?.value || ''
}

function setCellValue(rowId: string, colId: string, value: string) {
  const cellIndex = tableData.value.cells.findIndex(c => c.rowId === rowId && c.colId === colId)
  if (cellIndex >= 0) {
    tableData.value.cells[cellIndex].value = value
  } else {
    tableData.value.cells.push({ rowId, colId, value })
  }
  emitData()
}

function getColumnById(colId: string): TableColumn | undefined {
  return tableData.value.columns.find(c => c.id === colId)
}

function isCellSelected(rowId: string, colId: string): boolean {
  return selectedCells.value.some(c => c.rowId === rowId && c.colId === colId)
}

function getSelectionCount(): number {
  return selectedRowIds.value.length || tableData.value.rows.length
}

function generateId(): string {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

function emitData() {
  emit('update:modelValue', { ...tableData.value })
}

function handleAddColumn() {
  const newCol: TableColumn = {
    id: generateId(),
    width: 150,
    fieldType: 'text',
    title: '字段',
  }
  tableData.value.columns.push(newCol)
  
  tableData.value.rows.forEach(row => {
    tableData.value.cells.push({ rowId: row.id, colId: newCol.id, value: '' })
  })
  
  emitData()
  ElMessage.success('已添加新列')
}

function handleInsertColumn(position: 'left' | 'right') {
  if (!selectedColumnForMenu.value) return
  
  const colIndex = tableData.value.columns.findIndex(c => c.id === selectedColumnForMenu.value)
  if (colIndex < 0) return
  
  const insertIndex = position === 'left' ? colIndex : colIndex + 1
  
  const newCol: TableColumn = {
    id: generateId(),
    width: 150,
    fieldType: 'text',
    title: '字段',
  }
  
  tableData.value.columns.splice(insertIndex, 0, newCol)
  
  tableData.value.rows.forEach(row => {
    tableData.value.cells.push({ rowId: row.id, colId: newCol.id, value: '' })
  })
  
  columnMenuVisible.value = false
  emitData()
  ElMessage.success(`已在${position === 'left' ? '左侧' : '右侧'}插入新列`)
}

function handleDeleteColumn() {
  if (!selectedColumnForMenu.value) return
  
  const colIndex = tableData.value.columns.findIndex(c => c.id === selectedColumnForMenu.value)
  if (colIndex < 0) return
  
  tableData.value.columns.splice(colIndex, 1)
  tableData.value.cells = tableData.value.cells.filter(c => c.colId !== selectedColumnForMenu.value)
  
  columnMenuVisible.value = false
  emitData()
  ElMessage.success('已删除列')
}

function handleAddRow() {
  const newRow = {
    id: generateId(),
    height: 40,
  }
  
  tableData.value.rows.push(newRow)
  
  tableData.value.columns.forEach(col => {
    tableData.value.cells.push({ rowId: newRow.id, colId: col.id, value: '' })
  })
  
  emitData()
  ElMessage.success('已添加新行')
}

function handleSelectAll() {
  if (selectAllRows.value) {
    selectedRowIds.value = tableData.value.rows.map(r => r.id)
  } else {
    selectedRowIds.value = []
  }
}

function toggleRowSelection(rowId: string) {
  const index = selectedRowIds.value.indexOf(rowId)
  if (index >= 0) {
    selectedRowIds.value.splice(index, 1)
  } else {
    selectedRowIds.value.push(rowId)
  }
  
  selectAllRows.value = selectedRowIds.value.length === tableData.value.rows.length
}

function handleCellClick(rowId: string, colId: string, e: MouseEvent) {
  if (e.shiftKey && selectedCells.value.length > 0) {
    const lastCell = selectedCells.value[selectedCells.value.length - 1]
    const rowIndex = tableData.value.rows.findIndex(r => r.id === rowId)
    const lastRowIndex = tableData.value.rows.findIndex(r => r.id === lastCell.rowId)
    const colIndex = tableData.value.columns.findIndex(c => c.id === colId)
    const lastColIndex = tableData.value.columns.findIndex(c => c.id === lastCell.colId)
    
    selectedCells.value = []
    const minRow = Math.min(rowIndex, lastRowIndex)
    const maxRow = Math.max(rowIndex, lastRowIndex)
    const minCol = Math.min(colIndex, lastColIndex)
    const maxCol = Math.max(colIndex, lastColIndex)
    
    for (let i = minRow; i <= maxRow; i++) {
      for (let j = minCol; j <= maxCol; j++) {
        selectedCells.value.push({
          rowId: tableData.value.rows[i].id,
          colId: tableData.value.columns[j].id,
        })
      }
    }
  } else {
    selectedCells.value = [{ rowId, colId }]
  }
  
  editingCell.value = null
}

function handleCellDblClick(rowId: string, colId: string) {
  const col = getColumnById(colId)
  if (!col) return
  
  editingCell.value = { rowId, colId }
  editingCellValue.value = getCellValue(rowId, colId)
}

function saveCellEdit() {
  if (!editingCell.value) return
  
  const col = getColumnById(editingCell.value.colId)
  if (!col) return
  
  let value = editingCellValue.value
  
  if (col.fieldType === 'checkbox') {
    value = editingCellValue.value ? 'true' : 'false'
  }
  
  setCellValue(editingCell.value.rowId, editingCell.value.colId, value)
  editingCell.value = null
}

function startEditHeader(colId: string) {
  const col = getColumnById(colId)
  if (!col) return
  
  editingColumnId.value = colId
  editingColumnTitle.value = col.title
}

function saveHeaderEdit(colId: string) {
  const colIndex = tableData.value.columns.findIndex(c => c.id === colId)
  if (colIndex >= 0) {
    tableData.value.columns[colIndex].title = editingColumnTitle.value
    emitData()
  }
  editingColumnId.value = null
}

function toggleFieldTypeMenu(colId: string) {
  selectedColumnForFieldType.value = colId
  fieldTypeMenuVisible.value = !fieldTypeMenuVisible.value
}

function setFieldType(type: TableFieldType) {
  if (!selectedColumnForFieldType.value) return
  
  const colIndex = tableData.value.columns.findIndex(c => c.id === selectedColumnForFieldType.value)
  if (colIndex >= 0) {
    tableData.value.columns[colIndex].fieldType = type
    
    if (type === 'select' && !tableData.value.columns[colIndex].selectOptions) {
      tableData.value.columns[colIndex].selectOptions = ['选项1', '选项2', '选项3']
    }
    
    emitData()
    ElMessage.success(`字段类型已切换为${type === 'text' ? '文本' : type === 'select' ? '单选' : type === 'date' ? '日期' : '复选框'}`)
  }
  
  fieldTypeMenuVisible.value = false
}

function showColumnMenu(colId: string, event: MouseEvent) {
  event.stopPropagation()
  selectedColumnForMenu.value = colId
  columnMenuVisible.value = !columnMenuVisible.value
}

function startResizeColumn(colId: string, event: MouseEvent) {
  event.preventDefault()
  const col = getColumnById(colId)
  if (!col) return
  
  resizingColumn.value = {
    colId,
    startX: event.clientX,
    startWidth: col.width,
  }
  
  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)
}

function handleResizeMove(event: MouseEvent) {
  if (!resizingColumn.value) return
  
  const deltaX = event.clientX - resizingColumn.value.startX
  const newWidth = Math.max(80, resizingColumn.value.startWidth + deltaX)
  
  const colIndex = tableData.value.columns.findIndex(c => c.id === resizingColumn.value!.colId)
  if (colIndex >= 0) {
    tableData.value.columns[colIndex].width = newWidth
    emitData()
  }
}

function handleResizeEnd() {
  resizingColumn.value = null
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
}

function startScrollThumbDrag(event: MouseEvent) {
  isScrollThumbDragging = true
  scrollThumbStartX = event.clientX
  scrollThumbStartLeft = scrollThumbLeft.value
  
  document.addEventListener('mousemove', handleScrollThumbMove)
  document.addEventListener('mouseup', handleScrollThumbEnd)
}

function handleScrollThumbMove(event: MouseEvent) {
  if (!isScrollThumbDragging || !scrollTrackRef.value || !scrollHorizontalRef.value) return
  
  const trackRect = scrollTrackRef.value.getBoundingClientRect()
  const deltaX = event.clientX - scrollThumbStartX
  const maxLeft = trackRect.width - scrollThumbWidth.value
  const newLeft = Math.max(0, Math.min(maxLeft, scrollThumbStartLeft + deltaX))
  
  scrollThumbLeft.value = newLeft
  
  const scrollRatio = newLeft / maxLeft
  const maxScroll = scrollHorizontalRef.value.scrollWidth - scrollHorizontalRef.value.clientWidth
  scrollHorizontalRef.value.scrollLeft = scrollRatio * maxScroll
}

function handleScrollThumbEnd() {
  isScrollThumbDragging = false
  document.removeEventListener('mousemove', handleScrollThumbMove)
  document.removeEventListener('mouseup', handleScrollThumbEnd)
}

function updateScrollThumb() {
  if (!scrollHorizontalRef.value || !scrollTrackRef.value) return
  
  const scrollWidth = scrollHorizontalRef.value.scrollWidth
  const clientWidth = scrollHorizontalRef.value.clientWidth
  
  if (scrollWidth <= clientWidth) {
    scrollThumbWidth.value = 0
    return
  }
  
  const trackRect = scrollTrackRef.value.getBoundingClientRect()
  const thumbWidth = (clientWidth / scrollWidth) * trackRect.width
  scrollThumbWidth.value = Math.max(50, thumbWidth)
  
  const scrollRatio = scrollHorizontalRef.value.scrollLeft / (scrollWidth - clientWidth)
  const maxLeft = trackRect.width - scrollThumbWidth.value
  scrollThumbLeft.value = scrollRatio * maxLeft
}

watch(() => props.modelValue, (newVal) => {
  tableData.value = newVal
}, { deep: true })

onMounted(() => {
  updateScrollThumb()
  
  if (scrollHorizontalRef.value) {
    scrollHorizontalRef.value.addEventListener('scroll', updateScrollThumb)
  }
})

onUnmounted(() => {
  if (scrollHorizontalRef.value) {
    scrollHorizontalRef.value.removeEventListener('scroll', updateScrollThumb)
  }
  
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
  document.removeEventListener('mousemove', handleScrollThumbMove)
  document.removeEventListener('mouseup', handleScrollThumbEnd)
})
</script>

<style lang="scss" scoped>
.interactive-table-wrapper {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  margin: 8px 0;
}

.table-container {
  overflow: hidden;
}

.table-scroll-horizontal {
  overflow-x: auto;
  overflow-y: hidden;
}

.table-body-wrapper {
  min-width: 100%;
}

.interactive-table {
  border-collapse: collapse;
  table-layout: fixed;
  
  th, td {
    border: 1px solid #e4e7ed;
    padding: 0;
    vertical-align: middle;
    position: relative;
  }
}

.table-header-cell {
  background: #fafafa;
  height: 48px;
  font-weight: 500;
  color: #606266;
  border-bottom: 2px solid #e4e7ed;
  
  &.checkbox-header {
    width: 50px;
    text-align: center;
  }
  
  &.add-column-header {
    width: 50px;
    text-align: center;
    cursor: pointer;
    
    &:hover {
      background: #f0f2f5;
    }
    
    .el-icon {
      color: #909399;
      font-size: 16px;
    }
  }
  
  .header-content {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    height: 100%;
    
    .field-type-icon {
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:hover {
        background: #e4e7ed;
      }
      
      .el-icon {
        font-size: 14px;
        color: #909399;
      }
    }
    
    .header-title {
      flex: 1;
      cursor: text;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .header-menu {
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      opacity: 0;
      transition: opacity 0.2s;
      
      .el-icon {
        font-size: 14px;
        color: #909399;
      }
    }
  }
  
  &:hover .header-menu {
    opacity: 1;
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
  
  &.row-hovered {
    .row-index {
      opacity: 1;
    }
  }
}

.table-cell {
  height: 40px;
  padding: 8px 12px;
  font-size: 14px;
  color: #303133;
  position: relative;
  
  &.checkbox-cell {
    width: 50px;
    text-align: center;
    cursor: pointer;
    
    .row-index {
      color: #909399;
      font-size: 13px;
      opacity: 0;
      transition: opacity 0.2s;
    }
  }
  
  &.add-column-cell {
    width: 50px;
    border-right: none;
  }
  
  &.cell-selected {
    background: #e6f7ff;
    outline: 2px solid #409eff;
    outline-offset: -2px;
    z-index: 1;
  }
  
  .el-input,
  .el-select,
  .el-date-editor {
    width: 100%;
  }
}

.add-row-row {
  .add-row-cell {
    width: 50px;
    text-align: center;
    cursor: pointer;
    
    .el-icon {
      color: #909399;
      font-size: 16px;
    }
    
    &:hover {
      background: #f0f2f5;
      
      .el-icon {
        color: #409eff;
      }
    }
  }
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid #e4e7ed;
  background: #fafafa;
  min-height: 40px;
  
  .footer-left {
    .selection-count {
      font-size: 13px;
      color: #909399;
    }
  }
  
  .footer-center {
    flex: 1;
    margin: 0 16px;
    max-width: 400px;
    
    .horizontal-scrollbar {
      width: 100%;
      
      :deep(.el-scrollbar__wrap) {
        height: 8px;
        overflow-x: auto;
      }
      
      :deep(.el-scrollbar__bar) {
        display: none;
      }
    }
    
    .scroll-track {
      width: 100%;
      height: 8px;
      background: #e4e7ed;
      border-radius: 4px;
      position: relative;
      
      .scroll-thumb {
        position: absolute;
        top: 0;
        height: 100%;
        background: #c0c4cc;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s;
        
        &:hover {
          background: #909399;
        }
      }
    }
  }
  
  .footer-right {
    display: flex;
    gap: 4px;
    
    .el-icon {
      font-size: 14px;
      color: #909399;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      
      &:hover {
        background: #e4e7ed;
        color: #606266;
      }
    }
  }
}
</style>
