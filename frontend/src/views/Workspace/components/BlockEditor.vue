<template>
  <div class="block-editor" ref="editorRef" @click="handleEditorClick">
    <BlockItem
      v-for="(block, index) in blocks"
      :key="block.id"
      :block="block"
      :active-block-id="activeBlockId"
      :default-table-data="createDefaultTable()"
      @click="handleBlockClick"
      @focus="handleBlockFocus"
      @content-input="handleContentInput"
      @keydown="handleKeyDown"
      @delete="deleteBlock"
      @slash-menu="showSlashMenu"
      @table-update="updateBlockTable"
      @todo-check="handleTodoCheck"
    />

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
import { ref, watch, computed } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import BlockItem from './BlockItem.vue'
import SlashMenu from './SlashMenu.vue'
import { useBlockEditor } from './useBlockEditor'
import type { Block, BlockType, InteractiveTableData } from '@/types'

const props = defineProps<{
  modelValue: Block[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Block[]): void
}>()

const editorRef = ref<HTMLElement | null>(null)

const {
  blocks,
  activeBlockId,
  slashMenuVisible,
  slashMenuPosition,
  slashMenuTargetBlockId,
  uploadDialogVisible,
  uploadType,
  syncBlockContentToDOM,
  getPlaceholder,
  createBlock,
  createDefaultTable,
  addFirstBlock,
  handleContentInput,
  handleKeyDown,
  handleTodoCheck,
  updateBlockTable,
  deleteBlock,
  showSlashMenu,
  hideSlashMenu,
  handleSlashMenuInsert,
  handleTableSelect,
  handleSlashMenuUpload,
  handleFileUpload,
  getActiveBlockIndex,
  setCurrentBlockType,
  addBlockAfterActive,
  insertTableWithSize,
  applyInlineStyle,
  handleEditorClick,
  handleBlockClick,
  handleBlockFocus,
} = useBlockEditor(props.modelValue)

watch(() => props.modelValue, (newVal) => {
  isSyncingFromProps = true
  blocks.value = JSON.parse(JSON.stringify(newVal || []))
  syncBlockContentToDOM()
  setTimeout(() => {
    isSyncingFromProps = false
  }, 100)
}, { deep: true })

watch(blocks, (newVal) => {
  emit('update:modelValue', JSON.parse(JSON.stringify(newVal)))
}, { deep: true })

function setCurrentBlockTypeAndRefresh(type: BlockType) {
  setCurrentBlockType(type)
}

function addBlockAfterActiveAndRefresh(type: BlockType) {
  addBlockAfterActive(type)
}

function insertTableWithSizeAndRefresh(rows: number, cols: number) {
  insertTableWithSize(rows, cols)
}

defineExpose({
  setCurrentBlockType: setCurrentBlockTypeAndRefresh,
  addBlockAfterActive: addBlockAfterActiveAndRefresh,
  insertTableWithSize: insertTableWithSizeAndRefresh,
  applyInlineStyle,
  getActiveBlockIndex,
})
</script>

<style lang="scss" scoped>
.block-editor {
  min-height: 400px;
  padding: 16px;
  font-size: inherit;
  font-family: inherit;
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
