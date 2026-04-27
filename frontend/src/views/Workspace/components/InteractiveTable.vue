<template>
  <div class="interactive-table-wrapper" ref="wrapperRef">
    <div class="table-toolbar">
      <div class="toolbar-left">
        <el-dropdown trigger="click" @command="handleInsertRow">
          <el-button text class="toolbar-btn">
            <el-icon><Plus /></el-icon>
            <span>插入行</span>
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="above">在上方插入</el-dropdown-item>
              <el-dropdown-item command="below">在下方插入</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-dropdown trigger="click" @command="handleInsertColumn">
          <el-button text class="toolbar-btn">
            <el-icon><Plus /></el-icon>
            <span>插入列</span>
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="left">在左侧插入</el-dropdown-item>
              <el-dropdown-item command="right">在右侧插入</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-button
          text
          class="toolbar-btn"
          @click="handleDeleteRows"
          :disabled="!hasSelectedRows"
        >
          <el-icon><Delete /></el-icon>
          <span>删除行</span>
        </el-button>

        <el-button
          text
          class="toolbar-btn"
          @click="handleDeleteColumns"
          :disabled="!hasSelectedCols"
        >
          <el-icon><Delete /></el-icon>
          <span>删除列</span>
        </el-button>

        <div class="toolbar-divider"></div>

        <el-button
          text
          class="toolbar-btn"
          @click="handleMergeCells"
          :disabled="!canMergeCells"
        >
          <el-icon><Grid /></el-icon>
          <span>合并单元格</span>
        </el-button>

        <el-button
          text
          class="toolbar-btn"
          @click="handleSplitCell"
          :disabled="!canSplitCell"
        >
          <el-icon><CopyDocument /></el-icon>
          <span>拆分单元格</span>
        </el-button>

        <div class="toolbar-divider"></div>

        <div class="format-group">
          <el-button
            text
            class="format-btn"
            :class="{ 'is-active': formatState.bold }"
            @click="toggleFormat('bold')"
          >
            <el-icon><Bold /></el-icon>
          </el-button>
          <el-button
            text
            class="format-btn"
            :class="{ 'is-active': formatState.italic }"
            @click="toggleFormat('italic')"
          >
            <el-icon><Italic /></el-icon>
          </el-button>
          <el-button
            text
            class="format-btn"
            :class="{ 'is-active': formatState.underline }"
            @click="toggleFormat('underline')"
          >
            <el-icon><Underline /></el-icon>
          </el-button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="color-group">
          <div class="color-picker-wrapper">
            <el-color-picker
              v-model="textColor"
              :predefine="predefineColors"
              size="small"
              @change="handleTextColor"
              popper-class="table-color-picker"
            />
            <span class="color-label">字体</span>
          </div>
          <div class="color-picker-wrapper">
            <el-color-picker
              v-model="bgColor"
              :predefine="predefineColors"
              size="small"
              @change="handleBgColor"
              popper-class="table-color-picker"
            />
            <span class="color-label">背景</span>
          </div>
        </div>

        <div class="toolbar-divider"></div>

        <div class="align-group">
          <el-radio-group v-model="formatState.align" size="small" @change="handleAlign">
            <el-radio-button value="left">
              <el-icon><ArrowLeft /></el-icon>
            </el-radio-button>
            <el-radio-button value="center">
              <el-icon><Minus /></el-icon>
            </el-radio-button>
            <el-radio-button value="right">
              <el-icon><ArrowRight /></el-icon>
            </el-radio-button>
          </el-radio-group>
        </div>

        <div class="toolbar-divider"></div>

        <div class="border-group">
          <el-dropdown trigger="click" @command="handleBorder">
            <el-button text class="toolbar-btn">
              <el-icon><Grid /></el-icon>
              <span>边框</span>
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="all">所有边框</el-dropdown-item>
                <el-dropdown-item command="none">无框线</el-dropdown-item>
                <el-dropdown-item command="top">上框线</el-dropdown-item>
                <el-dropdown-item command="bottom">下框线</el-dropdown-item>
                <el-dropdown-item command="left">左框线</el-dropdown-item>
                <el-dropdown-item command="right">右框线</el-dropdown-item>
                <el-dropdown-item command="outer">外框线</el-dropdown-item>
                <el-dropdown-item command="inner">内框线</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <div class="toolbar-divider"></div>

        <div class="tool-group">
          <el-button
            text
            class="toolbar-btn"
            :class="{ 'is-active': formatBrushActive }"
            @click="toggleFormatBrush"
          >
            <el-icon><Brush /></el-icon>
            <span>格式刷</span>
          </el-button>

          <el-button
            text
            class="toolbar-btn"
            @click="clearFormat"
          >
            <el-icon><Delete /></el-icon>
            <span>清除格式</span>
          </el-button>

          <el-button
            text
            class="toolbar-btn"
            @click="fitColumnWidth"
          >
            <el-icon><FullScreen /></el-icon>
            <span>自动列宽</span>
          </el-button>
        </div>
      </div>

      <div class="toolbar-right">
        <el-button text class="toolbar-btn" @click="handleDeleteTable">
          <el-icon><Delete /></el-icon>
          <span>删除表格</span>
        </el-button>
      </div>
    </div>

    <div class="table-container" @mousedown="handleTableMouseDown" @mouseup="handleTableMouseUp" @mousemove="handleTableMouseMove">
      <div class="table-scroll-horizontal" ref="scrollContainerRef">
        <table class="interactive-table" :style="{ width: tableWidth + 'px' }">
          <thead>
            <tr>
              <th class="table-header-cell corner-header" style="width: 50px;">
                <div class="corner-selector" @mousedown="handleCornerClick"></div>
              </th>
              <th
                v-for="(col, colIndex) in currentColumns"
                :key="col.id"
                class="table-header-cell"
                :class="{ 'col-selected': isColSelected(colIndex) }"
                :style="{ width: col.width + 'px' }"
                @mousedown="handleColHeaderClick(colIndex, $event)"
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
              v-for="(row, rowIndex) in currentRows"
              :key="row.id"
              class="table-row"
              :class="{ 'row-selected': isRowSelected(rowIndex) }"
              @mousedown="handleRowHeaderClick(rowIndex, $event)"
            >
              <td class="table-cell row-header-cell" style="width: 50px;">
                <span class="row-number">{{ rowIndex + 1 }}</span>
              </td>
              <td
                v-for="(col, colIndex) in currentColumns"
                :key="col.id"
                class="table-cell"
                :class="[
                  { 'cell-selected': isCellSelected(rowIndex, colIndex) },
                  { 'cell-editing': isEditingCell(rowIndex, colIndex) },
                  { 'cell-merged': isMergedCell(rowIndex, colIndex) },
                  { 'cell-origin': isOriginCell(rowIndex, colIndex) },
                ]"
                :style="getCellStyle(rowIndex, colIndex)"
                :rowspan="getRowSpan(rowIndex, colIndex)"
                :colspan="getColSpan(rowIndex, colIndex)"
                @mousedown="handleCellMouseDown(rowIndex, colIndex, $event)"
                @dblclick="startEditingCell(rowIndex, colIndex)"
                @click="handleCellClick(rowIndex, colIndex)"
              >
                <template v-if="isMergedCell(rowIndex, colIndex) && !isOriginCell(rowIndex, colIndex)">
                </template>
                <template v-else-if="isEditingCell(rowIndex, colIndex)">
                  <template v-if="col.fieldType === 'text'">
                    <el-input
                      ref="cellInputRef"
                      v-model="editingValue"
                      size="small"
                      @blur="saveCellEdit"
                      @keyup.enter="handleEnterKey"
                      @keyup.tab="handleTabKey"
                      @keydown.arrow-up.prevent
                      @keydown.arrow-down.prevent
                      @keydown.arrow-left.prevent
                      @keydown.arrow-right.prevent
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
          v-for="sheet in sheetList"
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
            v-if="sheetList.length > 1 && editingSheetId !== sheet.id"
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
      <span>{{ hasSelection ? `已选择 ${selectionInfo}` : `${currentRows.length} 条记录` }}</span>
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
  Grid,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bold,
  Italic,
  Underline,
  Brush,
  FullScreen,
  CopyDocument,
  Minus,
} from '@element-plus/icons-vue'
import type { InteractiveTableData, TableFieldType, CellFormat, HorizontalAlign, BorderStyle } from '@/types'

const props = defineProps<{
  modelValue: InteractiveTableData
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: InteractiveTableData): void
  (e: 'delete'): void
}>()

const wrapperRef = ref<HTMLElement | null>(null)
const scrollContainerRef = ref<HTMLElement | null>(null)
const cellInputRef = ref<HTMLElement | null>(null)

const tableData = ref<InteractiveTableData>(JSON.parse(JSON.stringify(props.modelValue)))
const initialized = ref(false)

const tableWidth = computed(() => {
  return currentColumns.value.reduce((sum, col) => sum + col.width, 0) + 50
})

const sheetList = computed(() => tableData.value.sheets || [])
const activeSheetId = computed(() => tableData.value.activeSheetId || '')

const currentSheet = computed(() => {
  const sheets = tableData.value.sheets
  const activeId = tableData.value.activeSheetId
  if (!sheets || !activeId) return null
  return sheets.find(s => s.id === activeId) || null
})

const currentColumns = computed(() => currentSheet.value?.columns || [])
const currentRows = computed(() => currentSheet.value?.rows || [])
const currentCells = computed(() => currentSheet.value?.cells || [])
const currentMergeCells = computed(() => currentSheet.value?.mergeCells || [])

const editingCell = ref<{ rowIndex: number; colIndex: number } | null>(null)
const editingValue = ref('')
const checkboxValue = ref(false)

const editingColIndex = ref<number | null>(null)
const editingTitle = ref('')

const editingSheetId = ref<string | null>(null)
const renamingSheetName = ref('')

const selectedRows = ref<Set<number>>(new Set())
const selectedCols = ref<Set<number>>(new Set())
const selectionStart = ref<{ rowIndex: number; colIndex: number } | null>(null)
const selectionEnd = ref<{ rowIndex: number; colIndex: number } | null>(null)
const isSelecting = ref(false)

const resizingColumn = ref<{ colIndex: number; startX: number; startWidth: number } | null>(null)

const formatBrushActive = ref(false)
const copiedFormat = ref<Partial<CellFormat> | null>(null)

const formatState = ref<{
  bold: boolean
  italic: boolean
  underline: boolean
  align: HorizontalAlign
}>({
  bold: false,
  italic: false,
  underline: false,
  align: 'left',
})

const textColor = ref<string | null>(null)
const bgColor = ref<string | null>(null)

const predefineColors = [
  '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
  '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff',
  '#9900ff', '#ff00ff',
]

const hasSelectedRows = computed(() => selectedRows.value.size > 0)
const hasSelectedCols = computed(() => selectedCols.value.size > 0)
const hasSelection = computed(() => selectionStart.value !== null && selectionEnd.value !== null)

const selectionInfo = computed(() => {
  if (!selectionStart.value || !selectionEnd.value) return ''
  const minRow = Math.min(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const maxRow = Math.max(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const minCol = Math.min(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  const maxCol = Math.max(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  const rowCount = maxRow - minRow + 1
  const colCount = maxCol - minCol + 1
  return `${rowCount} 行 × ${colCount} 列`
})

const canMergeCells = computed(() => {
  if (!hasSelection.value) return false
  if (!selectionStart.value || !selectionEnd.value) return false
  const minRow = Math.min(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const maxRow = Math.max(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const minCol = Math.min(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  const maxCol = Math.max(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  return !(minRow === maxRow && minCol === maxCol)
})

const canSplitCell = computed(() => {
  if (!editingCell.value) return false
  const { rowIndex, colIndex } = editingCell.value
  return isOriginCell(rowIndex, colIndex)
})

function ensureSheets() {
  if (!tableData.value.sheets || tableData.value.sheets.length === 0) {
    const defaultSheet = {
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

function emitData() {
  emit('update:modelValue', JSON.parse(JSON.stringify(tableData.value)))
}

function getCellValue(rowIndex: number, colIndex: number): string {
  const row = currentRows.value[rowIndex]
  const col = currentColumns.value[colIndex]
  if (!row || !col) return ''
  const cell = currentCells.value.find(c => c.rowId === row.id && c.colId === col.id)
  return cell?.value || ''
}

function getCellFormat(rowIndex: number, colIndex: number): Partial<CellFormat> {
  const row = currentRows.value[rowIndex]
  const col = currentColumns.value[colIndex]
  if (!row || !col) return {}
  const cell = currentCells.value.find(c => c.rowId === row.id && c.colId === col.id)
  return { ...col.format, ...row.format, ...cell?.format }
}

function setCellValue(rowIndex: number, colIndex: number, value: string) {
  const sheet = currentSheet.value
  if (!sheet) return
  const row = sheet.rows[rowIndex]
  const col = sheet.columns[colIndex]
  if (!row || !col) return

  const cellIndex = sheet.cells.findIndex(c => c.rowId === row.id && c.colId === col.id)
  if (cellIndex >= 0) {
    sheet.cells[cellIndex].value = value
  } else {
    sheet.cells.push({ rowId: row.id, colId: col.id, value })
  }
  emitData()
}

function setCellFormat(rowIndex: number, colIndex: number, format: Partial<CellFormat>) {
  const sheet = currentSheet.value
  if (!sheet) return
  const row = sheet.rows[rowIndex]
  const col = sheet.columns[colIndex]
  if (!row || !col) return

  const cellIndex = sheet.cells.findIndex(c => c.rowId === row.id && c.colId === col.id)
  if (cellIndex >= 0) {
    sheet.cells[cellIndex].format = { ...sheet.cells[cellIndex].format, ...format }
  } else {
    sheet.cells.push({ rowId: row.id, colId: col.id, value: '', format })
  }
}

function getCellStyle(rowIndex: number, colIndex: number) {
  const format = getCellFormat(rowIndex, colIndex)
  const col = currentColumns.value[colIndex]

  const style: Record<string, unknown> = {}
  if (col) style.width = col.width + 'px'

  if (format.bold) style.fontWeight = 'bold'
  if (format.italic) style.fontStyle = 'italic'
  if (format.underline) style.textDecoration = 'underline'
  if (format.color) style.color = format.color
  if (format.bgColor) style.backgroundColor = format.bgColor
  if (format.align) style.textAlign = format.align
  if (format.verticalAlign) style.verticalAlign = format.verticalAlign

  return style
}

function isRowSelected(rowIndex: number): boolean {
  return selectedRows.value.has(rowIndex)
}

function isColSelected(colIndex: number): boolean {
  return selectedCols.value.has(colIndex)
}

function isCellSelected(rowIndex: number, colIndex: number): boolean {
  if (!selectionStart.value || !selectionEnd.value) return false
  const minRow = Math.min(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const maxRow = Math.max(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const minCol = Math.min(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  const maxCol = Math.max(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  return rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol
}

function isEditingCell(rowIndex: number, colIndex: number): boolean {
  return editingCell.value?.rowIndex === rowIndex && editingCell.value?.colIndex === colIndex
}

function getMergeInfo(rowIndex: number, colIndex: number) {
  const sheet = currentSheet.value
  if (!sheet) return null
  const row = sheet.rows[rowIndex]
  const col = sheet.columns[colIndex]
  if (!row || !col) return null

  const cell = sheet.cells.find(c => c.rowId === row.id && c.colId === col.id)
  if (cell?.isMerged) {
    return {
      isMerged: true,
      isOrigin: false,
      rowSpan: 0,
      colSpan: 0,
    }
  }

  const mergeCell = sheet.mergeCells.find(m => m.rowId === row.id && m.colId === col.id)
  if (mergeCell) {
    return {
      isMerged: true,
      isOrigin: true,
      rowSpan: mergeCell.rowSpan,
      colSpan: mergeCell.colSpan,
    }
  }

  return null
}

function isMergedCell(rowIndex: number, colIndex: number): boolean {
  const info = getMergeInfo(rowIndex, colIndex)
  return info?.isMerged || false
}

function isOriginCell(rowIndex: number, colIndex: number): boolean {
  const info = getMergeInfo(rowIndex, colIndex)
  return info?.isOrigin || false
}

function getRowSpan(rowIndex: number, colIndex: number): number | undefined {
  const info = getMergeInfo(rowIndex, colIndex)
  if (info?.isMerged && !info.isOrigin) return 0
  if (info?.isOrigin && info.rowSpan > 1) return info.rowSpan
  return undefined
}

function getColSpan(rowIndex: number, colIndex: number): number | undefined {
  const info = getMergeInfo(rowIndex, colIndex)
  if (info?.isMerged && !info.isOrigin) return 0
  if (info?.isOrigin && info.colSpan > 1) return info.colSpan
  return undefined
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

function handleCellMouseDown(rowIndex: number, colIndex: number, e: MouseEvent) {
  e.preventDefault()
  isSelecting.value = true
  selectionStart.value = { rowIndex, colIndex }
  selectionEnd.value = { rowIndex, colIndex }
  selectedRows.value.clear()
  selectedCols.value.clear()

  if (formatBrushActive.value && copiedFormat.value) {
    applyFormatToCell(rowIndex, colIndex, copiedFormat.value)
    formatBrushActive.value = false
    copiedFormat.value = null
    emitData()
  }
}

function handleTableMouseMove(e: MouseEvent) {
  if (!isSelecting.value || !selectionStart.value) return

  const target = e.target as HTMLElement
  const cell = target.closest('td.table-cell')
  if (cell) {
    const rowEl = cell.parentElement
    if (rowEl && rowEl.tagName === 'TR') {
      const tbody = rowEl.parentElement
      const rows = Array.from(tbody?.children || [])
      const rowIndex = rows.indexOf(rowEl) - 1

      const cells = Array.from(rowEl.children).slice(1)
      const colIndex = cells.indexOf(cell)

      if (rowIndex >= 0 && colIndex >= 0) {
        selectionEnd.value = { rowIndex, colIndex }
      }
    }
  }
}

function handleTableMouseUp() {
  isSelecting.value = false
  updateFormatState()
}

function handleCornerClick() {
  if (currentRows.value.length > 0 && currentColumns.value.length > 0) {
    selectionStart.value = { rowIndex: 0, colIndex: 0 }
    selectionEnd.value = { rowIndex: currentRows.value.length - 1, colIndex: currentColumns.value.length - 1 }
  }
}

function handleRowHeaderClick(rowIndex: number, e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.classList.contains('row-header-cell') || target.closest('.row-header-cell')) {
    e.preventDefault()
    if (selectedRows.value.has(rowIndex)) {
      selectedRows.value.delete(rowIndex)
    } else {
      if (!e.shiftKey && !e.ctrlKey) {
        selectedRows.value.clear()
      }
      selectedRows.value.add(rowIndex)
    }
  }
}

function handleColHeaderClick(colIndex: number, e: MouseEvent) {
  e.preventDefault()
  if (selectedCols.value.has(colIndex)) {
    selectedCols.value.delete(colIndex)
  } else {
    if (!e.shiftKey && !e.ctrlKey) {
      selectedCols.value.clear()
    }
    selectedCols.value.add(colIndex)
  }
}

function handleCellClick(rowIndex: number, colIndex: number) {
  if (isSelecting.value) return
  if (!isCellSelected(rowIndex, colIndex)) {
    selectionStart.value = { rowIndex, colIndex }
    selectionEnd.value = { rowIndex, colIndex }
  }
}

function startEditingCell(rowIndex: number, colIndex: number) {
  editingCell.value = { rowIndex, colIndex }
  editingValue.value = getCellValue(rowIndex, colIndex)

  const col = currentColumns.value[colIndex]
  if (col.fieldType === 'checkbox') {
    checkboxValue.value = editingValue.value === 'true'
  }

  nextTick(() => {
    if (cellInputRef.value) {
      const input = (cellInputRef.value as { $el?: HTMLElement } | null)?.$el?.querySelector('input')
      if (input) {
        input.focus()
        input.select()
      }
    }
  })
}

function saveCellEdit() {
  if (!editingCell.value) return

  const { rowIndex, colIndex } = editingCell.value
  const col = currentColumns.value[colIndex]

  if (col.fieldType !== 'checkbox') {
    setCellValue(rowIndex, colIndex, editingValue.value)
  }

  editingCell.value = null
  editingValue.value = ''
}

function handleEnterKey() {
  if (!editingCell.value) return
  saveCellEdit()

  const { rowIndex, colIndex } = editingCell.value
  const nextRowIndex = rowIndex + 1
  if (nextRowIndex < currentRows.value.length) {
    startEditingCell(nextRowIndex, colIndex)
  }
}

function handleTabKey() {
  if (!editingCell.value) return
  saveCellEdit()

  const { rowIndex, colIndex } = editingCell.value
  let nextColIndex = colIndex + 1
  let nextRowIndex = rowIndex

  if (nextColIndex >= currentColumns.value.length) {
    nextColIndex = 0
    nextRowIndex = rowIndex + 1
  }

  if (nextRowIndex < currentRows.value.length) {
    startEditingCell(nextRowIndex, nextColIndex)
  }
}

function handleCheckboxChange(rowIndex: number, colIndex: number) {
  setCellValue(rowIndex, colIndex, checkboxValue.value ? 'true' : 'false')
}

function startEditHeader(colIndex: number) {
  editingColIndex.value = colIndex
  editingTitle.value = currentColumns.value[colIndex].title
}

function saveHeaderEdit(colIndex: number) {
  const sheet = currentSheet.value
  if (!sheet) return

  if (editingTitle.value.trim()) {
    sheet.columns[colIndex].title = editingTitle.value.trim()
    emitData()
  }
  editingColIndex.value = null
  editingTitle.value = ''
}

function startResizeColumn(colIndex: number, e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()

  const col = currentColumns.value[colIndex]
  resizingColumn.value = {
    colIndex,
    startX: e.clientX,
    startWidth: col.width,
  }

  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)
}

function handleResizeMove(e: MouseEvent) {
  if (resizingColumn.value) {
    const deltaX = e.clientX - resizingColumn.value.startX
    const newWidth = Math.max(50, resizingColumn.value.startWidth + deltaX)

    const sheet = currentSheet.value
    if (sheet) {
      sheet.columns[resizingColumn.value.colIndex].width = newWidth
    }
  }
}

function handleResizeEnd() {
  if (resizingColumn.value) {
    emitData()
    resizingColumn.value = null
  }

  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
}

function handleInsertRow(command: string) {
  const sheet = currentSheet.value
  if (!sheet) return

  const insertIndex = selectedRows.value.size > 0
    ? Math.min(...Array.from(selectedRows.value))
    : (selectionStart.value?.rowIndex ?? 0)

  const newRow = {
    id: 'row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    height: 40,
  }

  const insertAt = command === 'above' ? insertIndex : insertIndex + 1
  sheet.rows.splice(insertAt, 0, newRow)

  sheet.columns.forEach(col => {
    sheet.cells.push({
      rowId: newRow.id,
      colId: col.id,
      value: '',
    })
  })

  emitData()
  ElMessage.success('已插入新行')
}

function handleInsertColumn(command: string) {
  const sheet = currentSheet.value
  if (!sheet) return

  const insertIndex = selectedCols.value.size > 0
    ? Math.min(...Array.from(selectedCols.value))
    : (selectionStart.value?.colIndex ?? 0)

  const newCol = {
    id: 'col_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    width: 150,
    fieldType: 'text' as TableFieldType,
    title: '字段' + (sheet.columns.length + 1),
  }

  const insertAt = command === 'left' ? insertIndex : insertIndex + 1
  sheet.columns.splice(insertAt, 0, newCol)

  sheet.rows.forEach(row => {
    sheet.cells.push({
      rowId: row.id,
      colId: newCol.id,
      value: '',
    })
  })

  emitData()
  ElMessage.success('已插入新列')
}

function handleDeleteRows() {
  const sheet = currentSheet.value
  if (!sheet || selectedRows.value.size === 0) return

  ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.size} 行吗？`, '提示', {
    type: 'warning',
  }).then(() => {
    const sortedIndices = Array.from(selectedRows.value).sort((a, b) => b - a)

    sortedIndices.forEach(rowIndex => {
      const row = sheet.rows[rowIndex]
      if (row) {
        sheet.cells = sheet.cells.filter(c => c.rowId !== row.id)
        sheet.mergeCells = sheet.mergeCells.filter(m => m.rowId !== row.id)
        sheet.rows.splice(rowIndex, 1)
      }
    })

    selectedRows.value.clear()
    selectionStart.value = null
    selectionEnd.value = null

    emitData()
    ElMessage.success('已删除选中行')
  }).catch(() => {})
}

function handleDeleteColumns() {
  const sheet = currentSheet.value
  if (!sheet || selectedCols.value.size === 0) return

  ElMessageBox.confirm(`确定要删除选中的 ${selectedCols.value.size} 列吗？`, '提示', {
    type: 'warning',
  }).then(() => {
    const sortedIndices = Array.from(selectedCols.value).sort((a, b) => b - a)

    sortedIndices.forEach(colIndex => {
      const col = sheet.columns[colIndex]
      if (col) {
        sheet.cells = sheet.cells.filter(c => c.colId !== col.id)
        sheet.mergeCells = sheet.mergeCells.filter(m => m.colId !== col.id)
        sheet.columns.splice(colIndex, 1)
      }
    })

    selectedCols.value.clear()
    selectionStart.value = null
    selectionEnd.value = null

    emitData()
    ElMessage.success('已删除选中列')
  }).catch(() => {})
}

function handleMergeCells() {
  const sheet = currentSheet.value
  if (!sheet || !selectionStart.value || !selectionEnd.value) return

  const minRow = Math.min(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const maxRow = Math.max(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const minCol = Math.min(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  const maxCol = Math.max(selectionStart.value.colIndex, selectionEnd.value.colIndex)

  const originRow = sheet.rows[minRow]
  const originCol = sheet.columns[minCol]

  if (!originRow || !originCol) return

  let firstValue = ''
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const val = getCellValue(r, c)
      if (val.trim() && !firstValue) {
        firstValue = val
      }
    }
  }

  const rowSpan = maxRow - minRow + 1
  const colSpan = maxCol - minCol + 1

  sheet.mergeCells.push({
    rowId: originRow.id,
    colId: originCol.id,
    rowSpan,
    colSpan,
  })

  setCellValue(minRow, minCol, firstValue)

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (r === minRow && c === minCol) continue

      const row = sheet.rows[r]
      const col = sheet.columns[c]
      if (row && col) {
        const cellIndex = sheet.cells.findIndex(cell => cell.rowId === row.id && cell.colId === col.id)
        if (cellIndex >= 0) {
          sheet.cells[cellIndex].isMerged = true
          sheet.cells[cellIndex].mergeOrigin = { rowId: originRow.id, colId: originCol.id }
        } else {
          sheet.cells.push({
            rowId: row.id,
            colId: col.id,
            value: '',
            isMerged: true,
            mergeOrigin: { rowId: originRow.id, colId: originCol.id },
          })
        }
      }
    }
  }

  selectionStart.value = null
  selectionEnd.value = null

  emitData()
  ElMessage.success('已合并单元格')
}

function handleSplitCell() {
  const sheet = currentSheet.value
  if (!sheet || !editingCell.value) return

  const { rowIndex, colIndex } = editingCell.value
  const row = sheet.rows[rowIndex]
  const col = sheet.columns[colIndex]

  if (!row || !col) return

  const mergeIndex = sheet.mergeCells.findIndex(m => m.rowId === row.id && m.colId === col.id)
  if (mergeIndex < 0) return

  const mergeInfo = sheet.mergeCells[mergeIndex]
  const rowSpan = mergeInfo.rowSpan
  const colSpan = mergeInfo.colSpan

  sheet.mergeCells.splice(mergeIndex, 1)

  for (let r = 0; r < rowSpan; r++) {
    for (let c = 0; c < colSpan; c++) {
      const ri = rowIndex + r
      const ci = colIndex + c
      if (ri === rowIndex && ci === colIndex) continue

      const targetRow = sheet.rows[ri]
      const targetCol = sheet.columns[ci]
      if (targetRow && targetCol) {
        const cellIndex = sheet.cells.findIndex(cell => cell.rowId === targetRow.id && cell.colId === targetCol.id)
        if (cellIndex >= 0) {
          delete sheet.cells[cellIndex].isMerged
          delete sheet.cells[cellIndex].mergeOrigin
        }
      }
    }
  }

  emitData()
  ElMessage.success('已拆分单元格')
}

function updateFormatState() {
  if (!selectionStart.value || !selectionEnd.value) return

  const minRow = Math.min(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const maxRow = Math.max(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const minCol = Math.min(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  const maxCol = Math.max(selectionStart.value.colIndex, selectionEnd.value.colIndex)

  let allBold = true
  let allItalic = true
  let allUnderline = true
  let align: HorizontalAlign = 'left'

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const format = getCellFormat(r, c)
      if (!format.bold) allBold = false
      if (!format.italic) allItalic = false
      if (!format.underline) allUnderline = false
      if (format.align) align = format.align
    }
  }

  formatState.value = {
    bold: allBold,
    italic: allItalic,
    underline: allUnderline,
    align,
  }
}

function toggleFormat(formatKey: 'bold' | 'italic' | 'underline') {
  if (!selectionStart.value || !selectionEnd.value) return

  const sheet = currentSheet.value
  if (!sheet) return

  const minRow = Math.min(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const maxRow = Math.max(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const minCol = Math.min(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  const maxCol = Math.max(selectionStart.value.colIndex, selectionEnd.value.colIndex)

  const newValue = !formatState.value[formatKey]

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      setCellFormat(r, c, { [formatKey]: newValue })
    }
  }

  formatState.value[formatKey] = newValue
  emitData()
}

function handleTextColor(color: string | null) {
  if (!selectionStart.value || !selectionEnd.value || !color) return

  const minRow = Math.min(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const maxRow = Math.max(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const minCol = Math.min(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  const maxCol = Math.max(selectionStart.value.colIndex, selectionEnd.value.colIndex)

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      setCellFormat(r, c, { color })
    }
  }

  emitData()
}

function handleBgColor(color: string | null) {
  if (!selectionStart.value || !selectionEnd.value || !color) return

  const minRow = Math.min(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const maxRow = Math.max(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const minCol = Math.min(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  const maxCol = Math.max(selectionStart.value.colIndex, selectionEnd.value.colIndex)

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      setCellFormat(r, c, { bgColor: color })
    }
  }

  emitData()
}

function handleAlign(align: HorizontalAlign) {
  if (!selectionStart.value || !selectionEnd.value) return

  const minRow = Math.min(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const maxRow = Math.max(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const minCol = Math.min(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  const maxCol = Math.max(selectionStart.value.colIndex, selectionEnd.value.colIndex)

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      setCellFormat(r, c, { align })
    }
  }

  emitData()
}

function handleBorder(command: string) {
  if (!selectionStart.value || !selectionEnd.value) return

  const minRow = Math.min(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const maxRow = Math.max(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const minCol = Math.min(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  const maxCol = Math.max(selectionStart.value.colIndex, selectionEnd.value.colIndex)

  const defaultBorder = { style: 'solid' as BorderStyle, color: '#000000' }

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const format: Partial<CellFormat> = {}

      switch (command) {
        case 'all':
          format.borderTop = defaultBorder
          format.borderBottom = defaultBorder
          format.borderLeft = defaultBorder
          format.borderRight = defaultBorder
          break
        case 'none':
          format.borderTop = undefined
          format.borderBottom = undefined
          format.borderLeft = undefined
          format.borderRight = undefined
          break
        case 'top':
          format.borderTop = defaultBorder
          break
        case 'bottom':
          format.borderBottom = defaultBorder
          break
        case 'left':
          format.borderLeft = defaultBorder
          break
        case 'right':
          format.borderRight = defaultBorder
          break
        case 'outer':
          if (r === minRow) format.borderTop = defaultBorder
          if (r === maxRow) format.borderBottom = defaultBorder
          if (c === minCol) format.borderLeft = defaultBorder
          if (c === maxCol) format.borderRight = defaultBorder
          break
        case 'inner':
          if (r > minRow) format.borderTop = defaultBorder
          if (c > minCol) format.borderLeft = defaultBorder
          break
      }

      if (Object.keys(format).length > 0) {
        setCellFormat(r, c, format)
      }
    }
  }

  emitData()
  ElMessage.success('已设置边框')
}

function toggleFormatBrush() {
  if (formatBrushActive.value) {
    formatBrushActive.value = false
    copiedFormat.value = null
  } else {
    if (selectionStart.value && selectionEnd.value &&
        selectionStart.value.rowIndex === selectionEnd.value.rowIndex &&
        selectionStart.value.colIndex === selectionEnd.value.colIndex) {
      copiedFormat.value = { ...getCellFormat(selectionStart.value.rowIndex, selectionStart.value.colIndex) }
      formatBrushActive.value = true
      ElMessage.info('已复制格式，点击其他单元格应用')
    } else {
      ElMessage.warning('请先选择单个单元格来复制格式')
    }
  }
}

function applyFormatToCell(rowIndex: number, colIndex: number, format: Partial<CellFormat>) {
  if (!currentSheet.value) return

  const row = currentSheet.value.rows[rowIndex]
  const col = currentSheet.value.columns[colIndex]
  if (!row || !col) return

  const cellIndex = currentSheet.value.cells.findIndex(c => c.rowId === row.id && c.colId === col.id)
  if (cellIndex >= 0) {
    currentSheet.value.cells[cellIndex].format = { ...currentSheet.value.cells[cellIndex].format, ...format }
  } else {
    currentSheet.value.cells.push({
      rowId: row.id,
      colId: col.id,
      value: '',
      format,
    })
  }
}

function clearFormat() {
  if (!selectionStart.value || !selectionEnd.value) return

  const minRow = Math.min(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const maxRow = Math.max(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const minCol = Math.min(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  const maxCol = Math.max(selectionStart.value.colIndex, selectionEnd.value.colIndex)

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      setCellFormat(r, c, {
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        color: undefined,
        bgColor: undefined,
        align: undefined,
        verticalAlign: undefined,
      })
    }
  }

  formatState.value = {
    bold: false,
    italic: false,
    underline: false,
    align: 'left',
  }

  emitData()
  ElMessage.success('已清除格式')
}

function fitColumnWidth() {
  if (!selectionStart.value || !selectionEnd.value) {
    ElMessage.warning('请先选择要适配的列')
    return
  }

  const minCol = Math.min(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  const maxCol = Math.max(selectionStart.value.colIndex, selectionEnd.value.colIndex)
  const minRow = Math.min(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)
  const maxRow = Math.max(selectionStart.value.rowIndex, selectionEnd.value.rowIndex)

  const sheet = currentSheet.value
  if (!sheet) return

  for (let c = minCol; c <= maxCol; c++) {
    let maxWidth = 100

    for (let r = minRow; r <= maxRow; r++) {
      const value = getCellValue(r, c)
      const width = Math.max(value.length * 10 + 20, 100)
      maxWidth = Math.max(maxWidth, width)
    }

    const col = sheet.columns[c]
    if (col) {
      col.width = Math.min(maxWidth, 500)
    }
  }

  emitData()
  ElMessage.success('已自动调整列宽')
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

function switchSheet(sheetId: string) {
  if (sheetId === activeSheetId.value) return
  if (editingSheetId.value) return

  tableData.value.activeSheetId = sheetId

  selectionStart.value = null
  selectionEnd.value = null
  selectedRows.value.clear()
  selectedCols.value.clear()
  editingCell.value = null
  editingValue.value = ''

  emitData()
}

function addSheet() {
  ensureSheets()

  const sheetIndex = tableData.value.sheets!.length
  const newSheet = {
    id: 'sheet_' + Date.now(),
    name: `Sheet${sheetIndex + 1}`,
    columns: [
      { id: 'col_1', width: 150, fieldType: 'text' as TableFieldType, title: '字段1' },
      { id: 'col_2', width: 150, fieldType: 'text' as TableFieldType, title: '字段2' },
      { id: 'col_3', width: 150, fieldType: 'text' as TableFieldType, title: '字段3' },
    ],
    rows: [
      { id: 'row_1', height: 40 },
      { id: 'row_2', height: 40 },
      { id: 'row_3', height: 40 },
    ],
    cells: [],
    mergeCells: [],
  }

  tableData.value.sheets!.push(newSheet)
  tableData.value.activeSheetId = newSheet.id

  selectionStart.value = null
  selectionEnd.value = null
  selectedRows.value.clear()
  selectedCols.value.clear()
  editingCell.value = null

  emitData()
  ElMessage.success('已添加新工作表')
}

function startRenameSheet(sheetId: string) {
  const sheet = sheetList.value.find(s => s.id === sheetId)
  if (sheet) {
    editingSheetId.value = sheetId
    renamingSheetName.value = sheet.name
  }
}

function saveRenameSheet() {
  if (!editingSheetId.value) return

  const newName = renamingSheetName.value.trim()
  if (newName) {
    const sheet = sheetList.value.find(s => s.id === editingSheetId.value)
    if (sheet) {
      sheet.name = newName
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
        tableData.value.activeSheetId = tableData.value.sheets![0].id
      }

      selectionStart.value = null
      selectionEnd.value = null
      selectedRows.value.clear()
      selectedCols.value.clear()
      editingCell.value = null

      emitData()
      ElMessage.success('已删除工作表')
    }
  }).catch(() => {})
}

watch(() => props.modelValue, (newVal) => {
  tableData.value = JSON.parse(JSON.stringify(newVal))
  if (!initialized.value) {
    ensureSheets()
    initialized.value = true
  }
})

onMounted(() => {
  ensureSheets()
  initialized.value = true
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
  flex-wrap: wrap;
  gap: 8px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #e4e7ed;
  margin: 0 8px;
}

.toolbar-btn {
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #ecf5ff;
    color: #409eff;
  }

  &:disabled {
    color: #c0c4cc;
    cursor: not-allowed;
  }

  &.is-active {
    background: #ecf5ff;
    color: #409eff;
  }

  .el-icon {
    font-size: 14px;
  }
}

.format-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.format-btn {
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #606266;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  width: 28px;
  height: 28px;

  &:hover {
    background: #ecf5ff;
    color: #409eff;
  }

  &.is-active {
    background: #ecf5ff;
    color: #409eff;
    font-weight: bold;
  }

  .el-icon {
    font-size: 14px;
  }
}

.color-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;

  .color-label {
    font-size: 12px;
    color: #606266;
  }
}

.align-group {
  display: flex;
  align-items: center;

  :deep(.el-radio-button__inner) {
    padding: 4px 8px;
    font-size: 12px;
    min-width: auto;
  }
}

.border-group,
.tool-group {
  display: flex;
  align-items: center;
}

.table-container {
  overflow: hidden;
  position: relative;
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
  height: 32px;
  font-weight: 500;
  color: #606266;
  border-bottom: 1px solid #e4e7ed;
  border-right: 1px solid #e4e7ed;
  position: relative;
  vertical-align: middle;
  text-align: center;
  box-sizing: border-box;
  padding: 0;
  user-select: none;

  &:last-child {
    border-right: none;
  }

  &.corner-header {
    width: 50px;
    min-width: 50px;
    max-width: 50px;
    border-right: 1px solid #e4e7ed;

    .corner-selector {
      width: 100%;
      height: 100%;
      cursor: cell;
    }
  }

  &.col-selected {
    background: #e6f7ff;
  }
}

.header-content {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  height: 100%;

  .header-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;

    :deep(.el-input__wrapper) {
      padding: 0 6px;
      box-shadow: none;
      background: #fff;
    }
  }

  .field-type-badge {
    font-size: 11px;
    color: #909399;
    background: #f4f4f5;
    padding: 1px 6px;
    border-radius: 3px;
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
  height: 32px;
  transition: background 0.2s;

  &:hover {
    background: #f5f7fa;
  }

  &.row-selected {
    background: #e6f7ff;
  }
}

.table-cell {
  height: 32px;
  padding: 4px 8px;
  font-size: 13px;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  border-right: 1px solid #e4e7ed;
  vertical-align: middle;
  position: relative;
  cursor: cell;
  box-sizing: border-box;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:last-child {
    border-right: none;
  }

  &.row-header-cell {
    width: 50px;
    min-width: 50px;
    max-width: 50px;
    background: #f5f7fa;
    text-align: center;
    border-right: 1px solid #e4e7ed;
    cursor: pointer;

    .row-number {
      font-size: 12px;
      color: #606266;
      font-weight: 500;
    }
  }

  &.cell-selected {
    background: #e6f7ff;
    outline: 2px solid #409eff;
    outline-offset: -2px;
    z-index: 1;
  }

  &.cell-editing {
    padding: 2px;

    :deep(.el-input__wrapper) {
      padding: 0 6px;
      box-shadow: none;
      background: #fff;
    }
  }

  &.cell-merged {
    background: #f5f7fa;
  }

  &.cell-origin {
    background: #fff;
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
