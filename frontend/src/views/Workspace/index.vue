<template>
  <div class="workspace-layout">
    <div class="sidebar">
      <div class="sidebar-top">
        <div class="back-btn" @click="router.push('/')" title="返回首页">
          <el-icon><ArrowLeft /></el-icon>
        </div>
        <div class="km-title" v-if="currentKm">
          {{ currentKm.name }}
        </div>
      </div>
      <div class="sidebar-header">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索文档..."
          clearable
          prefix-icon="Search"
          @input="handleSearch"
        />
      </div>
      <div class="sidebar-toolbar">
        <el-button text :icon="FolderAdd" @click="addRootFolder">
          新建文件夹
        </el-button>
        <el-button text :icon="DocumentAdd" @click="addRootDocument">
          新建文档
        </el-button>
      </div>
      <div class="tree-container" @contextmenu.prevent="handleRootContextMenu">
        <template v-if="!loading && treeData.length > 0">
          <TreeNode
            v-for="node in filteredTreeData"
            :key="`${node.type}-${node.id}`"
            :node="node"
            :level="0"
            @select="handleNodeSelect"
            @toggle="handleToggle"
            @contextmenu="handleContextMenu"
            @drop="handleDrop"
          />
        </template>
        <el-empty v-else-if="!loading" description="暂无文档，点击上方按钮新建" />
        <div v-else class="loading-container">
          <el-icon class="is-loading" size="32"><Loading /></el-icon>
        </div>
      </div>
    </div>
    <div class="main-content">
      <template v-if="currentDocument">
        <div class="doc-header">
          <h2 class="doc-title">
            <el-input
              v-model="editTitle"
              :placeholder="currentDocument.title || '未命名文档'"
              @blur="saveTitle"
              @keyup.enter="saveTitle"
              @keyup.esc="cancelEditTitle"
            />
          </h2>
          <div class="doc-meta">
            <span class="save-status" :class="saveStatus">
              <template v-if="saveStatus === 'saved'">
                <el-icon><Check /></el-icon>
                <span>已保存</span>
              </template>
              <template v-else-if="saveStatus === 'saving'">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>保存中...</span>
              </template>
              <template v-else-if="saveStatus === 'unsaved'">
                <el-icon><CircleClose /></el-icon>
                <span>未保存</span>
              </template>
              <template v-else-if="saveStatus === 'error'">
                <el-icon><Warning /></el-icon>
                <span>保存失败</span>
              </template>
            </span>
            <span class="version-btn" @click="versionHistoryVisible = true">
              <el-icon><Operation /></el-icon>
              <span>版本历史</span>
            </span>
            <span>最后更新: {{ formatTime(currentDocument.updatedAt) }}</span>
          </div>
        </div>
        
        <VersionHistory
          v-model="versionHistoryVisible"
          :document-id="currentDocument?.id || null"
          :current-content="editContent"
          @restore="handleVersionRestore"
        />
        
        <div class="editor-toolbar">
          <div class="toolbar-group">
            <el-tooltip content="撤销 (Ctrl+Z)" placement="bottom">
              <el-button 
                text 
                :disabled="!canUndo" 
                @click="handleUndo"
                class="toolbar-btn"
              >
                <el-icon><ArrowLeft /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="重做 (Ctrl+Y)" placement="bottom">
              <el-button 
                text 
                :disabled="!canRedo" 
                @click="handleRedo"
                class="toolbar-btn"
              >
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
          
          <div class="toolbar-divider"></div>
          
          <div class="toolbar-group">
            <el-select 
              v-model="fontFamily" 
              placeholder="字体" 
              clearable 
              style="width: 120px;"
              size="small"
              @change="handleFontFamilyChange"
            >
              <el-option label="默认字体" value="default" />
              <el-option label="宋体" value="SimSun" />
              <el-option label="微软雅黑" value="Microsoft YaHei" />
              <el-option label="黑体" value="SimHei" />
              <el-option label="楷体" value="KaiTi" />
              <el-option label="等宽字体" value="monospace" />
            </el-select>
          </div>
          
          <div class="toolbar-group">
            <el-select 
              v-model="fontSize" 
              placeholder="字号"
              size="small"
              style="width: 80px;"
              @change="handleFontSizeChange"
            >
              <el-option label="10" :value="10" />
              <el-option label="12" :value="12" />
              <el-option label="13" :value="13" />
              <el-option label="14" :value="14" />
              <el-option label="16" :value="16" />
              <el-option label="18" :value="18" />
              <el-option label="20" :value="20" />
              <el-option label="24" :value="24" />
              <el-option label="28" :value="28" />
              <el-option label="32" :value="32" />
              <el-option label="36" :value="36" />
              <el-option label="48" :value="48" />
              <el-option label="64" :value="64" />
              <el-option label="72" :value="72" />
            </el-select>
          </div>
          
          <div class="toolbar-divider"></div>
          
          <div class="toolbar-group">
            <el-tooltip content="加粗 (Ctrl+B)" placement="bottom">
              <el-button 
                text 
                @click="handleBold"
                class="toolbar-btn format-btn"
                :class="{ 'format-btn-active': isBoldActive }"
              >
                <strong>B</strong>
              </el-button>
            </el-tooltip>
            <el-tooltip content="斜体 (Ctrl+I)" placement="bottom">
              <el-button 
                text 
                @click="handleItalic"
                class="toolbar-btn format-btn"
                :class="{ 'format-btn-active': isItalicActive }"
              >
                <em>I</em>
              </el-button>
            </el-tooltip>
            <el-tooltip content="删除线" placement="bottom">
              <el-button 
                text 
                @click="handleStrikethrough"
                class="toolbar-btn format-btn"
                :class="{ 'format-btn-active': isStrikethroughActive }"
              >
                <span style="text-decoration: line-through;">S</span>
              </el-button>
            </el-tooltip>
            <el-tooltip content="下划线 (Ctrl+U)" placement="bottom">
              <el-button 
                text 
                @click="handleUnderline"
                class="toolbar-btn format-btn"
                :class="{ 'format-btn-active': isUnderlineActive }"
              >
                <span style="text-decoration: underline;">U</span>
              </el-button>
            </el-tooltip>
          </div>
          
          <div class="toolbar-divider"></div>
          
          <div class="toolbar-group">
            <el-tooltip content="标题 H1" placement="bottom">
              <el-button text @click="insertHeading(1)" class="toolbar-btn">
                <span style="font-size: 18px; font-weight: bold;">H1</span>
              </el-button>
            </el-tooltip>
            <el-tooltip content="标题 H2" placement="bottom">
              <el-button text @click="insertHeading(2)" class="toolbar-btn">
                <span style="font-size: 16px; font-weight: bold;">H2</span>
              </el-button>
            </el-tooltip>
            <el-tooltip content="标题 H3" placement="bottom">
              <el-button text @click="insertHeading(3)" class="toolbar-btn">
                <span style="font-size: 14px; font-weight: bold;">H3</span>
              </el-button>
            </el-tooltip>
          </div>
          
          <div class="toolbar-divider"></div>
          
          <div class="toolbar-group">
            <el-tooltip content="代码块" placement="bottom">
              <el-button text @click="insertCodeBlock" class="toolbar-btn">
                <el-icon><Share /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="无序列表" placement="bottom">
              <el-button text @click="insertList" class="toolbar-btn">
                <el-icon><List /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="有序列表" placement="bottom">
              <el-button text @click="insertOrderedList" class="toolbar-btn">
                <el-icon><Operation /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="引用" placement="bottom">
              <el-button text @click="insertQuote" class="toolbar-btn">
                <el-icon><ChatDotRound /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="链接" placement="bottom">
              <el-button text @click="insertLink" class="toolbar-btn">
                <el-icon><Link /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="分割线" placement="bottom">
              <el-button text @click="insertHR" class="toolbar-btn">
                <el-icon><Minus /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>
        
        <div class="doc-content">
          <div class="editor-pane wysiwyg-editor" :style="editorStyle">
            <BlockEditor
              ref="blockEditorRef"
              v-model="editorBlocks"
              v-if="useBlockEditor"
            />
            <textarea
              v-else
              ref="editorRef"
              v-model="editContent"
              class="markdown-editor"
              :style="editorStyle"
              placeholder="开始编写文档，支持 Markdown 语法...&#10;&#10;示例：&#10;# 一级标题&#10;## 二级标题&#10;**粗体文字**&#10;*斜体文字*&#10;&#10;输入 ``` 并回车可创建代码块"
              @input="handleContentChange"
              @keydown="handleKeyDown"
              @click="saveCursorPosition"
              @blur="saveCursorPosition"
            />
          </div>
          <OutlinePanel
            v-if="useBlockEditor"
            :blocks="editorBlocks"
          />
        </div>
      </template>
      <div v-else class="empty-content">
        <el-empty description="选择或创建一个文档开始编辑">
          <el-button type="primary" :icon="DocumentAdd" @click="addRootDocument">
            新建文档
          </el-button>
        </el-empty>
      </div>
    </div>
  </div>
  
  <ContextMenu
    v-model="contextMenu.visible"
    :x="contextMenu.x"
    :y="contextMenu.y"
    :node="contextMenu.node"
    :is-root="contextMenu.isRoot"
    @add-folder="handleAddFolder"
    @add-document="handleAddDocument"
    @rename="handleRename"
    @delete="handleDelete"
  />
  
  <SlashMenu
    :visible="slashMenuVisible"
    :position="slashMenuPosition"
    @close="hideSlashMenu"
    @insert="handleSlashMenuInsert"
    @upload="handleSlashMenuUpload"
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
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  FolderAdd,
  DocumentAdd,
  Loading,
  ArrowLeft,
  ArrowRight,
  List,
  Operation,
  ChatDotRound,
  Link,
  Minus,
  Share,
  UploadFilled,
  Check,
  CircleClose,
  Warning,
  Plus,
} from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import { useKnowledgeStore } from '@/store/knowledge'
import { folderApi, documentApi, treeApi, versionApi } from '@/api'
import type { TreeNode as TreeNodeType, InteractiveTableData, Block, BlockType, SaveStatus, DocumentVersion } from '@/types'
import TreeNode from './components/TreeNode.vue'
import ContextMenu from './components/ContextMenu.vue'
import SlashMenu from './components/SlashMenu.vue'
import InteractiveTable from './components/InteractiveTable.vue'
import BlockEditor from './components/BlockEditor.vue'
import OutlinePanel from './components/OutlinePanel.vue'
import VersionHistory from './components/VersionHistory.vue'

interface HistoryItem {
  content: string
  cursorStart: number
  cursorEnd: number
}

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  highlight: function (str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
      } catch (__) {}
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
  }
})

const store = useKnowledgeStore()
const { treeData, currentDocument, loading, activeNode, currentKm, currentKmId } = storeToRefs(store)
const { fetchTree, loadDocument, saveDocument, getAllNodes, toggleExpand, setActiveNode, fetchKmInfo } = store

const router = useRouter()
const route = useRoute()

const editorRef = ref<HTMLTextAreaElement | null>(null)
const blockEditorRef = ref<InstanceType<typeof BlockEditor> | null>(null)
const searchKeyword = ref('')
const editTitle = ref('')
const editContent = ref('')
const cursorStart = ref(0)
const cursorEnd = ref(0)

const fontFamily = ref('default')
const fontSize = ref(14)

const useBlockEditor = ref(true)
const editorBlocks = ref<Block[]>([])
const isSyncing = ref(false)

const isBoldActive = ref(false)
const isItalicActive = ref(false)
const isStrikethroughActive = ref(false)
const isUnderlineActive = ref(false)

const historyStack = ref<HistoryItem[]>([])
const historyIndex = ref(-1)
const isHistoryAction = ref(false)

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  node: null as TreeNodeType | null,
  isRoot: false,
})

const slashMenuVisible = ref(false)
const slashMenuPosition = ref({ x: 0, y: 0 })
const slashStartPos = ref(0)

const uploadDialogVisible = ref(false)
const uploadType = ref<'image' | 'attachment'>('image')

const saveStatus = ref<SaveStatus>('saved')
const saveTimer = ref<number | null>(null)
const lastSavedContent = ref('')

const versionHistoryVisible = ref(false)

interface ContentFragment {
  type: 'text' | 'table' | 'canvas'
  content: string
  tableData?: InteractiveTableData
  tableId?: string
  canvasData?: InteractiveCanvasData
  canvasId?: string
  startIndex?: number
  endIndex?: number
}

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1)

const editorStyle = computed(() => ({
  fontSize: `${fontSize.value}px`,
  fontFamily: fontFamily.value === 'default' ? 'inherit' : fontFamily.value,
}))

const previewStyle = computed(() => ({
  fontSize: `${fontSize.value}px`,
}))

function parseContentFragments(content: string): ContentFragment[] {
  const fragments: ContentFragment[] = []
  
  let lastIndex = 0
  
  function findNextSpecialBlock(startFrom: number): { type: 'table' | 'canvas' | null; index: number } {
    const tableMatch = content.indexOf(':::table', startFrom)
    const canvasMatch = content.indexOf(':::canvas', startFrom)
    
    if (tableMatch === -1 && canvasMatch === -1) {
      return { type: null, index: -1 }
    }
    
    if (tableMatch === -1) {
      return { type: 'canvas', index: canvasMatch }
    }
    
    if (canvasMatch === -1) {
      return { type: 'table', index: tableMatch }
    }
    
    return tableMatch < canvasMatch 
      ? { type: 'table', index: tableMatch }
      : { type: 'canvas', index: canvasMatch }
  }
  
  while (true) {
    const nextBlock = findNextSpecialBlock(lastIndex)
    
    if (nextBlock.type === null) {
      const remainingContent = content.substring(lastIndex)
      if (remainingContent.trim()) {
        fragments.push({
          type: 'text',
          content: remainingContent,
        })
      }
      break
    }
    
    const beforeBlock = content.substring(lastIndex, nextBlock.index)
    if (beforeBlock.trim()) {
      fragments.push({
        type: 'text',
        content: beforeBlock,
      })
    }
    
    const blockStartLineMatch = content.match(
      new RegExp(`^:::${nextBlock.type}\\s*$`, 'm')
    )
    if (!blockStartLineMatch) {
      lastIndex = nextBlock.index + 3
      continue
    }
    
    const startIndex = nextBlock.index
    const blockStartEnd = startIndex + blockStartLineMatch[0].length
    
    const afterBlockStart = content.substring(blockStartEnd)
    const endMatch = /^:::\s*$/m.exec(afterBlockStart)
    
    if (endMatch) {
      const blockJsonStr = afterBlockStart.substring(0, endMatch.index).trim()
      const blockEndIndex = blockStartEnd + endMatch.index + endMatch[0].length
      
      try {
        if (nextBlock.type === 'table') {
          const tableData = JSON.parse(blockJsonStr) as InteractiveTableData
          fragments.push({
            type: 'table',
            content: blockJsonStr,
            tableData,
            tableId: tableData.id,
            startIndex,
            endIndex: blockEndIndex,
          })
        } else if (nextBlock.type === 'canvas') {
          const canvasData = JSON.parse(blockJsonStr) as InteractiveCanvasData
          fragments.push({
            type: 'canvas',
            content: blockJsonStr,
            canvasData,
            canvasId: canvasData.id,
            startIndex,
            endIndex: blockEndIndex,
          })
        }
        lastIndex = blockEndIndex
      } catch (e) {
        fragments.push({
          type: 'text',
          content: content.substring(startIndex, blockEndIndex),
        })
        lastIndex = blockEndIndex
      }
    } else {
      fragments.push({
        type: 'text',
        content: content.substring(startIndex),
      })
      lastIndex = content.length
      break
    }
  }
  
  return fragments
}

function generateBlockId(): string {
  return 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

function createBlock(type: BlockType, content: string = '', meta?: Block['meta']): Block {
  return {
    id: generateBlockId(),
    type,
    content,
    meta,
  }
}

function createDefaultTable(): InteractiveTableData {
  const cols = 3
  const rows = 3
  
  const columns = []
  for (let i = 0; i < cols; i++) {
    columns.push({
      id: 'col_' + (i + 1),
      width: 150,
      fieldType: 'text',
      title: `字段${i + 1}`,
    })
  }
  
  const tableRows = []
  for (let i = 0; i < rows; i++) {
    tableRows.push({
      id: 'row_' + (i + 1),
      height: 40,
    })
  }
  
  const cells = []
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      cells.push({
        rowId: 'row_' + (i + 1),
        colId: 'col_' + (j + 1),
        value: '',
      })
    }
  }
  
  return {
    id: 'table_' + Date.now(),
    columns,
    rows: tableRows,
    cells,
    mergeCells: [],
  }
}

function markdownToBlocks(markdown: string): Block[] {
  const blocks: Block[] = []
  
  if (!markdown || !markdown.trim()) {
    return [createBlock('text')]
  }
  
  const fragments = parseContentFragments(markdown)
  
  for (const fragment of fragments) {
    if (fragment.type === 'table') {
      blocks.push(createBlock('table', '', { tableData: fragment.tableData }))
    } else if (fragment.type === 'canvas') {
      blocks.push(createBlock('canvas', '', { canvasData: fragment.canvasData }))
    } else {
      const lines = fragment.content.split('\n')
      
      for (const line of lines) {
        let block: Block | null = null
        
        if (line.startsWith('# ')) {
          block = createBlock('h1', line.substring(2))
        } else if (line.startsWith('## ')) {
          block = createBlock('h2', line.substring(3))
        } else if (line.startsWith('### ')) {
          block = createBlock('h3', line.substring(4))
        } else if (line.startsWith('#### ')) {
          block = createBlock('h4', line.substring(5))
        } else if (line.startsWith('##### ')) {
          block = createBlock('h5', line.substring(6))
        } else if (line.startsWith('###### ')) {
          block = createBlock('h6', line.substring(7))
        } else if (line.startsWith('- [ ] ')) {
          block = createBlock('todo', line.substring(6), { checked: false })
        } else if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
          block = createBlock('todo', line.substring(6), { checked: true })
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          block = createBlock('bullet', line.substring(2))
        } else if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^\d+\.\s(.*)$/)
          if (match) {
            block = createBlock('numbered', match[1])
          }
        } else if (line.startsWith('> ')) {
          block = createBlock('quote', line.substring(2))
        } else if (line.startsWith('```')) {
          const lang = line.substring(3) || 'plaintext'
          block = createBlock('code', '', { language: lang })
        } else if (line.startsWith('---') || line.startsWith('***') || line.startsWith('___')) {
          block = createBlock('divider')
        } else if (line.trim()) {
          block = createBlock('text', line)
        } else if (blocks.length > 0 && blocks[blocks.length - 1].type === 'code') {
          blocks[blocks.length - 1].content += (blocks[blocks.length - 1].content ? '\n' : '') + line
          continue
        }
        
        if (block) {
          blocks.push(block)
        }
      }
    }
  }
  
  if (blocks.length === 0) {
    blocks.push(createBlock('text'))
  }
  
  return blocks
}

function blocksToMarkdown(blocks: Block[]): string {
  const lines: string[] = []
  
  for (const block of blocks) {
    switch (block.type) {
      case 'text':
        lines.push(block.content || '')
        break
      case 'h1':
        lines.push(`# ${block.content || ''}`)
        break
      case 'h2':
        lines.push(`## ${block.content || ''}`)
        break
      case 'h3':
        lines.push(`### ${block.content || ''}`)
        break
      case 'h4':
        lines.push(`#### ${block.content || ''}`)
        break
      case 'h5':
        lines.push(`##### ${block.content || ''}`)
        break
      case 'h6':
        lines.push(`###### ${block.content || ''}`)
        break
      case 'bullet':
        lines.push(`- ${block.content || ''}`)
        break
      case 'numbered':
        lines.push(`1. ${block.content || ''}`)
        break
      case 'todo': {
        const check = block.meta?.checked ? '[x]' : '[ ]'
        lines.push(`- ${check} ${block.content || ''}`)
        break
      }
      case 'quote':
        lines.push(`> ${block.content || ''}`)
        break
      case 'code': {
        const lang = block.meta?.language || 'plaintext'
        lines.push(`\`\`\`${lang}`)
        lines.push(block.content || '')
        lines.push('```')
        break
      }
      case 'divider':
        lines.push('---')
        break
      case 'table':
        if (block.meta?.tableData) {
          lines.push(':::table')
          lines.push(JSON.stringify(block.meta.tableData, null, 2))
          lines.push(':::')
        }
        break
      case 'canvas':
        if (block.meta?.canvasData) {
          lines.push(':::canvas')
          lines.push(JSON.stringify(block.meta.canvasData, null, 2))
          lines.push(':::')
        }
        break
    }
  }
  
  return lines.join('\n')
}

const contentFragments = computed(() => {
  return parseContentFragments(editContent.value || '')
})

const renderedContent = computed(() => {
  const content = editContent.value || ''
  console.log('[Markdown 渲染] 原始内容:', JSON.stringify(content.substring(0, 100)))
  
  try {
    const result = md.render(content)
    console.log('[Markdown 渲染] 渲染结果:', JSON.stringify(result.substring(0, 200)))
    return result
  } catch (error) {
    console.error('[Markdown 渲染] 错误:', error)
    return `<div class="error-message">渲染错误</div>`
  }
})

const filteredTreeData = computed(() => {
  if (!searchKeyword.value) return treeData.value

  const keyword = searchKeyword.value.toLowerCase()

  const filterNodes = (nodes: TreeNodeType[]): TreeNodeType[] => {
    return nodes.filter(node => {
      const matched = node.name.toLowerCase().includes(keyword)
      if (node.children && node.children.length > 0) {
        node.children = filterNodes(node.children)
        return matched || node.children.length > 0
      }
      return matched
    })
  }

  return filterNodes(JSON.parse(JSON.stringify(treeData.value)))
})

function formatTime(time: string) {
  return new Date(time).toLocaleString('zh-CN')
}

function handleSearch() {
  if (searchKeyword.value) {
    const expandAll = (nodes: TreeNodeType[]) => {
      for (const node of nodes) {
        node.isExpanded = true
        if (node.children && node.children.length > 0) {
          expandAll(node.children)
        }
      }
    }
    expandAll(treeData.value)
  }
}

function handleNodeSelect(node: TreeNodeType) {
  console.log('[handleNodeSelect] 选中节点:', node)
  store.setActiveNode(node)
  if (node.type === 'document') {
    loadDocument(node.id)
  }
}

function handleToggle(node: TreeNodeType) {
  toggleExpand(node)
}

function handleRootContextMenu(e: MouseEvent) {
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    node: null,
    isRoot: true,
  }
}

function handleContextMenu({ e, node }: { e: MouseEvent; node: TreeNodeType }) {
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    node,
    isRoot: false,
  }
}

async function handleAddFolder(parentNode: TreeNodeType | null) {
  console.log('[handleAddFolder] parentNode:', parentNode)
  try {
    const { value: name } = await ElMessageBox.prompt('请输入文件夹名称', '新建文件夹', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '文件夹名称不能为空',
    })
    
    console.log('[handleAddFolder] 创建文件夹, name:', name, 'parentId:', parentNode ? parentNode.id : null, 'kmId:', currentKmId.value)
    
    await folderApi.create({
      name,
      parentId: parentNode ? parentNode.id : null,
      kmId: parentNode ? undefined : (currentKmId.value || null),
    })
    
    await fetchTree()
    if (parentNode) {
      parentNode.isExpanded = true
    }
    ElMessage.success('文件夹创建成功')
  } catch {
  }
}

async function handleAddDocument(parentNode: TreeNodeType | null) {
  console.log('[handleAddDocument] parentNode:', parentNode)
  try {
    const { value: title } = await ElMessageBox.prompt('请输入文档名称', '新建文档', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '文档名称不能为空',
    })
    
    console.log('[handleAddDocument] 创建文档, title:', title, 'folderId:', parentNode ? parentNode.id : null, 'kmId:', currentKmId.value)
    
    const res = await documentApi.create({
      title,
      folderId: parentNode ? parentNode.id : null,
      kmId: parentNode ? undefined : (currentKmId.value || null),
      content: '',
    })
    
    await fetchTree()
    if (parentNode) {
      parentNode.isExpanded = true
    }
    
    const newNode = getAllNodes().find(n => n.id === res.data.data.id && n.type === 'document')
    if (newNode) {
      handleNodeSelect(newNode)
    }
    
    ElMessage.success('文档创建成功')
  } catch {
  }
}

function addRootFolder() {
  console.log('[addRootFolder] activeNode.value:', activeNode.value)
  const parentNode = activeNode.value?.type === 'folder' ? activeNode.value : null
  console.log('[addRootFolder] parentNode:', parentNode)
  handleAddFolder(parentNode)
}

function addRootDocument() {
  console.log('[addRootDocument] activeNode.value:', activeNode.value)
  const parentNode = activeNode.value?.type === 'folder' ? activeNode.value : null
  console.log('[addRootDocument] parentNode:', parentNode)
  handleAddDocument(parentNode)
}

async function handleRename(node: TreeNodeType) {
  try {
    const oldName = node.name
    const { value: newName } = await ElMessageBox.prompt('请输入新名称', '重命名', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: oldName,
      inputPattern: /.+/,
      inputErrorMessage: '名称不能为空',
    })
    
    if (node.type === 'folder') {
      await folderApi.update(node.id, { name: newName })
    } else {
      await documentApi.update(node.id, { title: newName })
    }
    
    await fetchTree()
    ElMessage.success('重命名成功')
  } catch {
    // 用户取消
  }
}

async function handleDelete(node: TreeNodeType) {
  const typeText = node.type === 'folder' ? '文件夹' : '文档'
  let message = `确定要删除「${node.name}」吗？`
  
  if (node.type === 'folder' && node.children && node.children.length > 0) {
    message = `确定要删除「${node.name}」及其所有子文件夹和文档吗？此操作不可恢复。`
  }
  
  try {
    await ElMessageBox.confirm(message, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    
    if (node.type === 'folder') {
      await folderApi.delete(node.id, true)
    } else {
      await documentApi.delete(node.id)
    }
    
    if (currentDocument?.value?.id === node.id) {
      store.currentDocument = null
      editContent.value = ''
    }
    
    await fetchTree()
    ElMessage.success('删除成功')
  } catch {
    // 用户取消
  }
}

async function handleDrop(params: {
  sourceId: number
  sourceType: 'folder' | 'document'
  targetId: number | null
  targetType: 'folder' | 'document' | null
  position: 'before' | 'after' | 'inside'
}) {
  try {
    await treeApi.moveNode(params)
    await fetchTree()
    
    if (params.targetType === 'folder' && params.position === 'inside') {
      const targetNode = getAllNodes().find(n => n.id === params.targetId && n.type === 'folder')
      if (targetNode) {
        targetNode.isExpanded = true
      }
    }
    
    ElMessage.success('移动成功')
  } catch (error: any) {
    ElMessage.error(error.message || '移动失败')
  }
}

function startEditTitle() {
}

async function saveTitle() {
  if (!currentDocument.value) return
  
  const newTitle = editTitle.value.trim()
  
  if (newTitle === currentDocument.value.title) {
    return
  }
  
  if (newTitle === '') {
    editTitle.value = ''
    return
  }
  
  await documentApi.update(currentDocument.value.id, { title: newTitle })
  currentDocument.value.title = newTitle
  
  const node = getAllNodes().find(n => n.id === currentDocument.value!.id && n.type === 'document')
  if (node) {
    node.name = newTitle
  }
  
  ElMessage.success('保存成功')
}

function cancelEditTitle() {
  if (currentDocument.value) {
    editTitle.value = currentDocument.value.title || ''
  }
}

function saveCursorPosition() {
  if (editorRef.value) {
    cursorStart.value = editorRef.value.selectionStart
    cursorEnd.value = editorRef.value.selectionEnd
  }
}

function saveToHistory() {
  if (isHistoryAction.value) return
  
  if (historyIndex.value < historyStack.value.length - 1) {
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1)
  }
  
  saveCursorPosition()
  
  historyStack.value.push({
    content: editContent.value,
    cursorStart: cursorStart.value,
    cursorEnd: cursorEnd.value,
  })
  
  if (historyStack.value.length > 50) {
    historyStack.value.shift()
  } else {
    historyIndex.value = historyStack.value.length - 1
  }
}

function handleUndo() {
  if (!canUndo.value) return
  
  isHistoryAction.value = true
  
  historyIndex.value--
  const item = historyStack.value[historyIndex.value]
  
  if (item) {
    editContent.value = item.content
    cursorStart.value = item.cursorStart
    cursorEnd.value = item.cursorEnd
    
    nextTick(() => {
      if (editorRef.value) {
        editorRef.value.focus()
        editorRef.value.selectionStart = cursorStart.value
        editorRef.value.selectionEnd = cursorEnd.value
      }
      isHistoryAction.value = false
    })
  }
}

function handleRedo() {
  if (!canRedo.value) return
  
  isHistoryAction.value = true
  
  historyIndex.value++
  const item = historyStack.value[historyIndex.value]
  
  if (item) {
    editContent.value = item.content
    cursorStart.value = item.cursorStart
    cursorEnd.value = item.cursorEnd
    
    nextTick(() => {
      if (editorRef.value) {
        editorRef.value.focus()
        editorRef.value.selectionStart = cursorStart.value
        editorRef.value.selectionEnd = cursorEnd.value
      }
      isHistoryAction.value = false
    })
  }
}

function handleContentChange() {
  saveToHistory()
  
  if (editContent.value !== lastSavedContent.value) {
    saveStatus.value = 'unsaved'
  }
  
  if (saveTimer.value) {
    clearTimeout(saveTimer.value)
  }
  saveTimer.value = window.setTimeout(() => {
    performSave()
  }, 2000)
}

async function performSave() {
  if (!currentDocument.value) return
  
  if (editContent.value === lastSavedContent.value) {
    saveStatus.value = 'saved'
    return
  }
  
  saveStatus.value = 'saving'
  
  try {
    await saveDocument({
      title: currentDocument.value.title,
      content: editContent.value,
    })
    lastSavedContent.value = editContent.value
    saveStatus.value = 'saved'
  } catch (error) {
    console.error('自动保存失败:', error)
    saveStatus.value = 'error'
  }
}

function handleVersionRestore() {
  if (currentDocument.value) {
    loadDocument(currentDocument.value.id)
    ElMessage.success('版本已恢复')
  }
}

function updateTableData(fragment: ContentFragment, newTableData: InteractiveTableData) {
  if (fragment.startIndex === undefined || fragment.endIndex === undefined) return
  
  const beforeTable = editContent.value.substring(0, fragment.startIndex)
  const afterTable = editContent.value.substring(fragment.endIndex)
  
  const tableJsonStr = JSON.stringify(newTableData, null, 2)
  const newTableBlock = `:::table\n${tableJsonStr}\n:::`
  
  const newEndIndex = fragment.startIndex + newTableBlock.length
  
  editContent.value = beforeTable + newTableBlock + afterTable
  
  fragment.startIndex = fragment.startIndex
  fragment.endIndex = newEndIndex
  fragment.content = tableJsonStr
  fragment.tableData = newTableData
}

function deleteTable(fragment: ContentFragment) {
  if (fragment.startIndex === undefined || fragment.endIndex === undefined) return
  
  const beforeTable = editContent.value.substring(0, fragment.startIndex)
  const afterTable = editContent.value.substring(fragment.endIndex)
  
  editContent.value = beforeTable + afterTable
  
  ElMessage.success('表格已删除')
}

function insertTextAtCursor(text: string, selectLength: number = 0) {
  saveCursorPosition()
  
  const start = cursorStart.value
  const end = cursorEnd.value
  const currentText = editContent.value
  
  const before = currentText.substring(0, start)
  const after = currentText.substring(end)
  
  editContent.value = before + text + after
  
  const newCursorPos = start + (selectLength > 0 ? selectLength : text.length)
  
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.focus()
      editorRef.value.selectionStart = newCursorPos
      editorRef.value.selectionEnd = newCursorPos
      cursorStart.value = newCursorPos
      cursorEnd.value = newCursorPos
    }
  })
}

function wrapWithTag(beforeTag: string, afterTag: string) {
  saveCursorPosition()
  
  const start = cursorStart.value
  const end = cursorEnd.value
  const currentText = editContent.value
  
  const before = currentText.substring(0, start)
  const selected = currentText.substring(start, end)
  const after = currentText.substring(end)
  
  if (selected) {
    editContent.value = before + beforeTag + selected + afterTag + after
    const newStart = start + beforeTag.length
    const newEnd = start + beforeTag.length + selected.length
    
    nextTick(() => {
      if (editorRef.value) {
        editorRef.value.focus()
        editorRef.value.selectionStart = newStart
        editorRef.value.selectionEnd = newEnd
        cursorStart.value = newStart
        cursorEnd.value = newEnd
      }
    })
  } else {
    editContent.value = before + beforeTag + afterTag + after
    const newCursorPos = start + beforeTag.length
    
    nextTick(() => {
      if (editorRef.value) {
        editorRef.value.focus()
        editorRef.value.selectionStart = newCursorPos
        editorRef.value.selectionEnd = newCursorPos
        cursorStart.value = newCursorPos
        cursorEnd.value = newCursorPos
      }
    })
  }
}

function handleBold() {
  if (useBlockEditor.value && blockEditorRef.value) {
    blockEditorRef.value.applyInlineStyle('bold')
  } else {
    wrapWithTag('**', '**')
  }
}

function handleItalic() {
  if (useBlockEditor.value && blockEditorRef.value) {
    blockEditorRef.value.applyInlineStyle('italic')
  } else {
    wrapWithTag('*', '*')
  }
}

function handleStrikethrough() {
  if (useBlockEditor.value && blockEditorRef.value) {
    blockEditorRef.value.applyInlineStyle('strikeThrough')
  } else {
    wrapWithTag('~~', '~~')
  }
}

function handleUnderline() {
  if (useBlockEditor.value && blockEditorRef.value) {
    blockEditorRef.value.applyInlineStyle('underline')
  } else {
    wrapWithTag('<u>', '</u>')
  }
}

function handleFontFamilyChange() {
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.focus()
    }
  })
}

function handleFontSizeChange() {
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.focus()
    }
  })
}

function insertHeading(level: number) {
  if (useBlockEditor.value && blockEditorRef.value) {
    const headingType = `h${level}` as BlockType
    blockEditorRef.value.setCurrentBlockType(headingType)
  } else {
    const text = '#'.repeat(level) + ' '
    insertTextAtCursor(text, text.length)
  }
}

function insertList() {
  if (useBlockEditor.value && blockEditorRef.value) {
    blockEditorRef.value.setCurrentBlockType('bullet')
  } else {
    const text = '\n- '
    insertTextAtCursor(text, text.length)
  }
}

function insertOrderedList() {
  if (useBlockEditor.value && blockEditorRef.value) {
    blockEditorRef.value.setCurrentBlockType('numbered')
  } else {
    const text = '\n1. '
    insertTextAtCursor(text, text.length)
  }
}

function insertQuote() {
  if (useBlockEditor.value && blockEditorRef.value) {
    blockEditorRef.value.setCurrentBlockType('quote')
  } else {
    const text = '\n> '
    insertTextAtCursor(text, text.length)
  }
}

function insertCodeBlock() {
  if (useBlockEditor.value && blockEditorRef.value) {
    blockEditorRef.value.setCurrentBlockType('code')
  } else {
    const text = '\n```javascript\n\n```\n'
    insertTextAtCursor(text, text.length - 5)
  }
}

async function insertLink() {
  try {
    const { value: url } = await ElMessageBox.prompt('请输入链接地址', '插入链接', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: 'https://',
      inputPattern: /.+/,
      inputErrorMessage: '链接地址不能为空',
    })
    
    saveCursorPosition()
    
    const start = cursorStart.value
    const end = cursorEnd.value
    const currentText = editContent.value
    
    const before = currentText.substring(0, start)
    const selected = currentText.substring(start, end)
    const after = currentText.substring(end)
    
    if (selected) {
      const link = `[${selected}](${url})`
      editContent.value = before + link + after
      
      const newStart = start + 1
      const newEnd = start + 1 + selected.length
      
      nextTick(() => {
        if (editorRef.value) {
          editorRef.value.focus()
          editorRef.value.selectionStart = newStart
          editorRef.value.selectionEnd = newEnd
          cursorStart.value = newStart
          cursorEnd.value = newEnd
        }
      })
    } else {
      const link = `[](${url})`
      editContent.value = before + link + after
      
      const newCursorPos = start + 1
      
      nextTick(() => {
        if (editorRef.value) {
          editorRef.value.focus()
          editorRef.value.selectionStart = newCursorPos
          editorRef.value.selectionEnd = newCursorPos
          cursorStart.value = newCursorPos
          cursorEnd.value = newCursorPos
        }
      })
    }
  } catch {
    // 用户取消
  }
}

function insertHR() {
  if (useBlockEditor.value && blockEditorRef.value) {
    blockEditorRef.value.setCurrentBlockType('divider')
  } else {
    const text = '\n---\n'
    insertTextAtCursor(text, text.length)
  }
}

function getCursorPosition() {
  if (!editorRef.value) return { x: 0, y: 0 }
  
  const textarea = editorRef.value
  const start = textarea.selectionStart
  
  const rect = textarea.getBoundingClientRect()
  const computedStyle = window.getComputedStyle(textarea)
  const lineHeight = parseInt(computedStyle.lineHeight) || 24
  const fontSize = parseInt(computedStyle.fontSize) || 14
  
  const textBeforeCursor = editContent.value.substring(0, start)
  const lines = textBeforeCursor.split('\n')
  const lineCount = lines.length
  const lastLine = lines[lines.length - 1] || ''
  
  const x = rect.left + 10 + lastLine.length * fontSize * 0.6
  const y = rect.top + (lineCount - 1) * lineHeight + lineHeight + 10
  
  return { x, y }
}

function showSlashMenu() {
  if (!editorRef.value) return
  
  slashStartPos.value = editorRef.value.selectionStart - 1
  const pos = getCursorPosition()
  slashMenuPosition.value = { x: pos.x, y: pos.y }
  slashMenuVisible.value = true
}

function hideSlashMenu() {
  slashMenuVisible.value = false
}

function handleSlashMenuInsert(markdown: string, cursorOffset: number) {
  if (!editorRef.value) return
  
  const start = slashStartPos.value
  const end = editorRef.value.selectionStart
  
  const beforeText = editContent.value.substring(0, start)
  const afterText = editContent.value.substring(end)
  
  editContent.value = beforeText + markdown + afterText
  
  const newCursorPos = start + cursorOffset
  
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.focus()
      editorRef.value.selectionStart = newCursorPos
      editorRef.value.selectionEnd = newCursorPos
      cursorStart.value = newCursorPos
      cursorEnd.value = newCursorPos
    }
  })
  
  hideSlashMenu()
}

function handleSlashMenuUpload(type: 'image' | 'attachment') {
  uploadType.value = type
  uploadDialogVisible.value = true
  hideSlashMenu()
}

function handleFileUpload(file: any) {
  if (!file || !file.raw) return
  
  const rawFile = file.raw as File
  const fileName = rawFile.name
  
  const insertPos = slashStartPos.value
  
  if (uploadType.value === 'image') {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const markdown = `![${fileName}](${base64})`
      
      const beforeText = editContent.value.substring(0, insertPos)
      const afterText = editContent.value.substring(insertPos)
      
      editContent.value = beforeText + markdown + afterText
      
      uploadDialogVisible.value = false
      ElMessage.success('图片已添加')
    }
    reader.readAsDataURL(rawFile)
  } else {
    const markdown = `[${fileName}](./uploads/${fileName})`
    
    const beforeText = editContent.value.substring(0, insertPos)
    const afterText = editContent.value.substring(insertPos)
    
    editContent.value = beforeText + markdown + afterText
    
    uploadDialogVisible.value = false
    ElMessage.success('附件已添加')
  }
}

function handleKeyDown(e: KeyboardEvent) {
  const textarea = e.target as HTMLTextAreaElement
  const value = editContent.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
  if (slashMenuVisible.value) {
    if (e.key === 'Escape') {
      e.preventDefault()
      hideSlashMenu()
      return
    }
    if (e.key === 'Backspace') {
      if (start <= slashStartPos.value + 1 && start > 0) {
        hideSlashMenu()
      }
    }
  }
  
  if (e.key === '/' && start === end && !slashMenuVisible.value) {
    const beforeChar = start > 0 ? value.substring(start - 1, start) : ''
    if (beforeChar === '' || beforeChar === '\n' || beforeChar === ' ') {
      nextTick(() => {
        showSlashMenu()
      })
    }
    return
  }
  
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      handleUndo()
      return
    }
    if (e.key === 'z' && e.shiftKey) {
      e.preventDefault()
      handleRedo()
      return
    }
    if (e.key === 'y') {
      e.preventDefault()
      handleRedo()
      return
    }
    if (e.key === 'b') {
      e.preventDefault()
      handleBold()
      return
    }
    if (e.key === 'i') {
      e.preventDefault()
      handleItalic()
      return
    }
    if (e.key === 'u') {
      e.preventDefault()
      handleUnderline()
      return
    }
  }
  
  if (e.key === 'Enter') {
    const lines = value.substring(0, start).split('\n')
    const currentLine = lines[lines.length - 1] || ''
    
    const codeBlockMatch = currentLine.match(/^```(\w*)$/)
    if (codeBlockMatch && end === start) {
      e.preventDefault()
      
      const lang = codeBlockMatch[1] || ''
      const newContent = value.substring(0, start) + '\n\n```' + value.substring(end)
      
      editContent.value = newContent
      
      nextTick(() => {
        if (editorRef.value) {
          const newCursorPos = start + 1
          editorRef.value.focus()
          editorRef.value.selectionStart = newCursorPos
          editorRef.value.selectionEnd = newCursorPos
          cursorStart.value = newCursorPos
          cursorEnd.value = newCursorPos
        }
      })
      
      ElMessage.info(lang ? `已创建 ${lang} 代码块` : '已创建代码块')
      return
    }
  }
  
  if (e.key === 'Tab') {
    e.preventDefault()
    const tabSpace = '  '
    
    saveCursorPosition()
    const tabStart = cursorStart.value
    const tabEnd = cursorEnd.value
    
    editContent.value = value.substring(0, tabStart) + tabSpace + value.substring(tabEnd)
    
    nextTick(() => {
      if (editorRef.value) {
        const newPos = tabStart + tabSpace.length
        editorRef.value.focus()
        editorRef.value.selectionStart = newPos
        editorRef.value.selectionEnd = newPos
        cursorStart.value = newPos
        cursorEnd.value = newPos
      }
    })
  }
}

watch(currentDocument, (doc) => {
  if (doc) {
    isSyncing.value = true
    editContent.value = doc.content
    lastSavedContent.value = doc.content || ''
    saveStatus.value = 'saved'
    
    editTitle.value = doc.title || ''
    
    if (useBlockEditor.value) {
      editorBlocks.value = markdownToBlocks(doc.content || '')
    }
    
    historyStack.value = [{
      content: doc.content || '',
      cursorStart: 0,
      cursorEnd: 0,
    }]
    historyIndex.value = 0
    
    nextTick(() => {
      isSyncing.value = false
    })
  }
})

watch(editorBlocks, (newBlocks) => {
  if (isSyncing.value) return
  
  if (useBlockEditor.value && newBlocks.length > 0) {
    const markdown = blocksToMarkdown(newBlocks)
    if (markdown !== editContent.value) {
      isSyncing.value = true
      editContent.value = markdown
      handleContentChange()
      nextTick(() => {
        isSyncing.value = false
      })
    }
  }
}, { deep: true })

let hasOpenedDoc = ref(false)
let isNewDoc = computed(() => route.query.newDoc === '1')
let hasFocusedTitle = ref(false)

watch(() => [treeData.value, loading.value], () => {
  if (hasOpenedDoc.value || loading.value || treeData.value.length === 0) return
  
  const docIdParam = route.query.docId
  if (docIdParam && docIdParam !== '') {
    const docId = parseInt(docIdParam as string)
    if (!isNaN(docId)) {
      const nodes = getAllNodes()
      const targetNode = nodes.find(n => n.id === docId && n.type === 'document')
      if (targetNode) {
        hasOpenedDoc.value = true
        handleNodeSelect(targetNode)
      }
    }
  }
}, { immediate: true })

watch([currentDocument, isNewDoc], ([doc, isNew]) => {
  if (doc && isNew && !hasFocusedTitle.value) {
    hasFocusedTitle.value = true
    editTitle.value = ''
    nextTick(() => {
      const input = document.querySelector('.doc-title input') as HTMLInputElement
      if (input) {
        input.focus()
      }
    })
  }
})

function updateFormatState() {
  if (!useBlockEditor.value) return
  
  try {
    isBoldActive.value = document.queryCommandState('bold')
    isItalicActive.value = document.queryCommandState('italic')
    isStrikethroughActive.value = document.queryCommandState('strikeThrough')
    isUnderlineActive.value = document.queryCommandState('underline')
  } catch (e) {
    console.warn('queryCommandState not supported:', e)
  }
}

onMounted(() => {
  const kmIdParam = route.query.kmId
  if (kmIdParam && kmIdParam !== '') {
    const kmId = parseInt(kmIdParam as string)
    if (!isNaN(kmId)) {
      fetchTree(kmId)
      fetchKmInfo(kmId)
    } else {
      fetchTree()
    }
  } else {
    fetchTree()
  }
  
  document.addEventListener('mouseup', updateFormatState)
  document.addEventListener('keyup', updateFormatState)
  document.addEventListener('selectionchange', updateFormatState)
})

onUnmounted(() => {
  document.removeEventListener('mouseup', updateFormatState)
  document.removeEventListener('keyup', updateFormatState)
  document.removeEventListener('selectionchange', updateFormatState)
})
</script>

<style lang="scss" scoped>
.workspace-layout {
  display: flex;
  width: 100%;
  height: 100%;
  background-color: #fff;
}

.sidebar {
  width: 280px;
  min-width: 280px;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  background-color: #fafafa;
}

.sidebar-top {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
}

.back-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #fff;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}

.km-title {
  flex: 1;
  margin-left: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
}

.sidebar-toolbar {
  padding: 8px 12px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  gap: 8px;
}

.tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.empty-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.doc-header {
  padding: 20px 32px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fff;
  
  .doc-title {
    font-size: 24px;
    font-weight: 600;
    color: #303133;
    margin: 0;
    cursor: text;
    
    .el-input {
      width: 100%;
    }
  }
  
  .doc-meta {
    margin-top: 8px;
    font-size: 13px;
    color: #909399;
    display: flex;
    align-items: center;
    gap: 16px;
    
    .save-status {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      
      &.saved {
        color: #67c23a;
      }
      
      &.saving {
        color: #409eff;
      }
      
      &.unsaved {
        color: #e6a23c;
      }
      
      &.error {
        color: #f56c6c;
      }
      
      .is-loading {
        animation: rotate 1s linear infinite;
      }
    }
    
    .version-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      color: #409eff;
      transition: color 0.2s;
      
      &:hover {
        color: #66b1ff;
      }
    }
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.editor-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
  gap: 4px;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background-color: #e4e7ed;
  margin: 0 8px;
}

.toolbar-btn {
  padding: 6px 10px;
  border-radius: 4px;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background-color: #f5f7fa;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.format-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  
  strong, em, span {
    font-size: 14px;
    font-family: 'Times New Roman', serif;
  }
}

.format-btn-active {
  background-color: #ecf5ff !important;
  color: #409eff !important;
}

.doc-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-pane,
.preview-pane {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.editor-pane {
  border-right: 1px solid #e4e7ed;
  background-color: #fafafa;
}

.editor-pane.wysiwyg-editor {
  border-right: none;
  background-color: #fff;
  padding: 24px 32px;
}

.markdown-editor {
  width: 100%;
  height: 100%;
  min-height: 400px;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
  box-sizing: border-box;
  transition: font-size 0.2s;
}

.preview-pane {
  background-color: #fff;
}
</style>

<style lang="scss">
.preview-pane .markdown-body {
  color: #333;
  line-height: 1.8;
  font-size: 15px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  word-wrap: break-word;
  transition: font-size 0.2s;
  
  h1, h2, h3, h4, h5, h6 {
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.25;
    color: #1a1a1a;
  }
  
  h1 {
    font-size: 2em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #eaecef;
    font-weight: bold;
  }
  
  h2 {
    font-size: 1.5em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #eaecef;
    font-weight: bold;
  }
  
  h3 {
    font-size: 1.25em;
    font-weight: bold;
  }
  
  h4 {
    font-size: 1em;
    font-weight: bold;
  }
  
  p {
    margin-top: 0;
    margin-bottom: 16px;
  }
  
  ul, ol {
    margin-top: 0;
    margin-bottom: 16px;
    padding-left: 2em;
  }
  
  li {
    margin-bottom: 4px;
  }
  
  code:not(pre code) {
    padding: 0.2em 0.4em;
    margin: 0;
    font-size: 85%;
    background-color: #f6f8fa;
    border-radius: 3px;
    font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace;
  }
  
  pre {
    padding: 16px;
    overflow: auto;
    font-size: 85%;
    line-height: 1.45;
    background-color: #282c34;
    border-radius: 6px;
    margin-bottom: 16px;
    font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace;
    
    code {
      padding: 0;
      background: transparent;
      font-family: inherit;
    }
  }
  
  .hljs {
    background-color: #282c34;
    color: #abb2bf;
  }
  
  blockquote {
    padding: 0 1em;
    color: #6a737d;
    border-left: 0.25em solid #dfe2e5;
    margin: 0 0 16px;
    background-color: #f8f9fa;
    padding: 12px 16px;
    border-radius: 4px;
  }
  
  table {
    border-spacing: 0;
    border-collapse: collapse;
    margin-bottom: 16px;
    width: 100%;
    
    th, td {
      padding: 6px 13px;
      border: 1px solid #dfe2e5;
    }
    
    th {
      font-weight: 600;
      background-color: #f6f8fa;
    }
    
    tr:nth-child(even) {
      background-color: #fafbfc;
    }
  }
  
  a {
    color: #0366d6;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  img {
    max-width: 100%;
  }
  
  hr {
    height: 0.25em;
    padding: 0;
    margin: 24px 0;
    background-color: #e1e4e8;
    border: 0;
  }
  
  strong {
    font-weight: bold;
  }
  
  em {
    font-style: italic;
  }
  
  del {
    text-decoration: line-through;
  }
  
  u {
    text-decoration: underline;
  }
}
</style>
