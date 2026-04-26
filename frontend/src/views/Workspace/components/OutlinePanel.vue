<template>
  <div class="outline-panel" v-if="outlines.length > 0">
    <div class="outline-header">
      <span class="outline-title">大纲</span>
    </div>
    <div class="outline-content">
      <div
        v-for="(item, index) in outlines"
        :key="`${item.id}-${index}`"
        class="outline-item"
        :class="`outline-h${item.level}`"
        @click="handleItemClick(item)"
      >
        <span class="outline-dot" v-if="item.level > 1"></span>
        <span class="outline-text">{{ item.content }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Block } from '@/types'

interface OutlineItem {
  id: string
  level: number
  content: string
  block: Block
  index: number
}

interface Props {
  blocks: Block[]
}

const props = defineProps<Props>()

const outlines = computed<OutlineItem[]>(() => {
  const items: OutlineItem[] = []
  
  props.blocks.forEach((block, index) => {
    if (block.type.startsWith('h') && /^h[1-6]$/.test(block.type)) {
      const level = parseInt(block.type.charAt(1))
      items.push({
        id: block.id,
        level,
        content: block.content || '未命名标题',
        block,
        index,
      })
    }
  })
  
  return items
})

function handleItemClick(item: OutlineItem) {
  const targetElement = document.querySelector(`[data-block-id="${item.id}"]`)
  if (targetElement) {
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    targetElement.focus()
  }
}
</script>

<style lang="scss" scoped>
.outline-panel {
  width: 220px;
  min-width: 220px;
  border-left: 1px solid #e4e7ed;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.outline-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fff;
}

.outline-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.outline-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.outline-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  transition: all 0.2s;
  
  &:hover {
    background-color: #ecf5ff;
    color: #409eff;
  }
}

.outline-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: #c0c4cc;
  margin-right: 8px;
  flex-shrink: 0;
}

.outline-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-h1 {
  font-weight: 600;
  color: #303133;
  font-size: 15px;
  
  .outline-dot {
    display: none;
  }
}

.outline-h2 {
  padding-left: 16px;
}

.outline-h3 {
  padding-left: 32px;
}

.outline-h4 {
  padding-left: 48px;
}

.outline-h5 {
  padding-left: 64px;
}

.outline-h6 {
  padding-left: 80px;
}
</style>
