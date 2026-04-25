<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-menu-mask"
      @click="handleClose"
      @contextmenu.prevent
    >
      <div
        class="context-menu"
        :style="menuStyle"
        @click.stop
      >
        <div
          v-if="!node || node.type === 'folder'"
          class="context-menu-item"
          @click="handleAddFolder"
        >
          <el-icon><FolderAdd /></el-icon>
          <span>新建文件夹</span>
        </div>
        
        <div
          class="context-menu-item"
          @click="handleAddDocument"
        >
          <el-icon><DocumentAdd /></el-icon>
          <span>新建文档</span>
        </div>
        
        <div v-if="node" class="context-menu-divider"></div>
        
        <div
          v-if="node"
          class="context-menu-item"
          @click="handleRename"
        >
          <el-icon><Edit /></el-icon>
          <span>重命名</span>
        </div>
        
        <div
          v-if="node"
          class="context-menu-item is-danger"
          @click="handleDelete"
        >
          <el-icon><Delete /></el-icon>
          <span>删除</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import {
  FolderAdd,
  DocumentAdd,
  Edit,
  Delete,
} from '@element-plus/icons-vue'
import type { TreeNode } from '@/types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    x: number
    y: number
    node: TreeNode | null
    isRoot: boolean
  }>(),
  {
    node: null,
    isRoot: false,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'add-folder': [parentNode: TreeNode | null]
  'add-document': [parentNode: TreeNode | null]
  'rename': [node: TreeNode]
  'delete': [node: TreeNode]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const menuStyle = computed(() => {
  const maxWidth = window.innerWidth
  const maxHeight = window.innerHeight
  const menuWidth = 160
  const menuHeight = 200
  
  let left = props.x
  let top = props.y
  
  if (left + menuWidth > maxWidth) {
    left = maxWidth - menuWidth - 10
  }
  
  if (top + menuHeight > maxHeight) {
    top = maxHeight - menuHeight - 10
  }
  
  return {
    left: `${left}px`,
    top: `${top}px`,
  }
})

watch(visible, (val) => {
  if (val) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})

function handleClose() {
  visible.value = false
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleClose()
  }
}

function handleAddFolder() {
  emit('add-folder', props.node)
  handleClose()
}

function handleAddDocument() {
  emit('add-document', props.node)
  handleClose()
}

function handleRename() {
  if (props.node) {
    emit('rename', props.node)
  }
  handleClose()
}

function handleDelete() {
  if (props.node) {
    emit('delete', props.node)
  }
  handleClose()
}
</script>

<style lang="scss" scoped>
.context-menu-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

.context-menu {
  position: absolute;
  min-width: 160px;
  padding: 4px 0;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 10000;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f5f7fa;
    color: #409eff;
  }
  
  &.is-danger {
    &:hover {
      color: #f56c6c;
    }
  }
  
  .el-icon {
    margin-right: 8px;
    font-size: 14px;
  }
}

.context-menu-divider {
  height: 1px;
  margin: 4px 0;
  background-color: #e4e7ed;
}
</style>
