<template>
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
          :modelValue="block.meta?.tableData || defaultTableData"
          @update:modelValue="(data: InteractiveTableData) => updateBlockTable(block.id, data)"
          @delete="deleteBlock(block.id)"
        />
      </template>

      <template v-else-if="block.type === 'canvas'">
        <InteractiveCanvas
          :modelValue="block.meta?.canvasData || defaultCanvasData"
          @update:modelValue="(data: InteractiveCanvasData) => updateBlockCanvas(block.id, data)"
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
          @paste="handlePaste(block.id, $event)"
          :data-block-id="block.id"
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

<script setup lang="ts">
import { MoreFilled, Plus, Delete } from '@element-plus/icons-vue'
import InteractiveTable from './InteractiveTable.vue'
import InteractiveCanvas from './InteractiveCanvas.vue'
import type { Block, BlockType, InteractiveTableData, InteractiveCanvasData } from '@/types'

interface Props {
  block: Block
  activeBlockId: string | null
  defaultTableData: InteractiveTableData
  defaultCanvasData: InteractiveCanvasData
}

interface Emits {
  (e: 'update', block: Block): void
  (e: 'delete', blockId: string): void
  (e: 'focus', blockId: string): void
  (e: 'click', blockId: string, e: MouseEvent): void
  (e: 'content-input', blockId: string, e: Event): void
  (e: 'keydown', blockId: string, e: KeyboardEvent): void
  (e: 'slash-menu', blockId: string, e: MouseEvent): void
  (e: 'table-update', blockId: string, data: InteractiveTableData): void
  (e: 'canvas-update', blockId: string, data: InteractiveCanvasData): void
  (e: 'todo-check', blockId: string, checked: boolean): void
  (e: 'paste', blockId: string, e: ClipboardEvent): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

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
    canvas: '',
    divider: '',
  }
  return placeholders[type] || '输入内容...'
}

function handleContentInput(blockId: string, e: Event) {
  emit('content-input', blockId, e)
}

function handleKeyDown(blockId: string, e: KeyboardEvent) {
  emit('keydown', blockId, e)
}

function handleTodoCheck(blockId: string, checked: boolean) {
  emit('todo-check', blockId, checked)
}

function updateBlockTable(blockId: string, data: InteractiveTableData) {
  emit('table-update', blockId, data)
}

function updateBlockCanvas(blockId: string, data: InteractiveCanvasData) {
  emit('canvas-update', blockId, data)
}

function deleteBlock(blockId: string) {
  emit('delete', blockId)
}

function showSlashMenu(blockId: string, e: MouseEvent) {
  emit('slash-menu', blockId, e)
}

function handleBlockClick(blockId: string, e: MouseEvent) {
  emit('click', blockId, e)
}

function handleBlockFocus(blockId: string) {
  emit('focus', blockId)
}

function handlePaste(blockId: string, e: ClipboardEvent) {
  emit('paste', blockId, e)
}
</script>

<style lang="scss" scoped>
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
  white-space: pre-wrap;
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
</style>
