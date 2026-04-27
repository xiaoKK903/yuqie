<template>
  <div
    class="tree-node"
    :class="{
      'is-active': node.isActive,
      'is-dragging': isDragging,
      'is-drop-indicator': dropIndicator,
      'drop-before': dropIndicator === 'before',
      'drop-after': dropIndicator === 'after',
      'drop-inside': dropIndicator === 'inside',
    }"
  >
    <div
      class="tree-node-content"
      @click.prevent="handleClick"
      @contextmenu.prevent="handleContextMenu"
      draggable="true"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <div
        class="tree-node-indent"
        v-for="i in level"
        :key="i"
      ></div>
      <div
        class="tree-node-expand"
        :class="{ 'is-expanded': node.isExpanded, 'is-empty': isEmpty }"
        @click.stop="handleToggle"
      >
        <el-icon v-if="!isEmpty">
          <CaretRight />
        </el-icon>
      </div>
      <div class="tree-node-icon">
        <el-icon v-if="node.type === 'folder'">
          <Folder v-if="!node.isExpanded" />
          <FolderOpened v-else />
        </el-icon>
        <el-icon v-else>
          <Document />
        </el-icon>
      </div>
      <div class="tree-node-label">
        {{ node.name }}
      </div>
      <div 
        class="tree-node-more" 
        @click.stop="handleMoreClick"
        @contextmenu.stop.prevent
      >
        <el-icon><MoreFilled /></el-icon>
      </div>
    </div>
    
    <div
      v-if="node.isExpanded && node.children && node.children.length > 0"
      class="tree-node-children"
    >
      <TreeNode
        v-for="child in node.children"
        :key="`${child.type}-${child.id}`"
        :node="child"
        :level="level + 1"
        @select="handleChildSelect"
        @toggle="handleChildToggle"
        @contextmenu="handleChildContextMenu"
        @drop="handleChildDrop"
        @more="handleChildMore"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  CaretRight,
  Folder,
  FolderOpened,
  Document,
  MoreFilled,
} from '@element-plus/icons-vue'
import type { TreeNode } from '@/types'

const props = defineProps<{
  node: TreeNode
  level: number
}>()

const emit = defineEmits<{
  select: [node: TreeNode]
  toggle: [node: TreeNode]
  contextmenu: [e: MouseEvent, node: TreeNode]
  more: [e: MouseEvent, node: TreeNode]
  drop: [params: {
    sourceId: number
    sourceType: 'folder' | 'document'
    targetId: number | null
    targetType: 'folder' | 'document' | null
    position: 'before' | 'after' | 'inside'
  }]
}>()

const isDragging = ref(false)
const dropIndicator = ref<'before' | 'after' | 'inside' | null>(null)

const isEmpty = computed(() => {
  return !props.node.children || props.node.children.length === 0
})

function getDraggedData(e: DragEvent): { id: number; type: 'folder' | 'document' } | null {
  if (!e.dataTransfer) return null
  const data = e.dataTransfer.getData('application/tree-node')
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

function handleClick() {
  emit('select', props.node)
}

function handleToggle() {
  if (!isEmpty.value) {
    emit('toggle', props.node)
  }
}

function handleContextMenu(e: MouseEvent) {
  emit('contextmenu', { e, node: props.node })
}

function handleChildSelect(node: TreeNode) {
  emit('select', node)
}

function handleChildToggle(node: TreeNode) {
  emit('toggle', node)
}

function handleChildContextMenu(payload: { e: MouseEvent; node: TreeNode }) {
  emit('contextmenu', payload)
}

function handleMoreClick(e: MouseEvent) {
  emit('more', { e, node: props.node })
}

function handleChildMore(payload: { e: MouseEvent; node: TreeNode }) {
  emit('more', payload)
}

function handleChildDrop(params: {
  sourceId: number
  sourceType: 'folder' | 'document'
  targetId: number | null
  targetType: 'folder' | 'document' | null
  position: 'before' | 'after' | 'inside'
}) {
  emit('drop', params)
}

function handleDragStart(e: DragEvent) {
  isDragging.value = true
  const data = {
    id: props.node.id,
    type: props.node.type,
  }
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/tree-node', JSON.stringify(data))
  }
}

function handleDragEnd() {
  isDragging.value = false
  dropIndicator.value = null
}

function handleDragOver(e: DragEvent) {
  const draggedData = getDraggedData(e)
  if (!draggedData || draggedData.id === props.node.id) {
    return
  }
  
  if (draggedData.type === 'folder' && props.node.type === 'document') {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height
    
    if (y < height * 0.33) {
      dropIndicator.value = 'before'
    } else if (y > height * 0.66) {
      dropIndicator.value = 'after'
    } else {
      dropIndicator.value = null
    }
    return
  }
  
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  const y = e.clientY - rect.top
  const height = rect.height
  
  if (y < height * 0.25) {
    dropIndicator.value = 'before'
  } else if (y > height * 0.75) {
    dropIndicator.value = 'after'
  } else {
    dropIndicator.value = 'inside'
  }
}

function handleDragLeave() {
  dropIndicator.value = null
}

function handleDrop(e: DragEvent) {
  const draggedData = getDraggedData(e)
  if (!draggedData || !dropIndicator.value) {
    return
  }
  
  if (draggedData.type === 'folder' && props.node.type === 'folder') {
    if (isDescendant(props.node.id, draggedData.id)) {
      return
    }
  }
  
  emit('drop', {
    sourceId: draggedData.id,
    sourceType: draggedData.type,
    targetId: props.node.id,
    targetType: props.node.type,
    position: dropIndicator.value,
  })
  
  dropIndicator.value = null
}

function isDescendant(folderId: number, ancestorId: number): boolean {
  if (folderId === ancestorId) return true
  if (!props.node.children) return false
  
  const checkChildren = (nodes: TreeNode[]): boolean => {
    for (const node of nodes) {
      if (node.id === ancestorId && node.type === 'folder') return true
      if (node.children && checkChildren(node.children)) return true
    }
    return false
  }
  
  return checkChildren(props.node.children)
}
</script>

<style lang="scss" scoped>
.tree-node {
  position: relative;
}

.tree-node-content {
  display: flex;
  align-items: center;
  height: 32px;
  padding-right: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(64, 158, 255, 0.1);
  }
}

.tree-node.is-active .tree-node-content {
  background-color: #ecf5ff;
}

.tree-node.is-dragging {
  opacity: 0.5;
}

.tree-node.drop-before {
  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 2px;
    background-color: #409eff;
    z-index: 10;
  }
}

.tree-node.drop-after {
  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    background-color: #409eff;
    z-index: 10;
  }
}

.tree-node.drop-inside .tree-node-content {
  outline: 2px solid #409eff;
  outline-offset: -2px;
}

.tree-node-indent {
  width: 24px;
  height: 100%;
  flex-shrink: 0;
}

.tree-node-expand {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &.is-empty {
    opacity: 0;
    pointer-events: none;
  }
  
  &.is-expanded .el-icon {
    transform: rotate(90deg);
  }
  
  .el-icon {
    font-size: 12px;
    color: #909399;
    transition: transform 0.2s;
  }
}

.tree-node-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .el-icon {
    font-size: 16px;
    color: #606266;
  }
}

.tree-node-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #303133;
  margin-left: 4px;
}

.tree-node-more {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
  
  .el-icon {
    font-size: 14px;
    color: #909399;
    transform: rotate(90deg);
  }
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    
    .el-icon {
      color: #606266;
    }
  }
}

.tree-node-content:hover .tree-node-more {
  opacity: 1;
}

.tree-node-children {
  padding-left: 24px;
}
</style>
