<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <div class="move-copy-dialog">
      <div class="dialog-subtitle">
        可{{ operation === 'move' ? '移动' : '复制' }}到有创建文档权限的知识库
      </div>
      
      <div class="path-selector">
        <el-select
          v-model="selectedKmId"
          placeholder="选择知识库"
          style="width: 200px; margin-right: 8px;"
          @change="handleKmChange"
        >
          <el-option
            v-for="km in kmList"
            :key="km.id"
            :label="km.name"
            :value="km.id"
          />
        </el-select>
        <span class="path-separator">/</span>
        <el-select
          v-model="selectedFolderId"
          placeholder="选择文件夹"
          style="flex: 1;"
          @change="handleFolderChange"
        >
          <el-option :value="null" label="根目录" />
          <el-option
            v-for="folder in folderList"
            :key="folder.id"
            :label="folder.name"
            :value="folder.id"
          />
        </el-select>
      </div>
      
      <div class="tree-header">
        <span class="header-label">请选择要放置的目录位置</span>
        <div class="header-actions">
          <el-tooltip content="刷新">
            <el-button text :icon="Refresh" @click="loadCurrentTree" />
          </el-tooltip>
          <el-tooltip content="展开全部">
            <el-button text :icon="Expand" @click="expandAll" />
          </el-tooltip>
          <el-tooltip content="折叠全部">
            <el-button text :icon="Fold" @click="collapseAll" />
          </el-tooltip>
        </div>
      </div>
      
      <div class="tree-container">
        <el-tree
          ref="treeRef"
          :data="currentTreeData"
          :props="treeProps"
          node-key="id"
          :highlight-current="true"
          :default-expanded-keys="expandedKeys"
          @node-click="handleNodeClick"
          :expand-on-click-node="false"
          class="custom-tree"
        >
          <template #default="{ node, data }">
            <div 
              class="tree-node-item"
              :class="{ 'is-selected': selectedTarget?.id === data.id && selectedTarget?.type === data.type }"
            >
              <span class="node-icon">
                <el-icon v-if="data.type === 'folder'">
                  <Folder v-if="!node.expanded" />
                  <FolderOpened v-else />
                </el-icon>
                <el-icon v-else>
                  <Document />
                </el-icon>
              </span>
              <span class="node-label">{{ node.label }}</span>
            </div>
          </template>
        </el-tree>
      </div>
      
      <div class="position-section" v-if="selectedTarget">
        <div class="position-label">位置选择：</div>
        <div class="position-options">
          <el-radio-group v-model="positionMode" size="small">
            <el-radio value="sibling">
              同级
              <span class="radio-hint" v-if="selectedTarget.type === 'folder'">（移动到该文件夹的同一层级）</span>
              <span class="radio-hint" v-else>（移动到该文档的同一层级）</span>
            </el-radio>
            <el-radio value="child" v-if="selectedTarget.type === 'folder'">
              子级
              <span class="radio-hint">（移动到该文件夹内部）</span>
            </el-radio>
          </el-radio-group>
        </div>
      </div>
      
      <div class="position-section" v-else>
        <div class="position-label">位置选择：</div>
        <div class="position-options">
          <el-radio-group v-model="positionMode" size="small">
            <el-radio value="root">
              根目录
              <span class="radio-hint">（移动到当前知识库的根目录）</span>
            </el-radio>
          </el-radio-group>
        </div>
      </div>
    </div>
    
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm" :loading="loading">
        确认
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Folder,
  FolderOpened,
  Document,
  Refresh,
  Expand,
  Fold,
} from '@element-plus/icons-vue'
import { kmApi, treeApi, folderApi, documentApi } from '@/api'
import type { TreeNode, Km } from '@/types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    operation: 'move' | 'copy'
    sourceNode: TreeNode | null
  }>(),
  {
    sourceNode: null,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': [params: {
    targetKmId: number | null
    targetFolderId: number | null
    targetNodeId: number | null
    targetType: 'folder' | 'document' | null
    position: 'before' | 'after' | 'inside'
    copyNodes?: CopyNodeInfo[]
  }]
}>()

interface CopyNodeInfo {
  id: number
  type: 'folder' | 'document'
  name: string
  parentId: number | null
  kmId: number | null
  children: CopyNodeInfo[]
}

interface CopyPlan {
  sourceId: number
  sourceType: 'folder' | 'document'
  name: string
  parentId: number | null
  newParentId: number | null
  content?: string
  children: CopyPlan[]
}

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const dialogTitle = computed(() => {
  return props.operation === 'move' ? '移动到...' : '复制到...'
})

const loading = ref(false)
const kmList = ref<Km[]>([])
const selectedKmId = ref<number | null>(null)
const selectedFolderId = ref<number | null>(null)
const folderList = ref<TreeNode[]>([])

const currentTreeData = ref<TreeNode[]>([])
const expandedKeys = ref<number[]>([])

const treeRef = ref<any>(null)

const treeProps = {
  label: 'name',
  children: 'children',
  isLeaf: (data: TreeNode) => data.type === 'document' && !data.children,
}

const selectedTarget = ref<TreeNode | null>(null)
const positionMode = ref<'sibling' | 'child' | 'root'>('root')

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []
  const traverse = (items: TreeNode[]) => {
    for (const item of items) {
      result.push(item)
      if (item.children && item.children.length > 0) {
        traverse(item.children)
      }
    }
  }
  traverse(nodes)
  return result
}

async function loadKmList() {
  try {
    const res = await kmApi.getAll()
    kmList.value = res.data.data || []
  } catch (error) {
    console.error('加载知识库列表失败:', error)
  }
}

async function loadCurrentTree() {
  if (!selectedKmId.value) return
  
  loading.value = true
  try {
    const res = await treeApi.getTree(selectedKmId.value)
    currentTreeData.value = res.data.data || []
    
    folderList.value = flattenTree(currentTreeData.value).filter(n => n.type === 'folder')
    
    expandedKeys.value = []
    collectExpandedKeys(currentTreeData.value)
  } catch (error) {
    console.error('加载树数据失败:', error)
    ElMessage.error('加载树数据失败')
  } finally {
    loading.value = false
  }
}

function collectExpandedKeys(nodes: TreeNode[]) {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      expandedKeys.value.push(node.id)
      collectExpandedKeys(node.children)
    }
  }
}

function handleKmChange() {
  selectedFolderId.value = null
  selectedTarget.value = null
  positionMode.value = 'root'
  loadCurrentTree()
}

function handleFolderChange() {
  if (selectedFolderId.value === null) {
    selectedTarget.value = null
    positionMode.value = 'root'
  } else {
    const folder = folderList.value.find(f => f.id === selectedFolderId.value)
    if (folder) {
      selectedTarget.value = folder
      positionMode.value = 'child'
    }
  }
}

function handleNodeClick(data: TreeNode) {
  if (props.sourceNode && data.id === props.sourceNode.id && data.type === props.sourceNode.type) {
    ElMessage.warning('不能移动/复制到自身')
    return
  }
  
  if (data.type === 'folder' && isDescendantOfSource(data)) {
    ElMessage.warning('不能移动/复制到子文件夹')
    return
  }
  
  selectedTarget.value = data
  selectedFolderId.value = data.type === 'folder' ? data.id : null
  
  if (data.type === 'folder') {
    positionMode.value = 'child'
  } else {
    positionMode.value = 'sibling'
  }
}

function isDescendantOfSource(target: TreeNode): boolean {
  if (!props.sourceNode || props.sourceNode.type !== 'folder') return false
  if (props.sourceNode.id === target.id && props.sourceNode.type === target.type) return true
  
  const check = (nodes: TreeNode[]): boolean => {
    for (const node of nodes) {
      if (node.id === target.id && node.type === target.type) return true
      if (node.children && check(node.children)) return true
    }
    return false
  }
  
  return check(currentTreeData.value)
}

function expandAll() {
  if (treeRef.value) {
    expandedKeys.value = []
    collectAllIds(currentTreeData.value)
    nextTick(() => {
      if (treeRef.value) {
        treeRef.value.store.defaultExpandedKeys = [...expandedKeys.value]
      }
    })
  }
}

function collapseAll() {
  expandedKeys.value = []
}

function collectAllIds(nodes: TreeNode[]) {
  for (const node of nodes) {
    if (node.type === 'folder') {
      expandedKeys.value.push(node.id)
    }
    if (node.children && node.children.length > 0) {
      collectAllIds(node.children)
    }
  }
}

function handleCancel() {
  visible.value = false
}

function handleClosed() {
  selectedTarget.value = null
  positionMode.value = 'root'
  currentTreeData.value = []
}

async function handleConfirm() {
  if (!selectedKmId.value) {
    ElMessage.warning('请选择目标知识库')
    return
  }
  
  let targetKmId = selectedKmId.value
  let targetFolderId: number | null = null
  let targetNodeId: number | null = null
  let targetType: 'folder' | 'document' | null = null
  let position: 'before' | 'after' | 'inside' = 'inside'
  
  if (selectedTarget.value) {
    targetNodeId = selectedTarget.value.id
    targetType = selectedTarget.value.type
    
    if (selectedTarget.value.type === 'folder') {
      if (positionMode.value === 'child') {
        position = 'inside'
        targetFolderId = selectedTarget.value.id
      } else {
        position = 'after'
        targetFolderId = selectedTarget.value.parentId
      }
    } else {
      position = 'after'
      targetFolderId = selectedTarget.value.parentId
    }
  } else {
    targetFolderId = null
    position = 'inside'
  }
  
  const emitParams: any = {
    targetKmId,
    targetFolderId,
    targetNodeId,
    targetType,
    position,
  }
  
  if (props.operation === 'copy' && props.sourceNode) {
    const copyNodes = await buildCopyNodes(props.sourceNode)
    emitParams.copyNodes = copyNodes
  }
  
  emit('confirm', emitParams)
  
  visible.value = false
}

async function buildCopyNodes(sourceNode: TreeNode): Promise<CopyNodeInfo[]> {
  const sourceKmId = sourceNode.kmId
  
  let sourceTreeData: TreeNode[] = []
  
  if (sourceKmId !== null && sourceKmId !== undefined) {
    try {
      const res = await treeApi.getTree(sourceKmId)
      sourceTreeData = res.data.data || []
    } catch (e) {
      console.error('获取源知识库树数据失败:', e)
      return []
    }
  } else {
    try {
      const res = await treeApi.getTree(null)
      sourceTreeData = res.data.data || []
    } catch (e) {
      console.error('获取默认知识库树数据失败:', e)
      return []
    }
  }
  
  const allSourceNodes = flattenTree(sourceTreeData)
  
  function buildNodeTree(nodeId: number, nodeType: 'folder' | 'document'): CopyNodeInfo | null {
    const node = allSourceNodes.find(n => n.id === nodeId && n.type === nodeType)
    if (!node) return null
    
    const children: CopyNodeInfo[] = []
    
    if (nodeType === 'folder') {
      const childFolders = allSourceNodes.filter(n => 
        n.type === 'folder' && n.parentId === nodeId
      )
      
      for (const cf of childFolders) {
        const childTree = buildNodeTree(cf.id, 'folder')
        if (childTree) children.push(childTree)
      }
      
      const childDocs = allSourceNodes.filter(n => 
        n.type === 'document' && n.parentId === nodeId
      )
      
      for (const cd of childDocs) {
        const childTree = buildNodeTree(cd.id, 'document')
        if (childTree) children.push(childTree)
      }
    }
    
    return {
      id: node.id,
      type: node.type,
      name: node.name,
      parentId: node.parentId,
      kmId: node.kmId || null,
      children,
    }
  }
  
  const rootNode = buildNodeTree(sourceNode.id, sourceNode.type)
  return rootNode ? [rootNode] : []
}

watch(visible, async (val) => {
  if (val) {
    selectedTarget.value = null
    positionMode.value = 'root'
    selectedFolderId.value = null
    
    await loadKmList()
    if (kmList.value.length > 0) {
      selectedKmId.value = kmList.value[0].id
      await loadCurrentTree()
    }
  }
})
</script>

<style lang="scss" scoped>
.move-copy-dialog {
  .dialog-subtitle {
    font-size: 13px;
    color: #909399;
    margin-bottom: 16px;
  }
  
  .path-selector {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    
    .path-separator {
      margin: 0 8px;
      color: #909399;
    }
  }
  
  .tree-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    
    .header-label {
      font-size: 13px;
      color: #606266;
    }
    
    .header-actions {
      display: flex;
      gap: 4px;
    }
  }
  
  .tree-container {
    max-height: 280px;
    overflow-y: auto;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 16px;
  }
  
  .custom-tree {
    width: 100%;
    
    :deep(.el-tree-node__content) {
      width: 100%;
      height: auto;
      padding: 4px 0;
      
      &:hover {
        background-color: rgba(64, 158, 255, 0.05);
      }
    }
  }
  
  .tree-node-item {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 4px;
    
    &.is-selected {
      background-color: rgba(64, 158, 255, 0.15);
    }
    
    .node-icon {
      margin-right: 8px;
      
      .el-icon {
        font-size: 16px;
        color: #606266;
      }
    }
    
    .node-label {
      flex: 1;
      font-size: 13px;
      color: #303133;
    }
  }
  
  .position-section {
    padding: 12px 16px;
    background-color: #f5f7fa;
    border-radius: 4px;
    
    .position-label {
      font-size: 13px;
      font-weight: 500;
      color: #606266;
      margin-bottom: 8px;
    }
    
    .position-options {
      :deep(.el-radio-group) {
        .el-radio {
          margin-right: 24px;
          
          .el-radio__label {
            font-size: 13px;
            padding-left: 6px;
            color: #303133;
          }
        }
      }
      
      .radio-hint {
        font-size: 12px;
        color: #909399;
        margin-left: 4px;
      }
    }
  }
}
</style>
