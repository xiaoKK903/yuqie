<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="slash-menu-overlay"
      @click="handleOverlayClick"
    >
      <div
        class="slash-menu"
        :style="menuStyle"
        ref="menuRef"
      >
        <div class="slash-menu-header">
          <el-input
            v-model="searchText"
            placeholder="输入命令..."
            prefix-icon="Search"
            size="small"
            clearable
          />
        </div>
        
        <div class="slash-menu-content" ref="contentRef">
          <div class="menu-section">
            <div class="section-title">常用格式</div>
            <div
              v-for="item in filteredFormatItems"
              :key="item.key"
              class="menu-item"
              :class="{ active: highlightedKey === item.key }"
              @mouseenter="highlightItem(item.key)"
              @click="selectItem(item)"
            >
              <span class="item-icon">{{ item.icon }}</span>
              <span class="item-label">{{ item.label }}</span>
              <span class="item-shortcut" v-if="item.shortcut">{{ item.shortcut }}</span>
            </div>
          </div>
          
          <div class="menu-section">
            <div class="section-title">基础</div>
            <div
              v-for="item in filteredBaseItems"
              :key="item.key"
              class="menu-item"
              :class="{ active: highlightedKey === item.key }"
              @mouseenter="highlightItem(item.key)"
              @click="selectItem(item)"
            >
              <span class="item-icon large">{{ item.icon }}</span>
              <span class="item-label">{{ item.label }}</span>
              
              <div
                v-if="item.key === 'table'"
                class="table-dropdown"
                v-show="tableDropdownVisible"
              >
                <TableSelector @select="handleTableSelect" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import TableSelector from './TableSelector.vue'

interface MenuItem {
  key: string
  icon: string
  label: string
  shortcut?: string
  type: 'format' | 'base'
  markdown: string
  cursorOffset: number
}

const props = defineProps<{
  visible: boolean
  position: { x: number; y: number }
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'insert', markdown: string, cursorOffset: number): void
  (e: 'upload', type: 'image' | 'attachment'): void
}>()

const menuRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const searchText = ref('')
const highlightedKey = ref<string>('')
const tableDropdownVisible = ref(false)

const formatItems: MenuItem[] = [
  { key: 'text', icon: 'T', label: '文本', shortcut: '', type: 'format', markdown: '', cursorOffset: 0 },
  { key: 'h1', icon: 'H1', label: '标题 1', shortcut: '#', type: 'format', markdown: '# ', cursorOffset: 2 },
  { key: 'h2', icon: 'H2', label: '标题 2', shortcut: '##', type: 'format', markdown: '## ', cursorOffset: 3 },
  { key: 'h3', icon: 'H3', label: '标题 3', shortcut: '###', type: 'format', markdown: '### ', cursorOffset: 4 },
  { key: 'h4', icon: 'H4', label: '标题 4', shortcut: '####', type: 'format', markdown: '#### ', cursorOffset: 5 },
  { key: 'h5', icon: 'H5', label: '标题 5', shortcut: '#####', type: 'format', markdown: '##### ', cursorOffset: 6 },
  { key: 'h6', icon: 'H6', label: '标题 6', shortcut: '######', type: 'format', markdown: '###### ', cursorOffset: 7 },
  { key: 'bullet', icon: '☰', label: '无序列表', shortcut: '-', type: 'format', markdown: '- ', cursorOffset: 2 },
  { key: 'numbered', icon: '☲', label: '有序列表', shortcut: '1.', type: 'format', markdown: '1. ', cursorOffset: 3 },
  { key: 'todo', icon: '☑', label: '待办清单', shortcut: '- [ ]', type: 'format', markdown: '- [ ] ', cursorOffset: 6 },
  { key: 'link', icon: '🔗', label: '链接', shortcut: '[]()', type: 'format', markdown: '[]()', cursorOffset: 1 },
  { key: 'code', icon: '</>', label: '代码块', shortcut: '```', type: 'format', markdown: '```\n\n```', cursorOffset: 4 },
]

const baseItems: MenuItem[] = [
  { key: 'image', icon: '🖼️', label: '图片', type: 'base', markdown: '', cursorOffset: 0 },
  { key: 'table', icon: '📋', label: '表格', type: 'base', markdown: '', cursorOffset: 0 },
  { key: 'attachment', icon: '📎', label: '附件', type: 'base', markdown: '', cursorOffset: 0 },
  { key: 'status', icon: '🏷️', label: '状态', type: 'base', markdown: '', cursorOffset: 0 },
]

const filteredFormatItems = computed(() => {
  if (!searchText.value) return formatItems
  const keyword = searchText.value.toLowerCase()
  return formatItems.filter(item => 
    item.label.toLowerCase().includes(keyword) || 
    item.shortcut?.includes(keyword)
  )
})

const filteredBaseItems = computed(() => {
  if (!searchText.value) return baseItems
  const keyword = searchText.value.toLowerCase()
  return baseItems.filter(item => 
    item.label.toLowerCase().includes(keyword)
  )
})

const menuStyle = computed(() => {
  return {
    left: `${props.position.x}px`,
    top: `${props.position.y}px`,
  }
})

function highlightItem(key: string) {
  highlightedKey.value = key
  if (key === 'table') {
    tableDropdownVisible.value = true
  } else {
    tableDropdownVisible.value = false
  }
}

function selectItem(item: MenuItem) {
  if (item.key === 'image') {
    emit('upload', 'image')
  } else if (item.key === 'attachment') {
    emit('upload', 'attachment')
  } else if (item.key === 'table') {
    tableDropdownVisible.value = !tableDropdownVisible.value
    return
  } else if (item.key === 'status') {
    const statusMarkdown = '`状态`'
    emit('insert', statusMarkdown, 1)
  } else {
    emit('insert', item.markdown, item.cursorOffset)
  }
}

function handleTableSelect(rows: number, cols: number) {
  let markdown = '\n'
  for (let i = 0; i < rows; i++) {
    let row = '|'
    for (let j = 0; j < cols; j++) {
      row += ` 列${j + 1} |`
    }
    markdown += row + '\n'
    
    if (i === 0) {
      let separator = '|'
      for (let j = 0; j < cols; j++) {
        separator += ' --- |'
      }
      markdown += separator + '\n'
    }
  }
  
  emit('insert', markdown, 2)
  tableDropdownVisible.value = false
}

function handleOverlayClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.slash-menu')) {
    emit('close')
  }
}

watch(() => props.visible, (val) => {
  if (val) {
    searchText.value = ''
    if (filteredFormatItems.value.length > 0) {
      highlightedKey.value = filteredFormatItems.value[0].key
    }
    tableDropdownVisible.value = false
    
    nextTick(() => {
      const menu = menuRef.value
      if (menu) {
        const rect = menu.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        
        if (rect.right > viewportWidth) {
          menu.style.left = `${Math.max(0, viewportWidth - rect.width - 10)}px`
        }
        if (rect.bottom > viewportHeight) {
          menu.style.top = `${Math.max(0, viewportHeight - rect.height - 10)}px`
        }
      }
    })
  }
})

onMounted(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.visible) return
    
    const allItems = [...filteredFormatItems.value, ...filteredBaseItems.value]
    if (allItems.length === 0) return
    
    const currentIndex = allItems.findIndex(item => item.key === highlightedKey.value)
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (currentIndex + 1) % allItems.length
      highlightedKey.value = allItems[nextIndex].key
      if (highlightedKey.value !== 'table') {
        tableDropdownVisible.value = false
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (currentIndex - 1 + allItems.length) % allItems.length
      highlightedKey.value = allItems[prevIndex].key
      if (highlightedKey.value !== 'table') {
        tableDropdownVisible.value = false
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selectedItem = allItems.find(item => item.key === highlightedKey.value)
      if (selectedItem) {
        selectItem(selectedItem)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      emit('close')
    }
  }
  
  document.addEventListener('keydown', handleKeyDown)
  return () => {
    document.removeEventListener('keydown', handleKeyDown)
  }
})
</script>

<style lang="scss" scoped>
.slash-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

.slash-menu {
  position: fixed;
  min-width: 280px;
  max-width: 320px;
  max-height: 400px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  z-index: 10000;
}

.slash-menu-header {
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.slash-menu-content {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.menu-section {
  .section-title {
    padding: 8px 16px 4px;
    font-size: 12px;
    color: #909399;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  
  &:hover, &.active {
    background-color: #f5f7fa;
  }
  
  .item-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    color: #606266;
    background: #f4f4f5;
    border-radius: 4px;
    margin-right: 12px;
    flex-shrink: 0;
    
    &.large {
      width: 36px;
      height: 36px;
      font-size: 18px;
      background: transparent;
    }
  }
  
  .item-label {
    flex: 1;
    font-size: 14px;
    color: #303133;
  }
  
  .item-shortcut {
    font-size: 12px;
    color: #909399;
    background: #f4f4f5;
    padding: 2px 6px;
    border-radius: 4px;
  }
  
  .table-dropdown {
    position: absolute;
    left: 100%;
    top: 0;
    margin-left: 8px;
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    border: 1px solid #e4e7ed;
    z-index: 10001;
  }
}
</style>
