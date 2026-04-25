<template>
  <div class="workspace-layout">
    <div class="sidebar">
      <div class="sidebar-header">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索文档..."
          clearable
          prefix-icon="Search"
          @input="handleSearch"
        />
      </div>
      <div class="toolbar">
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
          <h2 class="doc-title" @dblclick="startEditTitle">
            <template v-if="isEditingTitle">
              <el-input
                v-model="editTitle"
                @blur="saveTitle"
                @keyup.enter="saveTitle"
                @keyup.esc="cancelEditTitle"
              />
            </template>
            <template v-else>{{ currentDocument.title }}</template>
          </h2>
          <div class="doc-meta">
            <span>最后更新: {{ formatTime(currentDocument.updatedAt) }}</span>
          </div>
        </div>
        <div class="editor-toolbar">
          <el-button-group>
            <el-button text @click="insertHeading(1)">H1</el-button>
            <el-button text @click="insertHeading(2)">H2</el-button>
            <el-button text @click="insertHeading(3)">H3</el-button>
            <el-button text @click="insertBold"><strong>B</strong></el-button>
            <el-button text @click="insertItalic"><em>I</em></el-button>
            <el-button text @click="insertCodeBlock">代码块</el-button>
            <el-button text @click="insertList">列表</el-button>
            <el-button text @click="insertQuote">引用</el-button>
          </el-button-group>
        </div>
        <div class="doc-content">
          <div class="editor-pane">
            <div class="markdown-editor" ref="editorContainer">
              <textarea
                ref="editorRef"
                v-model="editContent"
                class="editor-textarea"
                placeholder="开始编写文档，支持 Markdown 语法..."
                @input="handleContentChange"
                @keydown="handleKeyDown"
                @click="updateCursorPosition"
              />
            </div>
          </div>
          <div class="preview-pane">
            <div class="markdown-body" v-html="renderedContent"></div>
          </div>
        </div>
        
        <div class="insert-code-block-dialog" v-if="showCodeBlockDialog">
          <div class="dialog-overlay" @click="closeCodeBlockDialog"></div>
          <div class="dialog-content">
            <h3>插入代码块</h3>
            <div class="dialog-form">
              <el-select v-model="selectedLanguage" placeholder="选择语言" clearable style="width: 200px;">
                <el-option label="JavaScript" value="javascript" />
                <el-option label="TypeScript" value="typescript" />
                <el-option label="Python" value="python" />
                <el-option label="HTML" value="html" />
                <el-option label="CSS" value="css" />
                <el-option label="Java" value="java" />
                <el-option label="JSON" value="json" />
                <el-option label="SQL" value="sql" />
                <el-option label="Shell" value="shell" />
                <el-option label="Markdown" value="markdown" />
                <el-option label="纯文本" value="text" />
              </el-select>
              <div class="code-editor-wrapper" ref="codeEditorWrapper">
                <MonacoEditor
                  :value="codeBlockContent"
                  language="javascript"
                  :options="codeEditorOptions"
                  @change="onCodeEditorChange"
                  style="height: 200px; width: 100%;"
                />
              </div>
            </div>
            <div class="dialog-actions">
              <el-button @click="closeCodeBlockDialog">取消</el-button>
              <el-button type="primary" @click="insertCodeBlockAtCursor">插入</el-button>
            </div>
          </div>
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
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  FolderAdd,
  DocumentAdd,
  Loading,
} from '@element-plus/icons-vue'
import MonacoEditor from '@guolao/vue-monaco-editor'
import * as monaco from 'monaco-editor'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import 'highlight.js/styles/atom-one-dark.css'
import { useKnowledgeStore } from '@/store/knowledge'
import { folderApi, documentApi, treeApi } from '@/api'
import type { TreeNode as TreeNodeType } from '@/types'
import TreeNode from './components/TreeNode.vue'
import ContextMenu from './components/ContextMenu.vue'

if (typeof window !== 'undefined') {
  ;(self as any).MonacoEnvironment = {
    getWorkerUrl: function (_moduleId: string, label: string) {
      switch (label) {
        case 'json':
          return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(`
            importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/language/json/json.worker.js');
          `)
        case 'css':
        case 'scss':
        case 'less':
          return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(`
            importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/language/css/css.worker.js');
          `)
        case 'html':
        case 'handlebars':
        case 'razor':
          return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(`
            importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/language/html/html.worker.js');
          `)
        case 'typescript':
        case 'javascript':
          return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(`
            importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/language/typescript/ts.worker.js');
          `)
        default:
          return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(`
            importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/editor/editor.worker.js');
          `)
      }
    }
  }
}

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  highlight: function (str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs code-block-container"><code>' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
      } catch (__) {}
    }
    return '<pre class="hljs code-block-container"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
  }
})

md.renderer.rules.fence = function (tokens, idx, options, env, self) {
  const token = tokens[idx]
  const info = token.info ? md.utils.unescapeAll(token.info).trim() : ''
  const langName = info ? info.split(/\s+/g)[0] : ''
  const langAttrs = info ? info.slice(langName.length).trim() : ''
  
  const code = token.content
  
  let highlighted: string
  let codeClass = 'hljs code-block-container'
  
  if (options.highlight) {
    highlighted = options.highlight(code, langName, langAttrs)
    if (highlighted.indexOf('<pre') === 0) {
      return highlighted + '\n'
    }
  } else {
    highlighted = md.utils.escapeHtml(code)
  }
  
  if (langName && hljs.getLanguage(langName)) {
    try {
      highlighted = hljs.highlight(code, { language: langName, ignoreIllegals: true }).value
      codeClass += ' has-language'
    } catch (__) {}
  }

  let langDisplay = langName
  if (!langDisplay || langDisplay === 'text') {
    langDisplay = 'Plain Text'
  } else {
    langDisplay = langDisplay.charAt(0).toUpperCase() + langDisplay.slice(1)
  }

  return `<div class="code-block-wrapper">
    <div class="code-block-header">
      <span class="code-block-lang">${langDisplay}</span>
      <button class="code-block-copy" onclick="navigator.clipboard.writeText(this.closest('.code-block-wrapper').querySelector('code').textContent).then(() => { this.textContent = '已复制'; setTimeout(() => this.textContent = '复制', 2000) }).catch(() => { this.textContent = '失败' })">复制</button>
    </div>
    <pre class="${codeClass}"><code>${highlighted}</code></pre>
  </div>\n`
}

const store = useKnowledgeStore()
const { treeData, currentDocument, loading, activeNode } = storeToRefs(store)
const { fetchTree, loadDocument, saveDocument, getAllNodes, toggleExpand, setActiveNode } = store

const editorRef = ref<HTMLTextAreaElement | null>(null)
const editorContainer = ref<HTMLElement | null>(null)
const codeEditorWrapper = ref<HTMLElement | null>(null)

const searchKeyword = ref('')
const editTitle = ref('')
const editContent = ref('')
const isEditingTitle = ref(false)

const showCodeBlockDialog = ref(false)
const selectedLanguage = ref('javascript')
const codeBlockContent = ref('')
const cursorPosition = ref({ start: 0, end: 0 })

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  node: null as TreeNodeType | null,
  isRoot: false,
})

const codeEditorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  theme: 'vs-dark',
  language: 'javascript',
  fontSize: 14,
  fontFamily: 'Consolas, "Courier New", monospace',
  minimap: { enabled: false },
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  wordWrap: 'on',
  tabSize: 2,
  insertSpaces: true,
}

watch(selectedLanguage, (newLang) => {
  codeEditorOptions.language = newLang || 'text'
})

const renderedContent = computed(() => {
  const content = editContent.value || ''
  try {
    return md.render(content)
  } catch (error) {
    console.error('Markdown 渲染错误:', error)
    return `<div class="error-message">渲染错误: ${error}</div>`
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
    
    console.log('[handleAddFolder] 创建文件夹, name:', name, 'parentId:', parentNode ? parentNode.id : null)
    
    await folderApi.create({
      name,
      parentId: parentNode ? parentNode.id : null,
    })
    
    await fetchTree()
    if (parentNode) {
      parentNode.isExpanded = true
    }
    ElMessage.success('文件夹创建成功')
  } catch {
    // 用户取消
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
    
    console.log('[handleAddDocument] 创建文档, title:', title, 'folderId:', parentNode ? parentNode.id : null)
    
    const res = await documentApi.create({
      title,
      folderId: parentNode ? parentNode.id : null,
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
    // 用户取消
  }
}

function addRootFolder() {
  console.log('[addRootFolder] activeNode.value:', activeNode.value)
  console.log('[addRootFolder] activeNode.value?.type:', activeNode.value?.type)
  const parentNode = activeNode.value?.type === 'folder' ? activeNode.value : null
  console.log('[addRootFolder] parentNode:', parentNode)
  handleAddFolder(parentNode)
}

function addRootDocument() {
  console.log('[addRootDocument] activeNode.value:', activeNode.value)
  console.log('[addRootDocument] activeNode.value?.type:', activeNode.value?.type)
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
  const childrenCount = node.children ? node.children.length : 0
  let message = `确定要删除「${node.name}」吗？`
  
  if (node.type === 'folder' && childrenCount > 0) {
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
  if (!currentDocument.value) return
  editTitle.value = currentDocument.value.title
  isEditingTitle.value = true
  nextTick(() => {
    const input = document.querySelector('.doc-title input') as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
  })
}

async function saveTitle() {
  if (!currentDocument.value || !editTitle.value.trim()) {
    cancelEditTitle()
    return
  }
  
  await documentApi.update(currentDocument.value.id, { title: editTitle.value })
  currentDocument.value.title = editTitle.value
  
  const node = getAllNodes().find(n => n.id === currentDocument.value!.id && n.type === 'document')
  if (node) {
    node.name = editTitle.value
  }
  
  isEditingTitle.value = false
  ElMessage.success('保存成功')
}

function cancelEditTitle() {
  isEditingTitle.value = false
}

let saveTimer: number | null = null

function handleContentChange() {
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  saveTimer = window.setTimeout(() => {
    if (currentDocument.value) {
      saveDocument({
        title: currentDocument.value.title,
        content: editContent.value,
      })
    }
  }, 2000)
}

function updateCursorPosition() {
  if (editorRef.value) {
    cursorPosition.value = {
      start: editorRef.value.selectionStart,
      end: editorRef.value.selectionEnd,
    }
  }
}

function insertTextAtCursor(text: string, before: string = '', after: string = '') {
  if (!editorRef.value) return
  
  const start = editorRef.value.selectionStart
  const end = editorRef.value.selectionEnd
  const selectedText = editContent.value.substring(start, end)
  
  let newText: string
  let newCursorPos: number
  
  if (selectedText) {
    newText = editContent.value.substring(0, start) + before + selectedText + after + editContent.value.substring(end)
    newCursorPos = start + before.length + selectedText.length + after.length
  } else {
    newText = editContent.value.substring(0, start) + text + editContent.value.substring(end)
    newCursorPos = start + text.length
  }
  
  editContent.value = newText
  
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.focus()
      editorRef.value.selectionStart = newCursorPos
      editorRef.value.selectionEnd = newCursorPos
    }
  })
}

function insertHeading(level: number) {
  const prefix = '#'.repeat(level) + ' '
  insertTextAtCursor(prefix + '标题内容', prefix, '')
}

function insertBold() {
  insertTextAtCursor('**粗体文字**', '**', '**')
}

function insertItalic() {
  insertTextAtCursor('*斜体文字*', '*', '*')
}

function insertList() {
  insertTextAtCursor('- 列表项\n- 列表项\n')
}

function insertQuote() {
  insertTextAtCursor('> 引用内容\n')
}

function insertCodeBlock() {
  updateCursorPosition()
  showCodeBlockDialog.value = true
  codeBlockContent.value = ''
  selectedLanguage.value = 'javascript'
}

function closeCodeBlockDialog() {
  showCodeBlockDialog.value = false
  codeBlockContent.value = ''
}

function onCodeEditorChange(value: string | undefined) {
  codeBlockContent.value = value || ''
}

function insertCodeBlockAtCursor() {
  const lang = selectedLanguage.value || ''
  const code = codeBlockContent.value || ''
  
  const fenceStart = lang ? `\`\`\`${lang}\n` : '```\n'
  const fenceEnd = '\n```\n'
  
  const codeBlock = fenceStart + code + fenceEnd
  
  insertTextAtCursor(codeBlock)
  closeCodeBlockDialog()
  ElMessage.success('代码块已插入')
}

function handleKeyDown(e: KeyboardEvent) {
  const textarea = e.target as HTMLTextAreaElement
  const value = editContent.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
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
          editorRef.value.selectionStart = newCursorPos
          editorRef.value.selectionEnd = newCursorPos
          editorRef.value.focus()
        }
      })
      
      ElMessage.info(lang ? `已创建 ${lang} 代码块` : '已创建代码块')
      return
    }
  }
  
  if (e.key === 'Tab') {
    e.preventDefault()
    const tabSpace = '  '
    editContent.value = value.substring(0, start) + tabSpace + value.substring(end)
    
    nextTick(() => {
      if (editorRef.value) {
        const newPos = start + tabSpace.length
        editorRef.value.selectionStart = newPos
        editorRef.value.selectionEnd = newPos
      }
    })
  }
}

watch(currentDocument, (doc) => {
  if (doc) {
    editContent.value = doc.content
  }
})

onMounted(() => {
  fetchTree()
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

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
}

.toolbar {
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
  }
}

.editor-toolbar {
  padding: 8px 32px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
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
}

.editor-pane {
  border-right: 1px solid #e4e7ed;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
}

.markdown-editor {
  flex: 1;
  position: relative;
}

.editor-textarea {
  width: 100%;
  height: 100%;
  min-height: 100%;
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
  padding: 24px 32px;
  box-sizing: border-box;
}

.preview-pane {
  background-color: #fff;
  padding: 24px 32px;
}

.insert-code-block-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  
  .dialog-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
  }
  
  .dialog-content {
    position: relative;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    width: 600px;
    max-width: 90vw;
    padding: 20px;
    z-index: 1;
    
    h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }
    
    .dialog-form {
      margin-bottom: 16px;
      
      .el-select {
        margin-bottom: 12px;
      }
      
      .code-editor-wrapper {
        border: 1px solid #dcdfe6;
        border-radius: 4px;
        overflow: hidden;
      }
    }
    
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  }
}
</style>

<style lang="scss">
.preview-pane .markdown-body {
  color: #333;
  line-height: 1.8;
  font-size: 15px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  
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
  }
  
  h2 {
    font-size: 1.5em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #eaecef;
  }
  
  h3 {
    font-size: 1.25em;
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
    background-color: #f6f8fa;
    border-radius: 6px;
    margin-bottom: 16px;
    
    code {
      padding: 0;
      background: transparent;
    }
  }
  
  .code-block-wrapper {
    margin: 16px 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    
    .code-block-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background-color: #1e1e1e;
      border-bottom: 1px solid #333;
      
      .code-block-lang {
        font-size: 13px;
        color: #888;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .code-block-copy {
        padding: 4px 12px;
        font-size: 12px;
        color: #aaa;
        background-color: transparent;
        border: 1px solid #444;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        
        &:hover {
          color: #fff;
          background-color: #333;
          border-color: #555;
        }
      }
    }
    
    .code-block-container {
      margin: 0;
      border-radius: 0;
      background-color: #1e1e1e;
      
      code {
        font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace;
        font-size: 14px;
        line-height: 1.6;
        color: #d4d4d4;
      }
    }
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
    font-weight: 600;
  }
  
  em {
    font-style: italic;
  }
}
</style>
