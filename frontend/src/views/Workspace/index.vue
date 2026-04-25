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
        <div class="doc-content">
          <div class="editor-pane">
            <textarea
              v-model="editContent"
              class="markdown-editor"
              placeholder="开始编写文档，支持 Markdown 语法..."
              @input="handleContentChange"
            />
          </div>
          <div class="preview-pane">
            <div class="markdown-body" v-html="renderedContent"></div>
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
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  FolderAdd,
  DocumentAdd,
  Loading,
} from '@element-plus/icons-vue'
import { marked } from 'marked'
import { useKnowledgeStore } from '@/store/knowledge'
import { folderApi, documentApi, treeApi } from '@/api'
import type { TreeNode as TreeNodeType } from '@/types'
import TreeNode from './components/TreeNode.vue'
import ContextMenu from './components/ContextMenu.vue'

marked.use({
  gfm: true,
  breaks: true,
})

const store = useKnowledgeStore()
const { treeData, currentDocument, loading } = storeToRefs(store)
const { fetchTree, loadDocument, saveDocument, getAllNodes, toggleExpand, setActiveNode } = store

const searchKeyword = ref('')
const editTitle = ref('')
const editContent = ref('')
const isEditingTitle = ref(false)
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  node: null as TreeNodeType | null,
  isRoot: false,
})

const renderedContent = computed(() => {
  try {
    return marked.parse(editContent.value || '') as string
  } catch {
    return ''
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
  try {
    const { value: name } = await ElMessageBox.prompt('请输入文件夹名称', '新建文件夹', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '文件夹名称不能为空',
    })
    
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
  try {
    const { value: title } = await ElMessageBox.prompt('请输入文档名称', '新建文档', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '文档名称不能为空',
    })
    
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
  handleAddFolder(null)
}

function addRootDocument() {
  handleAddDocument(null)
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

.markdown-editor {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
}

.preview-pane {
  background-color: #fff;
}
</style>

<style lang="scss">
.preview-pane .markdown-body {
  color: #333;
  line-height: 1.8;
  
  h1, h2, h3, h4, h5, h6 {
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.25;
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
  
  code {
    padding: 0.2em 0.4em;
    margin: 0;
    font-size: 85%;
    background-color: #f6f8fa;
    border-radius: 3px;
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
  
  blockquote {
    padding: 0 1em;
    color: #6a737d;
    border-left: 0.25em solid #dfe2e5;
    margin: 0 0 16px;
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
